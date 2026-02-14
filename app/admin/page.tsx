import { createAdminClient } from "@/utils/supabase/admin";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AdminClient } from "./admin-client";

function isAdmin(email: string): boolean {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  return !!adminEmail && email.toLowerCase() === adminEmail;
}

export default async function AdminPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!isAdmin(session.email)) redirect("/dashboard");

  const supabase = createAdminClient();
  const { data: allowedEmails } = await supabase
    .from("allowed_emails")
    .select("email")
    .order("email");

  return (
    <main className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-4">
          <h1 className="text-lg font-semibold text-neutral-900">Admin – Allowed emails</h1>
          <Link
            href="/dashboard"
            className="text-sm text-red-600 hover:underline"
          >
            Back to dashboard
          </Link>
        </div>
      </header>
      <div className="mx-auto max-w-2xl px-4 py-8">
        <AdminClient
          emails={(allowedEmails ?? []).map((r) => r.email)}
          adminEmail={session.email}
        />
      </div>
    </main>
  );
}
