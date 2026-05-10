import Stripe from 'stripe';
import { logger } from './logger';

/**
 * STRIPE INITIALIZATION
 * 
 * Safety Rules:
 * 1. Test Mode ONLY (Keys starting with sk_test_).
 * 2. Validate environment variables.
 * 3. Centralized error handling.
 */

if (!process.env.STRIPE_SECRET_KEY) {
    logger.error("STRIPE_SECRET_KEY is missing! App will fail to process payments.", 'STRIPE');
}

// Safety Check: Prevent Live Keys in Development
const isTestKey = process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_');
if (process.env.NODE_ENV === 'development' && !isTestKey && process.env.STRIPE_SECRET_KEY) {
    logger.warn("CRITICAL: You are using a LIVE Stripe key in development. Please use test keys (sk_test_...).", 'STRIPE');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2025-01-27' as any, // Use latest stable
    typescript: true,
});

/**
 * Plan Configuration
 * These IDs come from your Stripe Dashboard (Test Mode)
 */
export const PLANS = {
    PRO: {
        priceId: process.env.STRIPE_PRO_PRICE_ID || '',
        name: 'Cortex Pro',
        amount: 1900, // $19.00
        currency: 'usd',
    }
};
