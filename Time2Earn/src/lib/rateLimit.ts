/**
 * rateLimit.ts
 * Rate limiting utility for sensitive operations in Time2Earn.
 * Protects against excessive requests, rapid-fire abuse, and brute-force attacks.
 */

interface RateBucket {
  timestamps: number[];
}

const buckets = new Map<string, RateBucket>();

export interface RateLimitOptions {
  maxRequests: number;
  windowMs: number;
}

export const RATE_LIMITS = {
  // Max 3 session requests per minute per player
  SESSION_SUBMIT: { maxRequests: 3, windowMs: 60 * 1000 },
  // Max 3 redemption requests per minute per player
  REDEMPTION_SUBMIT: { maxRequests: 3, windowMs: 60 * 1000 },
  // Max 3 debt payment requests per minute per player
  DEBT_PAYMENT_SUBMIT: { maxRequests: 3, windowMs: 60 * 1000 },
  // Max 5 login attempts per minute per username/IP
  AUTH_LOGIN: { maxRequests: 5, windowMs: 60 * 1000 },
  // Max 5 staff password resets per minute per admin
  STAFF_RESET: { maxRequests: 5, windowMs: 60 * 1000 },
  // Max 6 arcade session submissions per minute per player
  ARCADE_SUBMIT: { maxRequests: 6, windowMs: 60 * 1000 },
};

/**
 * Checks if a request is permitted under rate limit policy.
 * Returns true if allowed, false if rate limit exceeded.
 */
export function checkRateLimit(key: string, options: RateLimitOptions, now = Date.now()): boolean {
  const cutoff = now - options.windowMs;
  let bucket = buckets.get(key);

  if (!bucket) {
    bucket = { timestamps: [] };
    buckets.set(key, bucket);
  }

  // Filter timestamps within current window
  bucket.timestamps = bucket.timestamps.filter((ts) => ts > cutoff);

  if (bucket.timestamps.length >= options.maxRequests) {
    return false;
  }

  bucket.timestamps.push(now);
  return true;
}

/**
 * Asserts rate limit or throws an error with remaining cooldown in seconds.
 */
export function assertRateLimit(key: string, options: RateLimitOptions, actionName = 'request'): void {
  const now = Date.now();
  const allowed = checkRateLimit(key, options, now);
  if (!allowed) {
    const bucket = buckets.get(key);
    const oldest = bucket?.timestamps[0] ?? now;
    const retryAfterSec = Math.ceil((oldest + options.windowMs - now) / 1000);
    throw new Error(`Rate limit exceeded for ${actionName}. Please wait ${retryAfterSec}s before retrying.`);
  }
}

/**
 * Resets rate limit for a given key (used in tests or successful auth resets)
 */
export function resetRateLimit(key?: string): void {
  if (key) {
    buckets.delete(key);
  } else {
    buckets.clear();
  }
}
