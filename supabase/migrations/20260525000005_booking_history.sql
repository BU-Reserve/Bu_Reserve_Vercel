-- Keep a permanent history of bookings even after active bookings are cleaned up.

create table if not exists public.booking_history (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null,
  email text not null,
  room_id uuid not null references public.rooms(id) on delete restrict,
  start_time timestamptz not null,
  end_time timestamptz not null,
  booked_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create unique index if not exists booking_history_booking_id_key
  on public.booking_history(booking_id);

create index if not exists booking_history_email_booked_at
  on public.booking_history(email, booked_at desc);

create index if not exists booking_history_room_start
  on public.booking_history(room_id, start_time, end_time);

alter table public.booking_history enable row level security;

insert into public.booking_history (
  booking_id,
  email,
  room_id,
  start_time,
  end_time,
  booked_at
)
select
  id,
  email,
  room_id,
  start_time,
  end_time,
  coalesce(created_at, now())
from public.bookings
on conflict (booking_id) do nothing;

create or replace function public.log_booking_history()
returns trigger as $$
begin
  insert into public.booking_history (
    booking_id,
    email,
    room_id,
    start_time,
    end_time,
    booked_at
  )
  values (
    new.id,
    new.email,
    new.room_id,
    new.start_time,
    new.end_time,
    coalesce(new.created_at, now())
  )
  on conflict (booking_id) do nothing;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists log_booking_history_trigger on public.bookings;

create trigger log_booking_history_trigger
  after insert on public.bookings
  for each row execute function public.log_booking_history();
