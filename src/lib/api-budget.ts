/**
 * API Budget Manager
 * 
 * Tracks daily API usage per provider and proactively switches
 * to fallback providers before hitting hard limits.
 * 
 * Free-tier Gemini limits (as of 2025):
 *   - generateContent: 1,500 RPD (requests per day)
 *   - embedContent:    500 RPD
 *   - batchEmbedContents: 500 RPD (each call counts as 1)
 */

interface ProviderBudget {
    dailyCalls: number;
    dailyLimit: number;
    lastResetDate: string; // YYYY-MM-DD in UTC
    warningThreshold: number; // 0-1, e.g. 0.8 = warn at 80%
}

const budgets: Record<string, ProviderBudget> = {
    'gemini-embed': {
        dailyCalls: 0,
        dailyLimit: 450, // Conservative: real limit is 500
        lastResetDate: '',
        warningThreshold: 0.75,
    },
    'gemini-generate': {
        dailyCalls: 0,
        dailyLimit: 1400, // Conservative: real limit is 1500
        lastResetDate: '',
        warningThreshold: 0.8,
    },
    'groq-generate': {
        dailyCalls: 0,
        dailyLimit: 14400, // Groq free tier: 14,400 RPD
        lastResetDate: '',
        warningThreshold: 0.9,
    },
    'openrouter-embed': {
        dailyCalls: 0,
        dailyLimit: 10000, // OpenRouter is pay-per-use, generous limit
        lastResetDate: '',
        warningThreshold: 0.95,
    },
};

function getTodayUTC(): string {
    return new Date().toISOString().split('T')[0];
}

function maybeReset(provider: string) {
    const budget = budgets[provider];
    if (!budget) return;
    const today = getTodayUTC();
    if (budget.lastResetDate !== today) {
        budget.dailyCalls = 0;
        budget.lastResetDate = today;
        console.log(`[Budget] 🔄 Daily reset for ${provider}`);
    }
}

/**
 * Check if a provider has budget remaining.
 * Returns true if safe to use, false if should use fallback.
 */
export function hasBudget(provider: string): boolean {
    const budget = budgets[provider];
    if (!budget) return true; // Unknown provider = no limit tracked
    maybeReset(provider);
    return budget.dailyCalls < budget.dailyLimit;
}

/**
 * Check if we're approaching the limit (past warning threshold).
 * Use this to proactively switch BEFORE hitting the wall.
 */
export function isApproachingLimit(provider: string): boolean {
    const budget = budgets[provider];
    if (!budget) return false;
    maybeReset(provider);
    return budget.dailyCalls >= budget.dailyLimit * budget.warningThreshold;
}

/**
 * Record an API call against a provider's budget.
 */
export function recordCall(provider: string, count: number = 1) {
    const budget = budgets[provider];
    if (!budget) return;
    maybeReset(provider);
    budget.dailyCalls += count;

    const pct = Math.round((budget.dailyCalls / budget.dailyLimit) * 100);
    if (pct >= budget.warningThreshold * 100) {
        console.warn(`[Budget] ⚠️ ${provider}: ${budget.dailyCalls}/${budget.dailyLimit} (${pct}%) — approaching limit`);
    }
}

/**
 * Get remaining calls for a provider.
 */
export function remaining(provider: string): number {
    const budget = budgets[provider];
    if (!budget) return Infinity;
    maybeReset(provider);
    return Math.max(0, budget.dailyLimit - budget.dailyCalls);
}

/**
 * Mark a provider as exhausted (e.g. on hitting quota/429 errors)
 */
export function markProviderExhausted(provider: string) {
    const budget = budgets[provider];
    if (!budget) return;
    maybeReset(provider);
    budget.dailyCalls = budget.dailyLimit; // Set usage to max to prevent further calls today
    console.warn(`[Budget] 🚫 Provider ${provider} marked as EXHAUSTED for the rest of today.`);
}

/**
 * Get a summary of all budget statuses. Useful for logging.
 */
export function getBudgetSummary(): Record<string, { used: number; limit: number; pct: number }> {
    const summary: Record<string, { used: number; limit: number; pct: number }> = {};
    for (const [name, budget] of Object.entries(budgets)) {
        maybeReset(name);
        summary[name] = {
            used: budget.dailyCalls,
            limit: budget.dailyLimit,
            pct: Math.round((budget.dailyCalls / budget.dailyLimit) * 100),
        };
    }
    return summary;
}

// ── Rate limiter (in-memory, per-provider) ──────────────────────────

const rateLimitWindows: Record<string, number[]> = {};

/**
 * Simple sliding-window rate limiter.
 * Waits if we've exceeded maxCalls within windowMs.
 */
export async function rateLimit(provider: string, maxCalls: number, windowMs: number): Promise<void> {
    if (!rateLimitWindows[provider]) rateLimitWindows[provider] = [];

    const now = Date.now();
    const window = rateLimitWindows[provider];

    // Remove expired entries
    rateLimitWindows[provider] = window.filter(t => now - t < windowMs);

    if (rateLimitWindows[provider].length >= maxCalls) {
        const oldestInWindow = rateLimitWindows[provider][0];
        const waitMs = windowMs - (now - oldestInWindow) + 100; // +100ms buffer
        if (waitMs > 0) {
            console.log(`[RateLimit] ${provider}: waiting ${(waitMs / 1000).toFixed(1)}s`);
            await new Promise(resolve => setTimeout(resolve, waitMs));
        }
    }

    rateLimitWindows[provider].push(Date.now());
}
