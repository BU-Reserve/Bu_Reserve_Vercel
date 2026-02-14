"use server";

import { createAdminClient } from "@/utils/supabase/admin";
import { getSession } from "@/lib/session";
import { isAdminVerified } from "@/lib/admin-verified";
import { setAdminVerifiedCookie } from "@/lib/admin-verified";
import { revalidatePath } from "next/cache";

function isAdmin(email: string): boolean {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  return !!adminEmail && email.toLowerCase() === adminEmail;
}

export async function verifyAdminPassword(formData: FormData) {
  const session = await getSession();
  if (!session || !isAdmin(session.email)) {
    return { error: "Not authorized." };
  }
  const password = formData.get("password");
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || typeof password !== "string" || password !== expected) {
    return { error: "Wrong password." };
  }
  await setAdminVerifiedCookie(session.email);
  revalidatePath("/admin");
  return { success: true };
}

export async function addAllowedEmail(formData: FormData) {
  const session = await getSession();
  if (!session || !isAdmin(session.email) || !(await isAdminVerified(session.email))) {
    return { error: "Not authorized." };
  }

  const raw = formData.get("email");
  const email = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (!email) return { error: "Enter an email." };

  const supabase = createAdminClient();
  const { error } = await supabase.from("allowed_emails").insert({ email });

  if (error) {
    if (error.code === "23505") return { error: "That email is already allowed." };
    return { error: error.message };
  }
  revalidatePath("/admin");
  return { success: true };
}

export async function removeAllowedEmail(emailToRemove: string) {
  const session = await getSession();
  if (!session || !isAdmin(session.email) || !(await isAdminVerified(session.email))) {
    return { error: "Not authorized." };
  }

  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (emailToRemove.toLowerCase() === adminEmail) {
    return { error: "You cannot remove the admin email from the list." };
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("allowed_emails").delete().eq("email", emailToRemove);

  if (error) return { error: error.message };
  revalidatePath("/admin");
  return { success: true };
}
