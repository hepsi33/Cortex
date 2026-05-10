import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { workspaces, profiles } from '@/drizzle/schema';
import { eq, desc, count } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { getUserSubscriptionPlan } from '@/lib/subscription';
import { logger } from '@/lib/logger';

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

        const userWorkspaces = await db.query.workspaces.findMany({
            where: eq(workspaces.userId, userId as any),
            orderBy: [desc(workspaces.createdAt)],
        });

        return NextResponse.json(userWorkspaces);
    } catch (error) {
        logger.error('Get workspaces error:', 'DATABASE', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = session.user.id;
        
        // 1. Fetch the user's subscription plan and limits
        const subscription = await getUserSubscriptionPlan();
        if (!subscription) {
            return NextResponse.json({ error: 'Subscription data not found' }, { status: 500 });
        }

        // 2. Count existing workspaces for this user
        const existingWorkspaces = await db
            .select({ value: count() })
            .from(workspaces)
            .where(eq(workspaces.userId, userId as any));
        
        const workspaceCount = existingWorkspaces[0]?.value || 0;

        // 3. ENFORCE LIMITS
        // If they are not premium and reached the limit (3), block them.
        if (!subscription.isPremium && workspaceCount >= subscription.limits.MAX_REPOS) {
            logger.warn(`User ${session.user.email} reached workspace limit (${workspaceCount})`, 'PREMIUM');
            return NextResponse.json({ 
                error: 'Limit Reached', 
                details: `Free tier is limited to ${subscription.limits.MAX_REPOS} repositories. Please upgrade to Pro for unlimited access.`
            }, { status: 403 });
        }

        const { name } = await req.json();

        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            return NextResponse.json({ error: 'Workspace name is required' }, { status: 400 });
        }

        const [newWorkspace] = await db.insert(workspaces).values({
            userId: userId as any,
            name: name.trim(),
        }).returning();

        logger.info(`Workspace created: ${name} (Count: ${workspaceCount + 1})`, 'USAGE');

        return NextResponse.json(newWorkspace, { status: 201 });
    } catch (error: any) {
        logger.error('Create workspace error:', 'DATABASE', error);
        return NextResponse.json({ 
            error: 'Internal Server Error', 
            details: error.message
        }, { status: 500 });
    }
}
