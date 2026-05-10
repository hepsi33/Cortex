/**
 * FEATURE FLAGS
 * 
 * Why: This allows us to turn off specific systems instantly if they break.
 * Usage: if (FEATURE_FLAGS.ENABLE_STRIPE) { ... }
 */

export const FEATURE_FLAGS = {
    // Set to false to completely disable the Stripe payment flow (useful for local debugging)
    ENABLE_STRIPE: process.env.NEXT_PUBLIC_ENABLE_STRIPE === 'true',
    
    // Set to false to remove all "Locked" overlays and give everyone access
    ENABLE_PREMIUM_GATING: true,

    // Enable detailed debug logs for the subscription flow
    DEBUG_SUBSCRIPTIONS: true,
};
