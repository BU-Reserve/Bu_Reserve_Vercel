import { getSession } from "@/lib/session";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await getSession();
  if (session) redirect("/dashboard");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
      <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">KHC Room Booking</h1>
      <p className="text-center text-neutral-600 dark:text-neutral-400">
        Book rooms 910, 911 or 912. Up to 7 days ahead, 1 or 2 hour slots.
      </p>
      <Link
        href="/login"
        className="rounded-lg bg-red-600 px-6 py-3 font-medium text-white hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600"
      >
        Sign in to book
      </Link>
    </main>
  );
}
