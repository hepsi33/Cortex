import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { documents, profiles } from '@/drizzle/schema';
import { eq, desc, and } from 'drizzle-orm';
import { auth } from '@/lib/auth';

const isValidUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = session.user.id;
        if (!isValidUuid(userId)) {
            return NextResponse.json({ 
                error: 'Invalid Session', 
                details: 'Please log out and log in again as guest.' 
            }, { status: 400 });
        }

        // Ensure user exists in DB (for guests)
        const userExists = await db.query.profiles.findFirst({
            where: eq(profiles.id, userId as any)
        });

        if (!userExists) {
            await db.insert(profiles).values({
                id: userId as any,
                name: session.user.name || "Guest",
                email: session.user.email || `${userId}@guest.cortex`,
                password: "guest_no_password",
                role: "user",
                status: "approved"
            }).onConflictDoNothing();
        }

        const { searchParams } = new URL(req.url);
        const workspaceId = searchParams.get('workspaceId');

        const docs = await db.query.documents.findMany({
            where: and(
                eq(documents.userId, userId as any),
                workspaceId && workspaceId !== 'null' && isValidUuid(workspaceId) 
                    ? eq(documents.workspaceId, workspaceId) 
                    : eq(documents.workspaceId, null as any) // Only show non-workspace docs if no workspace provided
            ),
            orderBy: [desc(documents.createdAt)],
        });

        return NextResponse.json(docs);

    } catch (error: any) {
        console.error('Get documents error:', error);
        return NextResponse.json({ 
            error: 'Internal Server Error',
            details: error.message 
        }, { status: 500 });
    }
}
