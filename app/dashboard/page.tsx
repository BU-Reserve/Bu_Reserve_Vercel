import { createAdminClient } from "@/utils/supabase/admin";
import { getSession } from "@/lib/session";
import { getUserRole, isAdminRole } from "@/lib/access";
import { redirect } from "next/navigation";
import { DashboardClient } from "./dashboard-client";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const supabase = createAdminClient();
  const { data: rooms } = await supabase.from("rooms").select("*").order("name");
  const { data: myBookings } = await supabase
    .from("bookings")
    .select("*, room:rooms(*)")
    .eq("email", session.email)
    .gte("end_time", new Date().toISOString())
    .order("start_time", { ascending: true });

  const role = await getUserRole(session.email);
  const isAdmin = isAdminRole(role);

  return (
    <DashboardClient
      rooms={rooms ?? []}
      myBooking={myBookings?.[0] ?? null}
      userEmail={session.email}
      isAdmin={isAdmin}
    />
  );
}
