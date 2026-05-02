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

/**
 * Batch embed up to 100 texts in a SINGLE API call.
 * This is 100x faster than embedding one at a time and uses only 1 RPM quota.
 */
async function batchEmbed(texts: string[], maxRetries = 4): Promise<number[][]> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const result = await embeddingModel.batchEmbedContents({
                requests: texts.map(text => ({
                    content: { parts: [{ text }], role: 'user' as const }
                }))
            });
            return result.embeddings.map(e => e.values);
        } catch (error: any) {
            const msg = error.message || '';
            console.warn(`[Embed] Batch attempt ${attempt}/${maxRetries} failed: ${msg.substring(0, 100)}`);

            if (msg.includes('429') && attempt < maxRetries) {
                const delay = Math.pow(2, attempt) * 5000;
                console.log(`[Embed] Rate limited. Waiting ${delay / 1000}s...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }
            if (attempt === maxRetries) throw error;
            await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
        }
    }
    throw new Error('Unreachable');
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

        await processDocumentChunks(documentId, textContent);

        console.log(`[Processor] ✅ Complete: ${originalName}`);
        await updateDocStatus(documentId, 'completed');

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

                try {
                    const transcriptData = await info.getTranscript();
                    if (transcriptData?.transcript?.content?.body?.initial_segments) {
                        textContent = transcriptData.transcript.content.body.initial_segments
                            .map((s: any) => s.snippet?.text ?? '')
                            .join(' ');
                    }
                } catch {
                    console.warn(`[Processor] Transcript unavailable for ${videoId}`);
                }

                if (!textContent) {
                    textContent = `Video Title: ${info.basic_info.title}\nDescription: ${info.basic_info.short_description ?? ''}\n\n[Note: Transcript was unavailable.]`;
                }
            } catch (err) {
                console.warn(`[Processor] youtubei.js failed, trying youtube-transcript...`);
                const { YoutubeTranscript } = await import('youtube-transcript');
                const items = await YoutubeTranscript.fetchTranscript(videoId);
                textContent = items.map((i: any) => i.text).join(' ');
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
            .set({ content: textContent, name: title })
            .where(eq(documents.id, documentId));

        await updateDocStatus(documentId, 'indexing');

        await processDocumentChunks(documentId, textContent);

        await updateDocStatus(documentId, 'completed');

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
async function processDocumentChunks(documentId: string, textContent: string) {
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

    const BATCH_SIZE = 100;
    let processedSoFar = 0;

    for (let batchStart = 0; batchStart < totalChunks; batchStart += BATCH_SIZE) {
        const batchEnd = Math.min(batchStart + BATCH_SIZE, totalChunks);
        const batchTexts = chunks.slice(batchStart, batchEnd).map(c => c.pageContent);
        const batchNum = Math.floor(batchStart / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(totalChunks / BATCH_SIZE);

        // Rate limit: 15 RPM = 1 request every 4s. Using 4.1s to be safe.
        if (batchStart > 0) {
            await new Promise(resolve => setTimeout(resolve, 4100));
        }

        try {
            console.log(`[Processor] 📡 Embedding batch ${batchNum}/${totalBatches}...`);
            const embedStart = Date.now();
            const vectors = await batchEmbed(batchTexts);
            console.log(`[Processor] ⚡ Embedded ${vectors.length} chunks in ${Date.now() - embedStart}ms`);

            // Prepare all rows for this batch
            const rows = vectors.map((vector, i) => ({
                documentId,
                content: batchTexts[i],
                metadata: { chunkIndex: batchStart + i },
                vector
            }));

            // Bulk insert all 100 rows at once for speed
            console.log(`[Processor] 💾 Saving to database...`);
            const dbStart = Date.now();
            await db.insert(embeddings).values(rows);
            console.log(`[Processor] ✅ Database sync complete (${Date.now() - dbStart}ms)`);

            processedSoFar += vectors.length;

            for (let i = 0; i < 3; i++) {
                try {
                    await db.update(documents)
                        .set({ processedCount: processedSoFar })
                        .where(eq(documents.id, documentId));
                    break;
                } catch (e: any) {
                    console.warn(`[Processor] Progress update retry ${i+1}/3 for ${documentId}: ${e.message}`);
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }

            const pct = Math.round((processedSoFar / totalChunks) * 100);
            console.log(`[Processor] 📊 Progress: ${pct}% (${processedSoFar}/${totalChunks})`);

        } catch (e: any) {
            console.error(`[Processor] ❌ Batch ${batchNum} failed: ${e.message}`);
            // If it's a critical error (not just rate limit), we might want to stop
            if (e.message.includes('401') || e.message.includes('403')) break;
            continue;
        }
    }

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[Processor] ✨ Indexing complete for ${documentId} in ${totalTime}s`);
}
