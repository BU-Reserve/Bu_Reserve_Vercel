-- Allow diyavora@bu.edu to book multiple rooms at the same time.
-- Room availability still prevents double-booking the same room.

create or replace function public.check_one_booking_per_user()
returns trigger as $$
begin
  if lower(new.email) = 'diyavora@bu.edu' then
    return new;
  end if;

  if exists (
    select 1 from public.bookings
    where email = new.email
      and id != coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid)
      and tstzrange(start_time, end_time) && tstzrange(new.start_time, new.end_time)
  ) then
    raise exception 'You can only have one booking at a time.';
  end if;
  return new;
end;
$$ language plpgsql security definer;
