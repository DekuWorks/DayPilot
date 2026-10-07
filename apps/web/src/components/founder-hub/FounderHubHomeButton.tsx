"use client";

import Link from "next/link";
import { useAuth } from "@/providers/AuthProvider";

/**
 * Home shortcut above the calendar.
 * Shown only when Nest GET /auth/me marks this account as the hub owner.
 */
export function FounderHubHomeButton() {
  const { user } = useAuth();
  const hub = user?.founderHub;
  if (hub?.isOwner !== true) return null;

  const unread = hub.unreadCount > 0 ? hub.unreadCount : 0;
  const label = unread > 0 ? `Founder Hub (${unread})` : "Founder Hub";

  return (
    <Link
      href="/settings/founder-inbox"
      className="flex min-h-11 w-full max-w-full items-center justify-center rounded-xl bg-[var(--brand-500)] px-4 py-3 text-center text-sm font-semibold text-black"
    >
      {label}
    </Link>
  );
}
