import { createAdminClient } from "@/utils/supabase/admin";
import { getSession } from "@/lib/session";
import { isAdminVerified } from "@/lib/admin-verified";
import { getUserRole, isAdminRole } from "@/lib/access";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AdminClient } from "./admin-client";
import { AdminPasswordForm } from "./admin-password-form";

export default async function AdminPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const role = await getUserRole(session.email);
  if (!isAdminRole(role)) redirect("/dashboard");

  const verified = await isAdminVerified(session.email);
  if (!verified) {
    return (
      <main className="min-h-screen bg-neutral-50">
        <header className="border-b border-neutral-200 bg-white">
          <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-4">
            <h1 className="text-lg font-semibold text-neutral-900">Admin</h1>
            <Link href="/dashboard" className="text-sm text-red-600 hover:underline">
              Back to dashboard
            </Link>
          </div>
        </header>
        <div className="mx-auto max-w-2xl px-4 py-8">
          <AdminPasswordForm />
        </div>
      </main>
    );
  }

  const supabase = createAdminClient();
  const { data: allowedEmails } = await supabase
    .from("allowed_emails")
    .select("email, role")
    .order("email");

  return (
    <main className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-4">
          <h1 className="text-lg font-semibold text-neutral-900">Admin – Allowed emails</h1>
          <Link href="/dashboard" className="text-sm text-red-600 hover:underline">
            Back to dashboard
          </Link>
        </div>
      </header>
      <div className="mx-auto max-w-2xl px-4 py-8">
        <AdminClient
          entries={(allowedEmails ?? []).map((r) => ({
            email: r.email,
            role: r.role ?? "member",
          }))}
          currentUserEmail={session.email}
          currentUserRole={role}
        />
      </div>
    </main>
  );
}
