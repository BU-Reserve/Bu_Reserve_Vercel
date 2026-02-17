import { createAdminClient } from "@/utils/supabase/admin";

export type AllowedEmailRole = "member" | "admin" | "super_admin";

export function isAdminRole(role: AllowedEmailRole | null): role is "admin" | "super_admin" {
  return role === "admin" || role === "super_admin";
}

export async function getUserRole(email: string): Promise<AllowedEmailRole | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("allowed_emails")
    .select("role")
    .eq("email", normalized)
    .single();

  if (error || !data) return null;
  const role = data.role;
  if (role === "member" || role === "admin" || role === "super_admin") return role;
  return null;
}

export function canChangeRole(actorRole: AllowedEmailRole | null): boolean {
  return actorRole === "super_admin";
}

export function canRemoveEmail(actorRole: AllowedEmailRole | null, targetRole: AllowedEmailRole): boolean {
  if (actorRole === "super_admin") return true;
  if (actorRole === "admin") return targetRole === "member";
  return false;
}

export function canCreateRole(actorRole: AllowedEmailRole | null, roleToCreate: AllowedEmailRole): boolean {
  if (actorRole === "super_admin") return true;
  if (actorRole === "admin") return roleToCreate === "member";
  return false;
}
