import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { documents } from '@/drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { auth } from '@/lib/auth';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const id = (await params).id;
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check ownership
        const doc = await db.query.documents.findFirst({
            where: and(eq(documents.id, id), eq(documents.userId, session.user.id)),
        });

        if (!doc) {
            return NextResponse.json({ error: 'Document not found' }, { status: 404 });
        }

        // Delete document (cascade should handle embeddings if configured in DB, but let's trust schema or manual delete if needed)
        // Schema said: `onDelete: 'cascade'` for embeddings -> documentId.
        // So deleting document is enough.

        await db.delete(documents).where(eq(documents.id, id));

        return NextResponse.json({ message: 'Document deleted' });

    } catch (error) {
        console.error('Delete document error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
