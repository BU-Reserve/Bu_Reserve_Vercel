"use client";

import { addAllowedEmail, removeAllowedEmail, updateAllowedEmailRole } from "@/app/admin/actions";
import type { AllowedEmailRole } from "@/lib/access";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  entries: { email: string; role: AllowedEmailRole }[];
  currentUserEmail: string;
  currentUserRole: AllowedEmailRole;
};

const ROLE_OPTIONS: AllowedEmailRole[] = ["member", "admin", "super_admin"];

function roleLabel(role: AllowedEmailRole): string {
  if (role === "super_admin") return "Super admin";
  if (role === "admin") return "Admin";
  return "Member";
}

function canRemove(currentUserRole: AllowedEmailRole, targetRole: AllowedEmailRole): boolean {
  if (currentUserRole === "super_admin") return true;
  if (currentUserRole === "admin") return targetRole === "member";
  return false;
}

export function AdminClient({ entries, currentUserEmail, currentUserRole }: Props) {
  const router = useRouter();
  const [addLoading, setAddLoading] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);
  const [roleDrafts, setRoleDrafts] = useState<Record<string, AllowedEmailRole>>({});
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAddLoading(true);
    setMessage(null);
    const form = e.currentTarget;
    const formData = new FormData(form);
    const result = await addAllowedEmail(formData);
    setAddLoading(false);
    if (result?.error) {
      setMessage({ type: "error", text: result.error });
      return;
    }
    setMessage({ type: "success", text: "Email added." });
    form.reset();
    router.refresh();
  }

  async function handleRemove(email: string) {
    setRemoving(email);
    setMessage(null);
    const result = await removeAllowedEmail(email);
    setRemoving(null);
    if (result?.error) {
      setMessage({ type: "error", text: result.error });
      return;
    }
    router.refresh();
  }

  async function handleRoleUpdate(email: string) {
    const nextRole = roleDrafts[email];
    if (!nextRole) return;
    setUpdatingRole(email);
    setMessage(null);
    const result = await updateAllowedEmailRole(email, nextRole);
    setUpdatingRole(null);
    if (result?.error) {
      setMessage({ type: "error", text: result.error });
      return;
    }
    setMessage({ type: "success", text: `Updated role for ${email}.` });
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-neutral-900">Add email</h2>
        <form onSubmit={handleAdd} className="flex flex-wrap gap-3">
          <input
            name="email"
            type="email"
            placeholder="user@example.com"
            required
            className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-neutral-900 placeholder:text-neutral-400 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
          />
          {currentUserRole === "super_admin" && (
            <select
              name="role"
              defaultValue="member"
              className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            >
              {ROLE_OPTIONS.map((role) => (
                <option key={role} value={role}>
                  {roleLabel(role)}
                </option>
              ))}
            </select>
          )}
          <button
            type="submit"
            disabled={addLoading}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {addLoading ? "Adding…" : "Add"}
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-neutral-900">Allowed emails ({entries.length})</h2>
        {message && (
          <p
            className={`mb-4 text-sm ${message.type === "error" ? "text-red-600" : "text-green-600"}`}
          >
            {message.text}
          </p>
        )}
        {entries.length === 0 ? (
          <p className="text-sm text-neutral-500">No emails yet. Add one above.</p>
        ) : (
          <ul className="space-y-2">
            {entries.map(({ email, role }) => (
              <li
                key={email}
                className="flex items-center justify-between gap-4 rounded-lg border border-neutral-200 bg-neutral-50 py-2 pl-4 pr-2"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm text-neutral-900">{email}</span>
                  <span className="rounded bg-neutral-200 px-2 py-0.5 text-xs text-neutral-700">
                    {roleLabel(role)}
                  </span>
                  {email.toLowerCase() === currentUserEmail.toLowerCase() && (
                    <span className="text-xs text-neutral-500">(you)</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {currentUserRole === "super_admin" && (
                    <>
                      <select
                        value={roleDrafts[email] ?? role}
                        onChange={(e) =>
                          setRoleDrafts((prev) => ({
                            ...prev,
                            [email]: e.target.value as AllowedEmailRole,
                          }))
                        }
                        className="rounded border border-neutral-300 bg-white px-2 py-1 text-xs text-neutral-900 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                      >
                        {ROLE_OPTIONS.map((optionRole) => (
                          <option key={optionRole} value={optionRole}>
                            {roleLabel(optionRole)}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => handleRoleUpdate(email)}
                        disabled={updatingRole !== null || (roleDrafts[email] ?? role) === role}
                        className="rounded bg-neutral-200 px-2 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-300 disabled:opacity-50"
                      >
                        {updatingRole === email ? "Saving…" : "Save role"}
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemove(email)}
                    disabled={removing !== null || !canRemove(currentUserRole, role)}
                    className="rounded bg-red-100 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-200 disabled:opacity-50"
                  >
                    {removing === email ? "Removing…" : "Remove"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
