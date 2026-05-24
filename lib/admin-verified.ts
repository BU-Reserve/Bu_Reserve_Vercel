import { SignJWT, jwtVerify } from "jose";
import { getSessionSecret } from "@/lib/env";
import { cookies } from "next/headers";

const COOKIE_NAME = "khc_admin_verified";
const MAX_AGE = 60 * 60; // 1 hour

export async function setAdminVerifiedCookie(email: string): Promise<void> {
  const cookieStore = await cookies();
  const token = await new SignJWT({ email: email.toLowerCase() })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("1h")
    .sign(getSessionSecret());
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: MAX_AGE,
    path: "/admin",
  });
}

export async function isAdminVerified(adminEmail: string): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, getSessionSecret());
    const email = payload.email as string;
    return typeof email === "string" && email.toLowerCase() === adminEmail.toLowerCase();
  } catch {
    return false;
  }
}
