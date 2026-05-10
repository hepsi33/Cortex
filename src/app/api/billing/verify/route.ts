import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { profiles } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import crypto from 'crypto';

/**
 * POST /api/billing/verify
 * 
 * After the user pays in the Razorpay popup, the frontend sends
 * the payment details here for SERVER-SIDE verification.
 * 
 * This is critical for security — never trust the client alone.
 */
export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json();

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return NextResponse.json({ error: 'Missing payment details' }, { status: 400 });
        }

        // Step 1: Verify the signature
        // Razorpay signs: order_id + "|" + payment_id using your secret key
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest('hex');

        if (expectedSignature !== razorpay_signature) {
            logger.error('Payment signature verification FAILED', 'RAZORPAY');
            return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 });
        }

        // Step 2: Signature is valid — upgrade the user
        // Set expiry to 30 days from now (monthly plan)
        const periodEnd = new Date();
        periodEnd.setDate(periodEnd.getDate() + 30);

        await db.update(profiles).set({
            role: 'pro',
            stripeSubscriptionId: razorpay_payment_id, // reusing column for Razorpay payment ID
            stripePriceId: razorpay_order_id,           // reusing column for Razorpay order ID
            stripeCurrentPeriodEnd: periodEnd,
        }).where(eq(profiles.id, session.user.id));

        logger.info(`User ${session.user.id} upgraded to PRO via Razorpay (payment: ${razorpay_payment_id})`, 'RAZORPAY');

        return NextResponse.json({ success: true });
    } catch (error: any) {
        logger.error('Verification error: ' + error.message, 'RAZORPAY', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
