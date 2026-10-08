"use client";

import Link from "next/link";
import { useAuth } from "@/providers/AuthProvider";

const linkClass =
  "flex min-h-11 w-full max-w-full items-center justify-center rounded-xl bg-[var(--brand-500)] px-4 py-3 text-center text-sm font-semibold text-black";

/**
 * Home shortcut above the calendar.
 * Owner: Nest `founderHub.isOwner` → private inbox.
 * Founding subscriber: Nest `founderHub.isFoundingMember` → member hub.
 * A Pro or free account sees neither. Both can show for an owner who is
 * also a Founding 25 subscriber.
 */
export function FounderHubHomeButton() {
  const { user } = useAuth();
  const hub = user?.founderHub;
  const owner = hub?.isOwner === true;
  const member = hub?.isFoundingMember === true;
  if (!owner && !member) return null;

  const unread = owner && hub && hub.unreadCount > 0 ? hub.unreadCount : 0;
  const ownerName = member ? "Founder messages" : "Founder Hub";
  const ownerLabel = unread > 0 ? `${ownerName} (${unread})` : ownerName;

  const ownerLink = owner ? (
    <Link href="/settings/founder-inbox" className={linkClass}>
      {ownerLabel}
    </Link>
  ) : null;
  const memberLink = member ? (
    <Link href="/settings/founder-hub" className={linkClass}>
      Founder Hub
    </Link>
  ) : null;

  if (ownerLink && memberLink) {
    return (
      <div className="space-y-2">
        {memberLink}
        {ownerLink}
      </div>
    );
  }
  return ownerLink ?? memberLink;
}
