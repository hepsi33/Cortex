import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { workspaces } from '@/drizzle/schema';
import { eq, desc } from 'drizzle-orm';
import { auth } from '@/lib/auth';

export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userWorkspaces = await db.query.workspaces.findMany({
            where: eq(workspaces.userId, session.user.id),
            orderBy: [desc(workspaces.createdAt)],
        });

        return NextResponse.json(userWorkspaces);
    } catch (error) {
        console.error('Get workspaces error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { name } = await req.json();

        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            return NextResponse.json({ error: 'Workspace name is required' }, { status: 400 });
        }

        const [newWorkspace] = await db.insert(workspaces).values({
            userId: session.user.id,
            name: name.trim(),
        }).returning();

        return NextResponse.json(newWorkspace, { status: 201 });
    } catch (error) {
        console.error('Create workspace error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
