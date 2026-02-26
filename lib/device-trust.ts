import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE_NAME = "khc_trusted_device";
const SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET || "dev-secret-change-in-production"
);

export async function isTrustedDeviceForEmail(email: string): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, SECRET);
    const trustedEmail = payload.email as string;
    return typeof trustedEmail === "string" && trustedEmail.toLowerCase() === email.toLowerCase();
  } catch {
    return false;
  }
}

export async function markDeviceTrusted(email: string): Promise<void> {
  const cookieStore = await cookies();
  const token = await new SignJWT({ email: email.toLowerCase() })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("90d")
    .sign(SECRET);
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 90,
    path: "/",
  });
}
