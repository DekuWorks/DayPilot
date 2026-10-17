"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  CalendarDays,
  Check,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Plus,
} from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { DayTimeline } from "@/components/calendar/DayTimeline";
import { EventDetailModal } from "@/components/calendar/EventModals";
import {
  addDays,
  dateKey,
  startOfDay,
} from "@/components/calendar/calendar-utils";
import { FounderHubHomeButton } from "@/components/founder-hub/FounderHubHomeButton";
import { useEventsSocket } from "@/hooks/useEventsSocket";
import { useWorkspaces } from "@/hooks/useWorkspaces";
import * as eventsApi from "@/lib/events";
import type { CalendarEvent } from "@/lib/events";
import { formatDuration } from "@/lib/format-duration";
import * as focusApi from "@/lib/focus-supabase";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { normalizeColorHex } from "@/lib/workspace-colors";

type Task = {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_at: string | null;
  completed_at: string | null;
};

type Load<T> =
  | { state: "loading" }
  | { state: "unavailable" }
  | { state: "ready"; value: T };

const taskTabs = ["today", "upcoming", "completed"] as const;
type TaskTab = (typeof taskTabs)[number];

const priorityStyle: Record<string, string> = {
  urgent: "text-[var(--error)]",
  high: "text-[var(--warning)]",
  medium: "text-[var(--text-secondary)]",
  low: "text-[var(--text-tertiary)]",
};

function greetingForHour(hour: number) {
  // Late night and early morning should not say "Good morning".
  if (hour < 5) return "Good evening";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function dueLabel(iso: string) {
  const due = new Date(iso);
  const diff = Math.round(
    (startOfDay(due).getTime() - startOfDay(new Date()).getTime()) / 86_400_000,
  );
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return due.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function eventWhen(event: CalendarEvent) {
  const start = new Date(event.start);
  const diff = Math.round(
    (startOfDay(start).getTime() - startOfDay(new Date()).getTime()) /
      86_400_000,
  );
  const time = start.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  if (diff === 0) return `Today, ${time}`;
  if (diff === 1) return `Tomorrow, ${time}`;
  return `${start.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  })}, ${time}`;
}

/* "Build a plan" prompt: dismissal survives navigation within the tab. */
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

function Card({
  title,
  action,
  children,
  className = "",
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4 md:p-5 ${className}`}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-[var(--text-primary)]">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
  tint,
  unavailable,
}: {
  label: string;
  value: string;
  icon: typeof CheckSquare;
  tint: string;
  unavailable?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4">
      <div className="min-w-0">
        <p
          className={`truncate font-bold leading-tight ${
            unavailable
              ? "text-lg text-[var(--text-tertiary)]"
              : "text-2xl text-[var(--text-primary)]"
          }`}
        >
          {value}
        </p>
        <p className="truncate text-xs text-[var(--text-secondary)]">{label}</p>
      </div>
      <span
        aria-hidden
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
        style={{
          background: `color-mix(in srgb, ${tint} 16%, transparent)`,
          color: tint,
        }}
      >
        <Icon className="h-5 w-5" strokeWidth={1.75} />
      </span>
    </div>
  );
}

/** Ring of done against due today. No number is invented: with nothing due it stays empty. */
function ProgressRing({ done, total }: { done: number; total: number }) {
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const fraction = total > 0 ? Math.min(1, done / total) : 0;
  return (
    <svg
      viewBox="0 0 44 44"
      className="h-11 w-11 shrink-0 -rotate-90"
      aria-hidden
    >
      <circle
        cx="22"
        cy="22"
        r={radius}
        fill="none"
        strokeWidth="5"
        className="stroke-[var(--border-subtle)]"
      />
      <circle
        cx="22"
        cy="22"
        r={radius}
        fill="none"
        strokeWidth="5"
        strokeLinecap="round"
        className="stroke-[var(--brand-500)]"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - fraction)}
      />
    </svg>
  );
}

export function TodayDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const { workspaces } = useWorkspaces();

  const [day, setDay] = useState(() => startOfDay(new Date()));
  const [dayEvents, setDayEvents] = useState<Load<CalendarEvent[]>>({
    state: "loading",
  });
  const [upcoming, setUpcoming] = useState<Load<CalendarEvent[]>>({
    state: "loading",
  });
  const [tasks, setTasks] = useState<Load<Task[]>>(
    isSupabaseConfigured() ? { state: "loading" } : { state: "unavailable" },
  );
  const [focusSeconds, setFocusSeconds] = useState<Load<number>>({
    state: "loading",
  });
  const [tab, setTab] = useState<TaskTab>("today");
  const [selected, setSelected] = useState<CalendarEvent | null>(null);
  const scheduleRef = useRef<HTMLDivElement>(null);
  const planDismissed = useSyncExternalStore(
    subscribePlanDismiss,
    readPlanDismissed,
    () => false,
  );

  const today = useMemo(() => startOfDay(new Date()), []);
  const isToday = dateKey(day) === dateKey(today);

  const loadEvents = useCallback(() => {
    eventsApi
      .listEvents({
        from: day.toISOString(),
        to: addDays(day, 1).toISOString(),
      })
      .then((rows) => setDayEvents({ state: "ready", value: rows }))
      .catch(() => setDayEvents({ state: "unavailable" }));
    const now = new Date();
    eventsApi
      .listEvents({
        from: now.toISOString(),
        to: addDays(startOfDay(now), 8).toISOString(),
      })
      .then((rows) =>
        setUpcoming({
          state: "ready",
          value: rows
            .filter((e) => new Date(e.end) >= now)
            .sort(
              (a, b) =>
                new Date(a.start).getTime() - new Date(b.start).getTime(),
            ),
        }),
      )
      .catch(() => setUpcoming({ state: "unavailable" }));
  }, [day]);

  useEffect(() => {
    void Promise.resolve().then(loadEvents);
  }, [loadEvents]);

  useEventsSocket(loadEvents);

  const loadTasks = useCallback(async () => {
    if (!isSupabaseConfigured()) return;
    const { data, error } = await createClient()
      .from("tasks")
      .select("id, title, status, priority, due_at, completed_at")
      .neq("status", "cancelled")
      .order("due_at", { ascending: true, nullsFirst: false })
      .limit(300);
    if (error) {
      setTasks({ state: "unavailable" });
      return;
    }
    setTasks({ state: "ready", value: (data as Task[]) ?? [] });
  }, []);

  useEffect(() => {
    void Promise.resolve().then(loadTasks);
  }, [loadTasks]);

  useEffect(() => {
    let cancelled = false;
    focusApi
      .listFocusSessions({ from: today.toISOString() })
      .then((sessions) => {
        if (cancelled) return;
        const secs = sessions
          .filter((s) => s.status === "completed")
          .reduce((sum, s) => sum + (s.durationSeconds ?? 0), 0);
        setFocusSeconds({ state: "ready", value: secs });
      })
      .catch(() => {
        if (!cancelled) setFocusSeconds({ state: "unavailable" });
      });
    return () => {
      cancelled = true;
    };
  }, [today]);

  // Start the schedule near the current hour so it is not a wall of empty morning.
  useEffect(() => {
    const el = scheduleRef.current;
    if (!el || dayEvents.state !== "ready") return;
    const hour = isToday ? new Date().getHours() : 8;
    el.scrollTop = Math.max(0, (hour - 7) * 56);
  }, [dayEvents.state, isToday]);

  const coloredDayEvents = useMemo(() => {
    if (dayEvents.state !== "ready") return [];
    return dayEvents.value.map((event) => {
      const ws = workspaces.find((w) => w.id === event.workspaceId);
      const fromWorkspace = ws ? normalizeColorHex(ws.color) : null;
      return {
        ...event,
        calendarColor: fromWorkspace ?? event.calendarColor ?? null,
      };
    });
  }, [dayEvents, workspaces]);

  const taskBuckets = useMemo(() => {
    const list = tasks.state === "ready" ? tasks.value : [];
    const start = startOfDay(new Date());
    const end = addDays(start, 1);
    const open = list.filter((t) => t.status !== "completed");
    const todayTasks = open.filter((t) => {
      if (!t.due_at) return true;
      const d = new Date(t.due_at);
      return d >= start && d < end;
    });
    const upcomingTasks = open.filter(
      (t) => t.due_at != null && new Date(t.due_at) >= end,
    );
    const completed = list
      .filter((t) => t.status === "completed")
      .sort(
        (a, b) =>
          new Date(b.completed_at ?? 0).getTime() -
          new Date(a.completed_at ?? 0).getTime(),
      );
    const doneToday = completed.filter(
      (t) => t.completed_at != null && new Date(t.completed_at) >= start,
    );
    return { todayTasks, upcomingTasks, completed, doneToday };
  }, [tasks]);

  const visibleTasks = (
    tab === "today"
      ? taskBuckets.todayTasks
      : tab === "upcoming"
        ? taskBuckets.upcomingTasks
        : taskBuckets.completed
  ).slice(0, 6);

  async function toggleTask(task: Task) {
    if (!isSupabaseConfigured()) return;
    const completed = task.status === "completed";
    await createClient()
      .from("tasks")
      .update({
        status: completed ? "pending" : "completed",
        completed_at: completed ? null : new Date().toISOString(),
      })
      .eq("id", task.id);
    await loadTasks();
  }

  async function handleDelete(event: CalendarEvent) {
    if (!eventsApi.canDeleteCalendarEvent(event)) return;
    if (!confirm("Delete this event?")) return;
    try {
      await eventsApi.deleteEvent(event.id);
      setSelected(null);
      loadEvents();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to delete");
    }
  }

  const now = new Date();
  const name = user?.firstName?.trim();
  const dateLabel = now.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const dayLabel = day.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  const tasksReady = tasks.state === "ready";
  const openToday = taskBuckets.todayTasks.length;
  const doneToday = taskBuckets.doneToday.length;
  const dueTotal = openToday + doneToday;

  const upcomingEvents =
    upcoming.state === "ready"
      ? upcoming.value
          .filter((e) => dateKey(new Date(e.start)) !== dateKey(today))
          .slice(0, 4)
      : [];
  const nothingPlanned =
    dayEvents.state === "ready" &&
    dayEvents.value.length === 0 &&
    tasksReady &&
    openToday === 0 &&
    isToday;

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] md:text-3xl">
            {greetingForHour(now.getHours())}
            {name ? `, ${name}` : ""} <span aria-hidden>👋</span>
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Here&apos;s your plan for today.
          </p>
        </div>
        <p className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] px-3 py-1.5 text-sm font-medium text-[var(--text-primary)]">
          {dateLabel}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Tasks left today"
          value={
            tasks.state === "loading"
              ? "…"
              : tasksReady
                ? String(openToday)
                : "Unavailable"
          }
          icon={CheckSquare}
          tint="var(--success)"
          unavailable={tasks.state === "unavailable"}
        />
        <Stat
          label={isToday ? "Events today" : `Events, ${dayLabel}`}
          value={
            dayEvents.state === "loading"
              ? "…"
              : dayEvents.state === "ready"
                ? String(dayEvents.value.length)
                : "Unavailable"
          }
          icon={CalendarDays}
          tint="var(--information)"
          unavailable={dayEvents.state === "unavailable"}
        />
        <Stat
          label="Focus time today"
          value={
            focusSeconds.state === "loading"
              ? "…"
              : focusSeconds.state === "ready"
                ? focusSeconds.value > 0
                  ? formatDuration(focusSeconds.value)
                  : "None yet"
                : "Unavailable"
          }
          icon={BarChart3}
          tint="var(--projects)"
          unavailable={focusSeconds.state === "unavailable"}
        />
        <div className="flex items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4">
          <div className="min-w-0">
            <p
              className={`truncate font-bold leading-tight ${
                tasks.state === "unavailable"
                  ? "text-lg text-[var(--text-tertiary)]"
                  : "text-2xl text-[var(--text-primary)]"
              }`}
            >
              {tasks.state === "loading"
                ? "…"
                : tasksReady
                  ? dueTotal > 0
                    ? `${doneToday} of ${dueTotal}`
                    : "None due"
                  : "Unavailable"}
            </p>
            <p className="truncate text-xs text-[var(--text-secondary)]">
              Tasks done today
            </p>
          </div>
          <ProgressRing
            done={tasksReady ? doneToday : 0}
            total={tasksReady ? dueTotal : 0}
          />
        </div>
      </div>

      {nothingPlanned && !planDismissed && (
        <div className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4 md:p-5">
          <h2 className="text-base font-semibold text-[var(--text-primary)]">
            Build a plan you can finish
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-[var(--text-secondary)]">
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

      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <Card
          title={isToday ? "Today's schedule" : `Schedule, ${dayLabel}`}
          action={
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label="Previous day"
                onClick={() => setDay((d) => addDays(d, -1))}
                className="rounded-md p-1.5 text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)]"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setDay(startOfDay(new Date()))}
                disabled={isToday}
                className="rounded-md px-2 py-1 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] disabled:opacity-50"
              >
                Today
              </button>
              <button
                type="button"
                aria-label="Next day"
                onClick={() => setDay((d) => addDays(d, 1))}
                className="rounded-md p-1.5 text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)]"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          }
        >
          {dayEvents.state === "unavailable" ? (
            <p className="py-10 text-center text-sm text-[var(--text-tertiary)]">
              Unavailable. The schedule could not be loaded.
            </p>
          ) : (
            <div ref={scheduleRef} className="max-h-[34rem] overflow-y-auto">
              <DayTimeline
                day={day}
                events={coloredDayEvents}
                loading={dayEvents.state === "loading"}
                onSelectEvent={setSelected}
                onCreateAt={() => router.push("/calendar?create=1")}
              />
            </div>
          )}
        </Card>

        <div className="space-y-5">
          <Card
            title="Tasks"
            action={
              <Link
                href="/tasks"
                className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-[var(--brand-500)] hover:bg-[var(--surface-secondary)]"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden /> Add
              </Link>
            }
          >
            <div
              role="tablist"
              aria-label="Task filter"
              className="mb-3 inline-flex rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-secondary)] p-0.5"
            >
              {taskTabs.map((t) => (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  aria-selected={tab === t}
                  onClick={() => setTab(t)}
                  className={`rounded-[var(--radius-sm)] px-3 py-1 text-xs font-medium capitalize transition-colors ${
                    tab === t
                      ? "bg-[var(--brand-500)] text-[var(--text-inverse)]"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            {tasks.state === "loading" ? (
              <p className="py-6 text-center text-sm text-[var(--text-tertiary)]">
                Loading tasks…
              </p>
            ) : tasks.state === "unavailable" ? (
              <p className="py-6 text-center text-sm text-[var(--text-tertiary)]">
                Unavailable. Tasks could not be loaded.
              </p>
            ) : visibleTasks.length === 0 ? (
              <p className="py-6 text-center text-sm text-[var(--text-tertiary)]">
                {tab === "today"
                  ? "No tasks for today."
                  : tab === "upcoming"
                    ? "No upcoming tasks."
                    : "Nothing completed yet."}
              </p>
            ) : (
              <ul className="m-0 list-none divide-y divide-[var(--border-subtle)] p-0">
                {visibleTasks.map((task) => {
                  const done = task.status === "completed";
                  return (
                    <li
                      key={task.id}
                      className="flex items-center gap-3 py-2.5"
                    >
                      <button
                        type="button"
                        onClick={() => void toggleTask(task)}
                        aria-label={
                          done
                            ? `Mark ${task.title} as not done`
                            : `Mark ${task.title} as done`
                        }
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                          done
                            ? "border-[var(--brand-500)] bg-[var(--brand-500)] text-[var(--text-inverse)]"
                            : "border-[var(--border-strong)] hover:border-[var(--brand-500)]"
                        }`}
                      >
                        {done && <Check className="h-3 w-3" strokeWidth={3} />}
                      </button>
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/tasks/${task.id}`}
                          className={`block truncate text-sm font-medium hover:underline ${
                            done
                              ? "text-[var(--text-tertiary)] line-through"
                              : "text-[var(--text-primary)]"
                          }`}
                        >
                          {task.title}
                        </Link>
                        <p
                          className={`text-xs capitalize ${
                            priorityStyle[task.priority] ??
                            "text-[var(--text-tertiary)]"
                          }`}
                        >
                          {task.priority}
                          {task.due_at ? ` · ${dueLabel(task.due_at)}` : ""}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card
            title="Upcoming"
            action={
              <Link
                href="/calendar"
                className="text-xs font-medium text-[var(--brand-500)] hover:underline"
              >
                View all
              </Link>
            }
          >
            {upcoming.state === "loading" ? (
              <p className="py-4 text-center text-sm text-[var(--text-tertiary)]">
                Loading events…
              </p>
            ) : upcoming.state === "unavailable" ? (
              <p className="py-4 text-center text-sm text-[var(--text-tertiary)]">
                Unavailable. Events could not be loaded.
              </p>
            ) : upcomingEvents.length === 0 ? (
              <p className="py-4 text-center text-sm text-[var(--text-tertiary)]">
                Nothing after today in the next week.
              </p>
            ) : (
              <ul className="m-0 list-none space-y-2.5 p-0">
                {upcomingEvents.map((event) => (
                  <li key={event.id}>
                    <button
                      type="button"
                      onClick={() => setSelected(event)}
                      className="flex w-full items-center gap-3 rounded-[var(--radius-md)] text-left hover:bg-[var(--surface-secondary)]"
                    >
                      <span
                        aria-hidden
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--information)_16%,transparent)] text-[var(--information)]"
                      >
                        <CalendarDays className="h-4 w-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-[var(--text-primary)]">
                          {event.title}
                        </span>
                        <span className="block text-xs text-[var(--text-secondary)]">
                          {eventWhen(event)}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <div className="max-w-sm">
        <FounderHubHomeButton />
      </div>

      {selected && (
        <EventDetailModal
          event={selected}
          onClose={() => setSelected(null)}
          onDelete={() => void handleDelete(selected)}
        />
      )}
    </div>
  );
}
