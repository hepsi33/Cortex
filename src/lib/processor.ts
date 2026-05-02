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
            const result = await embeddingModel.batchEmbedContents(
                texts.map(text => ({
                    content: { parts: [{ text }], role: 'user' }
                }))
            );
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

        await db.update(documents)
            .set({ content: textContent })
            .where(eq(documents.id, documentId));

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
    console.log(`[Processor] Chunking ${documentId} (${textContent.length} chars)...`);

    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 150,
    });

    const chunks = await splitter.createDocuments([textContent]);
    const totalChunks = chunks.length;
    console.log(`[Processor] ${totalChunks} chunks generated`);

    await db.update(documents)
        .set({ chunkCount: totalChunks, processedCount: 0 })
        .where(eq(documents.id, documentId));

    // Process in batches of 100 (Gemini batch limit)
    const BATCH_SIZE = 100;
    let processedSoFar = 0;

    for (let batchStart = 0; batchStart < totalChunks; batchStart += BATCH_SIZE) {
        const batchEnd = Math.min(batchStart + BATCH_SIZE, totalChunks);
        const batchTexts = chunks.slice(batchStart, batchEnd).map(c => c.pageContent);

        // Rate limit: wait between batches (each batch = 1 API call)
        if (batchStart > 0) {
            await new Promise(resolve => setTimeout(resolve, 5000));
        }

        try {
            console.log(`[Processor] Embedding batch ${Math.floor(batchStart / BATCH_SIZE) + 1}/${Math.ceil(totalChunks / BATCH_SIZE)} (chunks ${batchStart + 1}-${batchEnd})...`);
            
            const vectors = await batchEmbed(batchTexts);

            // Prepare DB rows
            const rows = vectors.map((vector, i) => ({
                documentId,
                content: batchTexts[i],
                metadata: { chunkIndex: batchStart + i },
                vector
            }));

            // Insert in sub-batches of 50 to avoid oversized DB queries
            for (let dbStart = 0; dbStart < rows.length; dbStart += 50) {
                const dbBatch = rows.slice(dbStart, dbStart + 50);
                await db.insert(embeddings).values(dbBatch);
            }

            processedSoFar += vectors.length;

            await db.update(documents)
                .set({ processedCount: processedSoFar })
                .where(eq(documents.id, documentId));

            const pct = Math.round((processedSoFar / totalChunks) * 100);
            console.log(`[Processor] ✅ ${pct}% complete (${processedSoFar}/${totalChunks})`);

        } catch (e: any) {
            console.error(`[Processor] Batch failed at chunk ${batchStart}: ${e.message}`);
            // Don't abort entirely — continue with next batch
            continue;
        }
    }

    console.log(`[Processor] Embedding done: ${processedSoFar}/${totalChunks} chunks stored.`);
}
