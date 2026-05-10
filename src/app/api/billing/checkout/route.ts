import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { razorpay, PLANS } from '@/lib/razorpay';
import { logger } from '@/lib/logger';
import { FEATURE_FLAGS } from '@/config/features';

/**
 * POST /api/billing/checkout
 * 
 * Creates a Razorpay Order.
 * Unlike Stripe (which redirects), Razorpay returns an order_id
 * that the frontend uses to open a payment popup.
 */
export async function POST() {
    try {
        if (!FEATURE_FLAGS.ENABLE_STRIPE) {
            return NextResponse.json({ error: 'Payments are disabled' }, { status: 400 });
        }

        const session = await auth();
        if (!session?.user?.id || !session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const order = await razorpay.orders.create({
            amount: PLANS.PRO.amount,
            currency: PLANS.PRO.currency,
            receipt: `cortex_pro_${session.user.id.slice(0, 8)}_${Date.now()}`,
            notes: {
                userId: session.user.id,
                userEmail: session.user.email,
                plan: 'PRO',
            },
        });

        logger.info(`Razorpay order created: ${order.id} for user ${session.user.id}`, 'RAZORPAY');

        return NextResponse.json({
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            keyId: process.env.RAZORPAY_KEY_ID,
        });
    } catch (error: any) {
        logger.error('Checkout error: ' + error.message, 'RAZORPAY', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
