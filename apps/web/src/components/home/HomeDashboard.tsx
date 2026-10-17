"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useAuth } from "@/providers/AuthProvider";
import { CalendarApp } from "@/components/calendar/CalendarApp";
import { FounderHubHomeButton } from "@/components/founder-hub/FounderHubHomeButton";
import * as eventsApi from "@/lib/events";
import type { CalendarEvent } from "@/lib/events";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

type DueTask = { id: string; title: string };

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Home is the calendar. Compact next-event strip sits above Month / Week / Day. */
const planDismissKey = "daypilot-today-plan-dismissed";
const planDismissListeners = new Set<() => void>();
let planDismissedInMemory = false;

function subscribePlanDismiss(onStoreChange: () => void) {
  planDismissListeners.add(onStoreChange);
  return () => {
    planDismissListeners.delete(onStoreChange);
  };
}

function readPlanDismissed() {
  if (planDismissedInMemory) return true;
  try {
    return sessionStorage.getItem(planDismissKey) === "1";
  } catch {
    return false;
  }
}

function dismissTodayPlan() {
  planDismissedInMemory = true;
  try {
    sessionStorage.setItem(planDismissKey, "1");
  } catch {
    // The in-memory flag still hides the card for this tab.
  }
  planDismissListeners.forEach((listener) => listener());
}

export function HomeDashboard() {
  const { user } = useAuth();
  const [nextEvent, setNextEvent] = useState<CalendarEvent | null>(null);
  const [lookup, setLookup] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [dueTasks, setDueTasks] = useState<DueTask[]>([]);
  const [tasksLookup, setTasksLookup] = useState<
    "loading" | "ready" | "unavailable"
  >("loading");
  const planDismissed = useSyncExternalStore(
    subscribePlanDismiss,
    readPlanDismissed,
    () => false,
  );

  useEffect(() => {
    let cancelled = false;
    const now = new Date();
    const to = new Date(now);
    to.setDate(to.getDate() + 2);
    eventsApi
      .listEvents({
        from: now.toISOString(),
        to: to.toISOString(),
      })
      .then((events) => {
        if (cancelled) return;
        const upcoming = events
          .filter((e) => new Date(e.end) >= now)
          .sort(
            (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
          );
        setNextEvent(upcoming[0] ?? null);
        setLookup("ready");
      })
      .catch(() => {
        if (!cancelled) {
          setNextEvent(null);
          setLookup("error");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setTasksLookup("unavailable");
      return;
    }
    let cancelled = false;
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    const supabase = createClient();
    void supabase
      .from("tasks")
      .select("id, title, status, due_at")
      .neq("status", "completed")
      .neq("status", "cancelled")
      .gte("due_at", start.toISOString())
      .lt("due_at", end.toISOString())
      .order("due_at", { ascending: true })
      .limit(3)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setDueTasks([]);
          setTasksLookup("unavailable");
          return;
        }
        setDueTasks((data as DueTask[]) ?? []);
        setTasksLookup("ready");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const showPlanPrompt =
    lookup === "ready" && nextEvent == null && !planDismissed;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-[var(--text-secondary)]">
            {user?.firstName ? `Hello ${user.firstName}` : "Your calendar"}
          </p>
          {lookup === "loading" ? (
            <p className="mt-1 text-sm text-[var(--text-tertiary)]">
              Checking the next two days…
            </p>
          ) : lookup === "error" ? (
            <p className="mt-1 text-sm text-[var(--text-tertiary)]">
              Couldn&apos;t check upcoming events. The calendar below may still
              load.
            </p>
          ) : nextEvent ? (
            <p className="mt-1 text-sm font-medium text-[var(--brand-500)]">
              Next: {formatTime(nextEvent.start)} · {nextEvent.title}
            </p>
          ) : (
            <p className="mt-1 text-sm text-[var(--text-tertiary)]">
              Nothing in the next two days
            </p>
          )}
          {tasksLookup === "loading" ? (
            <p className="mt-1 text-sm text-[var(--text-tertiary)]">
              Checking tasks due today…
            </p>
          ) : tasksLookup === "unavailable" ? (
            <p className="mt-1 text-sm text-[var(--text-tertiary)]">
              Tasks due today are unavailable.
            </p>
          ) : dueTasks.length === 0 ? (
            <p className="mt-1 text-sm text-[var(--text-tertiary)]">
              No tasks due today.
            </p>
          ) : (
            <ul className="mt-1 space-y-0.5">
              {dueTasks.map((task) => (
                <li key={task.id}>
                  <Link
                    href={`/tasks/${task.id}`}
                    className="text-sm text-[var(--text-primary)] hover:underline"
                  >
                    Due today: {task.title}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
        <Link
          href="/booking-links"
          className="text-xs font-medium text-[var(--brand-500)] hover:underline"
        >
          Booking links
        </Link>
        <Link
          href="/pilot-brief"
          className="text-xs font-medium text-[var(--brand-500)] hover:underline"
        >
          Open Pilot Brief
        </Link>
      </div>
      {showPlanPrompt && (
        <div className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4 md:p-5">
          <h2 className="text-base font-semibold text-[var(--text-primary)]">
            Build a plan you can finish
          </h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)] leading-relaxed">
            Add a task you still need to do, or connect a calendar when you want
            today to include commitments you already have. Connecting is
            optional.
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <Link
              href="/tasks"
              className="text-sm font-medium text-[var(--brand-500)] hover:underline"
            >
              Add a task
            </Link>
            <Link
              href="/integrations"
              className="text-sm font-medium text-[var(--brand-500)] hover:underline"
            >
              Connect a calendar
            </Link>
            <button
              type="button"
              onClick={dismissTodayPlan}
              className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              Not now
            </button>
          </div>
        </div>
      )}
      <FounderHubHomeButton />
      <CalendarApp />
    </div>
  );
}
