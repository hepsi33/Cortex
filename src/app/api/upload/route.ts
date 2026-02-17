import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { documents } from '@/drizzle/schema';
import { auth } from '@/lib/auth';


export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session || !session.user || !session.user.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const formData = await req.formData();
        const file = formData.get('file') as File;
        const workspaceId = formData.get('workspaceId') as string | null;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        // Create document record immediately with pending/indexing status
        // We set content to empty string/null initially
        const [doc] = await db.insert(documents).values({
            userId: session.user.id,
            workspaceId: workspaceId || null,
            name: file.name,
            content: '', // Temporary empty content
            fileType: file.type,
            status: 'indexing', // Directly set to indexing as we start immediately
        }).returning();

        const { processUpload } = await import('@/lib/processor');

        // Fire and Forget: Offload parsing and embedding to background
        processUpload(doc.id, buffer, file.type, file.name).catch(err =>
            console.error('Background upload processing failed:', err)
        );

        return NextResponse.json({ id: doc.id, status: 'indexing' }, { status: 202 });

    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
