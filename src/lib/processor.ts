import { db } from './db';
import { documents, embeddings } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });

export async function processDocument(documentId: string, fileBuffer: Buffer, fileType: string) {
    console.log(`Starting processing for document ${documentId}`);
    try {
        // 1. Parse content
        let textContent = '';
        if (fileType === 'application/pdf') {
            // pdf-parse v2 API: constructor accepts { data: Buffer }
            const { PDFParse } = eval("require('pdf-parse')");
            const parser = new PDFParse({ data: fileBuffer, verbosity: 0 });
            const result = await parser.getText();
            textContent = result.text;
            await parser.destroy();
        } else {
            textContent = fileBuffer.toString('utf-8');
        }

        // Update status to indexing
        await db.update(documents)
            .set({ status: 'indexing' })
            .where(eq(documents.id, documentId));

        // 2. Split text
        // Use langchain splitter or simple splitter
        const splitter = new RecursiveCharacterTextSplitter({
            chunkSize: 1000,
            chunkOverlap: 200,
        });

        const chunks = await splitter.createDocuments([textContent]);

        console.log(`Generated ${chunks.length} chunks for document ${documentId}`);

        // 3. Generate embeddings and save
        // 3. Generate embeddings and save
        const documentsData: any[] = [];

        // Process in batches of 5 to avoid rate limits
        const BATCH_SIZE = 5;

        for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
            const batch = chunks.slice(i, i + BATCH_SIZE);

            const batchPromises = batch.map(async (chunk: any, batchIndex: number) => {
                const content = chunk.pageContent;
                // Generate embedding
                const result = await model.embedContent(content);
                const vector = result.embedding.values;

                return {
                    documentId: documentId,
                    content: content,
                    metadata: {
                        page: chunk.metadata.loc?.pageNumber,
                        chunkIndex: i + batchIndex
                    },
                    vector: vector
                };
            });

            const results = await Promise.all(batchPromises);
            documentsData.push(...results);

            // Small delay to be nice to API
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        // Insert into DB
        // Drizzle insert many
        await db.insert(embeddings).values(documentsData);

        // 4. Update status to completed
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
