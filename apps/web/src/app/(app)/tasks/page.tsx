"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
};

const filters = ["all", "today", "upcoming", "completed"] as const;

export default function TasksPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<(typeof filters)[number]>("today");
  const [title, setTitle] = useState("");
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
      const { data, error: qErr } = await supabase
        .from("tasks")
        .select("id, title, status, priority, due_at, description")
        .order("created_at", { ascending: false });
      if (qErr) throw new Error(qErr.message);
      setTasks((data as Task[]) ?? []);
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
      priority: "medium",
      due_at: due.toISOString(),
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

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Tasks</h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Synced to Supabase with RLS.
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

      {error && (
        <p className="text-sm text-[var(--error)]">{error}</p>
      )}

      <form onSubmit={addTask} className="flex gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="New task"
          className="min-w-0 flex-1 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--brand-500)]"
        />
        <Button type="submit">Add</Button>
      </form>

      <ul className="space-y-2 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-3">
        {loading ? (
          <li className="text-sm text-[var(--text-tertiary)] p-2">Loading…</li>
        ) : visible.length === 0 ? (
          <li className="text-sm text-[var(--text-secondary)] p-2">
            No tasks here yet.
          </li>
        ) : (
          visible.map((task) => (
            <li
              key={task.id}
              className="flex items-center gap-3 rounded-[var(--radius-md)] px-2 py-2 hover:bg-[var(--surface-secondary)]"
            >
              <button
                type="button"
                onClick={() => void toggle(task)}
                className={`h-5 w-5 rounded-full border ${
                  task.status === "completed"
                    ? "border-[var(--brand-500)] bg-[var(--brand-500)] text-[10px] text-[var(--text-inverse)]"
                    : "border-[var(--border-strong)]"
                }`}
              >
                {task.status === "completed" ? "✓" : ""}
              </button>
              <span
                className={`flex-1 text-sm ${
                  task.status === "completed"
                    ? "line-through text-[var(--text-tertiary)]"
                    : "text-[var(--text-primary)]"
                }`}
              >
                {task.title}
              </span>
              <span className="text-[10px] uppercase text-[var(--text-tertiary)]">
                {task.priority}
              </span>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
