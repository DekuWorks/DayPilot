import type { CalendarEvent } from "@/lib/events-supabase";

export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export const DAY_START_HOUR = 6;
export const DAY_END_HOUR = 22;
export const HOUR_HEIGHT = 56;

export type CalendarViewMode = "month" | "week" | "day";

export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function addDays(d: Date, n: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + n);
  return next;
}

export function startOfWeek(d: Date): Date {
  const day = startOfDay(d);
  day.setDate(day.getDate() - day.getDay());
  return day;
}

export function hoursInDay(): number[] {
  const hours: number[] = [];
  for (let h = DAY_START_HOUR; h < DAY_END_HOUR; h++) hours.push(h);
  return hours;
}

export function eventsForDay(
  events: CalendarEvent[],
  day: Date
): CalendarEvent[] {
  const key = dateKey(day);
  return events
    .filter((e) => dateKey(new Date(e.start)) === key)
    .sort(
      (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
    );
}

/** Position an event within the day timeline (px from top of grid). */
export function eventLayout(event: CalendarEvent): {
  top: number;
  height: number;
} {
  const start = new Date(event.start);
  const end = new Date(event.end);
  const startMinutes =
    start.getHours() * 60 +
    start.getMinutes() -
    DAY_START_HOUR * 60;
  const endMinutes =
    end.getHours() * 60 + end.getMinutes() - DAY_START_HOUR * 60;
  const clampedStart = Math.max(0, startMinutes);
  const clampedEnd = Math.max(
    clampedStart + 20,
    Math.min((DAY_END_HOUR - DAY_START_HOUR) * 60, endMinutes)
  );
  return {
    top: (clampedStart / 60) * HOUR_HEIGHT,
    height: Math.max(24, ((clampedEnd - clampedStart) / 60) * HOUR_HEIGHT),
  };
}

export function formatHourLabel(hour: number): string {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  return d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}
