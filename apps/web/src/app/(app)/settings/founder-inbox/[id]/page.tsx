"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  getInboxThread,
  inboxNote,
  inboxReply,
  inboxStatus,
  markInboxRead,
  type HubSuggestion,
} from "@/lib/founder-hub-api";

const STATUSES = [
  "submitted",
  "under_review",
  "planned",
  "building",
  "shipped",
  "closed",
];

export default function FounderInboxThreadPage() {
  const params = useParams<{ id: string }>();
  const [item, setItem] = useState<HubSuggestion | null>(null);
  const [reply, setReply] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    void getInboxThread(params.id)
      .then(setItem)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Could not load thread");
      });
  }, [params.id]);

  if (!item) {
    return (
      <p className="text-sm text-[var(--text-secondary)]">
        {error || "Loading…"}
      </p>
    );
  }

  return (
    <div className="max-w-2xl space-y-4">
      <Link
        href="/settings/founder-inbox"
        className="text-sm text-[var(--brand-500)]"
      >
        Founder messages
      </Link>
      <h1 className="text-2xl font-bold text-[var(--text-primary)]">
        {item.title}
      </h1>
      <p className="text-sm text-[var(--text-secondary)]">
        {item.statusLabel}
        {item.founderEmail ? ` · ${item.founderEmail}` : ""}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          className="text-sm text-[var(--brand-500)]"
          onClick={() => void markInboxRead(item.id, true).then(setItem)}
        >
          Mark read
        </button>
        <button
          type="button"
          className="text-sm text-[var(--brand-500)]"
          onClick={() => void markInboxRead(item.id, false).then(setItem)}
        >
          Mark unread
        </button>
      </div>
      <label className="block text-sm">
        Status
        <select
          value={item.status}
          className="mt-1 block rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 py-2"
          onChange={(event) => {
            void inboxStatus(item.id, event.target.value).then(setItem);
          }}
        >
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </label>
      {item.messages.map((message) => (
        <div
          key={message.id}
          className="rounded-xl border border-[var(--border-subtle)] px-4 py-3 text-sm"
        >
          <p className="mb-1 text-xs text-[var(--text-secondary)]">
            {message.kind}
          </p>
          {message.body}
        </div>
      ))}
      {error ? <p className="text-sm text-[var(--error)]">{error}</p> : null}
      <form
        className="space-y-2"
        onSubmit={(event) => {
          event.preventDefault();
          void inboxReply(item.id, reply)
            .then((next) => {
              setItem(next as HubSuggestion);
              setReply("");
            })
            .catch((err: unknown) => {
              setError(err instanceof Error ? err.message : "Could not reply");
            });
        }}
      >
        <textarea
          value={reply}
          onChange={(event) => setReply(event.target.value)}
          rows={3}
          placeholder="Reply to the founder"
          className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded-lg bg-[var(--brand-500)] px-4 py-2 text-sm font-semibold text-black"
        >
          Reply
        </button>
      </form>
      <form
        className="space-y-2"
        onSubmit={(event) => {
          event.preventDefault();
          void inboxNote(item.id, note)
            .then((next) => {
              setItem(next as HubSuggestion);
              setNote("");
            })
            .catch((err: unknown) => {
              setError(
                err instanceof Error ? err.message : "Could not save note",
              );
            });
        }}
      >
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={2}
          placeholder="Internal note. Founders never see this."
          className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 py-2 text-sm"
        />
        <button type="submit" className="text-sm text-[var(--text-primary)]">
          Save internal note
        </button>
      </form>
    </div>
  );
}
