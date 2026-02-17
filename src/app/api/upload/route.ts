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

        // Basic validation
        if (file.type !== 'application/pdf' && file.type !== 'text/plain') {
            return NextResponse.json({ error: 'Only PDF and TXT files are supported' }, { status: 400 });
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Parse content upfront so we can store it for retry
        let textContent = '';
        if (file.type === 'application/pdf') {
            const { PDFParse } = eval("require('pdf-parse')");
            const parser = new PDFParse({ data: buffer, verbosity: 0 });
            const result = await parser.getText();
            textContent = result.text;
            await parser.destroy();
        } else {
            textContent = buffer.toString('utf-8');
        }

        // Create document record with content stored
        const [doc] = await db.insert(documents).values({
            userId: session.user.id,
            workspaceId: workspaceId || null,
            name: file.name,
            content: textContent,
            fileType: file.type,
            status: 'pending',
        }).returning();

        const { processDocument } = await import('@/lib/processor');

        // Fire and forget — pass pre-parsed text directly
        processDocument(doc.id, textContent).catch(err => console.error('Background processing failed:', err));

        return NextResponse.json({ id: doc.id, status: 'pending' }, { status: 202 });

    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
