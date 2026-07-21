"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import * as notifApi from "@/lib/notifications-supabase";
import type { AppNotification } from "@/lib/notifications-supabase";

export function NotificationsMenu() {
  const { user } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      await notifApi.syncUpcomingMeetingReminders(user.id);
      const [list, count] = await Promise.all([
        notifApi.listNotifications(),
        notifApi.unreadCount(),
      ]);
      setItems(list);
      setUnread(count);
    } catch {
      // Keep UI quiet if notifications table isn't reachable
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), 60_000);
    return () => window.clearInterval(id);
  }, [refresh]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!panelRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  async function onOpen() {
    setOpen((v) => !v);
    if (!open) await refresh();
  }

  async function handleClick(n: AppNotification) {
    if (!n.readAt) {
      await notifApi.markRead(n.id);
      setItems((prev) =>
        prev.map((x) =>
          x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x
        )
      );
      setUnread((c) => Math.max(0, c - 1));
    }
    setOpen(false);
    if (n.resourceType === "event") router.push("/meetings");
    else if (n.resourceType === "task") router.push("/tasks");
    else router.push("/dashboard");
  }

  async function handleMarkAll() {
    await notifApi.markAllRead();
    setItems((prev) =>
      prev.map((x) => ({ ...x, readAt: x.readAt ?? new Date().toISOString() }))
    );
    setUnread(0);
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        className="relative rounded-[var(--radius-md)] p-2 text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] hover:text-[var(--text-primary)]"
        aria-label="Notifications"
        aria-expanded={open}
        onClick={() => void onOpen()}
      >
        <Bell className="h-5 w-5" strokeWidth={1.75} />
        {unread > 0 && (
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[var(--brand-500)]" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[min(100vw-2rem,22rem)] overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] shadow-xl">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-3 py-2.5">
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              Notifications
            </p>
            {unread > 0 && (
              <button
                type="button"
                onClick={() => void handleMarkAll()}
                className="text-xs font-medium text-[var(--brand-500)] hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>
          <ul className="max-h-80 overflow-y-auto">
            {loading && items.length === 0 ? (
              <li className="px-3 py-6 text-center text-sm text-[var(--text-tertiary)]">
                Loading…
              </li>
            ) : items.length === 0 ? (
              <li className="px-3 py-6 text-center text-sm text-[var(--text-tertiary)]">
                You&apos;re all caught up.
              </li>
            ) : (
              items.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => void handleClick(n)}
                    className={`flex w-full flex-col gap-0.5 border-b border-[var(--border-subtle)] px-3 py-3 text-left last:border-b-0 hover:bg-[var(--surface-secondary)] ${
                      !n.readAt
                        ? "bg-[color-mix(in_srgb,var(--brand-500)_6%,transparent)]"
                        : ""
                    }`}
                  >
                    <span className="text-sm font-medium text-[var(--text-primary)]">
                      {n.title}
                    </span>
                    {n.body && (
                      <span className="text-xs text-[var(--text-secondary)]">
                        {n.body}
                      </span>
                    )}
                    <span className="text-[10px] text-[var(--text-tertiary)]">
                      {new Date(n.createdAt).toLocaleString()}
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
