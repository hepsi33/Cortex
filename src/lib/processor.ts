import { db } from './db';
import { documents, embeddings } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { parsePdf, parseDocx, parsePptx, parseImage, parseText } from './file-parsers';
import { scrapeUrl } from './firecrawl';
import { hasBudget, isApproachingLimit, recordCall, rateLimit } from './api-budget';
import { YoutubeTranscript } from 'youtube-transcript';

// ── YouTube Transcript Helpers ──────────────────────────────────────

function cleanCaptionText(input: string): string {
    if (!input) return '';
    return input
        .replace(/\uFEFF/g, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, ' ')
        .trim();
}

async function fetchTimedText(videoId: string): Promise<string | null> {
    try {
        const res = await fetch(`https://www.youtube.com/api/timedtext?lang=en&v=${videoId}`);
        const text = await res.text();
        if (res.ok && text.includes('<text')) return cleanCaptionText(text);
    } catch { /* ignore */ }
    return null;
}

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-001" });

// ── Multi-Provider Embedding Pipeline ───────────────────────────────

/**
 * PRIMARY: Gemini batch embedding (fast, free-tier limited)
 */
async function embedWithGemini(texts: string[]): Promise<number[][]> {
    await rateLimit('gemini-embed', 10, 60_000); // 10 RPM max
    
    const result = await embeddingModel.batchEmbedContents({
        requests: texts.map(text => ({
            model: "models/gemini-embedding-001",
            content: { role: 'user', parts: [{ text }] },
            taskType: 'RETRIEVAL_DOCUMENT' as any,
            outputDimensionality: 768
        } as any))
    });
    
    recordCall('gemini-embed');
    
    return result.embeddings.map(e => {
        const values = e.values;
        if (values.length > 768) return values.slice(0, 768);
        if (values.length < 768) {
            const padded = new Array(768).fill(0);
            for (let i = 0; i < values.length; i++) padded[i] = values[i];
            return padded;
        }
        return values;
    });
}

/**
 * FALLBACK 1: OpenRouter embedding via the existing API key.
 * Uses text-embedding-3-small (1536 dims, truncated to 768).
 */
async function embedWithOpenRouter(texts: string[]): Promise<number[][]> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error('OPENROUTER_API_KEY not set');

    await rateLimit('openrouter-embed', 20, 60_000);

    const response = await fetch('https://openrouter.ai/api/v1/embeddings', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        },
        body: JSON.stringify({
            model: 'openai/text-embedding-3-small',
            input: texts,
            dimensions: 768,
        }),
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`OpenRouter embed failed (${response.status}): ${errText.substring(0, 200)}`);
    }

    const data = await response.json();
    recordCall('openrouter-embed');
    
    return data.data.map((item: any) => {
        const values: number[] = item.embedding;
        if (values.length > 768) return values.slice(0, 768);
        if (values.length < 768) {
            const padded = new Array(768).fill(0);
            for (let i = 0; i < values.length; i++) padded[i] = values[i];
            return padded;
        }
        return values;
    });
}

/**
 * FALLBACK 2: Local hash-based embeddings (zero API dependency).
 * 
 * Uses a simple character n-gram hashing approach to produce
 * deterministic 768-dim vectors. Quality is lower than neural
 * embeddings, but semantic search still works for exact/near matches.
 * Documents can be re-embedded with better providers later.
 */
function embedLocal(texts: string[]): number[][] {
    return texts.map(text => {
        const vector = new Array(768).fill(0);
        const normalized = text.toLowerCase().replace(/[^a-z0-9\s]/g, '');
        const words = normalized.split(/\s+/).filter(w => w.length > 2);

        // Character trigram hashing
        for (const word of words) {
            for (let i = 0; i <= word.length - 3; i++) {
                const trigram = word.substring(i, i + 3);
                let hash = 0;
                for (let j = 0; j < trigram.length; j++) {
                    hash = ((hash << 5) - hash) + trigram.charCodeAt(j);
                    hash = hash & hash; // Convert to 32-bit int
                }
                const idx = Math.abs(hash) % 768;
                vector[idx] += 1;
            }
        }

        // L2 normalize
        const magnitude = Math.sqrt(vector.reduce((sum: number, v: number) => sum + v * v, 0)) || 1;
        return vector.map((v: number) => v / magnitude);
    });
}

/**
 * Multi-provider batch embedding with automatic fallback.
 * 
 * Chain: Gemini → OpenRouter → Local
 * 
 * Each provider is tried in order. If one fails (quota, network, etc.),
 * the next one is used. The quota tracker proactively avoids providers
 * that are approaching their daily limit.
 */
async function batchEmbed(texts: string[], maxRetries = 3): Promise<number[][]> {
    // Provider 1: Gemini (if budget allows)
    if (hasBudget('gemini-embed') && !isApproachingLimit('gemini-embed')) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await embedWithGemini(texts);
            } catch (error: any) {
                const msg = error.message || '';
                console.warn(`[Embed] Gemini attempt ${attempt}/${maxRetries} failed: ${msg.substring(0, 100)}`);

                if (msg.includes('429') && attempt < maxRetries) {
                    const delay = Math.pow(2, attempt) * 5000;
                    console.log(`[Embed] Rate limited. Waiting ${delay / 1000}s...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    continue;
                }
                // Break to fallback on non-retryable errors
                break;
            }
        }
        console.warn('[Embed] ⚠️ Gemini exhausted, falling back to OpenRouter...');
    } else {
        console.log('[Embed] Gemini budget low, using fallback providers...');
    }

    // Provider 2: OpenRouter
    if (process.env.OPENROUTER_API_KEY) {
        try {
            return await embedWithOpenRouter(texts);
        } catch (error: any) {
            console.warn(`[Embed] OpenRouter failed: ${(error.message || '').substring(0, 100)}`);
        }
    }

    // Provider 3: Local (always works, no API needed)
    console.warn('[Embed] 🔧 Using local hash embeddings (offline mode)');
    return embedLocal(texts);
}

async function updateDocStatus(documentId: string, status: 'pending' | 'indexing' | 'completed' | 'failed', maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            await db.update(documents)
                .set({ status })
                .where(eq(documents.id, documentId));
            return;
        } catch (e: any) {
            console.warn(`[Processor] Status update retry ${i+1}/${maxRetries} for ${documentId}: ${e.message}`);
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
}

export async function processUpload(documentId: string, buffer: Buffer, fileType: string, originalName: string) {
    console.log(`[Processor] Starting: ${originalName} (${(buffer.length / 1024 / 1024).toFixed(1)}MB)`);
    try {
        await updateDocStatus(documentId, 'indexing');

        let textContent = '';

        console.log(`[Processor] Parsing ${fileType}...`);
        switch (fileType) {
            case 'application/pdf': textContent = await parsePdf(buffer); break;
            case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': textContent = await parseDocx(buffer); break;
            case 'application/vnd.openxmlformats-officedocument.presentationml.presentation': textContent = await parsePptx(buffer); break;
            case 'image/jpeg':
            case 'image/png':
            case 'image/gif':
            case 'image/webp': textContent = await parseImage(buffer, fileType); break;
            case 'text/plain':
            case 'text/markdown':
            case 'text/csv': textContent = await parseText(buffer); break;
            default: throw new Error(`Unsupported file type: ${fileType}`);
        }

        if (!textContent || textContent.trim().length === 0) {
            throw new Error("Parsed content is empty. The file might be image-only or corrupted.");
        }

        console.log(`[Processor] Extracted ${textContent.length} chars from ${originalName}`);

        await db.update(documents)
            .set({ content: textContent })
            .where(eq(documents.id, documentId));

        // Await indexing (it's safe now because the whole function is inside after())
        await processDocumentChunks(documentId, textContent);

        console.log(`[Processor] ✅ Done: ${originalName}`);

    } catch (error: any) {
        console.error(`[Processor] ❌ Failed ${documentId}:`, error.message);
        await updateDocStatus(documentId, 'failed');
    }
}

export async function processUrl(documentId: string, url: string) {
    console.log(`[Processor] Starting URL: ${url}`);
    try {
        let textContent = '';
        let title = url;

        const isYoutube = url.includes('youtube.com') || url.includes('youtu.be');

        if (isYoutube) {
            const { Innertube } = await import('youtubei.js');
            const youtube = await Innertube.create();
            const videoId = url.includes('v=') ? url.split('v=')[1].split('&')[0] : url.split('/').pop();
            if (!videoId) throw new Error("Invalid YouTube ID");

            try {
                const info = await youtube.getInfo(videoId);
                title = info.basic_info.title ?? url;

                // Strategy 1: Innertube getTranscript()
                try {
                    const transcriptData = await info.getTranscript();
                    if (transcriptData?.transcript?.content?.body?.initial_segments) {
                        textContent = transcriptData.transcript.content.body.initial_segments
                            .map((s: any) => s.snippet?.text ?? '')
                            .join(' ');
                        console.log(`[Processor] ✅ Innertube transcript extracted (${textContent.length} chars)`);
                    }
                } catch {
                    console.warn(`[Processor] Innertube getTranscript() failed for ${videoId}`);
                }

                // Strategy 2 & 3: Fallback scrapers (youtube-transcript lib + timedtext API)
                if (!textContent || textContent.trim().length < 50) {
                    console.log(`[Processor] Trying fallback transcript scrapers for ${videoId}...`);
                    try {
                        textContent = await Promise.any([
                            YoutubeTranscript.fetchTranscript(videoId).then(items => {
                                const text = items.map(i => i.text).join(' ');
                                console.log(`[Processor] ✅ youtube-transcript lib succeeded (${text.length} chars)`);
                                return text;
                            }),
                            fetchTimedText(videoId).then(text => {
                                if (!text) throw new Error('timedtext empty');
                                console.log(`[Processor] ✅ timedtext API succeeded (${text.length} chars)`);
                                return text;
                            }),
                        ]);
                    } catch {
                        console.warn(`[Processor] All fallback scrapers failed for ${videoId}`);
                    }
                }

                // Strategy 4: AI Neural Reconstruction from metadata
                if (!textContent || textContent.trim().length < 50) {
                    console.log(`[Processor] Captions unavailable for ${videoId}. Initiating AI Neural Reconstruction...`);
                    const extractorModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
                    const prompt = `
                        This YouTube video has no captions available. 
                        As an expert AI Study Assistant, I need you to reconstruct the likely content/educational value of this video based on its metadata.
                        
                        Title: ${info.basic_info.title}
                        Description: ${info.basic_info.short_description ?? 'No description'}
                        Author: ${info.basic_info.author ?? 'Unknown'}
                        
                        Please provide a detailed "Artificial Transcript" or "Knowledge Synthesis" that represents what this video covers. 
                        Format it as a clean, long-form text that I can index for RAG.
                        Include key topics, potential takeaways, and a structured breakdown of the subject matter.
                    `;
                    const result = await extractorModel.generateContent(prompt);
                    textContent = `[AI RECONSTRUCTED TRANSCRIPT - NO NATIVE CAPTIONS]\n\n${result.response.text()}`;
                }
            } catch (err: any) {
                console.warn(`[Processor] Innertube core failed for ${videoId}: ${err.message}. Trying standalone scrapers...`);
                
                // Even if Innertube completely crashes, try the standalone scrapers
                try {
                    textContent = await Promise.any([
                        YoutubeTranscript.fetchTranscript(videoId).then(items => items.map(i => i.text).join(' ')),
                        fetchTimedText(videoId).then(text => { if (!text) throw new Error(); return text; }),
                    ]);
                    console.log(`[Processor] ✅ Standalone scraper recovered transcript (${textContent.length} chars)`);
                } catch {
                    // True last resort
                    textContent = `Title: ${title}\nSource: ${url}\n\n[System Note: This video source was protected or unavailable for deep scraping. Please use a different source if detailed transcripts are required.]`;
                }
            }
        } else {
            try {
                const markdown = await scrapeUrl(url);
                if (markdown) {
                    textContent = markdown;
                } else {
                    throw new Error("Scrape returned empty");
                }
            } catch {
                console.warn("[Processor] Firecrawl failed, using basic fetch...");
                const response = await fetch(url, {
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
                });
                if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
                const html = await response.text();
                const extractorModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
                const prompt = `Extract the main article content from this HTML. Ignore ads/nav. Return ONLY text. HTML:\n${html.substring(0, 50000)}`;
                const result = await extractorModel.generateContent(prompt);
                textContent = result.response.text();
            }
        }

        if (!textContent || textContent.trim().length === 0) {
            throw new Error("Could not extract any content from source");
        }

        await db.update(documents)
            .set({ content: textContent, name: title })
            .where(eq(documents.id, documentId));

        await updateDocStatus(documentId, 'indexing');

        // Await indexing (it's safe now because the whole function is inside after())
        await processDocumentChunks(documentId, textContent);
        console.log(`[Processor] ✅ URL Done: ${url}`);

    } catch (error: any) {
        console.error(`[Processor] URL failed ${documentId}:`, error.message);
        await updateDocStatus(documentId, 'failed');
    }
}

/**
 * HIGH-SPEED EMBEDDING PIPELINE
 * 
 * Uses Gemini's batchEmbedContents API to embed up to 100 chunks per API call.
 * A 300-chunk textbook now needs only 3 API calls instead of 300.
 * 
 * Speed comparison:
 *   Old (1-at-a-time, 4.5s delay): 300 chunks = 22 minutes
 *   New (batch 100, 5s delay):      300 chunks = 15 seconds
 */
export async function processDocumentChunks(documentId: string, textContent: string) {
    const startTime = Date.now();
    console.log(`[Processor] 🚀 Starting indexing for ${documentId} (${textContent.length} chars)`);

    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 150,
    });

    const chunks = await splitter.createDocuments([textContent]);
    const totalChunks = chunks.length;
    console.log(`[Processor] 🧩 Generated ${totalChunks} chunks`);

    await db.update(documents)
        .set({ chunkCount: totalChunks, processedCount: 0 })
        .where(eq(documents.id, documentId));

    let processedSoFar = 0;

    try {
        const BATCH_SIZE = 100;
        const PARALLEL_BATCHES = 5; // Run 5 batches of 100 (500 chunks) in parallel
        
        const batchTasks = [];
        for (let batchStart = 0; batchStart < totalChunks; batchStart += BATCH_SIZE) {
            const batchEnd = Math.min(batchStart + BATCH_SIZE, totalChunks);
            const batchTexts = chunks.slice(batchStart, batchEnd).map(c => c.pageContent);
            const batchNum = Math.floor(batchStart / BATCH_SIZE) + 1;

            batchTasks.push((async () => {
                try {
                    console.log(`[Processor] 📡 Embedding batch ${batchNum}...`);
                    const vectors = await batchEmbed(batchTexts);
                    
                    const rows = vectors.map((vector, i) => ({
                        documentId,
                        content: batchTexts[i],
                        metadata: { chunkIndex: batchStart + i },
                        vector
                    }));

                    await db.insert(embeddings).values(rows);
                    
                    processedSoFar += vectors.length;
                    const pct = Math.round((processedSoFar / totalChunks) * 100);
                    console.log(`[Processor] 📊 Progress: ${pct}%`);
                    
                    // Simple progress update in DB
                    await db.update(documents)
                        .set({ processedCount: processedSoFar })
                        .where(eq(documents.id, documentId));
                } catch (e: any) {
                    console.error(`[Processor] ❌ Batch ${batchNum} failed: ${e.message}`);
                    throw e;
                }
            })());

            // If we hit the parallel limit, wait for them to finish before starting more
            // to avoid hitting the 15 RPM Gemini limit too fast
            if (batchTasks.length >= PARALLEL_BATCHES) {
                await Promise.all(batchTasks);
                batchTasks.length = 0; // Clear array
                // Small breath to avoid RPM spikes
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        // Wait for remaining tasks
        if (batchTasks.length > 0) {
            await Promise.all(batchTasks);
        }

        const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`[Processor] ✨ Indexing complete for ${documentId} in ${totalTime}s`);
        await updateDocStatus(documentId, 'completed', 5);
    } catch (finalError: any) {
        console.error(`[Processor] 💥 Fatal indexing error:`, finalError.message);
        await updateDocStatus(documentId, 'failed', 5);
    }
}
