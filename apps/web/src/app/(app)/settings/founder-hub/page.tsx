"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  createSuggestion,
  getHubSummary,
  getNoticePrefs,
  listBeta,
  listSuggestions,
  saveNoticePrefs,
  setBetaOptOut,
  uploadScreenshot,
  type BetaFeature,
  type HubSuggestion,
  type HubSummary,
  type NoticePrefs,
} from "@/lib/founder-hub-api";

const CATEGORIES = [
  ["feature_idea", "Feature Idea"],
  ["improvement", "Improvement"],
  ["bug", "Bug"],
  ["integration", "Integration"],
  ["other", "Other"],
] as const;

export default function FounderHubPage() {
  const [summary, setSummary] = useState<HubSummary | null>(null);
  const [items, setItems] = useState<HubSuggestion[]>([]);
  const [beta, setBeta] = useState<BetaFeature[]>([]);
  const [prefs, setPrefs] = useState<NoticePrefs | null>(null);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>("feature_idea");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const [hub, suggestions, features, noticePrefs] = await Promise.all([
      getHubSummary(),
      listSuggestions().catch(() => [] as HubSuggestion[]),
      listBeta().catch(() => [] as BetaFeature[]),
      getNoticePrefs().catch(() => null),
    ]);
    setSummary(hub);
    setItems(suggestions);
    setBeta(features);
    setPrefs(noticePrefs);
  }

  useEffect(() => {
    void load().catch((err: unknown) => {
      setError(
        err instanceof Error ? err.message : "Could not load Founder Hub",
      );
    });
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const created = await createSuggestion({ title, description, category });
      if (file) await uploadScreenshot(created.suggestion.id, file);
      setTitle("");
      setDescription("");
      setFile(null);
      await load();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not send suggestion",
      );
    } finally {
      setBusy(false);
    }
  }

  if (summary && !summary.canRead) {
    return (
      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          Founder Hub
        </h1>
        <p className="mt-2 text-[var(--text-secondary)]">
          Founder Hub is available to founding members.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <Link href="/settings" className="text-sm text-[var(--brand-500)]">
          Settings
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-[var(--text-primary)]">
          Founder Hub
        </h1>
        <p className="mt-1 text-[var(--text-secondary)]">
          {summary?.label ?? "Founding Member"}
          {summary?.phase === "grace" ? " · billing grace" : ""}
          {summary?.phase === "expired" ? " · read only" : ""}
        </p>
      </div>

      {error ? <p className="text-sm text-[var(--error)]">{error}</p> : null}

      {summary?.canWrite ? (
        <form
          onSubmit={(event) => void submit(event)}
          className="space-y-3 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-6"
        >
          <h2 className="font-semibold text-[var(--text-primary)]">
            Submit a suggestion
          </h2>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Title"
            required
            className="min-h-11 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 py-2 text-sm"
          />
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Description"
            required
            rows={4}
            className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 py-2 text-sm"
          />
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="min-h-11 w-full max-w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 py-2 text-sm"
          >
            {CATEGORIES.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="block max-w-full text-sm"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
          <button
            type="submit"
            disabled={busy}
            className="min-h-11 rounded-lg bg-[var(--brand-500)] px-4 py-2 text-sm font-semibold text-black disabled:opacity-60"
          >
            {busy ? "Sending…" : "Submit"}
          </button>
        </form>
      ) : null}

      <section className="space-y-3">
        <h2 className="font-semibold text-[var(--text-primary)]">
          My suggestions
        </h2>
        {items.length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)]">
            No suggestions yet.
          </p>
        ) : (
          items.map((item) => (
            <Link
              key={item.id}
              href={`/settings/founder-hub/${item.id}`}
              className="block rounded-xl border border-[var(--border-subtle)] px-4 py-3"
            >
              <p className="font-medium text-[var(--text-primary)]">
                {item.title}
                {item.unread ? " · unread" : ""}
              </p>
              <p className="text-sm text-[var(--text-secondary)]">
                {item.categoryLabel} · {item.statusLabel}
              </p>
            </Link>
          ))
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold text-[var(--text-primary)]">
          Early access
        </h2>
        {beta.length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)]">
            No founder beta features are available right now.
          </p>
        ) : (
          beta.map((feature) => (
            <div
              key={feature.key}
              className="rounded-xl border border-[var(--border-subtle)] px-4 py-3"
            >
              <p className="font-medium text-[var(--text-primary)]">
                {feature.name}
                {feature.label ? (
                  <span className="ml-2 rounded-full bg-[var(--brand-500)] px-2 py-0.5 text-xs text-black">
                    {feature.label}
                  </span>
                ) : null}
              </p>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                {feature.description}
              </p>
              <button
                type="button"
                className="mt-2 block text-sm text-[var(--brand-500)]"
                onClick={() => {
                  setTitle(feature.name);
                  setDescription(`Feedback on ${feature.name}.`);
                  setCategory("improvement");
                }}
              >
                Send feedback
              </button>
              {feature.changesScheduling ? (
                <button
                  type="button"
                  className="mt-2 block text-sm text-[var(--text-primary)]"
                  onClick={() => {
                    void setBetaOptOut(feature.key, !feature.optedOut).then(
                      setBeta,
                    );
                  }}
                >
                  {feature.optedOut
                    ? "Use this beta behaviour"
                    : "Turn off this beta behaviour"}
                </button>
              ) : null}
            </div>
          ))
        )}
      </section>

      {prefs ? (
        <section className="space-y-2">
          <h2 className="font-semibold text-[var(--text-primary)]">
            Hub notifications
          </h2>
          {(
            [
              ["inApp", "In the app"],
              ["push", "Phone alerts"],
              ["email", "Email"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={prefs[key]}
                onChange={(event) => {
                  const next = { ...prefs, [key]: event.target.checked };
                  setPrefs(next);
                  void saveNoticePrefs(next).catch((err: unknown) => {
                    setError(
                      err instanceof Error
                        ? err.message
                        : "Could not save preferences",
                    );
                  });
                }}
              />
              {label}
            </label>
          ))}
          <p className="text-xs text-[var(--text-secondary)]">
            Email is off until you turn it on. It is not a marketing list.
          </p>
        </section>
      ) : null}
    </div>
  );
}
