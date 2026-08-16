"use client";

import { useState } from "react";
import { CalendarPlus } from "lucide-react";
import { Button } from "@/components/Button";
import { useAuth } from "@/providers/AuthProvider";
import {
  formatSuggestedSlot,
  suggestSchedule,
  type SuggestedEvent,
} from "@/lib/ai-api";
import * as eventsApi from "@/lib/events";

export function SuggestScheduleCard() {
  const { user } = useAuth();
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [added, setAdded] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<SuggestedEvent[]>([]);

  async function requestSlots() {
    const q = prompt.trim();
    if (!q || busy) return;
    setBusy(true);
    setError("");
    setAdded([]);
    try {
      const result = await suggestSchedule(q);
      setSuggestions(result.suggestions ?? []);
      if (!result.suggestions?.length) {
        setError("No slots found. Try a different request.");
      }
    } catch (e) {
      setSuggestions([]);
      setError(
        e instanceof Error ? e.message : "Could not get schedule suggestions"
      );
    } finally {
      setBusy(false);
    }
  }

  async function addToCalendar(slot: SuggestedEvent) {
    if (!user?.id || adding) return;
    const key = `${slot.title}|${slot.start}`;
    setAdding(key);
    setError("");
    try {
      await eventsApi.createEvent(user.id, {
        title: slot.title,
        start: slot.start,
        end: slot.end,
        description: slot.description,
      });
      setAdded((prev) => [...prev, key]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add that event");
    } finally {
      setAdding(null);
    }
  }

  return (
    <div className="rounded-[var(--radius-xl)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4">
      <h2 className="text-sm font-semibold text-[var(--text-primary)]">
        When can I fit this?
      </h2>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">
        Ask for a slot around your existing week. Suggestions stay on the
        server — nothing is added until you confirm.
      </p>
      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void requestSlots();
        }}
      >
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g. 2 hours for deep work tomorrow morning"
          disabled={busy}
          className="min-w-0 flex-1 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--background-primary)] px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--brand-500)]"
        />
        <Button type="submit" size="sm" disabled={busy || !prompt.trim()}>
          {busy ? "Finding…" : "Find slots"}
        </Button>
      </form>
      {error && <p className="mt-3 text-sm text-[var(--error)]">{error}</p>}
      {suggestions.length > 0 && (
        <ul className="mt-3 space-y-2">
          {suggestions.map((slot) => {
            const key = `${slot.title}|${slot.start}`;
            const isAdded = added.includes(key);
            return (
              <li
                key={key}
                className="flex items-start justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    {slot.title}
                  </p>
                  <p className="text-xs text-[var(--text-secondary)]">
                    {formatSuggestedSlot(slot.start)} –{" "}
                    {formatSuggestedSlot(slot.end)}
                  </p>
                  {slot.description && (
                    <p className="mt-1 text-xs text-[var(--text-tertiary)]">
                      {slot.description}
                    </p>
                  )}
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={isAdded || adding === key}
                  onClick={() => void addToCalendar(slot)}
                  className="shrink-0 gap-1"
                >
                  <CalendarPlus className="h-3.5 w-3.5" />
                  {isAdded ? "Added" : adding === key ? "Adding…" : "Add"}
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
