import { type NextRequest, NextResponse } from "next/server";

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type RateLimitStore = Map<string, RateLimitEntry>;

const globalForRateLimit = globalThis as typeof globalThis & {
  __khcRateLimitStore?: RateLimitStore;
};

const store = globalForRateLimit.__khcRateLimitStore ?? new Map<string, RateLimitEntry>();
globalForRateLimit.__khcRateLimitStore = store;

export type RateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
};

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfter: number;
};

export function getClientIdentifier(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  const cfConnectingIp = request.headers.get("cf-connecting-ip")?.trim();

  return forwardedFor || realIp || cfConnectingIp || "anonymous";
}

export function rateLimit({ key, limit, windowMs }: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const existing = store.get(key);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs;
    store.set(key, { count: 1, resetAt });
    pruneExpiredEntries(now);

    return {
      allowed: true,
      limit,
      remaining: Math.max(limit - 1, 0),
      resetAt,
      retryAfter: Math.ceil(windowMs / 1000),
    };
  }

  existing.count += 1;

  const retryAfter = Math.max(Math.ceil((existing.resetAt - now) / 1000), 1);
  const remaining = Math.max(limit - existing.count, 0);

  return {
    allowed: existing.count <= limit,
    limit,
    remaining,
    resetAt: existing.resetAt,
    retryAfter,
  };
}

export function rateLimitResponse(result: RateLimitResult): NextResponse {
  return new NextResponse("Too many requests. Please try again later.", {
    status: 429,
    headers: {
      "Retry-After": String(result.retryAfter),
      "X-RateLimit-Limit": String(result.limit),
      "X-RateLimit-Remaining": String(result.remaining),
      "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
    },
  });
}

export function addRateLimitHeaders(response: NextResponse, result: RateLimitResult): NextResponse {
  response.headers.set("X-RateLimit-Limit", String(result.limit));
  response.headers.set("X-RateLimit-Remaining", String(result.remaining));
  response.headers.set("X-RateLimit-Reset", String(Math.ceil(result.resetAt / 1000)));
  return response;
}

function pruneExpiredEntries(now: number) {
  if (store.size < 1000) return;

  for (const [key, entry] of store.entries()) {
    if (entry.resetAt <= now) {
      store.delete(key);
    }
  }
}
