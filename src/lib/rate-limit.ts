// Minimal in-memory IP rate-limiter. Good enough for single-region Vercel
// Fluid Compute (one process per region serves bursts of the same IP
// consistently enough that this catches enumeration scrapers). For multi-
// region scale-out or coordinated abuse, swap for Upstash Redis later —
// the interface stays the same.

import type { NextRequest } from "next/server";

type Bucket = { count: number; resetAt: number };

const BUCKETS = new Map<string, Bucket>();

// Cap the map so a flood of unique IPs can't OOM the function. LRU-ish:
// when full, drop the oldest 25% by resetAt.
const MAX_KEYS = 10_000;
function prune() {
  if (BUCKETS.size < MAX_KEYS) return;
  const entries = [...BUCKETS.entries()].sort((a, b) => a[1].resetAt - b[1].resetAt);
  const toDrop = Math.floor(entries.length * 0.25);
  for (let i = 0; i < toDrop; i++) BUCKETS.delete(entries[i][0]);
}

export function getClientIp(req: NextRequest | Request): string {
  // Vercel sets these; fall back to a stable string so dev still rate-limits.
  const headerCandidates = [
    "x-forwarded-for",
    "x-real-ip",
    "cf-connecting-ip",
    "x-vercel-forwarded-for",
  ];
  for (const h of headerCandidates) {
    const v = req.headers.get(h);
    if (v) return v.split(",")[0]!.trim();
  }
  return "unknown";
}

/**
 * Returns { ok: true } if the request is under the cap, or
 * { ok: false, retryAfter } if rate-limited. Bucket is per (key, scope)
 * with a fixed window of `windowMs` and `max` requests per window.
 */
export function rateLimit(opts: {
  key: string;
  scope: string;
  max: number;
  windowMs: number;
}): { ok: true } | { ok: false; retryAfter: number } {
  const fullKey = `${opts.scope}:${opts.key}`;
  const now = Date.now();
  const bucket = BUCKETS.get(fullKey);

  if (!bucket || now >= bucket.resetAt) {
    BUCKETS.set(fullKey, { count: 1, resetAt: now + opts.windowMs });
    prune();
    return { ok: true };
  }

  if (bucket.count >= opts.max) {
    return { ok: false, retryAfter: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) };
  }

  bucket.count += 1;
  return { ok: true };
}
