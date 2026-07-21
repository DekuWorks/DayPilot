"use client";

import { useState } from "react";
import { Button } from "@/components/Button";
import type { CalendarEvent } from "@/lib/events-supabase";
import { dateKey, formatTime } from "./calendar-utils";

export function CreateEventModal({
  date,
  defaultStartTime = "09:00",
  onClose,
  onSubmit,
}: {
  date: Date;
  defaultStartTime?: string;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    start: string;
    end: string;
    description?: string;
  }) => Promise<void>;
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
  const [saving, setSaving] = useState(false);

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
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="bg-[var(--surface-primary)] border border-[var(--border-subtle)] rounded-2xl shadow-xl max-w-md w-full p-6">
        <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">
          New event
        </h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
              Title
            </label>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--brand-500)]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
              Date
            </label>
            <input
              type="date"
              required
              value={day}
              onChange={(e) => setDay(e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--brand-500)]"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                Start
              </label>
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--brand-500)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                End
              </label>
              <input
                type="time"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--brand-500)]"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-4 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--brand-500)] resize-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
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
        {event.description && (
          <p className="text-[var(--text-secondary)] text-sm mb-4">
            {event.description}
          </p>
        )}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onDelete}
            className="text-[var(--error)] hover:underline text-sm font-medium"
          >
            Delete
          </button>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
