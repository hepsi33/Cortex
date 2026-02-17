import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { workspaces } from '@/drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { auth } from '@/lib/auth';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const { name } = await req.json();

        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            return NextResponse.json({ error: 'Workspace name is required' }, { status: 400 });
        }

        const [updatedWorkspace] = await db.update(workspaces)
            .set({ name: name.trim() })
            .where(and(eq(workspaces.id, id), eq(workspaces.userId, session.user.id)))
            .returning();

        if (!updatedWorkspace) {
            return NextResponse.json({ error: 'Workspace not found or unauthorized' }, { status: 404 });
        }

        return NextResponse.json(updatedWorkspace);
    } catch (error) {
        console.error('Update workspace error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;

        // Verify ownership before delete
        const workspace = await db.query.workspaces.findFirst({
            where: and(eq(workspaces.id, id), eq(workspaces.userId, session.user.id)),
        });

        if (!workspace) {
            return NextResponse.json({ error: 'Workspace not found or unauthorized' }, { status: 404 });
        }

        await db.delete(workspaces).where(eq(workspaces.id, id));

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete workspace error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
