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

        // Update status to pending
        await db.update(documents)
            .set({ status: 'pending', chunkCount: 0 })
            .where(eq(documents.id, id));

        // Reprocess using stored content
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
