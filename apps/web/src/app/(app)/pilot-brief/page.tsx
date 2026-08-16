"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Sparkles, RefreshCw, Send } from "lucide-react";
import { Button } from "@/components/Button";
import { SuggestScheduleCard } from "@/components/pilot/SuggestScheduleCard";
import {
  briefFollowUps,
  generatePilotBrief,
  getTodayBrief,
  getTodayChat,
  sendPilotBriefChat,
  type PilotBrief,
  type PilotChatMessage,
} from "@/lib/pilot-brief-api";

export default function PilotBriefPage() {
  const [brief, setBrief] = useState<PilotBrief | null>(null);
  const [messages, setMessages] = useState<PilotChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState("");
  const [question, setQuestion] = useState("");
  const threadRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [existing, chat] = await Promise.all([
        getTodayBrief(),
        getTodayChat(),
      ]);
      setBrief(existing);
      setMessages(chat);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load brief");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight });
  }, [messages, asking]);

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

  async function ask(raw: string) {
    const message = raw.trim();
    if (!message || asking) return;
    setQuestion("");
    setAsking(true);
    setError("");
    try {
      const result = await sendPilotBriefChat(message);
      setMessages((prev) => [...prev, result.user_message, result.reply]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send that. Try again.");
    } finally {
      setAsking(false);
    }
  }

  const content = brief?.content;
  const lastAssistant = [...messages]
    .reverse()
    .find((m) => m.role === "assistant");
  const chips =
    lastAssistant?.follow_ups?.length
      ? lastAssistant.follow_ups
      : content
        ? briefFollowUps(content)
        : [
            "What should I tackle first?",
            "Where can I fit a focus block?",
            "Any conflicts I should fix?",
          ];

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--brand-500)]">
            Pilot Brief · AI
          </p>
          <h1 className="mt-1 text-2xl font-bold text-[var(--text-primary)]">
            Today&apos;s brief
          </h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Chat is grounded in your calendar and tasks. Keys stay on the server.
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

      <div className="rounded-[var(--radius-xl)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-6">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--brand-500)_18%,transparent)]">
          <Sparkles className="h-6 w-6 text-[var(--brand-500)]" />
        </div>

        {loading ? (
          <p className="text-[var(--text-secondary)]">Loading…</p>
        ) : !content ? (
          <div className="space-y-4">
            <p className="text-[var(--text-secondary)]">
              No brief for today yet. Generate one from your schedule and tasks,
              or ask Pilot a question below.
            </p>
            <Button onClick={() => void regenerate()} disabled={generating}>
              Generate Pilot Brief
            </Button>
          </div>
        ) : (
          <div className="space-y-5">
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
              <ChipSection
                title="Suggestions"
                items={content.suggestions}
                onPick={(s) => void ask(`Tell me more: ${s}`)}
              />
            )}
            {content.conflicts?.length > 0 && (
              <ChipSection
                title="Conflicts"
                items={content.conflicts}
                onPick={(s) => void ask(`How should I resolve this: ${s}`)}
              />
            )}
            {content.focus_windows?.length > 0 && (
              <ChipSection
                title="Focus windows"
                items={content.focus_windows}
                onPick={(s) => void ask(`Help me use the ${s} focus window.`)}
              />
            )}
            <p className="text-center text-[10px] text-[var(--text-tertiary)]">
              Source: {content.source === "ai" ? "AI + your data" : "rule-based fallback"}
            </p>
          </div>
        )}
      </div>

      <SuggestScheduleCard />

      <div className="rounded-[var(--radius-xl)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4">
        <h2 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">
          Ask Pilot
        </h2>
        <div
          ref={threadRef}
          className="mb-3 max-h-80 space-y-3 overflow-y-auto pr-1"
        >
          {messages.length === 0 && !asking && (
            <p className="text-sm text-[var(--text-secondary)]">
              Ask about meetings, tasks, conflicts, or where to focus. Pilot
              only uses today&apos;s DayPilot data.
            </p>
          )}
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-[var(--radius-md)] px-3 py-2 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "bg-[var(--brand-500)] text-[var(--text-inverse)]"
                    : "border border-[var(--border-subtle)] bg-[var(--surface-secondary)] text-[var(--text-primary)]"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {asking && (
            <p className="text-sm text-[var(--text-tertiary)]">
              Pilot is thinking…
            </p>
          )}
        </div>

        {chips.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {chips.map((chip) => (
              <button
                key={chip}
                type="button"
                disabled={asking}
                onClick={() => void ask(chip)}
                className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:border-[var(--brand-500)] hover:text-[var(--brand-500)] disabled:opacity-50"
              >
                {chip}
              </button>
            ))}
          </div>
        )}

        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void ask(question);
          }}
        >
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask about today…"
            disabled={asking}
            className="min-w-0 flex-1 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--background-primary)] px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--brand-500)]"
          />
          <Button type="submit" variant="outline" disabled={asking || !question.trim()}>
            <Send className="h-4 w-4" />
            <span className="sr-only">Send</span>
          </Button>
        </form>
      </div>
    </div>
  );
}

function ChipSection({
  title,
  items,
  onPick,
}: {
  title: string;
  items: string[];
  onPick: (item: string) => void;
}) {
  return (
    <div>
      <h2 className="mb-2 text-sm font-semibold text-[var(--text-primary)]">
        {title}
      </h2>
      <ul className="space-y-2">
        {items.map((s) => (
          <li key={s}>
            <button
              type="button"
              onClick={() => onPick(s)}
              className="w-full rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 py-2 text-left text-sm text-[var(--text-secondary)] hover:border-[var(--brand-500)] hover:text-[var(--text-primary)]"
            >
              {s}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
