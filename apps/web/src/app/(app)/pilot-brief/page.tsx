"use client";

import { useCallback, useEffect, useState } from "react";
import { Sparkles, RefreshCw } from "lucide-react";
import { Button } from "@/components/Button";
import {
  generatePilotBrief,
  getTodayBrief,
  type PilotBrief,
} from "@/lib/pilot-brief-api";

export default function PilotBriefPage() {
  const [brief, setBrief] = useState<PilotBrief | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [question, setQuestion] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const existing = await getTodayBrief();
      setBrief(existing);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load brief");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function regenerate() {
    setGenerating(true);
    setError("");
    try {
      const next = await generatePilotBrief();
      setBrief(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate brief");
    } finally {
      setGenerating(false);
    }
  }

  const content = brief?.content;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--brand-500)]">
            Pilot Brief · AI
          </p>
          <h1 className="mt-1 text-2xl font-bold text-[var(--text-primary)]">
            Today&apos;s brief
          </h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Grounded in your calendar and tasks. Keys stay on the server.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => void regenerate()}
          disabled={generating}
          className="gap-2"
        >
          <RefreshCw
            className={`h-4 w-4 ${generating ? "animate-spin" : ""}`}
          />
          {generating ? "Generating…" : brief ? "Regenerate" : "Generate"}
        </Button>
      </div>

      {error && <p className="text-sm text-[var(--error)]">{error}</p>}

      <div className="rounded-[var(--radius-xl)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-8 text-center">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--brand-500)_18%,transparent)] shadow-[0_0_48px_rgba(66,232,95,0.3)]">
          <Sparkles className="h-9 w-9 text-[var(--brand-500)]" />
        </div>

        {loading ? (
          <p className="text-[var(--text-secondary)]">Loading…</p>
        ) : !content ? (
          <div className="space-y-4">
            <p className="text-[var(--text-secondary)]">
              No brief for today yet. Generate one from your schedule and tasks.
            </p>
            <Button onClick={() => void regenerate()} disabled={generating}>
              Generate Pilot Brief
            </Button>
          </div>
        ) : (
          <div className="space-y-5 text-left">
            <p className="text-base leading-relaxed text-[var(--text-primary)]">
              {content.summary}
            </p>
            <div className="grid grid-cols-3 gap-3">
              {[
                ["Meetings", content.events_today],
                ["Tasks due", content.tasks_due],
                ["Overdue", content.tasks_overdue],
              ].map(([label, value]) => (
                <div
                  key={String(label)}
                  className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-secondary)] p-3 text-center"
                >
                  <p className="text-lg font-bold text-[var(--text-primary)]">
                    {value}
                  </p>
                  <p className="text-[10px] uppercase tracking-wide text-[var(--text-tertiary)]">
                    {label}
                  </p>
                </div>
              ))}
            </div>
            {content.suggestions?.length > 0 && (
              <div>
                <h2 className="mb-2 text-sm font-semibold text-[var(--text-primary)]">
                  Suggestions
                </h2>
                <ul className="space-y-2">
                  {content.suggestions.map((s) => (
                    <li
                      key={s}
                      className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 py-2 text-sm text-[var(--text-secondary)]"
                    >
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <p className="text-center text-[10px] text-[var(--text-tertiary)]">
              Source: {content.source === "ai" ? "AI + your data" : "rule-based fallback"}
            </p>
          </div>
        )}
      </div>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setQuestion("");
        }}
      >
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask me anything..."
          className="min-w-0 flex-1 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--brand-500)]"
        />
        <Button type="submit" variant="outline">
          Ask
        </Button>
      </form>
    </div>
  );
}
