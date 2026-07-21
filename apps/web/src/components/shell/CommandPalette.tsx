"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { primaryNav, secondaryNav } from "./nav-config";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import * as eventsApi from "@/lib/events-supabase";

type CommandPaletteProps = {
  open: boolean;
  onClose: () => void;
};

type PaletteItem = {
  id: string;
  label: string;
  href: string;
  group: string;
  hint?: string;
};

const navActions: PaletteItem[] = [
  ...primaryNav.map((n) => ({
    id: `nav-${n.href}`,
    label: n.label,
    href: n.href,
    group: "Navigate",
  })),
  ...secondaryNav.map((n) => ({
    id: `nav-${n.href}`,
    label: n.label,
    href: n.href,
    group: "Account",
  })),
];

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [openEpoch, setOpenEpoch] = useState(0);
  const [dynamicItems, setDynamicItems] = useState<PaletteItem[]>([]);

  useEffect(() => {
    if (!open) return;
    void Promise.resolve().then(() => {
      setQuery("");
      setActive(0);
      setOpenEpoch((n) => n + 1);
    });
    const t = window.setTimeout(() => inputRef.current?.focus(), 20);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open || !isSupabaseConfigured()) return;
    let cancelled = false;
    void (async () => {
      try {
        const supabase = createClient();
        const from = new Date();
        from.setDate(from.getDate() - 7);
        const to = new Date();
        to.setDate(to.getDate() + 30);

        const [events, tasksRes, notesRes, contactsRes] = await Promise.all([
          eventsApi.listEvents({
            from: from.toISOString(),
            to: to.toISOString(),
          }),
          supabase
            .from("tasks")
            .select("id, title, status")
            .neq("status", "cancelled")
            .order("updated_at", { ascending: false })
            .limit(40),
          supabase
            .from("notes")
            .select("id, title")
            .is("archived_at", null)
            .order("updated_at", { ascending: false })
            .limit(30),
          supabase
            .from("contacts")
            .select("id, name, email")
            .order("name", { ascending: true })
            .limit(40),
        ]);

        if (cancelled) return;

        const items: PaletteItem[] = [
          ...events.slice(0, 40).map((e) => ({
            id: `event-${e.id}`,
            label: e.title,
            href: "/calendar",
            group: "Events",
            hint: new Date(e.start).toLocaleString(undefined, {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            }),
          })),
          ...((tasksRes.data as { id: string; title: string; status: string }[]) ??
            []
          ).map((t) => ({
            id: `task-${t.id}`,
            label: t.title,
            href: "/tasks",
            group: "Tasks",
            hint: t.status,
          })),
          ...((notesRes.data as { id: string; title: string }[]) ?? []).map(
            (n) => ({
              id: `note-${n.id}`,
              label: n.title || "Untitled note",
              href: "/notes",
              group: "Notes",
            })
          ),
          ...((contactsRes.data as {
            id: string;
            name: string;
            email: string | null;
          }[]) ?? []
          ).map((c) => ({
            id: `contact-${c.id}`,
            label: c.name,
            href: "/contacts",
            group: "Contacts",
            hint: c.email ?? undefined,
          })),
        ];
        setDynamicItems(items);
      } catch {
        if (!cancelled) setDynamicItems([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const all = [...navActions, ...dynamicItems];
    if (!q) return navActions;
    return all.filter(
      (a) =>
        a.label.toLowerCase().includes(q) ||
        a.group.toLowerCase().includes(q) ||
        a.hint?.toLowerCase().includes(q) ||
        a.href.toLowerCase().includes(q)
    );
  }, [query, dynamicItems]);

  function go(href: string) {
    onClose();
    router.push(href);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-start justify-center bg-black/60 p-4 pt-[12vh]"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
      >
        <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] px-3 py-3">
          <Search className="h-4 w-4 text-[var(--text-tertiary)]" />
          <input
            key={openEpoch}
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                onClose();
              } else if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((i) => Math.min(results.length - 1, i + 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((i) => Math.max(0, i - 1));
              } else if (e.key === "Enter" && results[active]) {
                e.preventDefault();
                go(results[active].href);
              }
            }}
            placeholder="Search pages, events, tasks…"
            className="min-w-0 flex-1 bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]"
          />
          <kbd className="rounded border border-[var(--border-subtle)] px-1.5 py-0.5 text-[10px] text-[var(--text-tertiary)]">
            esc
          </kbd>
        </div>
        <ul className="max-h-80 overflow-y-auto p-2">
          {results.length === 0 ? (
            <li className="px-3 py-6 text-center text-sm text-[var(--text-tertiary)]">
              No matches
            </li>
          ) : (
            results.map((item, i) => (
              <li key={item.id}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(item.href)}
                  className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm ${
                    i === active
                      ? "bg-[color-mix(in_srgb,var(--brand-500)_15%,transparent)] text-[var(--text-primary)]"
                      : "text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)]"
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">
                      {item.label}
                    </span>
                    {item.hint && (
                      <span className="block truncate text-xs text-[var(--text-tertiary)]">
                        {item.hint}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 text-xs text-[var(--text-tertiary)]">
                    {item.group}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
