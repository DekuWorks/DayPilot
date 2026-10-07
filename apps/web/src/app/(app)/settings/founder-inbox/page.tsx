"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { listInbox, type HubSuggestion } from "@/lib/founder-hub-api";

const CATEGORIES = [
  "",
  "feature_idea",
  "improvement",
  "bug",
  "integration",
  "other",
];
const STATUSES = [
  "",
  "submitted",
  "under_review",
  "planned",
  "building",
  "shipped",
  "closed",
];

export default function FounderInboxPage() {
  const [items, setItems] = useState<HubSuggestion[]>([]);
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [unread, setUnread] = useState(false);
  const [error, setError] = useState("");

  async function load(next = { category, status, q, unread }) {
    setError("");
    try {
      setItems(await listInbox(next));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load messages");
    }
  }

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 15000);
    return () => window.clearInterval(timer);
    // Reload on filter changes via the form, and poll the current filters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, status, unread]);

  return (
    <div className="max-w-3xl space-y-4">
      <Link href="/settings" className="text-sm text-[var(--brand-500)]">
        Settings
      </Link>
      <h1 className="text-2xl font-bold text-[var(--text-primary)]">
        Founder messages
      </h1>
      <form
        className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap"
        onSubmit={(event) => {
          event.preventDefault();
          void load();
        }}
      >
        <input
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder="Search"
          className="min-h-11 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 py-2 text-sm sm:w-auto sm:min-w-40"
        />
        <select
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          className="min-h-11 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 py-2 text-sm sm:w-auto"
        >
          {CATEGORIES.map((value) => (
            <option key={value || "all-cat"} value={value}>
              {value || "All categories"}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="min-h-11 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 py-2 text-sm sm:w-auto"
        >
          {STATUSES.map((value) => (
            <option key={value || "all-status"} value={value}>
              {value || "All statuses"}
            </option>
          ))}
        </select>
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={unread}
            onChange={(event) => setUnread(event.target.checked)}
          />
          Unread
        </label>
        <button
          type="submit"
          className="min-h-11 rounded-lg px-3 text-sm font-medium text-[var(--brand-500)]"
        >
          Search
        </button>
      </form>
      {error ? <p className="text-sm text-[var(--error)]">{error}</p> : null}
      {items.map((item) => (
        <Link
          key={item.id}
          href={`/settings/founder-inbox/${item.id}`}
          className="block rounded-xl border border-[var(--border-subtle)] px-4 py-3"
        >
          <p className="font-medium text-[var(--text-primary)]">
            {item.title}
            {item.ownerUnread ? " · unread" : ""}
          </p>
          <p className="text-sm text-[var(--text-secondary)]">
            {item.categoryLabel} · {item.statusLabel}
            {item.founderEmail ? ` · ${item.founderEmail}` : ""}
          </p>
        </Link>
      ))}
      {items.length === 0 && !error ? (
        <p className="text-sm text-[var(--text-secondary)]">
          No founder messages.
        </p>
      ) : null}
    </div>
  );
}
