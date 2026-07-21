"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  Bell,
  CalendarDays,
  Menu,
  Search,
  Command,
} from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { useSidebarStore } from "@/stores/sidebar-store";

function greetingForHour(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function AppHeader({
  title,
  subtitle,
}: {
  title?: string;
  subtitle?: string;
}) {
  const { user } = useAuth();
  const setMobileOpen = useSidebarStore((s) => s.setMobileOpen);

  const { greeting, dateLabel } = useMemo(() => {
    const now = new Date();
    const name = user?.firstName || "there";
    return {
      greeting: `${greetingForHour(now.getHours())}, ${name}`,
      dateLabel: now.toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
    };
  }, [user?.firstName]);

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--background-primary)_88%,transparent)] backdrop-blur-md">
      <div className="flex items-center gap-3 px-4 py-3 md:px-6 md:py-4">
        <button
          type="button"
          className="md:hidden rounded-[var(--radius-md)] p-2 text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] hover:text-[var(--text-primary)]"
          aria-label="Open menu"
          onClick={() => setMobileOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="min-w-0 flex-1 md:max-w-xs lg:max-w-sm">
          <h1 className="truncate text-base font-semibold text-[var(--text-primary)] md:text-lg">
            {title ?? `${greeting}!`}
          </h1>
          <p className="truncate text-xs text-[var(--text-tertiary)] md:text-sm">
            {subtitle ?? dateLabel}
          </p>
        </div>

        <button
          type="button"
          className="hidden sm:flex flex-1 max-w-md items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] px-3 py-2 text-left text-sm text-[var(--text-tertiary)] hover:border-[var(--border-strong)] transition-colors"
          aria-label="Search (Command K)"
          title="Command palette coming soon"
          onClick={() => {
            /* Command palette Phase 4 */
          }}
        >
          <Search className="h-4 w-4 shrink-0" />
          <span className="flex-1 truncate">Search anything...</span>
          <kbd className="hidden md:inline-flex items-center gap-0.5 rounded border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--text-tertiary)]">
            <Command className="h-3 w-3" />K
          </kbd>
        </button>

        <div className="flex items-center gap-1 md:gap-2">
          <button
            type="button"
            className="relative rounded-[var(--radius-md)] p-2 text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] hover:text-[var(--text-primary)]"
            aria-label="Notifications"
            title="Notifications coming soon"
          >
            <Bell className="h-5 w-5" strokeWidth={1.75} />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[var(--brand-500)]" />
          </button>
          <Link
            href="/calendar"
            className="rounded-[var(--radius-md)] p-2 text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] hover:text-[var(--text-primary)]"
            aria-label="Calendar"
          >
            <CalendarDays className="h-5 w-5" strokeWidth={1.75} />
          </Link>
          <Link
            href="/settings"
            className="ml-1 flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--brand-500)_18%,transparent)]"
            title="Account settings"
          >
            {user?.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.avatarUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-xs font-semibold text-[var(--brand-500)]">
                {user?.firstName?.[0] ?? user?.email?.[0]?.toUpperCase() ?? "?"}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
