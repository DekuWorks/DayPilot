"use client";

import dynamic from "next/dynamic";

const CalendarApp = dynamic(
  () =>
    import("@/components/calendar/CalendarApp").then((m) => m.CalendarApp),
  {
    ssr: false,
    loading: () => (
      <p className="text-[var(--text-secondary)]">Loading calendar…</p>
    ),
  }
);

export default function CalendarPage() {
  return <CalendarApp />;
}
