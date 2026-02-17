import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { documents } from '@/drizzle/schema';
import { eq, desc, and } from 'drizzle-orm';
import { auth } from '@/lib/auth';

export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const workspaceId = searchParams.get('workspaceId');

        const docs = await db.query.documents.findMany({
            where: and(
                eq(documents.userId, session.user.id),
                workspaceId ? eq(documents.workspaceId, workspaceId) : undefined
            ),
            orderBy: [desc(documents.createdAt)],
        });

        return NextResponse.json(docs);

    } catch (error) {
        console.error('Get documents error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
