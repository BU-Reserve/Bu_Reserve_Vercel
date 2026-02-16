"use client";

import Image from "next/image";
import type { Booking, Room } from "@/types/database";
import { cancelBooking, createBooking, getAvailableRooms } from "@/app/dashboard/actions";
import { logout } from "@/app/logout/actions";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const MAX_DAYS = 7;

function formatLocalDate(d: Date) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDateOptions() {
  const options: { value: string; label: string }[] = [];
  const today = new Date();
  for (let i = 0; i <= MAX_DAYS; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    options.push({
      value: formatLocalDate(d),
      label: i === 0 ? "Today" : i === 1 ? "Tomorrow" : d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }),
    });
  }
  return options;
}

const TIME_OPTIONS = Array.from({ length: 24 }, (_, i) => {
  const hour = i;
  const label = hour === 0 ? "12:00 am" : hour < 12 ? `${hour}:00 am` : hour === 12 ? "12:00 pm" : `${hour - 12}:00 pm`;
  return { value: `${hour.toString().padStart(2, "0")}:00`, label };
});

type Props = {
  rooms: Room[];
  myBooking: (Booking & { room?: Room }) | null;
  userEmail: string;
  isAdmin?: boolean;
};

export function DashboardClient({ rooms, myBooking, userEmail, isAdmin }: Props) {
  const router = useRouter();
  const [date, setDate] = useState(() => formatLocalDate(new Date()));
  const [start, setStart] = useState("09:00");
  const [duration, setDuration] = useState<1 | 2>(1);
  const [availableRooms, setAvailableRooms] = useState<Room[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [bookingRoomId, setBookingRoomId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const tzOffset = new Date().getTimezoneOffset();

  const dateOptions = getDateOptions();

  useEffect(() => {
    let cancelled = false;
    getAvailableRooms(date, start, duration, tzOffset).then(({ rooms: next }) => {
      if (!cancelled) {
        setAvailableRooms(next);
        setRoomsLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [date, start, duration, tzOffset]);

  function handleDateChange(next: string) {
    setDate(next);
    setRoomsLoading(true);
    setError(null);
  }

  function handleStartChange(next: string) {
    setStart(next);
    setRoomsLoading(true);
    setError(null);
  }

  function handleDurationChange(next: 1 | 2) {
    setDuration(next);
    setRoomsLoading(true);
    setError(null);
  }

  async function handleBookRoom(roomId: string) {
    setBookingRoomId(roomId);
    setError(null);
    const formData = new FormData();
    formData.set("room_id", roomId);
    formData.set("date", date);
    formData.set("start", start);
    formData.set("duration", String(duration));
    formData.set("tz_offset", String(tzOffset));
    const result = await createBooking(formData);
    setBookingRoomId(null);
    if (result?.error) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  async function handleCancel() {
    if (!myBooking) return;
    setCancelLoading(true);
    const result = await cancelBooking(myBooking.id);
    setCancelLoading(false);
    if (result?.error) setError(result.error);
    else router.refresh();
  }

  return (
    <main className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <header className="border-b border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <Image 
            src="/bu_logo.jpg" 
            alt="BU Logo" 
            width={40} 
            height={40}
          />
          <h1 className="text-lg font-semibold text-neutral-900 dark:text-white">KHC Room Booking</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-neutral-600 dark:text-neutral-400">Hello, {userEmail}</span>
            {isAdmin && (
              <a
                href="/admin"
                className="text-sm text-red-600 hover:underline"
              >
                Admin
              </a>
            )}
            <form action={logout}>
              <button
                type="submit"
                className="text-sm text-red-600 hover:underline dark:text-red-400"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-8">
        {myBooking ? (
          <section className="mb-8 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <h2 className="mb-4 text-lg font-semibold text-neutral-900 dark:text-white">Your booking</h2>
            <p className="text-neutral-700 dark:text-neutral-300">
              <strong>Room {myBooking.room?.name ?? "—"}</strong> (capacity {myBooking.room?.capacity ?? "—"}) •{" "}
              {new Date(myBooking.start_time).toLocaleString("en-GB", {
                dateStyle: "medium",
                timeStyle: "short",
              })}{" "}
              –{" "}
              {new Date(myBooking.end_time).toLocaleString("en-GB", { timeStyle: "short" })}
            </p>
            <button
              type="button"
              onClick={handleCancel}
              disabled={cancelLoading}
              className="mt-4 rounded-lg bg-red-100 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50 disabled:opacity-50"
            >
              {cancelLoading ? "Cancelling…" : "Cancel booking"}
            </button>
            <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">
              You can only have one booking at a time. Cancel this one to book another slot.
            </p>
          </section>
        ) : (
          <section className="mb-8 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <h2 className="mb-4 text-lg font-semibold text-neutral-900 dark:text-white">Book a room</h2>
            <p className="mb-4 text-sm text-neutral-500 dark:text-neutral-400">
              Select a time, then click Book on an available room.
            </p>
            <div className="space-y-4">
              <div className="flex flex-wrap gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Date</label>
                  <select
                    value={date}
                    onChange={(e) => handleDateChange(e.target.value)}
                    className="mt-1 rounded-lg border border-neutral-300 bg-white px-4 py-2 dark:border-neutral-600 dark:bg-neutral-800 dark:text-white"
                  >
                    {dateOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Start time</label>
                  <select
                    value={start}
                    onChange={(e) => handleStartChange(e.target.value)}
                    className="mt-1 rounded-lg border border-neutral-300 bg-white px-4 py-2 dark:border-neutral-600 dark:bg-neutral-800 dark:text-white"
                  >
                    {TIME_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Duration</label>
                  <select
                    value={duration}
                    onChange={(e) => handleDurationChange(Number(e.target.value) as 1 | 2)}
                    className="mt-1 rounded-lg border border-neutral-300 bg-white px-4 py-2 dark:border-neutral-600 dark:bg-neutral-800 dark:text-white"
                  >
                    <option value={1}>1 hour</option>
                    <option value={2}>2 hours</option>
                  </select>
                </div>
              </div>
              <div>
                <h3 className="mb-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">Available rooms</h3>
                {roomsLoading ? (
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">Checking availability…</p>
                ) : availableRooms.length === 0 ? (
                  <p className="text-sm text-amber-600 dark:text-amber-400">No rooms available for this time.</p>
                ) : (
                  <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {availableRooms.map((r) => (
                      <li
                        key={r.id}
                        className="flex items-center justify-between gap-4 rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-800/50"
                      >
                        <div>
                          <span className="font-medium text-neutral-900 dark:text-white">Room {r.name}</span>
                          <p className="text-sm text-neutral-500 dark:text-neutral-400">Capacity: {r.capacity}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleBookRoom(r.id)}
                          disabled={bookingRoomId !== null}
                          className="shrink-0 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 dark:bg-red-500 dark:hover:bg-red-600"
                        >
                          {bookingRoomId === r.id ? "Booking…" : "Book"}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
            </div>
          </section>
        )}

        <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="mb-4 text-lg font-semibold text-neutral-900 dark:text-white">Rooms</h2>
          <ul className="grid gap-4 sm:grid-cols-3">
            {rooms.map((r) => (
              <li
                key={r.id}
                className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-700 dark:bg-neutral-800/50"
              >
                <span className="font-medium text-neutral-900 dark:text-white">Room {r.name}</span>
                <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">Capacity: {r.capacity} (for your reference)</p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
