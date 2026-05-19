type Bucket = {
  count: number;
  resetAtMs: number;
};

const buckets = new Map<string, Bucket>();

export class RateLimitExceeded extends Error {
  status = 429 as const;
  retryAfterSec: number;
  constructor(retryAfterSec: number) {
    super("Too Many Requests");
    this.retryAfterSec = retryAfterSec;
  }
}

export function rateLimitOrThrow(opts: {
  key: string;
  windowMs: number;
  max: number;
}) {
  const now = Date.now();
  const existing = buckets.get(opts.key);
  if (!existing || existing.resetAtMs <= now) {
    buckets.set(opts.key, { count: 1, resetAtMs: now + opts.windowMs });
    return;
  }
  existing.count += 1;
  if (existing.count > opts.max) {
    const retryAfterSec = Math.max(
      1,
      Math.ceil((existing.resetAtMs - now) / 1000),
    );
    throw new RateLimitExceeded(retryAfterSec);
  }
}
