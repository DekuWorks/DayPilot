"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { getHubSummary, type HubSummary } from "@/lib/founder-hub-api";

export function FounderHubAccountLinks() {
  const { user } = useAuth();
  const [hub, setHub] = useState<HubSummary | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getHubSummary()
      .then((summary) => {
        if (!cancelled) setHub(summary);
      })
      .catch(() => {
        if (!cancelled) setHub(null);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const owner = user?.founderHub?.isOwner === true;
  const showHub = hub?.canRead === true;
  if (!owner && !showHub) return null;

  return (
    <div className="space-y-3">
      {showHub ? (
        <Link
          href="/settings/founder-hub"
          className="block min-h-11 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-4 py-3"
        >
          <p className="text-sm font-medium text-[var(--text-primary)]">
            Founder Hub
          </p>
          <p className="text-sm text-[var(--text-secondary)]">
            {hub?.label ?? "Founding Member"}
            {hub && hub.unreadReplyCount > 0
              ? ` · ${hub.unreadReplyCount} unread`
              : ""}
          </p>
        </Link>
      ) : null}
      {owner ? (
        <Link
          href="/settings/founder-inbox"
          className="block min-h-11 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-4 py-3"
        >
          <p className="text-sm font-medium text-[var(--text-primary)]">
            Founder messages
            {user.founderHub && user.founderHub.unreadCount > 0
              ? ` (${user.founderHub.unreadCount})`
              : ""}
          </p>
          <p className="text-sm text-[var(--text-secondary)]">
            Suggestions and replies from founding members.
          </p>
        </Link>
      ) : null}
    </div>
  );
}
