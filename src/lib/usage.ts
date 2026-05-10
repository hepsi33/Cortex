import { db } from '@/lib/db';
import { usage_tracking } from '@/drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import { getUserSubscriptionPlan } from './subscription';

/**
 * Gets today's date as a string key: "2026-05-10"
 */
function getTodayKey(): string {
    return new Date().toISOString().split('T')[0];
}

/**
 * Gets or creates today's usage record for a user.
 */
async function getOrCreateTodayUsage(userId: string) {
    const today = getTodayKey();

    const existing = await db.query.usage_tracking.findFirst({
        where: and(
            eq(usage_tracking.userId, userId),
            eq(usage_tracking.day, today)
        ),
    });

    if (existing) return existing;

    // Create a new record for today
    const [created] = await db.insert(usage_tracking).values({
        userId: userId,
        day: today,
        aiGenerations: 0,
        repoCount: 0,
    }).returning();

    return created;
}

/**
 * CHECK: Can this user perform an AI generation?
 * Returns { allowed: boolean, remaining: number, limit: number }
 */
export async function checkAIGenerationLimit(userId: string) {
    const plan = await getUserSubscriptionPlan();

    // Premium users and admins have high limits
    if (plan?.isPremium) {
        return { allowed: true, remaining: plan.limits.MAX_DAILY_AI_GENERATIONS, limit: plan.limits.MAX_DAILY_AI_GENERATIONS };
    }

    const usage = await getOrCreateTodayUsage(userId);
    const limit = plan?.limits.MAX_DAILY_AI_GENERATIONS || 10;
    const remaining = Math.max(0, limit - usage.aiGenerations);

    if (remaining <= 0) {
        logger.warn(`User ${userId} hit daily AI limit (${limit})`, 'USAGE');
        return { allowed: false, remaining: 0, limit };
    }

    return { allowed: true, remaining, limit };
}

/**
 * INCREMENT: Call this after a successful AI generation.
 */
export async function incrementAIGeneration(userId: string) {
    const today = getTodayKey();
    const usage = await getOrCreateTodayUsage(userId);

    await db.update(usage_tracking)
        .set({ aiGenerations: usage.aiGenerations + 1, updatedAt: new Date() })
        .where(and(
            eq(usage_tracking.userId, userId),
            eq(usage_tracking.day, today)
        ));

    logger.info(`AI generation count: ${usage.aiGenerations + 1} for user ${userId}`, 'USAGE');
}
