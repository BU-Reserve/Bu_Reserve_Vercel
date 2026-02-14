"use client";

import { verifyAdminPassword } from "@/app/admin/actions";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function AdminPasswordForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = e.currentTarget;
    const formData = new FormData(form);
    const result = await verifyAdminPassword(formData);
    setLoading(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
      <h2 className="mb-2 text-base font-semibold text-neutral-900">Admin password</h2>
      <p className="mb-4 text-sm text-neutral-500">Enter the admin password to continue.</p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          name="password"
          type="password"
          placeholder="Password"
          required
          autoComplete="current-password"
          className="w-full max-w-xs rounded-lg border border-neutral-300 bg-white px-4 py-2 text-neutral-900 placeholder:text-neutral-400 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
        >
          {loading ? "Checking…" : "Continue"}
        </button>
      </form>
    </div>
  );
}
