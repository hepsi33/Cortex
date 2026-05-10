import Razorpay from 'razorpay';
import { logger } from './logger';

/**
 * RAZORPAY INITIALIZATION
 * 
 * How it differs from Stripe:
 * - Stripe redirects to an external page. Razorpay opens a popup on YOUR page.
 * - Stripe uses webhooks for everything. Razorpay uses both server verification + webhooks.
 * - Razorpay works in India without invite restrictions.
 */

if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    logger.warn('RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET is missing. Payments will not work.', 'RAZORPAY');
}

export const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || '',
    key_secret: process.env.RAZORPAY_KEY_SECRET || '',
});

/**
 * Plan Configuration
 */
export const PLANS = {
    PRO: {
        name: 'Cortex Pro',
        amount: 49900, // ₹499.00 in paise (Razorpay uses smallest currency unit)
        currency: 'INR',
        description: 'Cortex Pro — Unlimited AI Study Tools',
    }
};
