"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/Button";
import { useAuth } from "@/providers/AuthProvider";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import * as projectsApi from "@/lib/projects-supabase";
import type { Project } from "@/lib/projects-supabase";

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

const priorities = ["low", "medium", "high", "urgent"] as const;

export function TaskDetailPage() {
  const { user } = useAuth();
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = useMemo(() => {
    const fromPath = String(params.id ?? "");
    if (fromPath && fromPath !== "_") return fromPath;
    return String(searchParams.get("id") ?? "");
  }, [params.id, searchParams]);
  const [task, setTask] = useState<Task | null>(null);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<string>("medium");
  const [dueDate, setDueDate] = useState("");
  const [projectId, setProjectId] = useState("");
  const [newSub, setNewSub] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!isSupabaseConfigured() || !id) {
      setLoading(false);
      setTask(null);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const supabase = createClient();
      const [taskRes, subRes, proj] = await Promise.all([
        supabase
          .from("tasks")
          .select("id, title, status, priority, due_at, description, project_id")
          .eq("id", id)
          .maybeSingle(),
        supabase
          .from("subtasks")
          .select("id, task_id, title, status, position")
          .eq("task_id", id)
          .order("position", { ascending: true }),
        projectsApi.listProjects(),
      ]);
      if (taskRes.error) throw new Error(taskRes.error.message);
      if (!taskRes.data) {
        setTask(null);
        return;
      }
      const t = taskRes.data as Task;
      setTask(t);
      setTitle(t.title);
      setDescription(t.description ?? "");
      setPriority(t.priority);
      setProjectId(t.project_id ?? "");
      setDueDate(
        t.due_at ? new Date(t.due_at).toISOString().slice(0, 10) : ""
      );
      setSubtasks((subRes.data as Subtask[]) ?? []);
      setProjects(proj);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    if (!task) return;
    setSaving(true);
    setError("");
    try {
      const supabase = createClient();
      const due_at = dueDate
        ? new Date(`${dueDate}T23:59:59`).toISOString()
        : null;
      const { error: err } = await supabase
        .from("tasks")
        .update({
          title: title.trim() || "Untitled",
          description: description.trim() || null,
          priority,
          due_at,
          project_id: projectId || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", task.id);
      if (err) throw new Error(err.message);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function toggleComplete() {
    if (!task) return;
    const done = task.status === "completed";
    const supabase = createClient();
    await supabase
      .from("tasks")
      .update({
        status: done ? "pending" : "completed",
        completed_at: done ? null : new Date().toISOString(),
      })
      .eq("id", task.id);
    await load();
  }

  async function addSubtask(e: React.FormEvent) {
    e.preventDefault();
    if (!newSub.trim() || !task) return;
    const supabase = createClient();
    const { error: err } = await supabase.from("subtasks").insert({
      task_id: task.id,
      title: newSub.trim(),
      status: "pending",
      position: subtasks.length + 1,
    });
    if (err) {
      setError(err.message);
      return;
    }
    setNewSub("");
    await load();
  }

  async function toggleSub(s: Subtask) {
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

  async function remove() {
    if (!task || !confirm("Delete this task?")) return;
    const supabase = createClient();
    await supabase.from("tasks").delete().eq("id", task.id);
    router.push("/tasks");
  }

  if (loading) {
    return <p className="text-[var(--text-secondary)]">Loading…</p>;
  }
  if (!task) {
    return (
      <div className="space-y-3">
        <p className="text-[var(--text-secondary)]">Task not found.</p>
        <Link href="/tasks" className="text-[var(--brand-500)] text-sm">
          Back to tasks
        </Link>
      </div>
    );
  }

  const done = task.status === "completed";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/tasks"
          className="text-sm font-medium text-[var(--brand-500)]"
        >
          ← Tasks
        </Link>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" type="button" onClick={remove}>
            Delete
          </Button>
          <Button size="sm" type="button" onClick={() => void save()} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-[var(--error)]">{error}</p>}

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full bg-transparent text-2xl font-bold text-[var(--text-primary)] outline-none"
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Notes"
        rows={4}
        className="w-full rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--brand-500)]"
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-xs text-[var(--text-secondary)] space-y-1">
          Priority
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="mt-1 w-full rounded-md border border-[var(--border-subtle)] bg-[var(--surface-primary)] px-2 py-1.5 text-sm"
          >
            {priorities.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-[var(--text-secondary)] space-y-1">
          Due
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="mt-1 w-full rounded-md border border-[var(--border-subtle)] bg-[var(--surface-primary)] px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-xs text-[var(--text-secondary)] space-y-1">
          Project
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="mt-1 w-full rounded-md border border-[var(--border-subtle)] bg-[var(--surface-primary)] px-2 py-1.5 text-sm"
          >
            <option value="">No project</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <Button type="button" onClick={() => void toggleComplete()}>
        {done ? "Mark incomplete" : "Mark complete"}
      </Button>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">
          Subtasks
        </h2>
        <ul className="space-y-1">
          {subtasks.map((s) => (
            <li key={s.id} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void toggleSub(s)}
                className={`h-4 w-4 rounded border text-[9px] ${
                  s.status === "completed"
                    ? "border-[var(--brand-500)] bg-[var(--brand-500)] text-black"
                    : "border-[var(--border-strong)]"
                }`}
              >
                {s.status === "completed" ? "✓" : ""}
              </button>
              <span
                className={`text-sm ${
                  s.status === "completed"
                    ? "line-through text-[var(--text-tertiary)]"
                    : "text-[var(--text-primary)]"
                }`}
              >
                {s.title}
              </span>
            </li>
          ))}
        </ul>
        <form onSubmit={addSubtask} className="flex gap-2">
          <input
            value={newSub}
            onChange={(e) => setNewSub(e.target.value)}
            placeholder="Add subtask"
            className="min-w-0 flex-1 rounded-md border border-[var(--border-subtle)] bg-[var(--surface-primary)] px-3 py-1.5 text-sm outline-none"
          />
          <Button type="submit" size="sm">
            Add
          </Button>
        </form>
      </div>
      {!user && null}
    </div>
  );
}
