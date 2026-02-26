import { createAdminClient } from "@/utils/supabase/admin";

export async function cleanupExpiredBookings(): Promise<void> {
  const supabase = createAdminClient();
  await supabase
    .from("bookings")
    .delete()
    .lt("end_time", new Date().toISOString());
}
