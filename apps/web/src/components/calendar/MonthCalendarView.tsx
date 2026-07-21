"use client";

import type { CalendarEvent } from "@/lib/events-supabase";
import {
  WEEKDAYS,
  dateKey,
  formatTime,
} from "./calendar-utils";

type DayCell = {
  date: Date;
  isCurrentMonth: boolean;
  dayOfMonth: number;
  events: CalendarEvent[];
};

function buildMonthGrid(viewDate: Date, events: CalendarEvent[]): DayCell[][] {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startPad = first.getDay();
  const endPad = 6 - last.getDay();
  const days: DayCell[] = [];

  for (let i = 0; i < startPad; i++) {
    const d = new Date(year, month, 1 - (startPad - i));
    const key = dateKey(d);
    days.push({
      date: d,
      isCurrentMonth: false,
      dayOfMonth: d.getDate(),
      events: events.filter((e) => dateKey(new Date(e.start)) === key),
    });
  }
  for (let d = 1; d <= last.getDate(); d++) {
    const date = new Date(year, month, d);
    const key = dateKey(date);
    days.push({
      date,
      isCurrentMonth: true,
      dayOfMonth: d,
      events: events.filter((e) => dateKey(new Date(e.start)) === key),
    });
  }
  for (let i = 0; i < endPad; i++) {
    const d = new Date(year, month, last.getDate() + i + 1);
    const key = dateKey(d);
    days.push({
      date: d,
      isCurrentMonth: false,
      dayOfMonth: d.getDate(),
      events: events.filter((e) => dateKey(new Date(e.start)) === key),
    });
  }

  const weeks: DayCell[][] = [];
  for (let w = 0; w < days.length; w += 7) weeks.push(days.slice(w, w + 7));
  return weeks;
}

type Props = {
  viewDate: Date;
  events: CalendarEvent[];
  loading: boolean;
  onSelectEvent: (event: CalendarEvent) => void;
  onCreateOnDate: (date: Date) => void;
  onSelectDay?: (date: Date) => void;
};

export function MonthCalendarView({
  viewDate,
  events,
  loading,
  onSelectEvent,
  onCreateOnDate,
  onSelectDay,
}: Props) {
  const grid = buildMonthGrid(viewDate, events);
  const todayKey = dateKey(new Date());

  return (
    <div className="glass-effect rounded-2xl overflow-hidden border border-[var(--border-subtle)]">
      <div className="grid grid-cols-7 border-b border-[var(--border-subtle)]">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="py-3 px-2 text-center text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider"
          >
            {d}
          </div>
        ))}
      </div>
      <div className="divide-y divide-[var(--border-subtle)]">
        {loading ? (
          <div className="py-24 text-center text-[var(--text-secondary)]">
            Loading…
          </div>
        ) : (
          grid.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7 min-h-[100px]">
              {week.map((cell) => {
                const key = dateKey(cell.date);
                const isToday = key === todayKey;
                return (
                  <div
                    key={key}
                    className={`relative p-2 border-r border-[var(--border-subtle)] last:border-r-0 group ${
                      cell.isCurrentMonth
                        ? "bg-[var(--surface-primary)]"
                        : "bg-[var(--background-secondary)]"
                    } ${isToday ? "ring-1 ring-[var(--brand-500)] ring-inset" : ""}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <button
                        type="button"
                        onClick={() => onSelectDay?.(cell.date)}
                        className={`text-sm font-medium ${
                          cell.isCurrentMonth
                            ? isToday
                              ? "text-[var(--brand-500)]"
                              : "text-[var(--text-primary)]"
                            : "text-[var(--text-tertiary)]"
                        }`}
                      >
                        {cell.dayOfMonth}
                      </button>
                      <button
                        type="button"
                        onClick={() => onCreateOnDate(cell.date)}
                        className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-[var(--brand-500)] hover:bg-[color-mix(in_srgb,var(--brand-500)_20%,transparent)]"
                        aria-label="Add event"
                      >
                        +
                      </button>
                    </div>
                    <div className="space-y-1">
                      {cell.events.slice(0, 3).map((ev) => (
                        <button
                          key={ev.id}
                          type="button"
                          onClick={() => onSelectEvent(ev)}
                          className="w-full text-left px-2 py-1 rounded-lg bg-[color-mix(in_srgb,var(--brand-500)_15%,transparent)] hover:bg-[color-mix(in_srgb,var(--brand-500)_25%,transparent)] text-xs font-medium text-[var(--text-primary)] truncate border-l-2 border-[var(--brand-500)]"
                        >
                          {formatTime(ev.start)} {ev.title}
                        </button>
                      ))}
                      {cell.events.length > 3 && (
                        <span className="text-xs text-[var(--text-secondary)] pl-2">
                          +{cell.events.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
