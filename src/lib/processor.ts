import { db } from './db';
import { documents, embeddings } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { parsePdf, parseDocx, parsePptx, parseImage, parseText } from './file-parsers';
import { scrapeUrl } from './firecrawl';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-001" });

// Retry helper with exponential backoff
async function embedWithRetry(content: string, maxRetries = 4): Promise<number[]> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const result = await embeddingModel.embedContent(content);
            return result.embedding.values;
        } catch (error: any) {
            const msg = error.message || '';
            console.warn(`[Embed] Attempt ${attempt}/${maxRetries} failed: ${msg}`);
            
            if (msg.includes('429') && attempt < maxRetries) {
                // Rate limit: back off aggressively
                const delay = Math.pow(2, attempt) * 3000;
                console.log(`[Embed] Rate limited. Waiting ${delay / 1000}s...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }
            if (attempt === maxRetries) throw error;
            await new Promise(resolve => setTimeout(resolve, 1500 * attempt));
        }
    }
    throw new Error('Unreachable');
}

export async function processUpload(documentId: string, buffer: Buffer, fileType: string, originalName: string) {
    console.log(`[Processor] Starting: ${originalName} (${(buffer.length / 1024 / 1024).toFixed(1)}MB)`);
    try {
        await db.update(documents)
            .set({ status: 'indexing' })
            .where(eq(documents.id, documentId));

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
        
        // Store content in DB
        await db.update(documents)
            .set({ content: textContent })
            .where(eq(documents.id, documentId));

        // Generate embeddings
        await processDocumentChunks(documentId, textContent);

        console.log(`[Processor] ✅ Complete: ${originalName}`);
        await db.update(documents)
            .set({ status: 'completed' })
            .where(eq(documents.id, documentId));

    } catch (error: any) {
        console.error(`[Processor] ❌ Failed ${documentId}:`, error.message);
        await db.update(documents)
            .set({ status: 'failed' })
            .where(eq(documents.id, documentId));
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

                try {
                    const transcriptData = await info.getTranscript();
                    if (transcriptData?.transcript?.content?.body?.initial_segments) {
                        textContent = transcriptData.transcript.content.body.initial_segments
                            .map((s: any) => s.snippet?.text ?? '')
                            .join(' ');
                    }
                } catch (tErr) {
                    console.warn(`[Processor] Transcript unavailable for ${videoId}`);
                }

                if (!textContent) {
                    textContent = `Video Title: ${info.basic_info.title}\nDescription: ${info.basic_info.short_description ?? ''}\n\n[Note: Transcript was unavailable.]`;
                }
            } catch (err) {
                console.warn(`[Processor] youtubei.js failed for ${videoId}:`, err);
                const { YoutubeTranscript } = await import('youtube-transcript');
                const items = await YoutubeTranscript.fetchTranscript(videoId);
                textContent = items.map((i: any) => i.text).join(' ');
            }
        } else {
            console.log(`[Processor] Scraping ${url}...`);
            try {
                const markdown = await scrapeUrl(url);
                if (markdown) {
                    textContent = markdown;
                } else {
                    throw new Error("Scrape returned empty");
                }
            } catch (firecrawlError) {
                console.warn("[Processor] Firecrawl failed, using basic fetch...");
                const response = await fetch(url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    }
                });
                if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
                const html = await response.text();
                const extractorModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
                const prompt = `Extract the main article content from this HTML. Ignore ads/nav. Return ONLY text. HTML:\n${html.substring(0, 50000)}`;
                const result = await extractorModel.generateContent(prompt);
                textContent = result.response.text();
            }
        }

        if (!textContent || textContent.trim().length === 0) {
            throw new Error("Could not extract any content from source");
        }

        await db.update(documents)
            .set({ content: textContent, name: title, status: 'indexing' })
            .where(eq(documents.id, documentId));

        await processDocumentChunks(documentId, textContent);

        await db.update(documents)
            .set({ status: 'completed' })
            .where(eq(documents.id, documentId));

    } catch (error: any) {
        console.error(`[Processor] URL failed ${documentId}:`, error.message);
        await db.update(documents)
            .set({ status: 'failed' })
            .where(eq(documents.id, documentId));
    }
}

/**
 * Splits text into chunks and generates embeddings.
 * Designed to handle 50MB+ documents (500+ pages) without hitting
 * API rate limits or running out of memory.
 */
async function processDocumentChunks(documentId: string, textContent: string) {
    console.log(`[Processor] Chunking ${documentId} (${textContent.length} chars)...`);

    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 150,
    });

    const chunks = await splitter.createDocuments([textContent]);
    const totalChunks = chunks.length;
    console.log(`[Processor] ${totalChunks} chunks generated for ${documentId}`);

    // Record total chunk count upfront
    await db.update(documents)
        .set({ chunkCount: totalChunks, processedCount: 0 })
        .where(eq(documents.id, documentId));

    const DB_BATCH_SIZE = 25;
    let batch: any[] = [];
    let processedSoFar = 0;
    let consecutiveErrors = 0;

    for (let i = 0; i < totalChunks; i++) {
        const content = chunks[i].pageContent;

        // Adaptive rate limiting: slow down for Gemini free tier (15 RPM)
        // Every 5 chunks, pause briefly. Every 14 chunks (near the RPM limit), pause longer.
        if (i > 0) {
            if (i % 14 === 0) {
                await new Promise(resolve => setTimeout(resolve, 4000));
            } else if (i % 5 === 0) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        try {
            const vector = await embedWithRetry(content);
            batch.push({
                documentId,
                content,
                metadata: { chunkIndex: i },
                vector
            });
            consecutiveErrors = 0;
        } catch (e: any) {
            consecutiveErrors++;
            console.error(`[Processor] Chunk ${i}/${totalChunks} failed: ${e.message}`);

            // If we fail 5 chunks in a row, the API is likely down — stop gracefully
            if (consecutiveErrors >= 5) {
                console.error(`[Processor] 5 consecutive failures. Stopping early at chunk ${i}/${totalChunks}.`);
                break;
            }
            continue;
        }

        // Flush batch to DB periodically
        if (batch.length >= DB_BATCH_SIZE || i === totalChunks - 1) {
            if (batch.length > 0) {
                await db.insert(embeddings).values(batch);
                processedSoFar += batch.length;
                batch = [];

                // Progress heartbeat
                await db.update(documents)
                    .set({ processedCount: processedSoFar })
                    .where(eq(documents.id, documentId));

                const pct = Math.round((processedSoFar / totalChunks) * 100);
                console.log(`[Processor] ${documentId}: ${pct}% (${processedSoFar}/${totalChunks})`);
            }
        }
    }

    console.log(`[Processor] Embedding complete: ${processedSoFar}/${totalChunks} chunks stored.`);
}
