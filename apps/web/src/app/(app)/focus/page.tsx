"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/Button";
import { useAuth } from "@/providers/AuthProvider";
import * as focusApi from "@/lib/focus-supabase";

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s.toString().padStart(2, "0")}s`;
  return `${s}s`;
}

export default function FocusPage() {
  const { user } = useAuth();
  const [active, setActive] = useState<focusApi.FocusSession | null>(null);
  const [sessions, setSessions] = useState<focusApi.FocusSession[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const weekStart = new Date();
      weekStart.setHours(0, 0, 0, 0);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const [list, current] = await Promise.all([
        focusApi.listFocusSessions({ from: weekStart.toISOString() }),
        focusApi.getActiveFocusSession(),
      ]);
      setSessions(list);
      setActive(current);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load focus sessions");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!active) {
      setElapsed(0);
      return;
    }
    const tick = () => {
      setElapsed(
        Math.max(
          0,
          Math.floor((Date.now() - new Date(active.startedAt).getTime()) / 1000)
        )
      );
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [active]);

  async function toggle() {
    if (!user) return;
    setBusy(true);
    try {
      if (active) {
        await focusApi.completeFocusSession(active.id);
        setActive(null);
      } else {
        setActive(await focusApi.startFocusSession(user.id));
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Focus timer failed");
    } finally {
      setBusy(false);
    }
  }

  const weekSeconds = sessions
    .filter((s) => s.status === "completed")
    .reduce((sum, s) => sum + (s.durationSeconds ?? 0), 0);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Focus</h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Deep-work sessions stored in Supabase <code>focus_sessions</code>.
        </p>
        <div className="mt-2 flex gap-3 text-sm">
          <Link
            href="/insights#focus-timer"
            className="font-medium text-[var(--brand-500)] hover:underline"
          >
            Insights
          </Link>
          <Link
            href="/pilot-brief"
            className="font-medium text-[var(--brand-500)] hover:underline"
          >
            Pilot Brief
          </Link>
        </div>
      </div>

      {error && <p className="text-sm text-[var(--error)]">{error}</p>}

      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-6">
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-tertiary)]">
          This week
        </p>
        <p className="mt-2 text-3xl font-bold text-[var(--text-primary)]">
          {formatDuration(weekSeconds)}
        </p>
        <p className="mt-4 text-sm text-[var(--text-secondary)]">
          {active
            ? `Session running · ${formatDuration(elapsed)}`
            : "Start a block and we’ll log it against your account."}
        </p>
        <Button
          className="mt-4"
          onClick={() => void toggle()}
          disabled={busy || !user}
        >
          {busy ? "…" : active ? "End session" : "Start focus"}
        </Button>
      </div>

      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-5">
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">
          Recent sessions
        </h2>
        {sessions.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            No focus sessions this week yet.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {sessions.slice(0, 12).map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between text-sm text-[var(--text-secondary)]"
              >
                <span>
                  {new Date(s.startedAt).toLocaleString(undefined, {
                    weekday: "short",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
                <span>
                  {s.status === "completed"
                    ? formatDuration(s.durationSeconds ?? 0)
                    : s.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
