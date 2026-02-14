"use client";

import { addAllowedEmail, removeAllowedEmail } from "@/app/admin/actions";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  emails: string[];
  adminEmail: string;
};

export function AdminClient({ emails, adminEmail }: Props) {
  const router = useRouter();
  const [addLoading, setAddLoading] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
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
        <h2 className="mb-4 text-base font-semibold text-neutral-900">Allowed emails ({emails.length})</h2>
        {message && (
          <p
            className={`mb-4 text-sm ${message.type === "error" ? "text-red-600" : "text-green-600"}`}
          >
            {message.text}
          </p>
        )}
        {emails.length === 0 ? (
          <p className="text-sm text-neutral-500">No emails yet. Add one above.</p>
        ) : (
          <ul className="space-y-2">
            {emails.map((email) => (
              <li
                key={email}
                className="flex items-center justify-between gap-4 rounded-lg border border-neutral-200 bg-neutral-50 py-2 pl-4 pr-2"
              >
                <span className="text-sm text-neutral-900">{email}</span>
                {email.toLowerCase() === adminEmail.toLowerCase() ? (
                  <span className="text-xs text-neutral-500">(you – admin)</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleRemove(email)}
                    disabled={removing !== null}
                    className="rounded bg-red-100 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-200 disabled:opacity-50"
                  >
                    {removing === email ? "Removing…" : "Remove"}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
