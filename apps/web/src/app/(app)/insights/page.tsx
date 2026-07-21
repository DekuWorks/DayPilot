"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/Button";
import { useAuth } from "@/providers/AuthProvider";
import * as eventsApi from "@/lib/events-supabase";
import * as focusApi from "@/lib/focus-supabase";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

function startOfWeek(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - x.getDay());
  return x;
}

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function InsightsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [meetingMinutes, setMeetingMinutes] = useState(0);
  const [meetingsCount, setMeetingsCount] = useState(0);
  const [tasksCompleted, setTasksCompleted] = useState(0);
  const [tasksOpen, setTasksOpen] = useState(0);
  const [focusSeconds, setFocusSeconds] = useState(0);
  const [dayBars, setDayBars] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);
  const [activeFocus, setActiveFocus] = useState<focusApi.FocusSession | null>(
    null
  );
  const [elapsed, setElapsed] = useState(0);
  const [focusBusy, setFocusBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const weekStart = startOfWeek();
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      const events = await eventsApi.listEvents({
        from: weekStart.toISOString(),
        to: weekEnd.toISOString(),
      });

      let mins = 0;
      const bars = [0, 0, 0, 0, 0, 0, 0];
      for (const e of events) {
        const start = new Date(e.start);
        const end = new Date(e.end);
        const dur = Math.max(0, (end.getTime() - start.getTime()) / 60000);
        mins += dur;
        bars[start.getDay()] += dur;
      }
      setMeetingMinutes(Math.round(mins));
      setMeetingsCount(events.length);
      setDayBars(bars.map((v) => Math.round(v)));

      if (isSupabaseConfigured()) {
        const supabase = createClient();
        const { data: tasks } = await supabase
          .from("tasks")
          .select("id, status");
        const list = tasks ?? [];
        setTasksCompleted(list.filter((t) => t.status === "completed").length);
        setTasksOpen(
          list.filter(
            (t) => t.status !== "completed" && t.status !== "cancelled"
          ).length
        );
      }

      const sessions = await focusApi.listFocusSessions({
        from: weekStart.toISOString(),
      });
      const completedSecs = sessions
        .filter((s) => s.status === "completed")
        .reduce((sum, s) => sum + (s.durationSeconds ?? 0), 0);
      setFocusSeconds(completedSecs);

      const active = await focusApi.getActiveFocusSession();
      setActiveFocus(active);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load insights");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!activeFocus) {
      setElapsed(0);
      return;
    }
    const tick = () => {
      setElapsed(
        Math.max(
          0,
          Math.floor(
            (Date.now() - new Date(activeFocus.startedAt).getTime()) / 1000
          )
        )
      );
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [activeFocus]);

  const maxBar = useMemo(
    () => Math.max(30, ...dayBars),
    [dayBars]
  );

  async function toggleFocus() {
    if (!user) return;
    setFocusBusy(true);
    try {
      if (activeFocus) {
        await focusApi.completeFocusSession(activeFocus.id);
        setActiveFocus(null);
      } else {
        const session = await focusApi.startFocusSession(user.id);
        setActiveFocus(session);
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Focus timer failed");
    } finally {
      setFocusBusy(false);
    }
  }

  const weekday = ["S", "M", "T", "W", "T", "F", "S"];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          Insights
        </h1>
        <p className="text-sm text-[var(--text-secondary)]">
          This week’s meetings, tasks, and focus time.
        </p>
      </div>

      {error && <p className="text-sm text-[var(--error)]">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "Meetings",
            value: loading ? "…" : String(meetingsCount),
            hint: "this week",
          },
          {
            label: "In meetings",
            value: loading ? "…" : formatDuration(meetingMinutes * 60),
            hint: "scheduled time",
          },
          {
            label: "Tasks done",
            value: loading ? "…" : String(tasksCompleted),
            hint: `${tasksOpen} open`,
          },
          {
            label: "Focus",
            value: loading ? "…" : formatDuration(focusSeconds),
            hint: "completed this week",
          },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-tertiary)]">
              {card.label}
            </p>
            <p className="mt-2 text-2xl font-bold text-[var(--text-primary)]">
              {card.value}
            </p>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              {card.hint}
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-5">
        <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">
          Meeting load by day
        </h2>
        <div className="flex h-40 items-end gap-2">
          {dayBars.map((mins, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-2">
              <div
                className="w-full rounded-t-md bg-[var(--brand-500)] min-h-[4px] opacity-90"
                style={{ height: `${Math.max(4, (mins / maxBar) * 100)}%` }}
                title={`${mins} min`}
              />
              <span className="text-[10px] text-[var(--text-tertiary)]">
                {weekday[i]}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            Focus timer
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            {activeFocus
              ? `Session running · ${formatDuration(elapsed)}`
              : "Start a deep-work block and we’ll log it."}
          </p>
        </div>
        <Button onClick={toggleFocus} disabled={focusBusy || !user}>
          {focusBusy
            ? "…"
            : activeFocus
              ? "End session"
              : "Start focus"}
        </Button>
      </div>
    </div>
  );
}
