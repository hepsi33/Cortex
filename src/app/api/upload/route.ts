import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { documents } from '@/drizzle/schema';
import { addToQueue } from '@/lib/queue';
import { auth } from '@/lib/auth'; // Assuming auth is exported from here
import { nanoid } from 'nanoid';

export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session || !session.user || !session.user.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        // Basic validation
        if (file.type !== 'application/pdf' && file.type !== 'text/plain') {
            return NextResponse.json({ error: 'Only PDF and TXT files are supported' }, { status: 400 });
        }

        // Create document record
        const [doc] = await db.insert(documents).values({
            userId: session.user.id,
            name: file.name,
            status: 'pending',
        }).returning();

        // Trigger background processing
        // We can't pass the File object directly to background queue if strictly separated, 
        // but for this simple app, we might need to parse it here or save it temporarily.
        // 
        // Since we are serverless, we should process it *now* but return early if possible?
        // OR better: Since we need the file content, we have to parse it here or upload to blob storage.
        // 
        // Let's stick to the plan: "Upload file -> Create document -> Trigger background".
        // But for the background worker to read it, it needs access. 
        // 
        // Option A: Save to /tmp (unreliable on Vercel).
        // Option B: Parse content immediately, then offload embedding generation.
        // 
        // Let's do Option B: Parse content here. It's fast enough.

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // We will initiate the processing but not await it.
        // However, we need to pass the *content* or *buffer* to the processor.
        // Since our queue is in-memory for this simple implementation, we can pass it.

        // Actually, queue.ts `addToQueue` function should probably take the buffer or text content.
        // But wait, `addToQueue` in `lib/queue.ts` was just a stub.
        // 
        // Let's modify the queue to accept the file buffer/content.
        // 
        // For now, let's just implement the route and assume we have a `processDocument` function.

        // We'll call `processDocument` without awaiting, or use `waitUntil` (Next.js 15+ has unstable_after or we can just not await).

        // Let's import the processor (we'll create it next).
        const { processDocument } = await import('@/lib/processor');

        // Fire and forget (with error logging)
        processDocument(doc.id, buffer, file.type).catch(err => console.error('Background processing failed:', err));

        return NextResponse.json({ id: doc.id, status: 'pending' }, { status: 202 });

    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
