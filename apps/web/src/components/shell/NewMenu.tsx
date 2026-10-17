"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CalendarPlus, CheckSquare, Link2, Plus } from "lucide-react";

const items = [
  { href: "/calendar?create=1", label: "Event", icon: CalendarPlus },
  { href: "/tasks", label: "Task", icon: CheckSquare },
  { href: "/booking-links", label: "Booking link", icon: Link2 },
] as const;

/** "+ New" in the top bar. Each entry opens the screen where that thing is created. */
export function NewMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointer(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex min-h-9 items-center gap-1.5 rounded-[var(--radius-md)] bg-[var(--brand-500)] px-3 text-sm font-semibold text-[var(--text-inverse)] transition-colors hover:bg-[var(--brand-400)]"
      >
        <Plus className="h-4 w-4" strokeWidth={2.25} aria-hidden />
        New
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-48 overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-1 shadow-xl"
        >
          {items.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-[var(--radius-sm)] px-3 py-2 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--surface-secondary)]"
            >
              <Icon className="h-4 w-4 text-[var(--brand-500)]" aria-hidden />
              {label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
