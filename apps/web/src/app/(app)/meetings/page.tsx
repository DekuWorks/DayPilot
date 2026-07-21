"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/Button";
import { useAuth } from "@/providers/AuthProvider";
import * as eventsApi from "@/lib/events-supabase";
import type { CalendarEvent } from "@/lib/events-supabase";
import { dateKey } from "@/components/calendar/calendar-utils";

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function durationMins(start: string, end: string) {
  return Math.max(
    0,
    Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000)
  );
}

export default function MeetingsPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"upcoming" | "past" | "all">("upcoming");
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [day, setDay] = useState(dateKey(new Date()));
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("10:30");
  const [meetingUrl, setMeetingUrl] = useState("");
  const [location, setLocation] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const from = new Date();
      from.setDate(from.getDate() - 30);
      const to = new Date();
      to.setDate(to.getDate() + 60);
      const list = await eventsApi.listEvents({
        from: from.toISOString(),
        to: to.toISOString(),
      });
      setEvents(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load meetings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(() => {
    const now = Date.now();
    return events
      .filter((e) => {
        const start = new Date(e.start).getTime();
        if (filter === "upcoming") return start >= now - 15 * 60000;
        if (filter === "past") return start < now;
        return true;
      })
      .sort((a, b) => {
        const diff =
          new Date(a.start).getTime() - new Date(b.start).getTime();
        return filter === "past" ? -diff : diff;
      });
  }, [events, filter]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !title.trim()) return;
    try {
      await eventsApi.createEvent(user.id, {
        title: title.trim(),
        start: new Date(`${day}T${startTime}:00`).toISOString(),
        end: new Date(`${day}T${endTime}:00`).toISOString(),
        meetingUrl: meetingUrl.trim() || undefined,
        location: location.trim() || undefined,
      });
      setCreating(false);
      setTitle("");
      setMeetingUrl("");
      setLocation("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this meeting?")) return;
    try {
      await eventsApi.deleteEvent(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            Meetings
          </h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Upcoming and past meetings from your calendar.
          </p>
        </div>
        <Button size="sm" onClick={() => setCreating(true)}>
          Schedule meeting
        </Button>
      </div>

      <div className="flex flex-wrap gap-1 rounded-[var(--radius-md)] bg-[var(--surface-secondary)] p-1 w-fit">
        {(["upcoming", "past", "all"] as const).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize ${
              filter === id
                ? "bg-[var(--brand-500)] text-black"
                : "text-[var(--text-secondary)]"
            }`}
          >
            {id}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-[var(--error)]">{error}</p>}

      {creating && (
        <form
          onSubmit={handleCreate}
          className="space-y-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4"
        >
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Meeting title"
            className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--brand-500)]"
          />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="date"
              required
              value={day}
              onChange={(e) => setDay(e.target.value)}
              className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--brand-500)]"
            />
            <input
              type="time"
              required
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--brand-500)]"
            />
            <input
              type="time"
              required
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--brand-500)]"
            />
          </div>
          <input
            type="url"
            value={meetingUrl}
            onChange={(e) => setMeetingUrl(e.target.value)}
            placeholder="Meeting link (Zoom, Meet, …)"
            className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--brand-500)]"
          />
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Location (optional)"
            className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--brand-500)]"
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCreating(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm">
              Create
            </Button>
          </div>
        </form>
      )}

      <ul className="space-y-2">
        {loading ? (
          <li className="text-sm text-[var(--text-tertiary)] p-2">Loading…</li>
        ) : visible.length === 0 ? (
          <li className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-6 text-sm text-[var(--text-secondary)]">
            No meetings in this view. Schedule one or add events on the calendar.
          </li>
        ) : (
          visible.map((m) => (
            <li
              key={m.id}
              className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-semibold text-[var(--text-primary)] truncate">
                    {m.title}
                  </h2>
                  <p className="text-sm text-[var(--text-secondary)] mt-0.5">
                    {formatWhen(m.start)} · {durationMins(m.start, m.end)} min
                  </p>
                  {m.location && (
                    <p className="text-xs text-[var(--text-tertiary)] mt-1">
                      {m.location}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {m.meetingUrl && (
                    <a
                      href={m.meetingUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg bg-[var(--brand-500)] px-3 py-1.5 text-xs font-semibold text-black hover:opacity-90"
                    >
                      Join
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDelete(m.id)}
                    className="text-xs text-[var(--error)] hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
