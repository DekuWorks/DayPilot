import type { CalendarEvent } from "./events-supabase";

export type CalendarBooking = {
  id: string;
  title: string;
  bookerName: string;
  bookerEmail: string;
  start: string;
  end: string;
};

export function bookingEventId(bookingId: string) {
  return `booking:${bookingId}`;
}

export function mergeBookingEvents(
  events: CalendarEvent[],
  bookings: CalendarBooking[],
): CalendarEvent[] {
  const occupied = new Set(
    events.map((event) => `${event.start}|${event.end}`),
  );
  const added: CalendarEvent[] = [];
  for (const booking of bookings) {
    const key = `${booking.start}|${booking.end}`;
    if (occupied.has(key)) continue;
    occupied.add(key);
    const title = booking.title.trim() || "Booking";
    const name = booking.bookerName.trim() || "Guest";
    added.push({
      id: bookingEventId(booking.id),
      title: `${title} · ${name}`,
      start: booking.start,
      end: booking.end,
      description: booking.bookerEmail
        ? `Booked by ${name} (${booking.bookerEmail})`
        : `Booked by ${name}`,
      source: "booking",
      syncDirection: "imported",
    });
  }
  return [...events, ...added].sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
  );
}
