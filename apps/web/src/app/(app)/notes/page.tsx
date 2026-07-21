"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { useAuth } from "@/providers/AuthProvider";
import * as notesApi from "@/lib/notes-supabase";
import type { Note } from "@/lib/notes-supabase";

export default function NotesPage() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const selected = notes.find((n) => n.id === selectedId) ?? null;

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const list = await notesApi.listNotes();
      setNotes(list);
      setSelectedId((prev) => {
        if (prev && list.some((n) => n.id === prev)) return prev;
        return list[0]?.id ?? null;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load notes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!selected) {
      setTitle("");
      setContent("");
      return;
    }
    setTitle(selected.title);
    setContent(selected.content);
  }, [selected]);

  async function handleCreate() {
    if (!user) return;
    try {
      const note = await notesApi.createNote(user.id);
      setNotes((prev) => [note, ...prev]);
      setSelectedId(note.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create note");
    }
  }

  async function handleSave() {
    if (!selectedId) return;
    setSaving(true);
    setError("");
    try {
      const updated = await notesApi.updateNote(selectedId, { title, content });
      setNotes((prev) =>
        prev.map((n) => (n.id === updated.id ? updated : n))
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleArchive() {
    if (!selectedId || !confirm("Archive this note?")) return;
    try {
      await notesApi.archiveNote(selectedId);
      setNotes((prev) => prev.filter((n) => n.id !== selectedId));
      setSelectedId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to archive");
    }
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] min-h-[420px] flex-col gap-4 lg:flex-row">
      <aside className="flex w-full shrink-0 flex-col rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] lg:w-72">
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-4 py-3">
          <h1 className="text-lg font-bold text-[var(--text-primary)]">Notes</h1>
          <Button size="sm" onClick={handleCreate}>
            New
          </Button>
        </div>
        <ul className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <li className="px-2 py-3 text-sm text-[var(--text-tertiary)]">
              Loading…
            </li>
          ) : notes.length === 0 ? (
            <li className="px-2 py-3 text-sm text-[var(--text-tertiary)]">
              No notes yet.
            </li>
          ) : (
            notes.map((note) => (
              <li key={note.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(note.id)}
                  className={`w-full rounded-xl px-3 py-2.5 text-left transition-colors ${
                    selectedId === note.id
                      ? "bg-[color-mix(in_srgb,var(--brand-500)_15%,transparent)]"
                      : "hover:bg-[var(--surface-secondary)]"
                  }`}
                >
                  <div className="truncate text-sm font-medium text-[var(--text-primary)]">
                    {note.title || "Untitled"}
                  </div>
                  <div className="truncate text-xs text-[var(--text-tertiary)]">
                    {new Date(note.updatedAt).toLocaleString()}
                  </div>
                </button>
              </li>
            ))
          )}
        </ul>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)]">
        {error && (
          <p className="border-b border-[var(--border-subtle)] px-4 py-2 text-sm text-[var(--error)]">
            {error}
          </p>
        )}
        {!selectedId ? (
          <div className="flex flex-1 items-center justify-center p-8 text-sm text-[var(--text-secondary)]">
            Select a note or create a new one.
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] px-4 py-3">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="min-w-0 flex-1 bg-transparent text-lg font-semibold text-[var(--text-primary)] outline-none"
                placeholder="Title"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleArchive}
                className="shrink-0"
              >
                Archive
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write in markdown…"
              className="min-h-0 flex-1 resize-none bg-transparent px-4 py-4 text-sm leading-relaxed text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]"
            />
          </>
        )}
      </section>
    </div>
  );
}
