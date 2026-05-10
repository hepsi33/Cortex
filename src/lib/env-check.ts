import { logger } from '@/lib/logger';

/**
 * Validates that all required environment variables are present.
 * Call this once at app startup.
 */
export function validateEnvironment() {
    const required = [
        'DATABASE_URL',
        'AUTH_SECRET',
    ];

    const stripeRequired = [
        'STRIPE_SECRET_KEY',
        'STRIPE_PRO_PRICE_ID',
        'STRIPE_WEBHOOK_SECRET',
    ];

    const missing = required.filter(key => !process.env[key]);
    if (missing.length > 0) {
        logger.error(`CRITICAL: Missing required env vars: ${missing.join(', ')}`, 'GENERAL');
    }

    // Only warn about Stripe vars if Stripe is enabled
    if (process.env.NEXT_PUBLIC_ENABLE_STRIPE === 'true') {
        const missingStripe = stripeRequired.filter(key => !process.env[key]);
        if (missingStripe.length > 0) {
            logger.warn(`Stripe is enabled but missing: ${missingStripe.join(', ')}`, 'STRIPE');
        }

        // Safety: warn if using live keys in dev
        if (process.env.NODE_ENV === 'development' && process.env.STRIPE_SECRET_KEY?.startsWith('sk_live_')) {
            logger.error('🚨 LIVE Stripe key detected in development! Use sk_test_ keys only.', 'STRIPE');
        }
    }

    logger.info('Environment validation complete', 'GENERAL');
}
