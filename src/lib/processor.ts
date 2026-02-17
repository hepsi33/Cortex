import { db } from './db';
import { documents, embeddings } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';

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
            // Exponential backoff
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
    }
    throw new Error('Unreachable');
}

import { parsePdf, parseDocx, parsePptx, parseImage, parseText } from './file-parsers';

export async function processUpload(documentId: string, buffer: Buffer, fileType: string, originalName: string) {
    console.log(`Starting background upload processing for ${documentId}`);
    try {
        let textContent = '';

        // Update status to parsing
        await db.update(documents)
            .set({ status: 'indexing' }) // We can use indexing for parsing too
            .where(eq(documents.id, documentId));

        try {
            switch (fileType) {
                case 'application/pdf':
                    textContent = await parsePdf(buffer);
                    break;
                case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
                    textContent = await parseDocx(buffer);
                    break;
                case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
                    textContent = await parsePptx(buffer);
                    break;
                case 'image/jpeg':
                case 'image/png':
                case 'image/webp':
                    textContent = await parseImage(buffer, fileType);
                    break;
                case 'text/plain':
                case 'text/markdown':
                case 'text/csv':
                    textContent = await parseText(buffer);
                    break;
                default:
                    throw new Error(`Unsupported file type: ${fileType}`);
            }
        } catch (parseError: any) {
            console.error(`Parsing failed for ${documentId}:`, parseError);
            throw new Error(`Failed to parse content: ${parseError.message}`);
        }

        if (!textContent || textContent.trim().length === 0) {
            throw new Error('Extracted content is empty');
        }

        // Update document with content
        await db.update(documents)
            .set({ content: textContent })
            .where(eq(documents.id, documentId));

        // Proceed to embedding
        await processDocument(documentId, textContent);

    } catch (error: any) {
        console.error(`Upload processing failed for ${documentId}:`, error);
        await db.update(documents)
            .set({ status: 'failed' })
            .where(eq(documents.id, documentId));
    }
}

export async function processDocument(documentId: string, textContent: string) {
    console.log(`Starting embedding for document ${documentId}`);
    // ... existing implementation
    try {

        // Status is already indexing if called from processUpload, but safe to set again
        await db.update(documents)
            .set({ status: 'indexing' })
            .where(eq(documents.id, documentId));

        // Split text
        const splitter = new RecursiveCharacterTextSplitter({
            chunkSize: 1000,
            chunkOverlap: 200,
        });

        const chunks = await splitter.createDocuments([textContent]);

        console.log(`Generated ${chunks.length} chunks for document ${documentId}`);

        // Generate embeddings sequentially to avoid overwhelming Next.js fetch
        const documentsData: any[] = [];
        const batchSize = 5; // Process in small batches

        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            const content = chunk.pageContent;

            try {
                const vector = await embedWithRetry(content);

                documentsData.push({
                    documentId: documentId,
                    content: content,
                    metadata: {
                        page: chunk.metadata.loc?.pageNumber,
                        chunkIndex: i
                    },
                    documentIdReference: documentId, // Explicitly map if needed by schema, though we use documentId
                    vector: vector
                });
            } catch (e) {
                console.error(`Failed to embed chunk ${i}, skipping...`);
            }

            // Batch insert every 5 chunks to save progress and memory
            if (documentsData.length >= batchSize || i === chunks.length - 1) {
                if (documentsData.length > 0) {
                    await db.insert(embeddings).values(documentsData.map(d => ({
                        documentId: d.documentId,
                        content: d.content,
                        metadata: d.metadata,
                        vector: d.vector
                    })));
                    documentsData.length = 0; // Clear array
                }
            }

            console.log(`Processed chunk ${i + 1}/${chunks.length} for document ${documentId}`);
        }

        // Update status to completed
        await db.update(documents)
            .set({
                status: 'completed',
                chunkCount: chunks.length
            })
            .where(eq(documents.id, documentId));

        console.log(`Successfully processed document ${documentId}`);

    } catch (error) {
        console.error(`Error processing document ${documentId}:`, error);

        await db.update(documents)
            .set({ status: 'failed' })
            .where(eq(documents.id, documentId));
    }
}
