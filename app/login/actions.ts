"use server";

import { createAdminClient } from "@/utils/supabase/admin";
import { setSession } from "@/lib/session";
import { isTrustedDeviceForEmail } from "@/lib/device-trust";
import { createClient } from "@/utils/supabase/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

async function getBaseUrl(): Promise<string> {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return host ? `${proto}://${host}` : "http://localhost:3000";
}

export async function signIn(formData: FormData) {
  const raw = formData.get("email");
  const email = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (!email) {
    return { error: "Please enter your email." };
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("allowed_emails")
    .select("email")
    .eq("email", email)
    .single();

  if (!data) {
    return { error: "This email is not allowed to access the booking system." };
  }

  const isTrusted = await isTrustedDeviceForEmail(data.email);
  if (isTrusted) {
    await setSession(data.email);
    redirect("/dashboard");
  }

  const authClient = await createClient();
  const redirectTo = `${await getBaseUrl()}/auth/callback`;
  const { error } = await authClient.auth.signInWithOtp({
    email: data.email,
    options: {
      emailRedirectTo: redirectTo,
      // Allow first login to create auth user after allowlist check passes.
      shouldCreateUser: true,
    },
  });

  if (error) {
    return { error: "Unable to send confirmation email right now. Please try again." };
  }
  return { success: "New device detected. Check your email for the confirmation link." };
}
