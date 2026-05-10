import { NextResponse } from 'next/server';
import { getUserSubscriptionPlan } from '@/lib/subscription';
import { checkAIGenerationLimit } from '@/lib/usage';
import { logger } from '@/lib/logger';
import { auth } from '@/lib/auth';

/**
 * GET /api/billing/status
 * 
 * Returns the user's plan, limits, AND current usage.
 */
export async function GET() {
    try {
        const session = await auth();
        const subscription = await getUserSubscriptionPlan();
        
        if (!subscription || !session?.user?.id) {
            return NextResponse.json({ isPremium: false, plan: 'FREE', limits: null, usage: null }, { status: 200 });
        }

        // Get today's usage
        const usageCheck = await checkAIGenerationLimit(session.user.id);

        return NextResponse.json({
            isPremium: subscription.isPremium,
            plan: subscription.plan,
            limits: subscription.limits,
            usage: {
                aiGenerationsRemaining: usageCheck.remaining,
                aiGenerationsLimit: usageCheck.limit,
            }
        });
    } catch (error) {
        logger.error("Failed to fetch billing status", 'PREMIUM', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
