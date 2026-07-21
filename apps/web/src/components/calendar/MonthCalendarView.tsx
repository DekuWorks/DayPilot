"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { useAuth } from "@/providers/AuthProvider";
import * as eventsApi from "@/lib/events-supabase";
import type { CalendarEvent } from "@/lib/events-supabase";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
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

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

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

export function MonthCalendarView() {
  const { user } = useAuth();
  const [viewDate, setViewDate] = useState(() => new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModal, setCreateModal] = useState<{ date: Date } | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(
    null
  );

  const refetch = useCallback(() => {
    const from = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
    const to = new Date(viewDate.getFullYear(), viewDate.getMonth() + 2, 0);
    setLoading(true);
    eventsApi
      .listEvents({ from: from.toISOString(), to: to.toISOString() })
      .then(setEvents)
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, [viewDate]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const grid = buildMonthGrid(viewDate, events);
  const todayKey = dateKey(new Date());

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

  return (
    <div>
      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setViewDate(
                    (d) => new Date(d.getFullYear(), d.getMonth() - 1)
                  )
                }
                className="p-2.5"
                aria-label="Previous month"
              >
                ‹
              </Button>
              <h1 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)] min-w-[200px]">
                {MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}
              </h1>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setViewDate(
                    (d) => new Date(d.getFullYear(), d.getMonth() + 1)
                  )
                }
                className="p-2.5"
                aria-label="Next month"
              >
                ›
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewDate(new Date())}
              >
                Today
              </Button>
              <Button
                size="sm"
                onClick={() => setCreateModal({ date: new Date() })}
              >
                Create event
              </Button>
            </div>
          </div>

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
                            <span
                              className={`text-sm font-medium ${
                                cell.isCurrentMonth
                                  ? isToday
                                    ? "text-[var(--brand-500)]"
                                    : "text-[var(--text-primary)]"
                                  : "text-[var(--text-tertiary)]"
                              }`}
                            >
                              {cell.dayOfMonth}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setCreateModal({ date: cell.date })
                              }
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
                                onClick={() => setSelectedEvent(ev)}
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
        </div>
      </div>

      {createModal && (
        <CreateEventModal
          date={createModal.date}
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

function CreateEventModal({
  date,
  onClose,
  onSubmit,
}: {
  date: Date;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    start: string;
    end: string;
    description?: string;
  }) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [day, setDay] = useState(date.toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const start = new Date(`${day}T${startTime}:00`).toISOString();
      const end = new Date(`${day}T${endTime}:00`).toISOString();
      await onSubmit({
        title,
        start,
        end,
        description: description || undefined,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="bg-[var(--surface-primary)] border border-[var(--border-subtle)] rounded-2xl shadow-xl max-w-md w-full p-6">
        <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">
          New event
        </h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
              Title
            </label>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--brand-500)]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
              Date
            </label>
            <input
              type="date"
              required
              value={day}
              onChange={(e) => setDay(e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--brand-500)]"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                Start
              </label>
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--brand-500)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                End
              </label>
              <input
                type="time"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--brand-500)]"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-4 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--brand-500)] resize-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? "Saving…" : "Create"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EventDetailModal({
  event,
  onClose,
  onDelete,
}: {
  event: CalendarEvent;
  onClose: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="bg-[var(--surface-primary)] border border-[var(--border-subtle)] rounded-2xl shadow-xl max-w-md w-full p-6">
        <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">
          {event.title}
        </h2>
        <p className="text-[var(--text-secondary)] text-sm mb-2">
          {new Date(event.start).toLocaleString()} –{" "}
          {formatTime(event.end)}
        </p>
        {event.description && (
          <p className="text-[var(--text-secondary)] text-sm mb-4">
            {event.description}
          </p>
        )}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onDelete}
            className="text-[var(--error)] hover:underline text-sm font-medium"
          >
            Delete
          </button>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
