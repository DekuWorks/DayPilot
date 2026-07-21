"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { useAuth } from "@/providers/AuthProvider";
import * as projectsApi from "@/lib/projects-supabase";
import type { Project } from "@/lib/projects-supabase";

const STATUSES = ["active", "on_hold", "completed"] as const;
const COLORS = ["#42E85F", "#3B82F6", "#F59E0B", "#EF4444", "#A855F7"];

export default function ProjectsPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newColor, setNewColor] = useState(COLORS[0]);

  const selected = projects.find((p) => p.id === selectedId) ?? null;

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const list = await projectsApi.listProjects();
      setProjects(list);
      setSelectedId((prev) => {
        if (prev && list.some((p) => p.id === prev)) return prev;
        return list[0]?.id ?? null;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load projects");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !newName.trim()) return;
    try {
      const project = await projectsApi.createProject(user.id, {
        name: newName.trim(),
        description: newDescription.trim() || undefined,
        color: newColor,
      });
      setProjects((prev) => [project, ...prev]);
      setSelectedId(project.id);
      setCreating(false);
      setNewName("");
      setNewDescription("");
      setNewColor(COLORS[0]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create");
    }
  }

  async function patchSelected(
    patch: Parameters<typeof projectsApi.updateProject>[1]
  ) {
    if (!selectedId) return;
    try {
      const updated = await projectsApi.updateProject(selectedId, patch);
      setProjects((prev) =>
        prev.map((p) => (p.id === updated.id ? updated : p))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update");
    }
  }

  async function handleArchive() {
    if (!selectedId || !confirm("Archive this project?")) return;
    try {
      await projectsApi.archiveProject(selectedId);
      setProjects((prev) => prev.filter((p) => p.id !== selectedId));
      setSelectedId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to archive");
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            Projects
          </h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Lightweight projects synced to Supabase.
          </p>
        </div>
        <Button size="sm" onClick={() => setCreating(true)}>
          New project
        </Button>
      </div>

      {error && <p className="text-sm text-[var(--error)]">{error}</p>}

      {creating && (
        <form
          onSubmit={handleCreate}
          className="space-y-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4"
        >
          <input
            required
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Project name"
            className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--brand-500)]"
          />
          <textarea
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            placeholder="Description (optional)"
            rows={2}
            className="w-full resize-none rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--brand-500)]"
          />
          <div className="flex flex-wrap items-center gap-2">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setNewColor(c)}
                className={`h-7 w-7 rounded-full ${
                  newColor === c ? "ring-2 ring-[var(--text-primary)] ring-offset-2 ring-offset-[var(--surface-primary)]" : ""
                }`}
                style={{ background: c }}
                aria-label={`Color ${c}`}
              />
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCreating(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm">
              Create
            </Button>
          </div>
        </form>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <ul className="space-y-2 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-3">
          {loading ? (
            <li className="p-2 text-sm text-[var(--text-tertiary)]">Loading…</li>
          ) : projects.length === 0 ? (
            <li className="p-2 text-sm text-[var(--text-tertiary)]">
              No projects yet.
            </li>
          ) : (
            projects.map((project) => (
              <li key={project.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(project.id)}
                  className={`flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition-colors ${
                    selectedId === project.id
                      ? "bg-[color-mix(in_srgb,var(--brand-500)_12%,transparent)]"
                      : "hover:bg-[var(--surface-secondary)]"
                  }`}
                >
                  <span
                    className="mt-1 h-3 w-3 shrink-0 rounded-full"
                    style={{ background: project.color }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-[var(--text-primary)]">
                      {project.name}
                    </span>
                    <span className="block text-xs capitalize text-[var(--text-tertiary)]">
                      {project.status.replace("_", " ")} · {project.progress}%
                    </span>
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>

        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-5">
          {!selected ? (
            <p className="text-sm text-[var(--text-secondary)]">
              Select a project to view details.
            </p>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <input
                  value={selected.name}
                  onChange={(e) =>
                    setProjects((prev) =>
                      prev.map((p) =>
                        p.id === selected.id
                          ? { ...p, name: e.target.value }
                          : p
                      )
                    )
                  }
                  onBlur={(e) =>
                    patchSelected({ name: e.target.value.trim() || selected.name })
                  }
                  className="min-w-0 flex-1 bg-transparent text-xl font-bold text-[var(--text-primary)] outline-none"
                />
                <Button variant="outline" size="sm" onClick={handleArchive}>
                  Archive
                </Button>
              </div>

              <textarea
                value={selected.description ?? ""}
                onChange={(e) =>
                  setProjects((prev) =>
                    prev.map((p) =>
                      p.id === selected.id
                        ? { ...p, description: e.target.value }
                        : p
                    )
                  )
                }
                onBlur={(e) =>
                  patchSelected({
                    description: e.target.value.trim() || null,
                  })
                }
                placeholder="Add a description…"
                rows={3}
                className="w-full resize-none rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--brand-500)]"
              />

              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
                  Status
                </label>
                <div className="flex flex-wrap gap-1">
                  {STATUSES.map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => patchSelected({ status })}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize ${
                        selected.status === status
                          ? "bg-[var(--brand-500)] text-black"
                          : "bg-[var(--surface-secondary)] text-[var(--text-secondary)]"
                      }`}
                    >
                      {status.replace("_", " ")}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
                  Progress ({selected.progress}%)
                </label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={selected.progress}
                  onChange={(e) => {
                    const progress = Number(e.target.value);
                    setProjects((prev) =>
                      prev.map((p) =>
                        p.id === selected.id ? { ...p, progress } : p
                      )
                    );
                  }}
                  onMouseUp={(e) =>
                    patchSelected({
                      progress: Number((e.target as HTMLInputElement).value),
                    })
                  }
                  onTouchEnd={(e) =>
                    patchSelected({
                      progress: Number((e.target as HTMLInputElement).value),
                    })
                  }
                  className="w-full accent-[var(--brand-500)]"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
                  Color
                </label>
                <div className="flex flex-wrap gap-2">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => patchSelected({ color: c })}
                      className={`h-7 w-7 rounded-full ${
                        selected.color === c
                          ? "ring-2 ring-[var(--text-primary)] ring-offset-2 ring-offset-[var(--surface-primary)]"
                          : ""
                      }`}
                      style={{ background: c }}
                      aria-label={`Color ${c}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
