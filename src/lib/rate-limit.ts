// Simple in-memory sliding-window rate limiter (see docs/SECURITY.md §6).
// Adequate for a single-instance MVP deployment. Swappable for a Redis-backed
// implementation behind the same `checkRateLimit` signature when scaling out.

type Bucket = { count: number; windowStart: number };

const buckets = new Map<string, Bucket>();

// Periodically forget stale buckets so this Map doesn't grow forever.
const MAX_BUCKETS = 50_000;

export type RateLimitResult = { allowed: boolean; remaining: number; retryAfterMs: number };

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || now - existing.windowStart >= windowMs) {
    buckets.set(key, { count: 1, windowStart: now });
    if (buckets.size > MAX_BUCKETS) {
      const oldestKey = buckets.keys().next().value;
      if (oldestKey) buckets.delete(oldestKey);
    }
    return { allowed: true, remaining: limit - 1, retryAfterMs: 0 };
  }

  if (existing.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: windowMs - (now - existing.windowStart),
    };
  }

  existing.count += 1;
  return { allowed: true, remaining: limit - existing.count, retryAfterMs: 0 };
}

/** Best-effort client IP extraction behind common proxies. */
export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0]!.trim();
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}

export const RATE_LIMITS = {
  createRequest: { limit: 5, windowMs: 10 * 60 * 1000 },
  clientAction: { limit: 30, windowMs: 60 * 1000 },
  auth: { limit: 10, windowMs: 60 * 1000 },
} as const;
