-- Switch bookings from auth user_id to email (for email-only sign-in, no magic link)

-- Drop triggers first (they reference the table)
drop trigger if exists check_one_booking_per_user_trigger on public.bookings;
drop trigger if exists check_room_available_trigger on public.bookings;

-- Drop RLS policies that use user_id
drop policy if exists "Users can view own bookings" on public.bookings;
drop policy if exists "Users can insert own bookings" on public.bookings;
drop policy if exists "Users can delete own bookings" on public.bookings;

-- Add email column (nullable first for existing rows)
alter table public.bookings add column if not exists email text;

-- Backfill existing rows so email is never null (required before NOT NULL)
update public.bookings set email = 'migrated@placeholder.com' where email is null;

-- Remove user_id: drop FK then column
alter table public.bookings drop constraint if exists bookings_user_id_fkey;
alter table public.bookings drop column if exists user_id;

-- Make email required
alter table public.bookings alter column email set not null;

-- Index for lookups by email
create index if not exists bookings_email on public.bookings(email);

-- One booking at a time per email (not per user_id)
create or replace function public.check_one_booking_per_user()
returns trigger as $$
begin
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

create trigger check_one_booking_per_user_trigger
  before insert or update on public.bookings
  for each row execute function public.check_one_booking_per_user();

-- Room availability unchanged
create or replace function public.check_room_available()
returns trigger as $$
begin
  if exists (
    select 1 from public.bookings
    where room_id = new.room_id
      and id != coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid)
      and tstzrange(start_time, end_time) && tstzrange(new.start_time, new.end_time)
  ) then
    raise exception 'This room is already booked for the selected time.';
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger check_room_available_trigger
  before insert or update on public.bookings
  for each row execute function public.check_room_available();

-- Bookings are now accessed only via server with service role (no anon RLS needed)
-- Service role bypasses RLS by default.
