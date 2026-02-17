import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { documents, embeddings } from '@/drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { auth } from '@/lib/auth';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const id = (await params).id;

        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check if document exists and belongs to user
        const doc = await db.query.documents.findFirst({
            where: and(eq(documents.id, id), eq(documents.userId, session.user.id)),
        });

        if (!doc) {
            return NextResponse.json({ error: 'Document not found' }, { status: 404 });
        }

        if (!doc.content) {
            return NextResponse.json(
                { error: 'Document content not available. Please delete and re-upload.' },
                { status: 400 }
            );
        }

        // Clear existing embeddings
        await db.delete(embeddings).where(eq(embeddings.documentId, id));

        // Update status to indexing
        await db.update(documents)
            .set({ status: 'indexing', chunkCount: 0 })
            .where(eq(documents.id, id));

        // Check if this is an image that needs re-analysis
        const isPendingImage = doc.content.includes('[IMAGE_PENDING_ANALYSIS]');

        if (isPendingImage) {
            // Extract base64 data and mimeType from the stored content
            const mimeMatch = doc.content.match(/mimeType:\s*(.+)/);
            const dataMatch = doc.content.match(/data:\s*(.+)/);
            const mimeType = mimeMatch?.[1]?.trim() || 'image/png';
            const base64Data = dataMatch?.[1]?.trim();

            if (base64Data) {
                console.log(`Re-analyzing image ${id} with Gemini Vision...`);
                const { parseImage } = await import('@/lib/file-parsers');
                const buffer = Buffer.from(base64Data, 'base64');

                try {
                    const newContent = await parseImage(buffer, mimeType);

                    // Check if vision analysis succeeded (not another fallback)
                    if (newContent.includes('[IMAGE_PENDING_ANALYSIS]')) {
                        // Still rate limited
                        await db.update(documents)
                            .set({ status: 'failed' })
                            .where(eq(documents.id, id));
                        return NextResponse.json(
                            { error: 'Gemini Vision is still rate-limited. Please try again later.' },
                            { status: 429 }
                        );
                    }

                    // Success! Update content with real analysis
                    await db.update(documents)
                        .set({ content: newContent })
                        .where(eq(documents.id, id));

                    // Now process the real content for embeddings
                    const { processDocument } = await import('@/lib/processor');
                    processDocument(doc.id, newContent).catch(err =>
                        console.error('Retry embedding failed:', err)
                    );

                    return NextResponse.json({ message: 'Image re-analyzed successfully' }, { status: 200 });
                } catch (parseErr) {
                    console.error('Image re-analysis failed:', parseErr);
                    await db.update(documents)
                        .set({ status: 'failed' })
                        .where(eq(documents.id, id));
                    return NextResponse.json(
                        { error: 'Image re-analysis failed. Try again later.' },
                        { status: 500 }
                    );
                }
            }
        }

        // Standard retry: Reprocess using stored text content
        const { processDocument } = await import('@/lib/processor');

        processDocument(doc.id, doc.content).catch(err =>
            console.error('Retry processing failed:', err)
        );

        return NextResponse.json({ message: 'Retry initiated' }, { status: 200 });

    } catch (error) {
        console.error('Retry error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
