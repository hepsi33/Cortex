import { db } from './db';
import { documents, embeddings } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { Innertube } from 'youtubei.js';
import { parsePdf, parseDocx, parsePptx, parseImage, parseText } from './file-parsers';
import { scrapeUrl } from './firecrawl';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });

// Retry helper for flaky fetch inside Next.js
async function embedWithRetry(content: string, maxRetries = 3): Promise<number[]> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const result = await model.embedContent(content);
            return result.embedding.values;
        } catch (error: any) {
            console.warn(`Embedding attempt ${attempt}/${maxRetries} failed:`, error.message);
            if (attempt === maxRetries) throw error;
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
    }
    throw new Error('Unreachable');
}

export async function processUpload(documentId: string, buffer: Buffer, fileType: string, originalName: string) {
    console.log(`[Processor] Starting file processing for ${documentId}: ${originalName}`);
    try {
        let textContent = '';

        await db.update(documents)
            .set({ status: 'indexing' })
            .where(eq(documents.id, documentId));

        try {
            await db.update(documents).set({ status: 'indexing' }).where(eq(documents.id, documentId));
            
            console.log(`[Processor] Parsing ${fileType}...`);
            switch (fileType) {
                case 'application/pdf': textContent = await parsePdf(buffer); break;
                case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': textContent = await parseDocx(buffer); break;
                case 'application/vnd.openxmlformats-officedocument.presentationml.presentation': textContent = await parsePptx(buffer); break;
                case 'image/jpeg':
                case 'image/png':
                case 'image/webp': textContent = await parseImage(buffer, fileType); break;
                case 'text/plain':
                case 'text/markdown':
                case 'text/csv': textContent = await parseText(buffer); break;
                default: throw new Error(`Unsupported file type: ${fileType}`);
            }
            if (!textContent || textContent.trim().length === 0) throw new Error("Parsed content is empty. This PDF might be image-only.");
        } catch (parseError: any) {
            console.error(`[Processor] Parsing failed for ${documentId}:`, parseError);
            throw parseError;
        }

        console.log(`[Processor] Content extracted (${textContent.length} chars). Syncing to DB...`);
        await db.update(documents)
            .set({ content: textContent })
            .where(eq(documents.id, documentId));

        await processDocument(documentId, textContent);

        console.log(`[Processor] Done with ${documentId}`);
        await db.update(documents)
            .set({ status: 'completed' })
            .where(eq(documents.id, documentId));

    } catch (error: any) {
        console.error(`[Processor] Fatal error processing document ${documentId}:`, error);
        await db.update(documents).set({ status: 'failed' }).where(eq(documents.id, documentId));
    }
}

export async function processUrl(documentId: string, url: string) {
    console.log(`[Processor] Starting URL processing for ${documentId}: ${url}`);
    try {
        let textContent = '';
        let title = url;

        const isYoutube = url.includes('youtube.com') || url.includes('youtu.be');

        if (isYoutube) {
            const youtube = await Innertube.create();
            const videoId = url.includes('v=') ? url.split('v=')[1].split('&')[0] : url.split('/').pop();
            if (!videoId) throw new Error("Invalid YouTube ID");
            
            try {
                const transcript = await youtube.getTranscript(videoId);
                textContent = transcript.transcript.content.body.initial_segments.map((s: any) => s.snippet.text).join(' ');
            } catch (transcriptError) {
                console.warn(`[Processor] Transcript failed for ${videoId}, falling back to metadata...`, transcriptError);
                const info = await youtube.getBasicInfo(videoId);
                title = info.basic_info.title || url;
                textContent = `Video Title: ${info.basic_info.title}\nDescription: ${info.basic_info.description}\n\n[Note: Formal transcript was unavailable. This summary is based on video metadata and AI analysis of the title/description.]`;
            }
        } else {
            console.log(`[Processor] Scraping ${url} with Firecrawl helper...`);
            try {
                const markdown = await scrapeUrl(url);
                if (markdown) {
                    textContent = markdown;
                    title = url;
                } else {
                    throw new Error("Scrape returned empty content");
                }
            } catch (firecrawlError) {
                console.warn("[Processor] Firecrawl failed, falling back to basic fetch...", firecrawlError);
                const response = await fetch(url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    }
                });
                if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
                const html = await response.text();
                const extractorModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
                const prompt = `Extract the main article content from this HTML. Ignore ads/nav. Return ONLY text. HTML:\n${html.substring(0, 50000)}`;
                const result = await extractorModel.generateContent(prompt);
                textContent = result.response.text();
                title = url;
            }
        }

        if (!textContent || textContent.trim().length === 0) throw new Error("Could not extract any content from source");

        await db.update(documents)
            .set({ content: textContent, name: title, status: 'indexing' })
            .where(eq(documents.id, documentId));

        await processDocument(documentId, textContent);

        await db.update(documents).set({ status: 'completed' }).where(eq(documents.id, documentId));

    } catch (error: any) {
        console.error(`[Processor] URL processing failed for ${documentId}:`, error);
        await db.update(documents).set({ status: 'failed' }).where(eq(documents.id, documentId));
    }
}

export async function processDocument(documentId: string, textContent: string) {
    console.log(`[Processor] Generating embeddings for ${documentId}`);
    try {
        const splitter = new RecursiveCharacterTextSplitter({
            chunkSize: 1200, // Increased for textbooks
            chunkOverlap: 200,
        });

        const chunks = await splitter.createDocuments([textContent]);
        console.log(`[Processor] Generated ${chunks.length} chunks for ${documentId}`);

        const batchSize = 50; // Increased for performance
        let documentsData: any[] = [];

        for (let i = 0; i < chunks.length; i++) {
            const content = chunks[i].pageContent;
            
            // Add a mandatory delay for free-tier Gemini (15 RPM)
            // If we have many chunks, we need to slow down to avoid 429
            if (i > 0 && i % 2 === 0) {
                await new Promise(resolve => setTimeout(resolve, 1500)); 
            }

            try {
                const vector = await embedWithRetry(content);
                documentsData.push({
                    documentId,
                    content,
                    metadata: { chunkIndex: i },
                    vector
                });
            } catch (e) {
                console.error(`[Processor] Failed to embed chunk ${i}`);
            }

            if (documentsData.length >= batchSize || i === chunks.length - 1) {
                if (documentsData.length > 0) {
                    await db.insert(embeddings).values(documentsData);
                    documentsData = [];
                }
            }
        }

        await db.update(documents)
            .set({ chunkCount: chunks.length })
            .where(eq(documents.id, documentId));

    } catch (error) {
        console.error(`[Processor] Embedding failed for ${documentId}:`, error);
        throw error;
    }
}
