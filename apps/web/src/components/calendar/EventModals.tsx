"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { canDeleteCalendarEvent, type CalendarEvent } from "@/lib/events";
import type { Workspace } from "@/lib/workspaces-supabase";
import { dateKey, formatTime } from "./calendar-utils";
import {
  ColorTagSelect,
  WorkspaceSelect,
  fieldClass,
} from "./ColorTagSelect";

export function CreateEventModal({
  date,
  defaultStartTime = "09:00",
  workspaces,
  onClose,
  onSubmit,
  onWorkspaceColorChange,
}: {
  date: Date;
  defaultStartTime?: string;
  workspaces: Workspace[];
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    start: string;
    end: string;
    description?: string;
    workspaceId?: string;
    calendarColor?: string;
  }) => Promise<void>;
  onWorkspaceColorChange?: (workspaceId: string, color: string) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [day, setDay] = useState(dateKey(date));
  const [startTime, setStartTime] = useState(defaultStartTime);
  const [endTime, setEndTime] = useState(() => {
    const [h, m] = defaultStartTime.split(":").map(Number);
    const endH = Math.min(23, h + 1);
    return `${String(endH).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  });
  const [description, setDescription] = useState("");
  const [workspaceId, setWorkspaceId] = useState(workspaces[0]?.id ?? "");
  const [color, setColor] = useState(workspaces[0]?.color ?? "#3D9B6A");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (workspaces.length === 0) return;
    const exists = workspaces.some((w) => w.id === workspaceId);
    if (!exists) {
      setWorkspaceId(workspaces[0].id);
      setColor(workspaces[0].color);
    }
  }, [workspaces, workspaceId]);

  function selectWorkspace(id: string) {
    setWorkspaceId(id);
    const ws = workspaces.find((w) => w.id === id);
    if (ws) setColor(ws.color);
  }

  async function selectColor(hex: string) {
    setColor(hex);
    if (workspaceId && onWorkspaceColorChange) {
      try {
        await onWorkspaceColorChange(workspaceId, hex);
      } catch {
        const ws = workspaces.find((w) => w.id === workspaceId);
        if (ws) setColor(ws.color);
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const start = new Date(`${day}T${startTime}:00`).toISOString();
      const end = new Date(`${day}T${endTime}:00`).toISOString();
      await onSubmit({
        title,
        start,
        end,
        description: description || undefined,
        workspaceId: workspaceId || undefined,
        calendarColor: color || undefined,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="bg-[var(--surface-primary)] border border-[var(--border-subtle)] rounded-2xl shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-[var(--text-primary)] mb-5">
          New event
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
              Title
            </label>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Event title"
              className={fieldClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
              Date
            </label>
            <input
              type="date"
              required
              value={day}
              onChange={(e) => setDay(e.target.value)}
              className={fieldClass}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
                Start
              </label>
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className={fieldClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
                End
              </label>
              <input
                type="time"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className={fieldClass}
              />
            </div>
          </div>
          {workspaces.length > 0 && (
            <>
              <WorkspaceSelect
                workspaces={workspaces}
                value={workspaceId}
                onChange={selectWorkspace}
              />
              <ColorTagSelect
                workspaces={workspaces}
                workspaceId={workspaceId}
                value={color}
                onChange={(hex) => void selectColor(hex)}
              />
            </>
          )}
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Optional notes"
              className={`${fieldClass} resize-none`}
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? "Saving…" : "Create"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function EventDetailModal({
  event,
  onClose,
  onDelete,
}: {
  event: CalendarEvent;
  onClose: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="bg-[var(--surface-primary)] border border-[var(--border-subtle)] rounded-2xl shadow-xl max-w-md w-full p-6">
        <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">
          {event.title}
        </h2>
        <p className="text-[var(--text-secondary)] text-sm mb-2">
          {new Date(event.start).toLocaleString()} – {formatTime(event.end)}
        </p>
        {event.source && event.source !== "native" && (
          <p className="text-xs text-[var(--text-tertiary)] mb-2">
            {event.source === "apple_eventkit" || event.source === "apple"
              ? "Apple Calendar"
              : event.source === "google"
                ? "Google Calendar"
                : event.source === "outlook"
                  ? "Microsoft Outlook"
                  : "Calendar"}
          </p>
        )}
        {event.description && (
          <p className="text-[var(--text-secondary)] text-sm mb-4">
            {event.description}
          </p>
        )}
        <div className="flex justify-end gap-3">
          {canDeleteCalendarEvent(event) && (
            <button
              type="button"
              onClick={onDelete}
              className="text-[var(--error)] hover:underline text-sm font-medium"
            >
              Delete
            </button>
          )}
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
