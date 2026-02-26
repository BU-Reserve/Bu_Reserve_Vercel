import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { setSession } from "@/lib/session";
import { markDeviceTrusted } from "@/lib/device-trust";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const authClient = await createClient();
  if (code) {
    const { error: exchangeError } = await authClient.auth.exchangeCodeForSession(code);
    if (exchangeError) {
      return NextResponse.redirect(`${url.origin}/login?error=auth_failed`);
    }
  } else {
    // Fallback for links that provide token_hash/type instead of code.
    const tokenHash = url.searchParams.get("token_hash");
    const type = url.searchParams.get("type");
    if (!tokenHash || !type) {
      return NextResponse.redirect(`${url.origin}/login?error=missing_code`);
    }
    const { error: verifyError } = await authClient.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as EmailOtpType,
    });
    if (verifyError) {
      return NextResponse.redirect(`${url.origin}/login?error=auth_failed`);
    }
  }

  const {
    data: { user },
  } = await authClient.auth.getUser();
  const email = user?.email?.toLowerCase();
  if (!email) {
    return NextResponse.redirect(`${url.origin}/login?error=missing_user`);
  }

  const admin = createAdminClient();
  const { data: allowed } = await admin
    .from("allowed_emails")
    .select("email")
    .eq("email", email)
    .single();
  if (!allowed) {
    return NextResponse.redirect(`${url.origin}/login?error=not_allowed`);
  }

  //await setSession(email);
  await markDeviceTrusted(email);
  return NextResponse.redirect(`${url.origin}/dashboard`);
}
