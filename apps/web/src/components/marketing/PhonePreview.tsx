import type { ReactNode } from "react";
import Image from "next/image";
import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Home,
  Lock,
  Plus,
} from "lucide-react";

/**
 * Phone frame plus six structural screens for the marketing pages.
 *
 * These are layout previews, not screenshots. They use the real screen names,
 * tab names and booking methods, and grey placeholder bars where content would
 * be. No names, dates, counts or percentages are drawn, so nothing here can be
 * mistaken for a person's data.
 */

export type PhoneScreenKind =
  | "today"
  | "calendar"
  | "tasks"
  | "booking"
  | "insights"
  | "hub";

const tabs = [
  { label: "Today", icon: Home },
  { label: "Calendar", icon: CalendarDays },
  { label: "Tasks", icon: CheckCircle2 },
  { label: "Insights", icon: BarChart3 },
] as const;

/** Grey placeholder bar. `w` is a percentage of the row. */
function Bar({
  w = 60,
  tone = "base",
}: {
  w?: number;
  tone?: "base" | "faint";
}) {
  return (
    <span
      aria-hidden
      className={`block h-[0.55em] rounded-full ${
        tone === "faint"
          ? "bg-[var(--border-subtle)] opacity-60"
          : "bg-[var(--border-strong)] opacity-50"
      }`}
      style={{ width: `${w}%` }}
    />
  );
}

function Title({
  children,
  trailing,
}: {
  children: ReactNode;
  trailing?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <p className="text-[1.25em] font-bold leading-none text-[var(--text-primary)]">
        {children}
      </p>
      {trailing}
    </div>
  );
}

function Avatar() {
  return (
    <span
      aria-hidden
      className="block h-[1.6em] w-[1.6em] rounded-full bg-[color-mix(in_srgb,var(--brand-500)_30%,transparent)]"
    />
  );
}

function Segmented({ items, active }: { items: string[]; active: number }) {
  return (
    <div className="flex rounded-[0.7em] bg-[var(--surface-secondary)] p-[0.2em] text-[0.8em] font-semibold">
      {items.map((item, i) => (
        <span
          key={item}
          className={`flex-1 rounded-[0.55em] px-[0.4em] py-[0.35em] text-center ${
            i === active
              ? "bg-[var(--brand-500)] text-[var(--text-inverse)]"
              : "text-[var(--text-secondary)]"
          }`}
        >
          {item}
        </span>
      ))}
    </div>
  );
}

function Row({ accent = false }: { accent?: boolean }) {
  return (
    <div className="flex items-center gap-[0.6em] rounded-[0.7em] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-[0.6em]">
      <span
        aria-hidden
        className={`block h-[1.1em] w-[1.1em] shrink-0 rounded-full border-[0.14em] ${
          accent
            ? "border-[var(--brand-500)]"
            : "border-[var(--border-strong)] opacity-70"
        }`}
      />
      <div className="flex-1 space-y-[0.35em]">
        <Bar w={72} />
        <Bar w={38} tone="faint" />
      </div>
    </div>
  );
}

function Screen({ kind }: { kind: PhoneScreenKind }) {
  switch (kind) {
    case "today":
      return (
        <div className="space-y-[0.9em]">
          <Title trailing={<Avatar />}>Today</Title>
          <div className="flex justify-between">
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
              <span
                key={i}
                className="w-[1.6em] text-center text-[0.75em] font-medium text-[var(--text-tertiary)]"
              >
                {d}
              </span>
            ))}
          </div>
          <p className="text-[0.85em] font-semibold text-[var(--text-primary)]">
            Today&apos;s plan
          </p>
          <div className="space-y-[0.5em]">
            <Row accent />
            <Row />
            <Row />
            <Row />
            <Row />
            <Row />
          </div>
        </div>
      );
    case "calendar":
      return (
        <div className="space-y-[0.9em]">
          <Title
            trailing={
              <Plus className="h-[1.2em] w-[1.2em] text-[var(--brand-500)]" />
            }
          >
            Calendar
          </Title>
          <Segmented items={["Month", "Week", "Day"]} active={1} />
          <div className="relative space-y-[1.5em] pt-[0.3em]">
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i} className="flex items-center gap-[0.5em]">
                <span className="w-[2em] shrink-0">
                  <Bar w={100} tone="faint" />
                </span>
                <span className="block h-px flex-1 bg-[var(--border-subtle)]" />
              </div>
            ))}
            <span
              aria-hidden
              className="absolute left-[3em] right-0 top-[1.6em] block h-[3em] rounded-[0.5em] border-l-[0.25em] border-[var(--brand-500)] bg-[color-mix(in_srgb,var(--brand-500)_22%,transparent)]"
            />
            <span
              aria-hidden
              className="absolute left-[3em] right-[22%] top-[6.4em] block h-[2.2em] rounded-[0.5em] border-l-[0.25em] border-[var(--information)] bg-[color-mix(in_srgb,var(--information)_20%,transparent)]"
            />
          </div>
        </div>
      );
    case "tasks":
      return (
        <div className="space-y-[0.9em]">
          <Title>Tasks</Title>
          <Segmented items={["Today", "Upcoming", "Done"]} active={0} />
          <div className="space-y-[0.5em]">
            <Row />
            <Row />
            <Row />
            <Row />
          </div>
          <span className="flex items-center justify-center gap-[0.3em] rounded-[0.8em] bg-[var(--brand-500)] py-[0.6em] text-[0.85em] font-semibold text-[var(--text-inverse)]">
            <Plus className="h-[1em] w-[1em]" /> Add task
          </span>
        </div>
      );
    case "booking":
      return (
        <div className="space-y-[0.9em]">
          <Title>Booking links</Title>
          <p className="text-[0.8em] text-[var(--text-secondary)]">
            How should people meet you?
          </p>
          <div className="space-y-[0.5em]">
            {["Meeting link", "Phone", "Slack", "Discord"].map((label, i) => (
              <div
                key={label}
                className="flex items-center gap-[0.6em] rounded-[0.7em] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-[0.7em] text-[0.85em] font-medium text-[var(--text-primary)]"
              >
                <span
                  aria-hidden
                  className={`block h-[1em] w-[1em] rounded-full border-[0.14em] ${
                    i === 0
                      ? "border-[var(--brand-500)] bg-[var(--brand-500)]"
                      : "border-[var(--border-strong)] opacity-70"
                  }`}
                />
                {label}
              </div>
            ))}
          </div>
          <span className="block rounded-[0.8em] bg-[var(--brand-500)] py-[0.6em] text-center text-[0.85em] font-semibold text-[var(--text-inverse)]">
            Share link
          </span>
        </div>
      );
    case "insights":
      return (
        <div className="space-y-[0.9em]">
          <Title>Insights</Title>
          <p className="text-[0.8em] text-[var(--text-secondary)]">This week</p>
          <div className="grid grid-cols-2 gap-[0.5em]">
            {["Meetings", "Tasks done", "Focus time", "In meetings"].map(
              (label) => (
                <div
                  key={label}
                  className="space-y-[0.5em] rounded-[0.7em] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-[0.6em]"
                >
                  <p className="text-[0.7em] text-[var(--text-secondary)]">
                    {label}
                  </p>
                  <Bar w={45} />
                </div>
              ),
            )}
          </div>
          <div className="flex h-[5.5em] items-end justify-between rounded-[0.7em] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-[0.6em]">
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
              <div key={i} className="flex flex-col items-center gap-[0.3em]">
                <span
                  aria-hidden
                  className="block h-[1.2em] w-[0.9em] rounded-t-[0.2em] bg-[var(--border-strong)] opacity-40"
                />
                <span className="text-[0.65em] text-[var(--text-tertiary)]">
                  {d}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    case "hub":
      return (
        <div className="space-y-[0.9em]">
          <Title>Founders Hub</Title>
          <div className="flex flex-col items-center gap-[0.6em] rounded-[0.9em] border border-[var(--border-subtle)] bg-[var(--surface-primary)] px-[0.8em] py-[1.4em] text-center">
            <Lock className="h-[1.6em] w-[1.6em] text-[var(--brand-500)]" />
            <p className="text-[0.9em] font-semibold text-[var(--text-primary)]">
              Members only
            </p>
            <p className="text-[0.7em] leading-snug text-[var(--text-secondary)]">
              Private to Founding 25 members. Not a public feed.
            </p>
          </div>
          <div className="space-y-[0.5em]">
            <Row />
            <Row />
          </div>
        </div>
      );
  }
}

const activeTab: Record<PhoneScreenKind, number> = {
  today: 0,
  calendar: 1,
  tasks: 2,
  booking: -1,
  insights: 3,
  hub: -1,
};

export function PhoneFrame({
  kind,
  className = "",
  label,
  shot,
}: {
  kind: PhoneScreenKind;
  className?: string;
  /** Accessible name. Decorative frames still say what they are. */
  label?: string;
  /** Real iPhone capture. When set, the drawn layout is not shown. */
  shot?: string;
}) {
  const active = activeTab[kind];
  return (
    <div
      role="img"
      aria-label={
        label ??
        (shot
          ? `Screenshot of the ${kind} screen in the DayPilot iPhone app`
          : `Layout preview of the ${kind} screen`)
      }
      className={`relative aspect-[9/19] w-full bg-[#0b0f0d] p-[3.2%] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.45)] ring-1 ring-[var(--border-strong)] ${className}`}
      style={{ containerType: "inline-size", borderRadius: "15% / 7.1%" }}
    >
      <div
        className="relative flex h-full flex-col overflow-hidden bg-[var(--background-primary)]"
        style={{ borderRadius: "13% / 6.2%" }}
      >
        {shot ? (
          <Image
            src={shot}
            alt=""
            fill
            unoptimized
            sizes="(max-width: 768px) 40vw, 180px"
            className="object-cover object-top"
          />
        ) : (
          <>
            <span
              aria-hidden
              className="absolute left-1/2 top-[1.6%] z-10 block h-[2.4%] w-[28%] -translate-x-1/2 rounded-full bg-[#0b0f0d]"
            />
            <div
              className="flex-1 overflow-hidden px-[7%] pt-[13%]"
              style={{ fontSize: "4.3cqw" }}
            >
              <Screen kind={kind} />
            </div>
            <div
              aria-hidden
              className="flex justify-around border-t border-[var(--border-subtle)] bg-[var(--surface-primary)] px-[3%] pb-[5%] pt-[2.5%]"
              style={{ fontSize: "3.4cqw" }}
            >
              {tabs.map(({ label: tab, icon: Icon }, i) => (
                <span
                  key={tab}
                  className={`flex flex-col items-center gap-[0.25em] font-medium ${
                    i === active
                      ? "text-[var(--brand-500)]"
                      : "text-[var(--text-tertiary)]"
                  }`}
                >
                  <Icon className="h-[1.9em] w-[1.9em]" strokeWidth={1.75} />
                  {tab}
                </span>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
