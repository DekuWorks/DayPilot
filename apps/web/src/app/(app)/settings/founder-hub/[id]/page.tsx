"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  getSuggestion,
  replyToSuggestion,
  type HubSuggestion,
} from "@/lib/founder-hub-api";

export default function FounderSuggestionPage() {
  const params = useParams<{ id: string }>();
  const [item, setItem] = useState<HubSuggestion | null>(null);
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void getSuggestion(params.id)
      .then(setItem)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Could not load suggestion");
      });
  }, [params.id]);

  async function send(event: React.FormEvent) {
    event.preventDefault();
    if (!body.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      const result = (await replyToSuggestion(params.id, body.trim())) as {
        suggestion: HubSuggestion;
      };
      setItem(result.suggestion);
      setBody("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send message");
    } finally {
      setBusy(false);
    }
  }

  if (!item) {
    return <p className="text-sm text-[var(--text-secondary)]">{error || "Loading…"}</p>;
  }

  return (
    <div className="max-w-2xl space-y-4">
      <Link href="/settings/founder-hub" className="text-sm text-[var(--brand-500)]">
        Founder Hub
      </Link>
      <h1 className="text-2xl font-bold text-[var(--text-primary)]">{item.title}</h1>
      <p className="text-sm text-[var(--text-secondary)]">
        {item.categoryLabel} · {item.statusLabel}
      </p>
      <div className="space-y-3">
        {item.messages.map((message) => (
          <div
            key={message.id}
            className="rounded-xl border border-[var(--border-subtle)] px-4 py-3 text-sm text-[var(--text-primary)]"
          >
            <p className="mb-1 text-xs text-[var(--text-secondary)]">{message.kind}</p>
            {message.body}
          </div>
        ))}
      </div>
      {error ? <p className="text-sm text-[var(--error)]">{error}</p> : null}
      <form onSubmit={(event) => void send(event)} className="space-y-2">
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          rows={3}
          placeholder="Follow up"
          className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-[var(--brand-500)] px-4 py-2 text-sm font-semibold text-black"
        >
          Send
        </button>
      </form>
    </div>
  );
}
