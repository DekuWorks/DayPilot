"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/providers/AuthProvider";
import { CalendarApp } from "@/components/calendar/CalendarApp";
import * as eventsApi from "@/lib/events";
import type { CalendarEvent } from "@/lib/events";

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Home is the calendar. Compact next-event strip sits above Month / Week / Day. */
export function HomeDashboard() {
  const { user } = useAuth();
  const [nextEvent, setNextEvent] = useState<CalendarEvent | null>(null);

  const loadNext = useCallback(async () => {
    const now = new Date();
    const to = new Date(now);
    to.setDate(to.getDate() + 2);
    try {
      const events = await eventsApi.listEvents({
        from: now.toISOString(),
        to: to.toISOString(),
      });
      const upcoming = events
        .filter((e) => new Date(e.end) >= now)
        .sort(
          (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
        );
      setNextEvent(upcoming[0] ?? null);
    } catch {
      setNextEvent(null);
    }
  }, []);

  useEffect(() => {
    void loadNext();
  }, [loadNext]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-[var(--text-secondary)]">
            {user?.firstName
              ? `Hello ${user.firstName}`
              : "Your calendar"}
          </p>
          {nextEvent ? (
            <p className="mt-1 text-sm font-medium text-[var(--brand-500)]">
              Next: {formatTime(nextEvent.start)} · {nextEvent.title}
            </p>
          ) : (
            <p className="mt-1 text-sm text-[var(--text-tertiary)]">
              Nothing next on your calendar
            </p>
          )}
        </div>
        <Link
          href="/insights"
          className="text-xs font-medium text-[var(--brand-500)] hover:underline"
        >
          Insights and Pilot Brief
        </Link>
      </div>
      <CalendarApp />
    </div>
  );
}
