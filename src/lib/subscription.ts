import { auth } from "./auth";
import { db } from "./db";
import { profiles } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { logger } from "./logger";
import { FEATURE_FLAGS } from "@/config/features";

/**
 * PLAN_LIMITS defines the rules for each tier.
 * Centralizing these here makes it easy to change limits later in one place.
 */
export const PLAN_LIMITS = {
    FREE: {
        MAX_REPOS: 3,
        MAX_DAILY_AI_GENERATIONS: 10,
        MAX_FOCUS_SESSION_SECONDS: 3600, // 1 hour
    },
    PRO: {
        MAX_REPOS: 100, // Effectively unlimited
        MAX_DAILY_AI_GENERATIONS: 1000,
        MAX_FOCUS_SESSION_SECONDS: 28800, // 8 hours
    }
};

/**
 * getUserSubscriptionPlan
 * The single source of truth for a user's status.
 */
export async function getUserSubscriptionPlan() {
    try {
        const session = await auth();

        if (!session || !session.user) {
            return null;
        }

        const user = await db.query.profiles.findFirst({
            where: eq(profiles.id, session.user.id),
        });

        if (!user) {
            logger.warn(`User profile not found for ID: ${session.user.id}`, 'PREMIUM');
            return null;
        }

        /**
         * FEATURE GATING TOGGLE
         * If the flag is OFF, everyone gets PRO limits automatically.
         */
        if (!FEATURE_FLAGS.ENABLE_PREMIUM_GATING) {
            return { ...user, isPremium: true, plan: 'PRO', limits: PLAN_LIMITS.PRO };
        }

        /**
         * DEMO/ADMIN BYPASS LOGIC
         * We check the "Role" first. Admins and Demo accounts bypass Stripe entirely.
         */
        const isBypass = user.role === 'admin' || user.role === 'demo_admin';
        
        // Stripe validity check (Is the expiration date in the future?)
        const isSubscribed = 
            !!user.stripePriceId && 
            !!user.stripeCurrentPeriodEnd && 
            user.stripeCurrentPeriodEnd.getTime() + 86_400_000 > Date.now();

        const isPremium = isBypass || isSubscribed || user.role === 'pro';

        if (FEATURE_FLAGS.DEBUG_SUBSCRIPTIONS) {
            logger.info(`User ${user.email} status: ${isPremium ? 'PREMIUM' : 'FREE'} (Bypass: ${isBypass})`, 'PREMIUM');
        }

        return {
            ...user,
            isPremium,
            plan: isPremium ? 'PRO' : 'FREE',
            limits: isPremium ? PLAN_LIMITS.PRO : PLAN_LIMITS.FREE
        };
    } catch (error) {
        logger.error("Failed to fetch subscription plan", 'PREMIUM', error);
        return null;
    }
}

/**
 * Helper to check if a user is an admin
 */
export async function isAdmin() {
    const session = await auth();
    const role = session?.user?.role;
    return role === 'admin' || role === 'demo_admin';
}
