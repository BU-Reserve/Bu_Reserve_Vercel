"use server";

import { createAdminClient } from "@/utils/supabase/admin";
import { getSession } from "@/lib/session";
import { isAdminVerified } from "@/lib/admin-verified";
import { setAdminVerifiedCookie } from "@/lib/admin-verified";
import {
  canChangeRole,
  canCreateRole,
  canRemoveEmail,
  type AllowedEmailRole,
  getUserRole,
  isAdminRole,
} from "@/lib/access";
import { revalidatePath } from "next/cache";

function parseRole(value: unknown): AllowedEmailRole | null {
  if (value === "admin" || value === "super_admin") return value;
  if (value === "member") return value;
  return null;
}

async function getAuthorizedAdminRole(): Promise<{
  email: string;
  role: AllowedEmailRole;
} | null> {
  const session = await getSession();
  if (!session) return null;
  const role = await getUserRole(session.email);
  if (!isAdminRole(role)) return null;
  if (!(await isAdminVerified(session.email))) return null;
  return { email: session.email.toLowerCase(), role };
}

async function countSuperAdmins(): Promise<number> {
  const supabase = createAdminClient();
  const { count } = await supabase
    .from("allowed_emails")
    .select("*", { head: true, count: "exact" })
    .eq("role", "super_admin");
  return count ?? 0;
}

export async function verifyAdminPassword(formData: FormData) {
  const session = await getSession();
  if (!session) {
    return { error: "Not authorized." };
  }
  const role = await getUserRole(session.email);
  if (!isAdminRole(role)) {
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
  const actor = await getAuthorizedAdminRole();
  if (!actor) {
    return { error: "Not authorized." };
  }

  const raw = formData.get("email");
  const email = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (!email) return { error: "Enter an email." };
  const role = parseRole(formData.get("role")) ?? "member";
  if (!canCreateRole(actor.role, role)) {
    return { error: "Only super admins can assign admin roles." };
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("allowed_emails").insert({ email, role });

  if (error) {
    if (error.code === "23505") return { error: "That email is already allowed." };
    return { error: error.message };
  }
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function removeAllowedEmail(emailToRemove: string) {
  const actor = await getAuthorizedAdminRole();
  if (!actor) {
    return { error: "Not authorized." };
  }
  const targetEmail = emailToRemove.trim().toLowerCase();
  if (!targetEmail) return { error: "Invalid email." };

  const targetRole = await getUserRole(targetEmail);
  if (!targetRole) return { error: "Email not found." };
  if (!canRemoveEmail(actor.role, targetRole)) {
    return { error: "You cannot remove this user." };
  }
  if (targetRole === "super_admin" && (await countSuperAdmins()) <= 1) {
    return { error: "At least one super admin is required." };
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("allowed_emails").delete().eq("email", targetEmail);

  if (error) return { error: error.message };
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateAllowedEmailRole(emailToUpdate: string, roleRaw: string) {
  const actor = await getAuthorizedAdminRole();
  if (!actor) {
    return { error: "Not authorized." };
  }
  if (!canChangeRole(actor.role)) {
    return { error: "Only super admins can change roles." };
  }

  const targetEmail = emailToUpdate.trim().toLowerCase();
  if (!targetEmail) return { error: "Invalid email." };
  const nextRole = parseRole(roleRaw);
  if (!nextRole) return { error: "Invalid role." };
  const currentRole = await getUserRole(targetEmail);
  if (!currentRole) return { error: "Email not found." };

  if (currentRole === "super_admin" && nextRole !== "super_admin" && (await countSuperAdmins()) <= 1) {
    return { error: "At least one super admin is required." };
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("allowed_emails")
    .update({ role: nextRole })
    .eq("email", targetEmail);

  if (error) return { error: error.message };
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return { success: true };
}
