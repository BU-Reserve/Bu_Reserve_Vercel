import { createAdminClient } from "@/utils/supabase/admin";
import { getSession } from "@/lib/session";
import { cleanupExpiredBookings } from "@/lib/booking-cleanup";
import { redirect } from "next/navigation";
import { DashboardClient } from "./dashboard-client";

const MULTI_BOOKING_EMAILS = new Set(["diyavora@bu.edu"]);

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  await cleanupExpiredBookings();

  const supabase = createAdminClient();
  const { data: rooms } = await supabase.from("rooms").select("*").order("name");
  const { data: myBookings } = await supabase
    .from("bookings")
    .select("*, room:rooms(*)")
    .eq("email", session.email)
    .gte("end_time", new Date().toISOString())
    .order("start_time", { ascending: true });

  return (
    <DashboardClient
      rooms={rooms ?? []}
      myBookings={myBookings ?? []}
      userEmail={session.email}
      canBookMultipleRooms={MULTI_BOOKING_EMAILS.has(session.email.toLowerCase())}
    />
  );
}
