"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/Button";
import * as eventsApi from "@/lib/events-api";
import * as aiApi from "@/lib/ai-api";
import { useEventsSocket } from "@/hooks/useEventsSocket";
import type { Event } from "@/lib/events-api";
import type { SuggestedEvent } from "@/lib/ai-api";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type DayCell = { date: Date; isCurrentMonth: boolean; dayOfMonth: number; events: Event[] };

function buildMonthGrid(viewDate: Date, events: Event[]): DayCell[][] {
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

export default function DashboardPage() {
  const [viewDate, setViewDate] = useState(() => new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModal, setCreateModal] = useState<{ date: Date } | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [prompt, setPrompt] = useState("");
  const [suggestions, setSuggestions] = useState<SuggestedEvent[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

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

  useEventsSocket(refetch);

  function prevMonth() {
    setViewDate((d) => new Date(d.getFullYear(), d.getMonth() - 1));
  }

  function nextMonth() {
    setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + 1));
  }

  function goToday() {
    setViewDate(new Date());
  }

  const grid = buildMonthGrid(viewDate, events);
  const today = new Date();
  const todayKey = today.toISOString().slice(0, 10);

  async function handleCreate(data: { title: string; start: string; end: string; description?: string }) {
    try {
      await eventsApi.createEvent(data);
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

  async function handleSuggest() {
    if (!prompt.trim()) return;
    setAiError("");
    setSuggestions([]);
    setAiLoading(true);
    try {
      const { suggestions: next } = await aiApi.suggestSchedule(prompt.trim());
      setSuggestions(next ?? []);
    } catch (e) {
      setAiError(e instanceof Error ? e.message : "Could not get suggestions");
    } finally {
      setAiLoading(false);
    }
  }

  async function handleAddSuggestion(s: SuggestedEvent) {
    try {
      await eventsApi.createEvent({
        title: s.title,
        start: s.start,
        end: s.end,
        description: s.description,
      });
      setSuggestions((prev) => prev.filter((x) => x !== s));
      refetch();
    } catch {
      setAiError("Failed to add event");
    }
  }

  return (
    <div className="container-width section-padding py-6 md:py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-1 min-w-0">
          {/* Calendar header */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={prevMonth}
                className="p-2.5"
                aria-label="Previous month"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Button>
              <h1 className="text-2xl md:text-3xl font-bold text-[#2B3448] min-w-[200px]">
                {MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}
              </h1>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={nextMonth}
                className="p-2.5"
                aria-label="Next month"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={goToday}>
                Today
              </Button>
              <Button size="sm" onClick={() => setCreateModal({ date: new Date() })}>
                Create event
              </Button>
            </div>
          </div>

          {/* Month grid */}
          <div className="glass-effect rounded-2xl overflow-hidden border border-[#4FB3B3]/20">
            <div className="grid grid-cols-7 border-b border-[#4FB3B3]/20">
              {WEEKDAYS.map((d) => (
                <div
                  key={d}
                  className="py-3 px-2 text-center text-xs font-semibold text-[#4f4f4f] uppercase tracking-wider"
                >
                  {d}
                </div>
              ))}
            </div>
            <div className="divide-y divide-[#4FB3B3]/10">
              {loading ? (
                <div className="py-24 text-center text-[#4f4f4f]">Loading…</div>
              ) : (
                grid.map((week, wi) => (
                  <div key={wi} className="grid grid-cols-7 min-h-[100px] md:min-h-[120px]">
                    {week.map((cell, di) => {
                      const isToday = dateKey(cell.date) === todayKey;
                      return (
                        <div
                          key={di}
                          className={`relative p-2 border-r border-[#4FB3B3]/10 last:border-r-0 ${
                            cell.isCurrentMonth ? "bg-white/50" : "bg-[#f8fafb]"
                          } ${isToday ? "ring-1 ring-[#4FB3B3] ring-inset" : ""}`}
                        >
                          <div className="flex items-start justify-between gap-1">
                            <span
                              className={`text-sm font-medium ${
                                cell.isCurrentMonth ? (isToday ? "text-[#4FB3B3]" : "text-[#2B3448]") : "text-[#9ca3af]"
                              }`}
                            >
                              {cell.dayOfMonth}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setCreateModal({ date: cell.date }); }}
                              className="opacity-0 group-hover:opacity-100 hover:!opacity-100 p-0.5 rounded text-[#4FB3B3] hover:bg-[#4FB3B3]/20 transition-opacity"
                              aria-label="Add event"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                            </button>
                          </div>
                          <div className="mt-1 space-y-1 group">
                            {cell.events.slice(0, 3).map((e) => (
                              <button
                                key={e.id}
                                type="button"
                                onClick={(ev) => { ev.stopPropagation(); setSelectedEvent(e); }}
                                className="w-full text-left px-2 py-1 rounded-lg bg-[#4FB3B3]/15 hover:bg-[#4FB3B3]/25 text-xs font-medium text-[#2B3448] truncate border-l-2 border-[#4FB3B3]"
                              >
                                {formatTime(e.start)} {e.title}
                              </button>
                            ))}
                            {cell.events.length > 3 && (
                              <span className="text-xs text-[#4f4f4f] pl-2">+{cell.events.length - 3} more</span>
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

        {/* Sidebar: AI + quick add */}
        <aside className="w-full lg:w-80 flex-shrink-0">
          <div className="glass-effect rounded-2xl p-6 border border-[#4FB3B3]/20 sticky top-24">
            <h2 className="text-lg font-semibold text-[#2B3448] mb-3">Schedule with AI</h2>
            <p className="text-sm text-[#4f4f4f] mb-3">
              e.g. &ldquo;2 hours for deep work tomorrow at 9am&rdquo;
            </p>
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSuggest()}
              placeholder="What do you want to schedule?"
              className="w-full px-4 py-2.5 rounded-xl border border-[#4FB3B3]/30 focus:ring-2 focus:ring-[#4FB3B3] focus:border-[#4FB3B3] outline-none mb-3"
            />
            <Button onClick={handleSuggest} disabled={aiLoading} className="w-full mb-4">
              {aiLoading ? "Thinking…" : "Suggest"}
            </Button>
            {aiError && <p className="text-sm text-red-600 mb-2">{aiError}</p>}
            {suggestions.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-[#2B3448]">Suggested events</p>
                {suggestions.map((s) => (
                  <div
                    key={`${s.start}-${s.title}`}
                    className="flex flex-col gap-2 p-3 rounded-xl bg-white/60 border border-[#4FB3B3]/20"
                  >
                    <span className="font-medium text-[#2B3448] text-sm">{s.title}</span>
                    <span className="text-xs text-[#4f4f4f]">
                      {new Date(s.start).toLocaleDateString()} {formatTime(s.start)}–{formatTime(s.end)}
                    </span>
                    <Button size="sm" variant="outline" onClick={() => handleAddSuggestion(s)}>
                      Add to calendar
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Create event modal */}
      {createModal && (
        <CreateEventModal
          date={createModal.date}
          onClose={() => setCreateModal(null)}
          onSubmit={handleCreate}
        />
      )}

      {/* Event detail modal */}
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
  onSubmit: (data: { title: string; start: string; end: string; description?: string }) => void;
}) {
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState(() => date.toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    try {
      const [sy, sm, sd] = startDate.split("-").map(Number);
      const [sh, smm] = startTime.split(":").map(Number);
      const [eh, emm] = endTime.split(":").map(Number);
      const start = new Date(sy, sm - 1, sd, sh, smm).toISOString();
      const end = new Date(sy, sm - 1, sd, eh, emm).toISOString();
      await onSubmit({ title: title.trim(), start, end, description: description.trim() || undefined });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold text-[#2B3448] mb-4">New event</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#2B3448] mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="Event title"
              className="w-full px-4 py-2 rounded-xl border border-[#4FB3B3]/30 focus:ring-2 focus:ring-[#4FB3B3] outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#2B3448] mb-1">Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
              className="w-full px-4 py-2 rounded-xl border border-[#4FB3B3]/30 focus:ring-2 focus:ring-[#4FB3B3] outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#2B3448] mb-1">Start</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
                className="w-full px-4 py-2 rounded-xl border border-[#4FB3B3]/30 focus:ring-2 focus:ring-[#4FB3B3] outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#2B3448] mb-1">End</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
                className="w-full px-4 py-2 rounded-xl border border-[#4FB3B3]/30 focus:ring-2 focus:ring-[#4FB3B3] outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#2B3448] mb-1">Description (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-4 py-2 rounded-xl border border-[#4FB3B3]/30 focus:ring-2 focus:ring-[#4FB3B3] outline-none resize-none"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={submitting}>
              {submitting ? "Creating…" : "Create"}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
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
  event: Event;
  onClose: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold text-[#2B3448] mb-2">{event.title}</h2>
        <p className="text-[#4f4f4f] text-sm mb-2">
          {new Date(event.start).toLocaleDateString(undefined, {
            weekday: "short",
            month: "short",
            day: "numeric",
          })}{" "}
          · {formatTime(event.start)}–{formatTime(event.end)}
        </p>
        {event.description && (
          <p className="text-[#4f4f4f] text-sm mb-4">{event.description}</p>
        )}
        {event.source && event.source !== "native" && (
          <span className="inline-block text-xs px-2 py-1 rounded-full bg-[#4FB3B3]/20 text-[#2B3448] mb-4">
            {event.source}
          </span>
        )}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onDelete}
            className="text-red-600 hover:underline text-sm font-medium"
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
