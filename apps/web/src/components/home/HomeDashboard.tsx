"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarPlus,
  CheckSquare,
  StickyNote,
  Timer,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Send,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { Button } from "@/components/Button";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import * as eventsApi from "@/lib/events-supabase";
import { generatePilotBrief, getTodayBrief } from "@/lib/pilot-brief-api";

type HomeEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
  meetingUrl?: string | null;
};

type HomeTask = {
  id: string;
  title: string;
  status: string;
  due_at?: string | null;
  due_date?: string | null;
  priority?: string;
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function MetricCard({
  label,
  value,
  delta,
  positive,
  accent,
}: {
  label: string;
  value: string;
  delta: string;
  positive: boolean;
  accent: string;
}) {
  const Icon = positive ? ArrowUpRight : ArrowDownRight;
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4 md:p-5">
      <p className="text-[var(--text-data-label)] font-medium uppercase tracking-wide text-[var(--text-tertiary)]">
        {label}
      </p>
      <p className="mt-2 text-[var(--text-data-value)] font-bold text-[var(--text-primary)]">
        {value}
      </p>
      <p
        className="mt-2 inline-flex items-center gap-1 text-xs font-medium"
        style={{ color: accent }}
      >
        <Icon className="h-3.5 w-3.5" />
        {delta}
      </p>
    </div>
  );
}

function MiniCalendar({ selected }: { selected: Date }) {
  const year = selected.getFullYear();
  const month = selected.getMonth();
  const first = new Date(year, month, 1);
  const startPad = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date().getDate();
  const isCurrentMonth =
    new Date().getMonth() === month && new Date().getFullYear() === year;

  const cells: (number | null)[] = [
    ...Array.from({ length: startPad }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold text-[var(--text-primary)]">
          {selected.toLocaleString(undefined, { month: "long", year: "numeric" })}
        </h3>
        <Link
          href="/calendar"
          className="text-xs font-medium text-[var(--brand-500)] hover:underline"
        >
          View
        </Link>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium text-[var(--text-tertiary)]">
        {["S", "M", "T", "W", "T", "F", "S"].map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1 text-center text-xs">
        {cells.map((day, i) => (
          <div
            key={i}
            className={`flex h-8 items-center justify-center rounded-full ${
              day && isCurrentMonth && day === today
                ? "bg-[var(--brand-500)] font-semibold text-[var(--text-inverse)]"
                : "text-[var(--text-secondary)]"
            }`}
          >
            {day ?? ""}
          </div>
        ))}
      </div>
    </div>
  );
}

export function HomeDashboard() {
  const { user } = useAuth();
  const [events, setEvents] = useState<HomeEvent[]>([]);
  const [tasks, setTasks] = useState<HomeTask[]>([]);
  const [taskFilter, setTaskFilter] = useState<"all" | "today" | "upcoming" | "completed">(
    "today"
  );
  const [loading, setLoading] = useState(true);
  const [briefQuestion, setBriefQuestion] = useState("");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [briefText, setBriefText] = useState("");
  const [briefLoading, setBriefLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const from = startOfDay().toISOString();
      const to = new Date(startOfDay().getTime() + 7 * 86400000).toISOString();

      let nextEvents: HomeEvent[] = [];
      try {
        const rows = await eventsApi.listEvents({ from, to });
        nextEvents = rows.map((e) => ({
          id: e.id,
          title: e.title,
          start: e.start,
          end: e.end,
          meetingUrl: e.meetingUrl,
        }));
      } catch {
        nextEvents = [];
      }

      if (isSupabaseConfigured()) {
        const supabase = createClient();
        const { data: taskRows } = await supabase
          .from("tasks")
          .select("id, title, status, due_at, due_date, priority")
          .order("due_at", { ascending: true, nullsFirst: false })
          .limit(40);
        setTasks((taskRows as HomeTask[]) ?? []);
      } else {
        setTasks([]);
      }

      setEvents(nextEvents);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void (async () => {
      const existing = await getTodayBrief();
      if (existing?.content?.summary) {
        setBriefText(existing.content.summary);
      }
    })();
  }, []);

  async function refreshBrief() {
    setBriefLoading(true);
    try {
      const brief = await generatePilotBrief();
      setBriefText(brief.content.summary);
    } catch {
      setBriefText(
        `Hello ${user?.firstName || "there"}, here's your brief for today. You have ${todayEvents.length} meeting${todayEvents.length === 1 ? "" : "s"} and ${dueCount} task${dueCount === 1 ? "" : "s"} due.`
      );
    } finally {
      setBriefLoading(false);
    }
  }

  const todayEvents = useMemo(() => {
    const start = startOfDay().getTime();
    const end = endOfDay().getTime();
    return events
      .filter((e) => {
        const t = new Date(e.start).getTime();
        return t >= start && t <= end;
      })
      .sort((a, b) => +new Date(a.start) - +new Date(b.start));
  }, [events]);

  const upcomingEvents = useMemo(() => {
    const end = endOfDay().getTime();
    return events
      .filter((e) => new Date(e.start).getTime() > end)
      .slice(0, 5);
  }, [events]);

  const filteredTasks = useMemo(() => {
    const today = startOfDay();
    const tomorrow = new Date(today.getTime() + 86400000);
    return tasks.filter((t) => {
      if (taskFilter === "all") return t.status !== "cancelled";
      if (taskFilter === "completed") return t.status === "completed";
      const due = t.due_at || t.due_date;
      if (taskFilter === "today") {
        if (t.status === "completed") return false;
        if (!due) return true;
        const d = new Date(due);
        return d >= today && d < tomorrow;
      }
      // upcoming
      if (t.status === "completed") return false;
      if (!due) return false;
      return new Date(due) >= tomorrow;
    });
  }, [tasks, taskFilter]);

  const completedCount = tasks.filter((t) => t.status === "completed").length;
  const dueCount = tasks.filter((t) => t.status !== "completed").length;

  async function toggleTask(task: HomeTask) {
    if (!isSupabaseConfigured()) return;
    const supabase = createClient();
    const next =
      task.status === "completed"
        ? { status: "pending", completed_at: null }
        : { status: "completed", completed_at: new Date().toISOString() };
    await supabase.from("tasks").update(next).eq("id", task.id);
    await load();
  }

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    if (!newTaskTitle.trim() || !user || !isSupabaseConfigured()) return;
    const supabase = createClient();
    await supabase.from("tasks").insert({
      user_id: user.id,
      title: newTaskTitle.trim(),
      status: "pending",
      priority: "medium",
      due_at: endOfDay().toISOString(),
    });
    setNewTaskTitle("");
    await load();
  }

  const fallbackBrief = `Hello ${user?.firstName || "there"}, here's your brief for today. You have ${todayEvents.length} meeting${todayEvents.length === 1 ? "" : "s"} and ${dueCount} task${dueCount === 1 ? "" : "s"} due. Your day looks ${todayEvents.length <= 4 ? "balanced" : "busy"}.`;
  const displayBrief = briefText || fallbackBrief;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-[var(--text-secondary)]">
          You have{" "}
          <span className="font-medium text-[var(--text-primary)]">
            {todayEvents.length} events
          </span>{" "}
          today and{" "}
          <span className="font-medium text-[var(--text-primary)]">
            {dueCount} tasks
          </span>{" "}
          to complete.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Events Today"
          value={String(todayEvents.length)}
          delta="from your calendar"
          positive
          accent="var(--brand-500)"
        />
        <MetricCard
          label="Tasks Due"
          value={String(dueCount)}
          delta="open items"
          positive={dueCount < 10}
          accent="var(--projects)"
        />
        <MetricCard
          label="Focus Time"
          value="—"
          delta="track sessions soon"
          positive
          accent="var(--focus)"
        />
        <MetricCard
          label="Completed"
          value={String(completedCount)}
          delta="tasks done"
          positive
          accent="var(--calendar-personal)"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_1fr_0.95fr]">
        {/* Schedule */}
        <section className="space-y-4">
          <div className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4 md:p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-[var(--text-primary)]">
                Today&apos;s Schedule
              </h2>
              <Link
                href="/calendar"
                className="text-xs font-medium text-[var(--brand-500)] hover:underline"
              >
                View Calendar
              </Link>
            </div>
            {loading ? (
              <p className="text-sm text-[var(--text-tertiary)]">Loading…</p>
            ) : todayEvents.length === 0 ? (
              <p className="text-sm text-[var(--text-secondary)]">
                No events scheduled today.
              </p>
            ) : (
              <ul className="space-y-3">
                {todayEvents.map((event) => (
                  <li
                    key={event.id}
                    className="flex gap-3 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-secondary)] p-3"
                  >
                    <div className="w-16 shrink-0 text-xs font-medium text-[var(--brand-500)]">
                      {formatTime(event.start)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-[var(--text-primary)]">
                        {event.title}
                      </p>
                      <p className="text-xs text-[var(--text-tertiary)]">
                        {formatTime(event.start)} – {formatTime(event.end)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4 md:p-5">
            <h2 className="mb-3 text-base font-semibold text-[var(--text-primary)]">
              Upcoming
            </h2>
            {upcomingEvents.length === 0 ? (
              <p className="text-sm text-[var(--text-secondary)]">
                Nothing else this week yet.
              </p>
            ) : (
              <ul className="space-y-2">
                {upcomingEvents.map((event) => (
                  <li key={event.id} className="text-sm">
                    <span className="font-medium text-[var(--text-primary)]">
                      {event.title}
                    </span>
                    <span className="text-[var(--text-tertiary)]">
                      {" · "}
                      {new Date(event.start).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Tasks */}
        <section className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4 md:p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              Tasks
            </h2>
            <Link
              href="/tasks"
              className="text-xs font-medium text-[var(--brand-500)] hover:underline"
            >
              Open
            </Link>
          </div>
          <div className="mb-4 flex flex-wrap gap-1 rounded-[var(--radius-md)] bg-[var(--surface-secondary)] p-1">
            {(
              [
                ["all", "All"],
                ["today", "Today"],
                ["upcoming", "Upcoming"],
                ["completed", "Completed"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTaskFilter(id)}
                className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  taskFilter === id
                    ? "bg-[var(--brand-500)] text-[var(--text-inverse)]"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <ul className="mb-4 max-h-72 space-y-2 overflow-y-auto">
            {filteredTasks.length === 0 ? (
              <li className="text-sm text-[var(--text-secondary)]">
                No tasks in this view.
              </li>
            ) : (
              filteredTasks.map((task) => (
                <li
                  key={task.id}
                  className="flex items-center gap-3 rounded-[var(--radius-md)] px-2 py-2 hover:bg-[var(--surface-secondary)]"
                >
                  <button
                    type="button"
                    onClick={() => void toggleTask(task)}
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                      task.status === "completed"
                        ? "border-[var(--brand-500)] bg-[var(--brand-500)] text-[var(--text-inverse)]"
                        : "border-[var(--border-strong)]"
                    }`}
                    aria-label={
                      task.status === "completed"
                        ? "Mark incomplete"
                        : "Mark complete"
                    }
                  >
                    {task.status === "completed" ? "✓" : ""}
                  </button>
                  <span
                    className={`flex-1 truncate text-sm ${
                      task.status === "completed"
                        ? "text-[var(--text-tertiary)] line-through"
                        : "text-[var(--text-primary)]"
                    }`}
                  >
                    {task.title}
                  </span>
                  <span className="text-[10px] font-medium text-[var(--brand-500)]">
                    {taskFilter === "completed"
                      ? "Done"
                      : task.due_at || task.due_date
                        ? "Due"
                        : "Today"}
                  </span>
                </li>
              ))
            )}
          </ul>
          <form onSubmit={addTask} className="flex gap-2">
            <input
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="Add new task"
              className="min-w-0 flex-1 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none focus:ring-2 focus:ring-[var(--brand-500)]"
            />
            <Button type="submit" size="sm" className="shrink-0 gap-1">
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </form>
        </section>

        {/* Right column */}
        <section className="space-y-4">
          <div className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-5 text-center">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--brand-500)_18%,transparent)] shadow-[0_0_40px_rgba(66,232,95,0.25)]">
              <Sparkles className="h-7 w-7 text-[var(--brand-500)]" />
            </div>
            <div className="mb-2 inline-flex items-center gap-1 rounded-md bg-[color-mix(in_srgb,var(--brand-500)_16%,transparent)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--brand-500)]">
              Pilot Brief · AI
            </div>
            <p className="mb-4 text-sm leading-relaxed text-[var(--text-secondary)]">
              {briefLoading ? "Generating brief…" : displayBrief}
            </p>
            <div className="mb-3 flex justify-center gap-2">
              <Link href="/pilot-brief">
                <Button variant="outline" size="sm">
                  Open Pilot Brief
                </Button>
              </Link>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void refreshBrief()}
                disabled={briefLoading}
              >
                {briefLoading ? "…" : "Refresh"}
              </Button>
            </div>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                setBriefQuestion("");
                void refreshBrief();
              }}
            >
              <input
                value={briefQuestion}
                onChange={(e) => setBriefQuestion(e.target.value)}
                placeholder="Ask me anything..."
                className="min-w-0 flex-1 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none focus:ring-2 focus:ring-[var(--brand-500)]"
              />
              <button
                type="submit"
                className="rounded-[var(--radius-md)] bg-[var(--brand-500)] p-2 text-[var(--text-inverse)]"
                aria-label="Send"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>

          <MiniCalendar selected={new Date()} />

          <div className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4">
            <h3 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">
              Quick Actions
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                {
                  href: "/calendar",
                  label: "New Event",
                  icon: CalendarPlus,
                  color: "var(--brand-500)",
                },
                {
                  href: "/tasks",
                  label: "New Task",
                  icon: CheckSquare,
                  color: "var(--meetings)",
                },
                {
                  href: "/notes",
                  label: "New Note",
                  icon: StickyNote,
                  color: "var(--projects)",
                },
                {
                  href: "/insights",
                  label: "Focus Timer",
                  icon: Timer,
                  color: "var(--calendar-personal)",
                },
              ].map((action) => (
                <Link
                  key={action.label}
                  href={action.href}
                  className="flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 py-2.5 text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--border-strong)]"
                >
                  <action.icon
                    className="h-4 w-4"
                    style={{ color: action.color }}
                  />
                  {action.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                Integrations
              </h3>
              <Link
                href="/integrations"
                className="text-xs font-medium text-[var(--brand-500)] hover:underline"
              >
                Manage
              </Link>
            </div>
            <p className="text-xs text-[var(--text-secondary)]">
              Connect Google Calendar, Outlook, Zoom, and more from Integrations.
            </p>
          </div>
        </section>
      </div>

      {/* Insights strip */}
      <section className="grid gap-4 md:grid-cols-3">
        {[
          { title: "Focus Time", hint: "Weekly trend", color: "var(--brand-500)" },
          { title: "Meetings", hint: `${todayEvents.length} today`, color: "var(--meetings)" },
          {
            title: "Tasks Completed",
            hint: `${completedCount} total`,
            color: "var(--brand-400)",
          },
        ].map((card) => (
          <div
            key={card.title}
            className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4"
          >
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              {card.title}
            </h3>
            <p className="mt-1 text-xs text-[var(--text-tertiary)]">{card.hint}</p>
            <div className="mt-4 flex h-12 items-end gap-1">
              {[40, 55, 35, 70, 50, 80, 65].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-sm opacity-80"
                  style={{ height: `${h}%`, background: card.color }}
                />
              ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
