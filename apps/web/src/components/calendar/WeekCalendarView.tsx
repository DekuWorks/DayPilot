"use client";

import type { CalendarEvent } from "@/lib/events-supabase";
import {
  DAY_END_HOUR,
  DAY_START_HOUR,
  HOUR_HEIGHT,
  WEEKDAYS,
  addDays,
  dateKey,
  eventLayout,
  eventsForDay,
  formatHourLabel,
  formatTime,
  hoursInDay,
  startOfWeek,
} from "./calendar-utils";

type Props = {
  viewDate: Date;
  events: CalendarEvent[];
  loading: boolean;
  onSelectEvent: (event: CalendarEvent) => void;
  onCreateAt: (date: Date, hour: number) => void;
  onSelectDay?: (date: Date) => void;
};

export function WeekCalendarView({
  viewDate,
  events,
  loading,
  onSelectEvent,
  onCreateAt,
  onSelectDay,
}: Props) {
  const weekStart = startOfWeek(viewDate);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const hours = hoursInDay();
  const totalHeight = (DAY_END_HOUR - DAY_START_HOUR) * HOUR_HEIGHT;
  const todayKey = dateKey(new Date());

  return (
    <div className="glass-effect rounded-2xl overflow-hidden border border-[var(--border-subtle)]">
      {loading ? (
        <div className="py-24 text-center text-[var(--text-secondary)]">
          Loading…
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[720px]">
            <div className="grid grid-cols-[64px_repeat(7,minmax(0,1fr))] border-b border-[var(--border-subtle)]">
              <div className="h-12 border-r border-[var(--border-subtle)]" />
              {days.map((d) => {
                const key = dateKey(d);
                const isToday = key === todayKey;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => onSelectDay?.(d)}
                    className={`h-12 px-1 border-r border-[var(--border-subtle)] last:border-r-0 text-center ${
                      isToday
                        ? "bg-[color-mix(in_srgb,var(--brand-500)_10%,transparent)]"
                        : ""
                    }`}
                  >
                    <div className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">
                      {WEEKDAYS[d.getDay()]}
                    </div>
                    <div
                      className={`text-sm font-semibold ${
                        isToday
                          ? "text-[var(--brand-500)]"
                          : "text-[var(--text-primary)]"
                      }`}
                    >
                      {d.getDate()}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-[64px_repeat(7,minmax(0,1fr))]">
              <div className="relative border-r border-[var(--border-subtle)]">
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

              {days.map((d) => {
                const key = dateKey(d);
                const dayEvents = eventsForDay(events, d);
                return (
                  <div
                    key={key}
                    className="relative border-r border-[var(--border-subtle)] last:border-r-0 bg-[var(--surface-primary)]"
                    style={{ height: totalHeight }}
                  >
                    {hours.map((h) => (
                      <button
                        key={h}
                        type="button"
                        onClick={() => onCreateAt(d, h)}
                        className="absolute left-0 right-0 border-t border-[var(--border-subtle)] hover:bg-[color-mix(in_srgb,var(--brand-500)_6%,transparent)]"
                        style={{
                          top: (h - DAY_START_HOUR) * HOUR_HEIGHT,
                          height: HOUR_HEIGHT,
                        }}
                        aria-label={`Add event ${key} ${formatHourLabel(h)}`}
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
                          className="absolute left-0.5 right-0.5 z-10 rounded-md border-l-2 border-[var(--brand-500)] bg-[color-mix(in_srgb,var(--brand-500)_18%,transparent)] hover:bg-[color-mix(in_srgb,var(--brand-500)_28%,transparent)] px-1 py-0.5 text-left overflow-hidden"
                          style={{ top, height }}
                          title={`${ev.title} (${formatTime(ev.start)})`}
                        >
                          <div className="text-[10px] font-semibold text-[var(--text-primary)] truncate leading-tight">
                            {ev.title}
                          </div>
                          {height > 32 && (
                            <div className="text-[9px] text-[var(--text-secondary)] truncate">
                              {formatTime(ev.start)}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
