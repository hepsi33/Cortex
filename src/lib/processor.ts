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

export async function processDocument(documentId: string, textContent: string) {
    console.log(`Starting processing for document ${documentId}`);
    try {

        // Update status to indexing
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

        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            const content = chunk.pageContent;

            const vector = await embedWithRetry(content);

            documentsData.push({
                documentId: documentId,
                content: content,
                metadata: {
                    page: chunk.metadata.loc?.pageNumber,
                    chunkIndex: i
                },
                vector: vector
            });

            console.log(`Embedded chunk ${i + 1}/${chunks.length} for document ${documentId}`);

            // Small delay between requests
            if (i < chunks.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 300));
            }
        }

        // Insert into DB
        await db.insert(embeddings).values(documentsData);

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
