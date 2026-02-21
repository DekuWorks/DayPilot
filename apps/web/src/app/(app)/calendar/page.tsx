"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/Button";
import * as eventsApi from "@/lib/events-api";
import * as aiApi from "@/lib/ai-api";
import { useEventsSocket } from "@/hooks/useEventsSocket";
import type { Event } from "@/lib/events-api";
import type { SuggestedEvent } from "@/lib/ai-api";

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: d.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function CalendarPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [prompt, setPrompt] = useState("");
  const [suggestions, setSuggestions] = useState<SuggestedEvent[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [addingId, setAddingId] = useState<string | null>(null);

  const refetch = useCallback(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    setLoading(true);
    eventsApi
      .listEvents({ from: start.toISOString(), to: end.toISOString() })
      .then(setEvents)
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  useEventsSocket(refetch);

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
    const id = `${s.start}-${s.title}`;
    setAddingId(id);
    try {
      const created = await eventsApi.createEvent({
        title: s.title,
        start: s.start,
        end: s.end,
        description: s.description,
      });
      setEvents((prev) => [...prev, created]);
      setSuggestions((prev) => prev.filter((x) => x !== s));
    } catch {
      setAiError("Failed to add event");
    } finally {
      setAddingId(null);
    }
  }

  const eventsByDay = events.reduce<Record<string, Event[]>>((acc, e) => {
    const day = e.start.slice(0, 10);
    if (!acc[day]) acc[day] = [];
    acc[day].push(e);
    return acc;
  }, {});

  const sortedDays = Object.keys(eventsByDay).sort();

  return (
    <div className="container-width section-padding py-8 md:py-12">
      <h1 className="text-2xl md:text-3xl font-bold text-[#2B3448] mb-2">Calendar</h1>
      <p className="text-[#4f4f4f] mb-6">
        One place for everything: your events, connected calendars, and booking links. Describe what you want to schedule and add it below.
      </p>

      <div className="glass-effect rounded-2xl p-6 md:p-8 max-w-2xl mb-8">
        <h2 className="text-lg font-semibold text-[#2B3448] mb-3">Schedule with AI</h2>
        <p className="text-sm text-[#4f4f4f] mb-3">
          e.g. &ldquo;2 hours for deep work tomorrow at 9am&rdquo; or &ldquo;Lunch with Sarah Friday at 12:30&rdquo;
        </p>
        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSuggest()}
            placeholder="What do you want to schedule?"
            className="flex-1 min-w-[200px] px-4 py-2 rounded-xl border border-[#4FB3B3]/30 focus:ring-2 focus:ring-[#4FB3B3] focus:border-[#4FB3B3] outline-none"
          />
          <Button onClick={handleSuggest} disabled={aiLoading}>
            {aiLoading ? "Thinking…" : "Suggest"}
          </Button>
        </div>
        {aiError && (
          <p className="mt-3 text-sm text-red-600">{aiError}</p>
        )}
        {suggestions.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-sm font-medium text-[#2B3448]">Suggested events</p>
            {suggestions.map((s) => {
              const id = `${s.start}-${s.title}`;
              return (
                <div
                  key={id}
                  className="flex flex-wrap items-center gap-2 py-2 px-3 rounded-xl bg-white/60 border border-[#4FB3B3]/20"
                >
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-[#2B3448]">{s.title}</span>
                    <span className="text-[#4f4f4f] text-sm ml-2">
                      {formatDate(s.start)} {formatTime(s.start)}–{formatTime(s.end)}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAddSuggestion(s)}
                    disabled={addingId === id}
                  >
                    {addingId === id ? "Adding…" : "Add to calendar"}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="glass-effect rounded-2xl p-6 md:p-8 max-w-2xl">
        <h2 className="text-lg font-semibold text-[#2B3448] mb-4">Upcoming events (next 7 days)</h2>
        {loading ? (
          <p className="text-[#4f4f4f]">Loading…</p>
        ) : sortedDays.length === 0 ? (
          <p className="text-[#4f4f4f]">No events yet. Use AI to suggest some.</p>
        ) : (
          <ul className="space-y-4">
            {sortedDays.map((day) => (
              <li key={day}>
                <p className="text-sm font-medium text-[#4FB3B3] mb-2">{formatDate(day)}</p>
                <ul className="space-y-2">
                  {eventsByDay[day].map((e) => (
                    <li
                      key={e.id}
                      className="py-2 px-3 rounded-xl bg-white/60 border border-[#4FB3B3]/20"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-[#2B3448]">{e.title}</span>
                        {e.source && e.source !== "native" && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-[#4FB3B3]/20 text-[#2B3448]">
                            {e.source === "google" ? "Google" : e.source === "outlook" ? "Outlook" : e.source === "apple" ? "Apple" : e.source === "booking" ? "Booking" : e.source}
                          </span>
                        )}
                        <span className="text-[#4f4f4f] text-sm">
                          {formatTime(e.start)}–{formatTime(e.end)}
                        </span>
                      </div>
                      {e.description && (
                        <p className="text-sm text-[#4f4f4f] mt-1">{e.description}</p>
                      )}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
