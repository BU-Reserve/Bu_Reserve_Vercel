import { jwtVerify } from "jose";
import { NextResponse, type NextRequest } from "next/server";
import {
  addRateLimitHeaders,
  getClientIdentifier,
  rateLimit,
  rateLimitResponse,
} from "@/utils/rate-limit";
import { getSessionSecret } from "@/lib/env";

const COOKIE_NAME = "khc_session";
const RATE_LIMIT_WINDOW_MS = getPositiveNumber(
  process.env.RATE_LIMIT_WINDOW_SECONDS,
  15 * 60
) * 1000;
const RATE_LIMIT_MAX_REQUESTS = getPositiveNumber(process.env.RATE_LIMIT_MAX_REQUESTS, 100);
const AUTH_RATE_LIMIT_WINDOW_MS = getPositiveNumber(
  process.env.AUTH_RATE_LIMIT_WINDOW_SECONDS,
  15 * 60
) * 1000;
const AUTH_RATE_LIMIT_MAX_ATTEMPTS = getPositiveNumber(
  process.env.AUTH_RATE_LIMIT_MAX_ATTEMPTS,
  5
);
const AUTH_RATE_LIMIT_PATHS = new Set(["/login", "/logout"]);
const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function getPositiveNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export async function updateSession(request: NextRequest) {
  const clientIdentifier = getClientIdentifier(request);
  const pathname = request.nextUrl.pathname;
  const globalLimit = rateLimit({
    key: `global:${clientIdentifier}`,
    limit: RATE_LIMIT_MAX_REQUESTS,
    windowMs: RATE_LIMIT_WINDOW_MS,
  });

  if (!globalLimit.allowed) {
    return rateLimitResponse(globalLimit);
  }

  if (AUTH_RATE_LIMIT_PATHS.has(pathname) && MUTATING_METHODS.has(request.method)) {
    const authLimit = rateLimit({
      key: `auth:${clientIdentifier}`,
      limit: AUTH_RATE_LIMIT_MAX_ATTEMPTS,
      windowMs: AUTH_RATE_LIMIT_WINDOW_MS,
    });

    if (!authLimit.allowed) {
      return rateLimitResponse(authLimit);
    }
  }

  const response = NextResponse.next({
    request: { headers: request.headers },
  });

  // Protect dashboard and admin: require session
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/admin")) {
    const token = request.cookies.get(COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    try {
      await jwtVerify(token, getSessionSecret());
    } catch {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return addRateLimitHeaders(response, globalLimit);
}
