-- Allowed emails: only these can sign in
create table if not exists public.allowed_emails (
  email text primary key,
  created_at timestamptz default now()
);

-- Rooms: 910, 911, 912. Capacity is informational only (tells booker how many the room holds).
create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  capacity int not null,
  created_at timestamptz default now()
);

insert into public.rooms (name, capacity) values
  ('910', 10),
  ('911', 4),
  ('912', 10)
on conflict (name) do nothing;

-- Bookings: 1 or 2 hour windows, up to 1 week in advance, one per user
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  room_id uuid not null references public.rooms(id) on delete restrict,
  start_time timestamptz not null,
  end_time timestamptz not null,
  created_at timestamptz default now(),
  constraint booking_duration check (
    (end_time - start_time) = interval '1 hour' or (end_time - start_time) = interval '2 hours'
  )
);

create index if not exists bookings_user_id on public.bookings(user_id);
create index if not exists bookings_room_start on public.bookings(room_id, start_time, end_time);

-- RLS
alter table public.allowed_emails enable row level security;
alter table public.rooms enable row level security;
alter table public.bookings enable row level security;

-- Anyone can read rooms
create policy "Rooms are viewable by everyone" on public.rooms for select using (true);

-- Only allowlisted emails exist in allowed_emails; we check in app, so authenticated can read
create policy "Authenticated can read allowed_emails" on public.allowed_emails for select to authenticated using (true);

-- Bookings: users see and manage only their own (cannot view or delete others' bookings)
create policy "Users can view own bookings" on public.bookings for select using (auth.uid() = user_id);
create policy "Users can insert own bookings" on public.bookings for insert with check (auth.uid() = user_id);
create policy "Users can delete own bookings" on public.bookings for delete using (auth.uid() = user_id);

-- Service role can manage allowed_emails (or add an admin policy later)
-- For now, insert allowed emails via Supabase dashboard or SQL as superuser

-- Function: ensure user has no overlapping booking (one at a time)
create or replace function public.check_one_booking_per_user()
returns trigger as $$
begin
  if exists (
    select 1 from public.bookings
    where user_id = new.user_id
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

-- Function: one booker per room per slot (if a room is booked, no one else can book it for that time)
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
