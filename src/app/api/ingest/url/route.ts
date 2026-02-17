
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { documents } from '@/drizzle/schema';
import { auth } from '@/lib/auth';
import { scrapeUrl } from '@/lib/firecrawl';

export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session || !session.user || !session.user.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { url, workspaceId } = await req.json();

        if (!url) {
            return NextResponse.json({ error: 'URL is required' }, { status: 400 });
        }

        // Basic URL validation
        try {
            new URL(url);
        } catch {
            return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
        }

        // Scrape content
        const content = await scrapeUrl(url);

        if (!content || content.length === 0) {
            return NextResponse.json({ error: 'Failed to retrieve content from URL' }, { status: 400 });
        }

        // Create document
        const [doc] = await db.insert(documents).values({
            userId: session.user.id,
            workspaceId: workspaceId || null,
            name: url,
            content: content,
            fileType: 'url',
            status: 'pending',
        }).returning();

        const { processDocument } = await import('@/lib/processor');

        // Fire and forget processing
        processDocument(doc.id, content).catch(err => console.error('Background processing failed:', err));

        return NextResponse.json({ id: doc.id, status: 'pending' }, { status: 202 });

    } catch (error) {
        console.error('URL ingest error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
