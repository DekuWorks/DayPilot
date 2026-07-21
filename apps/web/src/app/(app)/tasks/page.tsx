"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/Button";
import { useAuth } from "@/providers/AuthProvider";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

type Task = {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_at: string | null;
  description: string | null;
  project_id: string | null;
};

type Subtask = {
  id: string;
  task_id: string;
  title: string;
  status: string;
  position: number;
};

type ProjectOption = { id: string; name: string; color: string };

const filters = ["all", "today", "upcoming", "completed"] as const;
const priorities = ["low", "medium", "high", "urgent"] as const;

const priorityColor: Record<string, string> = {
  low: "text-[var(--text-tertiary)]",
  medium: "text-[var(--text-secondary)]",
  high: "text-amber-400",
  urgent: "text-[var(--error)]",
};

export default function TasksPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [filter, setFilter] = useState<(typeof filters)[number]>("today");
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<(typeof priorities)[number]>("medium");
  const [projectId, setProjectId] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [newSubtask, setNewSubtask] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setError("Supabase is not configured");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const supabase = createClient();
      const [tasksRes, subRes, projRes] = await Promise.all([
        supabase
          .from("tasks")
          .select(
            "id, title, status, priority, due_at, description, project_id"
          )
          .order("created_at", { ascending: false }),
        supabase
          .from("subtasks")
          .select("id, task_id, title, status, position")
          .order("position", { ascending: true }),
        supabase
          .from("projects")
          .select("id, name, color")
          .neq("status", "archived")
          .order("name"),
      ]);
      if (tasksRes.error) throw new Error(tasksRes.error.message);
      setTasks((tasksRes.data as Task[]) ?? []);
      setSubtasks((subRes.data as Subtask[]) ?? []);
      setProjects((projRes.data as ProjectOption[]) ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return tasks.filter((t) => {
      if (filter === "all") return t.status !== "cancelled";
      if (filter === "completed") return t.status === "completed";
      if (filter === "today") {
        if (t.status === "completed") return false;
        if (!t.due_at) return true;
        const d = new Date(t.due_at);
        return d >= start && d < end;
      }
      if (t.status === "completed" || !t.due_at) return false;
      return new Date(t.due_at) >= end;
    });
  }, [tasks, filter]);

  const subtasksByTask = useMemo(() => {
    const map: Record<string, Subtask[]> = {};
    for (const s of subtasks) {
      (map[s.task_id] ??= []).push(s);
    }
    return map;
  }, [subtasks]);

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !user || !isSupabaseConfigured()) return;
    const supabase = createClient();
    const due = new Date();
    due.setHours(23, 59, 59, 999);
    const { error: insErr } = await supabase.from("tasks").insert({
      user_id: user.id,
      title: title.trim(),
      status: "pending",
      priority,
      due_at: due.toISOString(),
      project_id: projectId || null,
    });
    if (insErr) {
      setError(insErr.message);
      return;
    }
    setTitle("");
    await load();
  }

  async function toggle(task: Task) {
    if (!isSupabaseConfigured()) return;
    const supabase = createClient();
    const completed = task.status === "completed";
    await supabase
      .from("tasks")
      .update({
        status: completed ? "pending" : "completed",
        completed_at: completed ? null : new Date().toISOString(),
      })
      .eq("id", task.id);
    await load();
  }

  async function cyclePriority(task: Task) {
    const idx = priorities.indexOf(
      task.priority as (typeof priorities)[number]
    );
    const next = priorities[(idx + 1) % priorities.length];
    const supabase = createClient();
    await supabase.from("tasks").update({ priority: next }).eq("id", task.id);
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, priority: next } : t))
    );
  }

  async function addSubtask(taskId: string) {
    const text = (newSubtask[taskId] ?? "").trim();
    if (!text || !isSupabaseConfigured()) return;
    const supabase = createClient();
    const position = (subtasksByTask[taskId]?.length ?? 0) + 1;
    const { error: err } = await supabase.from("subtasks").insert({
      task_id: taskId,
      title: text,
      status: "pending",
      position,
    });
    if (err) {
      setError(err.message);
      return;
    }
    setNewSubtask((prev) => ({ ...prev, [taskId]: "" }));
    await load();
  }

  async function toggleSubtask(s: Subtask) {
    const supabase = createClient();
    await supabase
      .from("subtasks")
      .update({
        status: s.status === "completed" ? "pending" : "completed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", s.id);
    setSubtasks((prev) =>
      prev.map((x) =>
        x.id === s.id
          ? {
              ...x,
              status: s.status === "completed" ? "pending" : "completed",
            }
          : x
      )
    );
  }

  function projectName(id: string | null) {
    if (!id) return null;
    return projects.find((p) => p.id === id)?.name ?? null;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Tasks</h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Priorities, projects, and subtasks — synced to Supabase.
        </p>
      </div>

      <div className="flex flex-wrap gap-1 rounded-[var(--radius-md)] bg-[var(--surface-secondary)] p-1 w-fit">
        {filters.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize ${
              filter === id
                ? "bg-[var(--brand-500)] text-[var(--text-inverse)]"
                : "text-[var(--text-secondary)]"
            }`}
          >
            {id}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-[var(--error)]">{error}</p>}

      <form onSubmit={addTask} className="space-y-2">
        <div className="flex gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="New task"
            className="min-w-0 flex-1 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--brand-500)]"
          />
          <Button type="submit">Add</Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={priority}
            onChange={(e) =>
              setPriority(e.target.value as (typeof priorities)[number])
            }
            className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] px-3 py-1.5 text-xs outline-none"
          >
            {priorities.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] px-3 py-1.5 text-xs outline-none"
          >
            <option value="">No project</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </form>

      <ul className="space-y-2 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-3">
        {loading ? (
          <li className="text-sm text-[var(--text-tertiary)] p-2">Loading…</li>
        ) : visible.length === 0 ? (
          <li className="text-sm text-[var(--text-secondary)] p-2">
            No tasks here yet.
          </li>
        ) : (
          visible.map((task) => {
            const kids = subtasksByTask[task.id] ?? [];
            const isOpen = expanded[task.id];
            const proj = projectName(task.project_id);
            return (
              <li
                key={task.id}
                className="rounded-[var(--radius-md)] px-2 py-2 hover:bg-[var(--surface-secondary)]"
              >
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setExpanded((prev) => ({
                        ...prev,
                        [task.id]: !prev[task.id],
                      }))
                    }
                    className="text-[var(--text-tertiary)]"
                    aria-label="Toggle subtasks"
                  >
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => void toggle(task)}
                    className={`h-5 w-5 shrink-0 rounded-full border ${
                      task.status === "completed"
                        ? "border-[var(--brand-500)] bg-[var(--brand-500)] text-[10px] text-[var(--text-inverse)]"
                        : "border-[var(--border-strong)]"
                    }`}
                  >
                    {task.status === "completed" ? "✓" : ""}
                  </button>
                  <span
                    className={`min-w-0 flex-1 text-sm ${
                      task.status === "completed"
                        ? "line-through text-[var(--text-tertiary)]"
                        : "text-[var(--text-primary)]"
                    }`}
                  >
                    {task.title}
                    {proj && (
                      <span className="ml-2 text-[10px] text-[var(--text-tertiary)]">
                        {proj}
                      </span>
                    )}
                  </span>
                  {kids.length > 0 && (
                    <span className="text-[10px] text-[var(--text-tertiary)]">
                      {kids.filter((s) => s.status === "completed").length}/
                      {kids.length}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => void cyclePriority(task)}
                    className={`text-[10px] uppercase font-medium ${
                      priorityColor[task.priority] ?? priorityColor.medium
                    }`}
                    title="Cycle priority"
                  >
                    {task.priority}
                  </button>
                </div>

                {isOpen && (
                  <div className="ml-9 mt-2 space-y-1.5 border-l border-[var(--border-subtle)] pl-3">
                    {kids.map((s) => (
                      <div key={s.id} className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => void toggleSubtask(s)}
                          className={`h-4 w-4 rounded border text-[9px] ${
                            s.status === "completed"
                              ? "border-[var(--brand-500)] bg-[var(--brand-500)] text-black"
                              : "border-[var(--border-strong)]"
                          }`}
                        >
                          {s.status === "completed" ? "✓" : ""}
                        </button>
                        <span
                          className={`text-xs ${
                            s.status === "completed"
                              ? "line-through text-[var(--text-tertiary)]"
                              : "text-[var(--text-secondary)]"
                          }`}
                        >
                          {s.title}
                        </span>
                      </div>
                    ))}
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        void addSubtask(task.id);
                      }}
                      className="flex gap-1 pt-1"
                    >
                      <input
                        value={newSubtask[task.id] ?? ""}
                        onChange={(e) =>
                          setNewSubtask((prev) => ({
                            ...prev,
                            [task.id]: e.target.value,
                          }))
                        }
                        placeholder="Add subtask"
                        className="min-w-0 flex-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-[var(--brand-500)]"
                      />
                      <button
                        type="submit"
                        className="rounded-lg p-1 text-[var(--brand-500)] hover:bg-[color-mix(in_srgb,var(--brand-500)_15%,transparent)]"
                        aria-label="Add subtask"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </form>
                  </div>
                )}
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
