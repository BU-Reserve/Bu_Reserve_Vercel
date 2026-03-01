import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies";

export const TRUSTED_DEVICE_COOKIE_NAME = "khc_trusted_device";
const SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET || "dev-secret-change-in-production"
);
const TRUSTED_DEVICE_MAX_AGE = 60 * 60 * 24 * 90;
const TRUSTED_DEVICE_COOKIE_OPTIONS: Partial<ResponseCookie> = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  maxAge: TRUSTED_DEVICE_MAX_AGE,
  path: "/",
};

export async function isTrustedDeviceForEmail(email: string): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(TRUSTED_DEVICE_COOKIE_NAME)?.value;
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, SECRET);
    const trustedEmail = payload.email as string;
    return typeof trustedEmail === "string" && trustedEmail.toLowerCase() === email.toLowerCase();
  } catch {
    return false;
  }
}

export async function createTrustedDeviceToken(email: string): Promise<string> {
  return new SignJWT({ email: email.toLowerCase() })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("90d")
    .sign(SECRET);
}

export async function markDeviceTrusted(email: string): Promise<void> {
  const cookieStore = await cookies();
  const token = await createTrustedDeviceToken(email);
  cookieStore.set(TRUSTED_DEVICE_COOKIE_NAME, token, TRUSTED_DEVICE_COOKIE_OPTIONS);
}

export function trustedDeviceCookieOptions(): Partial<ResponseCookie> {
  return TRUSTED_DEVICE_COOKIE_OPTIONS;
}
