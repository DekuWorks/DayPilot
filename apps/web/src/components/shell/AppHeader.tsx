"use client";

import Link from "next/link";
import { Menu, Search, Command } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { useSidebarStore } from "@/stores/sidebar-store";
import { NewMenu } from "./NewMenu";
import { NotificationsMenu } from "./NotificationsMenu";

/**
 * Top bar: search, New, notifications, profile.
 * The greeting lives on the Today page, not here.
 */
export function AppHeader({
  title,
  subtitle,
  onOpenSearch,
}: {
  title?: string;
  subtitle?: string;
  onOpenSearch?: () => void;
}) {
  const { user } = useAuth();
  const setMobileOpen = useSidebarStore((s) => s.setMobileOpen);

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--background-primary)_88%,transparent)] backdrop-blur-md">
      <div className="flex items-center gap-2 px-3 py-3 sm:gap-3 sm:px-4 md:px-6">
        <button
          type="button"
          className="md:hidden shrink-0 rounded-[var(--radius-md)] p-2 text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] hover:text-[var(--text-primary)]"
          aria-label="Open menu"
          onClick={() => setMobileOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </button>

        {title ? (
          <div className="min-w-0 md:max-w-xs">
            <h1 className="truncate text-base font-semibold text-[var(--text-primary)] md:text-lg">
              {title}
            </h1>
            {subtitle ? (
              <p className="truncate text-xs text-[var(--text-tertiary)] md:text-sm">
                {subtitle}
              </p>
            ) : null}
          </div>
        ) : null}

        <button
          type="button"
          className="flex min-w-0 max-w-md flex-1 items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] px-3 py-2 text-left text-sm text-[var(--text-tertiary)] transition-colors hover:border-[var(--border-strong)]"
          aria-label="Search (Command K)"
          onClick={() => onOpenSearch?.()}
        >
          <Search className="h-4 w-4 shrink-0" />
          <span className="flex-1 truncate">
            Search tasks, events, or people…
          </span>
          <kbd className="hidden md:inline-flex items-center gap-0.5 rounded border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--text-tertiary)]">
            <Command className="h-3 w-3" />K
          </kbd>
        </button>

        <div className="ml-auto flex items-center gap-1 md:gap-2">
          <NewMenu />
          <NotificationsMenu />
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
