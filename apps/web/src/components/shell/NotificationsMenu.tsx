"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import * as notifApi from "@/lib/notifications-supabase";
import type { AppNotification } from "@/lib/notifications-supabase";

function mapRow(row: {
  id: string;
  type: string;
  title: string;
  body: string | null;
  resource_type: string | null;
  resource_id: string | null;
  read_at: string | null;
  created_at: string;
}): AppNotification {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    resourceType: row.resource_type,
    resourceId: row.resource_id,
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}

export function NotificationsMenu() {
  const { user } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [live, setLive] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      await notifApi.syncReminderNotifications(user.id);
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
  }, [refresh]);

  useEffect(() => {
    if (!user || !isSupabaseConfigured()) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const n = mapRow(
              payload.new as Parameters<typeof mapRow>[0]
            );
            setItems((prev) => [n, ...prev.filter((x) => x.id !== n.id)]);
            if (!n.readAt) setUnread((c) => c + 1);
          } else if (payload.eventType === "UPDATE") {
            const n = mapRow(
              payload.new as Parameters<typeof mapRow>[0]
            );
            setItems((prev) => {
              const prevItem = prev.find((x) => x.id === n.id);
              if (prevItem && !prevItem.readAt && n.readAt) {
                setUnread((c) => Math.max(0, c - 1));
              }
              return prev.map((x) => (x.id === n.id ? n : x));
            });
          } else if (payload.eventType === "DELETE") {
            const old = payload.old as { id?: string; read_at?: string | null };
            if (old.id) {
              setItems((prev) => prev.filter((x) => x.id !== old.id));
              if (!old.read_at) setUnread((c) => Math.max(0, c - 1));
            }
          }
        }
      )
      .subscribe((status) => {
        setLive(status === "SUBSCRIBED");
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user]);

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
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                Notifications
              </p>
              <p className="text-[10px] text-[var(--text-tertiary)]">
                {live ? "Live" : "Connecting…"}
              </p>
            </div>
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
