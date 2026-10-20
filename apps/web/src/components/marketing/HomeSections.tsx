import type { ReactNode } from "react";
import Image from "next/image";
import {
  BarChart3,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  Crown,
  Home,
  Link2,
  Lock,
  Smartphone,
  Sparkles,
  Plus,
} from "lucide-react";
import { AppStoreBadge } from "@/components/AppStoreBadge";
import { Button } from "@/components/Button";
import { PhoneFrame, type PhoneScreenKind } from "./PhonePreview";

/** Sections for the marketing homepage. Server components, no live data. */

export function HomeHero() {
  return (
    <section
      className="container-width section-padding pb-10 pt-8 md:pb-14 md:pt-12"
      aria-labelledby="hero-heading"
    >
      <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-6">
        <div className="space-y-6 md:space-y-7">
          <p className="inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-primary)] px-3 py-1 text-xs font-medium text-[var(--brand-500)]">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />A smarter way to
            plan your day
          </p>
          <h1
            id="hero-heading"
            className="text-5xl font-extrabold leading-[1.02] tracking-tight text-[var(--text-primary)] sm:text-6xl lg:text-7xl"
          >
            Your day.
            <br />
            One clear plan.
          </h1>
          <p className="max-w-md text-base leading-relaxed text-[var(--text-secondary)] md:text-lg">
            Tasks, calendar and bookings in one place. Start planning without
            connecting a calendar.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <AppStoreBadge />
            <Button href="/signup" variant="outline" size="md">
              Start on the web
            </Button>
          </div>
          <p className="max-w-md text-sm text-[var(--text-tertiary)]">
            Add a task or an event before you connect anything. The web app and
            the iPhone app use the same account.
          </p>
        </div>

        <div
          className="relative mx-auto h-[26rem] w-full max-w-[28rem] sm:h-[32rem] lg:h-[36rem] lg:max-w-none"
          aria-label="Layout previews of the DayPilot iPhone app"
        >
          <div className="absolute left-[2%] top-0 z-10 w-[50%] -rotate-3 sm:left-[4%]">
            <PhoneFrame kind="today" />
          </div>
          <div className="absolute right-[2%] top-[9%] w-[46%] rotate-3 sm:right-[2%]">
            <PhoneFrame kind="calendar" />
          </div>
        </div>
      </div>
    </section>
  );
}

const valuePoints = [
  { icon: CalendarCheck, text: "Tasks, calendar and bookings in one place" },
  { icon: CalendarDays, text: "No calendar connection required to start" },
  { icon: Link2, text: "One account on the web and iPhone" },
  { icon: Smartphone, text: "Available on iPhone now" },
] as const;

export function ValueStrip() {
  return (
    <section className="container-width section-padding pb-10 md:pb-14">
      <ul className="m-0 grid list-none grid-cols-2 gap-4 rounded-[var(--radius-xl)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-5 md:grid-cols-4 md:p-6">
        {valuePoints.map(({ icon: Icon, text }) => (
          <li
            key={text}
            className="flex items-center gap-3 text-sm font-medium text-[var(--text-secondary)]"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--border-subtle)] text-[var(--brand-500)]">
              <Icon className="h-5 w-5" aria-hidden strokeWidth={1.75} />
            </span>
            {text}
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ---------- Six-card band (always dark, like the mockup) ---------- */

function Ghost({ w = 60 }: { w?: number }) {
  return (
    <span
      aria-hidden
      className="block h-2 rounded-full bg-[var(--border-strong)] opacity-50"
      style={{ width: `${w}%` }}
    />
  );
}

function MiniRow() {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-secondary)] p-2">
      <span
        aria-hidden
        className="block h-3.5 w-3.5 shrink-0 rounded-full border-2 border-[var(--border-strong)]"
      />
      <div className="flex-1 space-y-1.5">
        <Ghost w={70} />
        <Ghost w={35} />
      </div>
    </div>
  );
}

function MiniPanel({ children }: { children: ReactNode }) {
  return (
    <div className="mt-5 min-h-[9.5rem] rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-3">
      {children}
    </div>
  );
}

const screenCards: {
  title: string;
  description: string;
  icon: typeof Home;
  tint: string;
  mini: ReactNode;
}[] = [
  {
    title: "Today Dashboard",
    description:
      "See your day at a glance: tasks due, events and what is next.",
    icon: Home,
    tint: "var(--brand-500)",
    mini: (
      <MiniPanel>
        <p className="mb-2 text-xs font-semibold text-[var(--text-primary)]">
          Today
        </p>
        <div className="space-y-1.5">
          <MiniRow />
          <MiniRow />
        </div>
        <span className="mt-2 ml-auto flex w-fit items-center gap-1 rounded-md bg-[var(--brand-500)] px-2 py-1 text-[10px] font-semibold text-[var(--text-inverse)]">
          <Plus className="h-3 w-3" aria-hidden /> Add
        </span>
      </MiniPanel>
    ),
  },
  {
    title: "Calendar & Time Blocking",
    description:
      "Month, week and day views. Add an event to set time aside for the work.",
    icon: CalendarDays,
    tint: "var(--calendar-personal)",
    mini: (
      <MiniPanel>
        <div className="grid grid-cols-3 gap-1.5">
          {[0, 1, 2].map((col) => (
            <div key={col} className="space-y-1.5">
              <Ghost w={50} />
              <span
                aria-hidden
                className="block rounded-md bg-[color-mix(in_srgb,var(--brand-500)_28%,transparent)]"
                style={{ height: col === 1 ? "4.5rem" : "2.5rem" }}
              />
              <span
                aria-hidden
                className="block h-6 rounded-md bg-[color-mix(in_srgb,var(--information)_26%,transparent)]"
              />
            </div>
          ))}
        </div>
      </MiniPanel>
    ),
  },
  {
    title: "Tasks & Projects",
    description:
      "Keep what matters in one list, with due dates, priorities and projects.",
    icon: CheckCircle2,
    tint: "var(--success)",
    mini: (
      <MiniPanel>
        <p className="mb-2 text-xs font-semibold text-[var(--text-secondary)]">
          Priority
        </p>
        <div className="space-y-1.5">
          <MiniRow />
          <MiniRow />
          <MiniRow />
        </div>
      </MiniPanel>
    ),
  },
  {
    title: "Booking Experience",
    description:
      "Share a link. People pick from the hours you offer. You choose how to meet.",
    icon: Link2,
    tint: "var(--projects)",
    mini: (
      <MiniPanel>
        <p className="mb-2 text-xs font-semibold text-[var(--text-primary)]">
          How to meet
        </p>
        <ul className="m-0 list-none space-y-1.5 p-0 text-[11px] font-medium text-[var(--text-secondary)]">
          {["Meeting link", "Phone", "Slack", "Discord"].map((m, i) => (
            <li
              key={m}
              className="flex items-center gap-2 rounded-md border border-[var(--border-subtle)] px-2 py-1"
            >
              <span
                aria-hidden
                className={`block h-2.5 w-2.5 rounded-full border-2 ${
                  i === 0
                    ? "border-[var(--brand-500)] bg-[var(--brand-500)]"
                    : "border-[var(--border-strong)]"
                }`}
              />
              {m}
            </li>
          ))}
        </ul>
      </MiniPanel>
    ),
  },
  {
    title: "Insights & Pilot Brief",
    description:
      "See this week's meetings, tasks and focus time, and read a short brief of the day.",
    icon: BarChart3,
    tint: "var(--focus)",
    mini: (
      <MiniPanel>
        <p className="mb-2 text-xs font-semibold text-[var(--text-primary)]">
          This week
        </p>
        <div className="flex h-24 items-end justify-between gap-1.5">
          {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-1">
              <span
                aria-hidden
                className="block w-full rounded-t-sm bg-[var(--border-strong)] opacity-40"
                style={{ height: "1.5rem" }}
              />
              <span className="text-[9px] text-[var(--text-tertiary)]">
                {d}
              </span>
            </div>
          ))}
        </div>
      </MiniPanel>
    ),
  },
  {
    title: "Founders Hub",
    description:
      "A private space for Founding 25 members to talk directly with DayPilot.",
    icon: Crown,
    tint: "var(--warning)",
    mini: (
      <MiniPanel>
        <div className="flex h-full min-h-[7.5rem] flex-col items-center justify-center gap-1.5 text-center">
          <Lock
            className="h-5 w-5 text-[var(--brand-500)]"
            aria-hidden
            strokeWidth={1.75}
          />
          <p className="text-xs font-semibold text-[var(--text-primary)]">
            Members only
          </p>
          <p className="text-[10px] leading-snug text-[var(--text-secondary)]">
            Not a public feed. Sign in to open it.
          </p>
        </div>
      </MiniPanel>
    ),
  },
];

export function ScreenCards() {
  return (
    <section
      data-theme="dark"
      aria-labelledby="screens-heading"
      className="bg-[var(--background-primary)] text-[var(--text-primary)]"
    >
      <div className="container-width section-padding py-12 md:py-16">
        <h2 id="screens-heading" className="sr-only">
          What is in DayPilot
        </h2>
        <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {screenCards.map(({ title, description, icon: Icon, tint, mini }) => (
            <li
              key={title}
              className="flex flex-col rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-secondary)] p-5"
            >
              <span
                aria-hidden
                className="flex h-10 w-10 items-center justify-center rounded-xl"
                style={{
                  background: `color-mix(in srgb, ${tint} 18%, transparent)`,
                  color: tint,
                }}
              >
                <Icon className="h-5 w-5" strokeWidth={1.75} />
              </span>
              <h3 className="mt-4 text-base font-semibold text-[var(--text-primary)]">
                {title}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-secondary)]">
                {description}
              </p>
              {mini}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ---------- iOS strip and final call to action ---------- */

const iosScreens: {
  kind: PhoneScreenKind;
  title: string;
  caption: string;
}[] = [
  { kind: "today", title: "Today", caption: "Your day at a glance" },
  { kind: "calendar", title: "Calendar", caption: "Month, week and day" },
  { kind: "tasks", title: "Tasks", caption: "Stay organised" },
  { kind: "booking", title: "Booking", caption: "Share your availability" },
  { kind: "insights", title: "Insights", caption: "Read the week" },
  { kind: "hub", title: "Founders Hub", caption: "For founding members" },
];

export function IosScreens() {
  return (
    <section
      className="container-width section-padding py-12 md:py-16"
      aria-labelledby="ios-heading"
    >
      <div className="grid gap-6 xl:grid-cols-[1fr_20rem]">
        <div className="rounded-[var(--radius-xl)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-6 md:p-8">
          <div className="grid gap-8 lg:grid-cols-[11rem_1fr]">
            <div className="space-y-4">
              <h2
                id="ios-heading"
                className="text-2xl font-bold text-[var(--text-primary)]"
              >
                iPhone app screens
              </h2>
              <AppStoreBadge />
              <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
                Built for iPhone, with the same plan you see on the web.
              </p>
            </div>
            <ol className="m-0 grid list-none grid-cols-3 gap-x-3 gap-y-6 p-0 md:grid-cols-6">
              {iosScreens.map(({ kind, title, caption }, i) => (
                <li key={kind} className="space-y-2 text-center">
                  <PhoneFrame
                    kind={kind}
                    className="shadow-md"
                    label={`Layout preview of the ${title} screen`}
                  />
                  <p className="text-xs font-semibold text-[var(--text-primary)]">
                    {i + 1}. {title}
                  </p>
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    {caption}
                  </p>
                </li>
              ))}
            </ol>
          </div>
          <p className="mt-6 text-xs text-[var(--text-tertiary)]">
            These are layout previews, not screenshots. They show structure
            only.
          </p>
        </div>

        <FinalCta />
      </div>
    </section>
  );
}

export function FinalCta() {
  return (
    <aside
      aria-labelledby="final-cta-heading"
      className="flex flex-col justify-between gap-8 overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border-subtle)] bg-[linear-gradient(160deg,color-mix(in_srgb,var(--brand-500)_14%,var(--surface-primary)),var(--surface-primary))] p-6 md:p-8"
    >
      <div className="space-y-3">
        <h2
          id="final-cta-heading"
          className="text-3xl font-bold leading-tight text-[var(--text-primary)]"
        >
          Start planning today
        </h2>
        <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
          Download DayPilot for iPhone, or start on the web. You can begin
          before you connect a calendar.
        </p>
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <AppStoreBadge />
          <Button href="/signup" variant="outline" size="sm">
            Start on the web
          </Button>
        </div>
      </div>
      <Image
        src="/brand/daypilot-logo-mark-128.png"
        alt=""
        width={96}
        height={96}
        className="h-24 w-24 self-end rounded-[22%] shadow-xl"
        unoptimized
      />
    </aside>
  );
}
