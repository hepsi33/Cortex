import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { stripe } from '@/lib/stripe';
import { db } from '@/lib/db';
import { profiles } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import { FEATURE_FLAGS } from '@/config/features';

/**
 * POST /api/billing/portal
 * 
 * Creates a Stripe Customer Portal session.
 * This lets users manage their subscription without you building UI for it.
 */
export async function POST() {
    try {
        if (!FEATURE_FLAGS.ENABLE_STRIPE) {
            return NextResponse.json({ error: 'Stripe is disabled' }, { status: 400 });
        }

        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = await db.query.profiles.findFirst({
            where: eq(profiles.id, session.user.id),
        });

        if (!user?.stripeCustomerId) {
            logger.warn(`No Stripe customer for user ${session.user.id}`, 'STRIPE');
            return NextResponse.json({ error: 'No billing account found. Please subscribe first.' }, { status: 400 });
        }

        const portalSession = await stripe.billingPortal.sessions.create({
            customer: user.stripeCustomerId,
            return_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard`,
        });

        logger.info(`Portal session created for ${user.email}`, 'STRIPE');
        return NextResponse.json({ url: portalSession.url });
    } catch (error: any) {
        logger.error('Portal error: ' + error.message, 'STRIPE', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
