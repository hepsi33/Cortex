import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { profiles } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import crypto from 'crypto';

/**
 * POST /api/billing/webhook
 * 
 * Handles Razorpay webhook events.
 * Set this URL in Razorpay Dashboard → Webhooks.
 * 
 * Events we handle:
 * - payment.captured → Payment confirmed (backup for verify route)
 * - subscription.cancelled → User cancelled
 */
export async function POST(req: NextRequest) {
    const body = await req.text();
    const signature = req.headers.get('x-razorpay-signature');
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!signature || !webhookSecret) {
        logger.error('Missing Razorpay webhook signature or secret', 'WEBHOOK');
        return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    // Verify webhook signature
    const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(body)
        .digest('hex');

    if (expectedSignature !== signature) {
        logger.error('Razorpay webhook signature verification failed', 'WEBHOOK');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const event = JSON.parse(body);
    logger.info(`Razorpay webhook received: ${event.event}`, 'WEBHOOK');

    try {
        switch (event.event) {
            case 'payment.captured': {
                const payment = event.payload.payment.entity;
                const userId = payment.notes?.userId;
                if (userId) {
                    const periodEnd = new Date();
                    periodEnd.setDate(periodEnd.getDate() + 30);

                    await db.update(profiles).set({
                        role: 'pro',
                        stripeSubscriptionId: payment.id,
                        stripeCurrentPeriodEnd: periodEnd,
                    }).where(eq(profiles.id, userId));
                    logger.info(`Webhook: User ${userId} upgraded to PRO`, 'WEBHOOK');
                }
                break;
            }
            case 'payment.failed': {
                const payment = event.payload.payment.entity;
                logger.warn(`Payment failed: ${payment.id} - ${payment.error_description}`, 'WEBHOOK');
                break;
            }
        }
    } catch (error: any) {
        logger.error('Webhook processing error: ' + error.message, 'WEBHOOK', error);
        return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
    }

    return NextResponse.json({ received: true });
}
