"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/Button";
import { useAuth } from "@/providers/AuthProvider";
import * as eventsApi from "@/lib/events-supabase";
import type { CalendarEvent } from "@/lib/events-supabase";
import {
  MONTHS,
  addDays,
  dateKey,
  startOfWeek,
  type CalendarViewMode,
} from "./calendar-utils";
import { MonthCalendarView } from "./MonthCalendarView";
import { WeekCalendarView } from "./WeekCalendarView";
import { DayTimeline } from "./DayTimeline";
import { CreateEventModal, EventDetailModal } from "./EventModals";

const VIEW_OPTIONS: { id: CalendarViewMode; label: string }[] = [
  { id: "month", label: "Month" },
  { id: "week", label: "Week" },
  { id: "day", label: "Day" },
];

export function CalendarApp() {
  const { user } = useAuth();
  const [mode, setMode] = useState<CalendarViewMode>("month");
  const [viewDate, setViewDate] = useState(() => new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModal, setCreateModal] = useState<{
    date: Date;
    hour?: number;
  } | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(
    null
  );

  const range = useMemo(() => {
    if (mode === "month") {
      return {
        from: new Date(viewDate.getFullYear(), viewDate.getMonth(), 1),
        to: new Date(viewDate.getFullYear(), viewDate.getMonth() + 2, 0),
      };
    }
    if (mode === "week") {
      const start = startOfWeek(viewDate);
      return { from: start, to: addDays(start, 7) };
    }
    const start = new Date(
      viewDate.getFullYear(),
      viewDate.getMonth(),
      viewDate.getDate()
    );
    return { from: start, to: addDays(start, 1) };
  }, [mode, viewDate]);

  const refetch = useCallback(() => {
    setLoading(true);
    eventsApi
      .listEvents({
        from: range.from.toISOString(),
        to: range.to.toISOString(),
      })
      .then(setEvents)
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, [range.from, range.to]);

  useEffect(() => {
    void Promise.resolve().then(() => refetch());
  }, [refetch]);

  const title = useMemo(() => {
    if (mode === "day") {
      return viewDate.toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    }
    if (mode === "week") {
      const start = startOfWeek(viewDate);
      const end = addDays(start, 6);
      const sameMonth = start.getMonth() === end.getMonth();
      if (sameMonth) {
        return `${MONTHS[start.getMonth()]} ${start.getDate()}–${end.getDate()}, ${start.getFullYear()}`;
      }
      return `${MONTHS[start.getMonth()]} ${start.getDate()} – ${MONTHS[end.getMonth()]} ${end.getDate()}, ${end.getFullYear()}`;
    }
    return `${MONTHS[viewDate.getMonth()]} ${viewDate.getFullYear()}`;
  }, [mode, viewDate]);

  function shift(delta: number) {
    setViewDate((d) => {
      if (mode === "month") {
        return new Date(d.getFullYear(), d.getMonth() + delta);
      }
      if (mode === "week") return addDays(d, delta * 7);
      return addDays(d, delta);
    });
  }

  async function handleCreate(data: {
    title: string;
    start: string;
    end: string;
    description?: string;
  }) {
    if (!user) return;
    try {
      await eventsApi.createEvent(user.id, data);
      setCreateModal(null);
      refetch();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to create event");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this event?")) return;
    try {
      await eventsApi.deleteEvent(id);
      setSelectedEvent(null);
      refetch();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to delete");
    }
  }

  function openCreate(date: Date, hour?: number) {
    setCreateModal({ date, hour });
  }

  const defaultStartTime =
    createModal?.hour != null
      ? `${String(createModal.hour).padStart(2, "0")}:00`
      : "09:00";

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => shift(-1)}
            className="p-2.5 shrink-0"
            aria-label="Previous"
          >
            ‹
          </Button>
          <h1 className="text-xl md:text-3xl font-bold text-[var(--text-primary)] truncate">
            {title}
          </h1>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => shift(1)}
            className="p-2.5 shrink-0"
            aria-label="Next"
          >
            ›
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            className="inline-flex rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] p-0.5"
            role="tablist"
            aria-label="Calendar view"
          >
            {VIEW_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                role="tab"
                aria-selected={mode === opt.id}
                onClick={() => setMode(opt.id)}
                className={`px-3 py-1.5 text-sm font-medium rounded-[10px] transition-colors ${
                  mode === opt.id
                    ? "bg-[var(--brand-500)] text-black"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewDate(new Date())}
          >
            Today
          </Button>
          <Button size="sm" onClick={() => openCreate(new Date())}>
            Create event
          </Button>
        </div>
      </div>

      {mode === "month" && (
        <MonthCalendarView
          viewDate={viewDate}
          events={events}
          loading={loading}
          onSelectEvent={setSelectedEvent}
          onCreateOnDate={(date) => openCreate(date)}
          onSelectDay={(date) => {
            setViewDate(date);
            setMode("day");
          }}
        />
      )}
      {mode === "week" && (
        <WeekCalendarView
          viewDate={viewDate}
          events={events}
          loading={loading}
          onSelectEvent={setSelectedEvent}
          onCreateAt={(date, hour) => openCreate(date, hour)}
          onSelectDay={(date) => {
            setViewDate(date);
            setMode("day");
          }}
        />
      )}
      {mode === "day" && (
        <DayTimeline
          day={viewDate}
          events={events}
          loading={loading}
          onSelectEvent={setSelectedEvent}
          onCreateAt={(date, hour) => openCreate(date, hour)}
        />
      )}

      {createModal && (
        <CreateEventModal
          key={`${dateKey(createModal.date)}-${defaultStartTime}`}
          date={createModal.date}
          defaultStartTime={defaultStartTime}
          onClose={() => setCreateModal(null)}
          onSubmit={handleCreate}
        />
      )}
      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onDelete={() => handleDelete(selectedEvent.id)}
        />
      )}
    </div>
  );
}
