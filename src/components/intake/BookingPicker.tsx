"use client";

import { useEffect, useMemo, useState } from "react";

interface CalendarSlot {
  start: string;
  end: string;
}

interface BookingPickerProps {
  token: string;
}

const DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Los_Angeles",
  weekday: "short",
  month: "short",
  day: "numeric",
});

const TIME_FORMAT = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Los_Angeles",
  hour: "numeric",
  minute: "2-digit",
});

function groupSlotsByDate(slots: CalendarSlot[]): { date: string; slots: CalendarSlot[] }[] {
  const groups = new Map<string, CalendarSlot[]>();
  for (const slot of slots) {
    const key = DATE_FORMAT.format(new Date(slot.start));
    const existing = groups.get(key) ?? [];
    existing.push(slot);
    groups.set(key, existing);
  }
  return Array.from(groups.entries()).map(([date, dateSlots]) => ({ date, slots: dateSlots }));
}

export function BookingPicker({ token }: BookingPickerProps) {
  const [slots, setSlots] = useState<CalendarSlot[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [booking, setBooking] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<{ start: string; meetLink: string | null } | null>(
    null,
  );

  useEffect(() => {
    fetch(`/api/intake/calendar/availability?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        if (res.status === 503) {
          setError(
            "Booking isn't available right now — we'll reach out to schedule your kickoff call directly.",
          );
          setSlots([]);
          return;
        }
        if (!res.ok) throw new Error("failed");
        const data = (await res.json()) as { slots: CalendarSlot[] };
        setSlots(data.slots);
      })
      .catch(() => {
        setError("Failed to load available times.");
        setSlots([]);
      });
  }, [token]);

  const grouped = useMemo(() => (slots ? groupSlotsByDate(slots) : []), [slots]);

  const handleBook = async (slot: CalendarSlot) => {
    setBooking(slot.start);
    setError(null);

    try {
      const res = await fetch("/api/intake/calendar/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, start: slot.start, end: slot.end }),
      });

      if (res.status === 409) {
        setError("That time was just taken — pick another slot below.");
        const refreshed = await fetch(
          `/api/intake/calendar/availability?token=${encodeURIComponent(token)}`,
        );
        if (refreshed.ok) {
          const data = (await refreshed.json()) as { slots: CalendarSlot[] };
          setSlots(data.slots);
        }
        return;
      }

      if (!res.ok) throw new Error("failed");

      const data = (await res.json()) as { start: string; meetLink: string | null };
      setConfirmed(data);
    } catch {
      setError("Failed to book the meeting. Please try again.");
    } finally {
      setBooking(null);
    }
  };

  if (confirmed) {
    return (
      <div className="mt-6 border-t border-gray-100 pt-6 dark:border-gray-800">
        <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
          You&apos;re booked for {DATE_FORMAT.format(new Date(confirmed.start))} at{" "}
          {TIME_FORMAT.format(new Date(confirmed.start))} Pacific.
        </p>
        {confirmed.meetLink && (
          <a
            href={confirmed.meetLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-[#CD7F32] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#B8721D]"
          >
            Join with Google Meet
          </a>
        )}
      </div>
    );
  }

  if (slots === null) {
    return (
      <div className="mt-6 border-t border-gray-100 pt-6 dark:border-gray-800">
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading available times…</p>
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div className="mt-6 border-t border-gray-100 pt-6 dark:border-gray-800">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {error ?? "No open times in the next two weeks — we'll reach out to schedule directly."}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 border-t border-gray-100 pt-6 dark:border-gray-800">
      <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
        You&apos;re ready to book your kickoff call. Pick a time (Pacific):
      </p>
      {error && <p className="mb-3 text-sm text-red-500">{error}</p>}
      <div className="space-y-4">
        {grouped.map((group) => (
          <div key={group.date}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
              {group.date}
            </p>
            <div className="flex flex-wrap gap-2">
              {group.slots.map((slot) => (
                <button
                  key={slot.start}
                  type="button"
                  disabled={booking !== null}
                  onClick={() => handleBook(slot)}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:border-[#CD7F32] hover:text-[#CD7F32] disabled:opacity-50 dark:border-gray-600 dark:text-gray-300"
                >
                  {TIME_FORMAT.format(new Date(slot.start))}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
