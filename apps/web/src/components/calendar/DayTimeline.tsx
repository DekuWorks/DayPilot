"use client";

import type { CalendarEvent } from "@/lib/events-supabase";
import {
  DAY_END_HOUR,
  DAY_START_HOUR,
  HOUR_HEIGHT,
  eventLayout,
  eventsForDay,
  formatHourLabel,
  formatTime,
  hoursInDay,
} from "./calendar-utils";

type Props = {
  day: Date;
  events: CalendarEvent[];
  loading: boolean;
  onSelectEvent: (event: CalendarEvent) => void;
  onCreateAt: (date: Date, hour: number) => void;
};

export function DayTimeline({
  day,
  events,
  loading,
  onSelectEvent,
  onCreateAt,
}: Props) {
  const hours = hoursInDay();
  const dayEvents = eventsForDay(events, day);
  const totalHeight = (DAY_END_HOUR - DAY_START_HOUR) * HOUR_HEIGHT;

  return (
    <div className="glass-effect rounded-2xl overflow-hidden border border-[var(--border-subtle)]">
      {loading ? (
        <div className="py-24 text-center text-[var(--text-secondary)]">
          Loading…
        </div>
      ) : (
        <div className="flex overflow-x-auto">
          <div className="w-16 shrink-0 border-r border-[var(--border-subtle)]">
            <div className="h-10 border-b border-[var(--border-subtle)]" />
            <div style={{ height: totalHeight }} className="relative">
              {hours.map((h) => (
                <div
                  key={h}
                  className="absolute left-0 right-0 px-1 text-[10px] text-[var(--text-tertiary)] text-right pr-2"
                  style={{ top: (h - DAY_START_HOUR) * HOUR_HEIGHT - 6 }}
                >
                  {formatHourLabel(h)}
                </div>
              ))}
            </div>
          </div>
          <div className="flex-1 min-w-[280px]">
            <div className="h-10 border-b border-[var(--border-subtle)] px-3 flex items-center text-sm font-semibold text-[var(--text-primary)]">
              {day.toLocaleDateString(undefined, {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </div>
            <div
              className="relative bg-[var(--surface-primary)]"
              style={{ height: totalHeight }}
            >
              {hours.map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => onCreateAt(day, h)}
                  className="absolute left-0 right-0 border-t border-[var(--border-subtle)] hover:bg-[color-mix(in_srgb,var(--brand-500)_6%,transparent)] transition-colors"
                  style={{
                    top: (h - DAY_START_HOUR) * HOUR_HEIGHT,
                    height: HOUR_HEIGHT,
                  }}
                  aria-label={`Add event at ${formatHourLabel(h)}`}
                />
              ))}
              {dayEvents.map((ev) => {
                const { top, height } = eventLayout(ev);
                return (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectEvent(ev);
                    }}
                    className="absolute left-2 right-2 z-10 rounded-lg border-l-2 border-[var(--brand-500)] bg-[color-mix(in_srgb,var(--brand-500)_18%,transparent)] hover:bg-[color-mix(in_srgb,var(--brand-500)_28%,transparent)] px-2 py-1 text-left overflow-hidden"
                    style={{ top, height }}
                  >
                    <div className="text-xs font-semibold text-[var(--text-primary)] truncate">
                      {ev.title}
                    </div>
                    <div className="text-[10px] text-[var(--text-secondary)] truncate">
                      {formatTime(ev.start)} – {formatTime(ev.end)}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
