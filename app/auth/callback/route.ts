import { NextResponse } from "next/server";

// No longer used (email-only sign-in, no magic link). Redirect to login.
export async function GET(request: Request) {
  const { origin } = new URL(request.url);
  return NextResponse.redirect(`${origin}/login`);
}
