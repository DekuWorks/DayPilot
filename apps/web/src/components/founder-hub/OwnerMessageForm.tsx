"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { startOwnerThread } from "@/lib/founder-hub-api";

export type MessageableFounder = {
  userId: string;
  label: string;
};

export function OwnerMessageForm({
  founders,
  recipientUserId,
}: {
  founders?: MessageableFounder[];
  recipientUserId?: string;
}) {
  const router = useRouter();
  const [recipient, setRecipient] = useState(
    recipientUserId ?? founders?.[0]?.userId ?? "",
  );
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const lockedRecipient = Boolean(recipientUserId);
  const choices = founders ?? [];
  const canCompose = lockedRecipient || choices.length > 0;

  async function send(event: React.FormEvent) {
    event.preventDefault();
    const target = recipientUserId || recipient;
    if (!target || busy) return;
    setBusy(true);
    setError("");
    try {
      const thread = await startOwnerThread({
        recipientUserId: target,
        title: title.trim(),
        body: body.trim(),
      });
      router.push(`/settings/founder-inbox/${thread.id}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not send that message",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={(event) => void send(event)}
      className="space-y-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] p-4"
    >
      <h2 className="font-semibold text-[var(--text-primary)]">New message</h2>
      {canCompose ? null : (
        <p className="text-sm text-[var(--text-secondary)]">
          No founding members with open access.
        </p>
      )}
      {!lockedRecipient && choices.length > 0 ? (
        <label className="block text-sm text-[var(--text-primary)]">
          Founder
          <select
            value={recipient}
            onChange={(event) => setRecipient(event.target.value)}
            required
            className="mt-1 block min-h-11 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-primary)] px-3 py-2"
          >
            <option value="">Choose a founder</option>
            {choices.map((person) => (
              <option key={person.userId} value={person.userId}>
                {person.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {canCompose ? (
        <label className="block text-sm text-[var(--text-primary)]">
          Subject
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
            maxLength={120}
            className="mt-1 block min-h-11 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-primary)] px-3 py-2"
          />
        </label>
      ) : null}
      {canCompose ? (
        <label className="block text-sm text-[var(--text-primary)]">
          Message
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            required
            maxLength={4000}
            rows={4}
            className="mt-1 block w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-primary)] px-3 py-2"
          />
        </label>
      ) : null}
      {error ? <p className="text-sm text-[var(--error)]">{error}</p> : null}
      {canCompose ? (
        <button
          type="submit"
          disabled={busy}
          className="min-h-11 rounded-lg bg-[var(--brand-500)] px-4 py-2 text-sm font-semibold text-black disabled:opacity-60"
        >
          {busy ? "Sending…" : "Send"}
        </button>
      ) : null}
    </form>
  );
}
