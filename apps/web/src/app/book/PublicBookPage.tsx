"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/Button";
import { downloadBookingIcs } from "@/lib/booking-ics";
import {
  groupSlotsByLocalDay,
  localDayKey,
  monthCells,
} from "@/lib/booking-page-calendar";
import * as bookingApi from "@/lib/booking-supabase";
import type { PublicSlot } from "@/lib/booking-supabase";
import {
  normalizeCallbackNumber,
  type ConfiguredMethod,
  type PublicMeetingChoice,
} from "@/lib/meeting-choice";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatZone(zone: string) {
  return zone.replaceAll("_", " ");
}

function formatDayLabel(date: Date) {
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function PublicBookPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = useMemo(() => {
    const fromPath = String(params?.slug ?? "");
    if (fromPath && fromPath !== "_") return fromPath;
    return String(searchParams.get("slug") ?? "");
  }, [params, searchParams]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState<string | null>(null);
  const [duration, setDuration] = useState(30);
  const [hostZone, setHostZone] = useState("UTC");
  const [paused, setPaused] = useState(false);
  const [linkId, setLinkId] = useState<string | null>(null);
  const [slots, setSlots] = useState<PublicSlot[]>([]);
  const [selected, setSelected] = useState<PublicSlot | null>(null);
  const [dayKey, setDayKey] = useState<string | null>(null);
  const [visible, setVisible] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [step, setStep] = useState<"time" | "details" | "done">("time");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [methods, setMethods] = useState<PublicMeetingChoice[]>([]);
  const [methodId, setMethodId] = useState<ConfiguredMethod | null>(null);
  const [guestPhone, setGuestPhone] = useState("");

  const viewerZone = useMemo(() => bookingApi.browserTimeZone(), []);
  const slotsByDay = useMemo(() => groupSlotsByLocalDay(slots), [slots]);
  const cells = useMemo(
    () => monthCells(visible.year, visible.month),
    [visible.year, visible.month],
  );
  const daySlots = dayKey ? (slotsByDay.get(dayKey) ?? []) : [];
  const monthLabel = new Date(
    visible.year,
    visible.month,
    1,
  ).toLocaleDateString(undefined, { month: "long", year: "numeric" });

  const load = useCallback(async () => {
    if (!slug) {
      setLoading(false);
      setLinkId(null);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const page = await bookingApi.getPublicBookingLink(slug);
      if (!page) {
        setLinkId(null);
        setSlots([]);
        return;
      }
      setLinkId(page.id);
      setTitle(page.title);
      setDescription(page.description);
      setDuration(page.duration);
      setHostZone(page.timeZone);
      setPaused(page.paused);
      const choices = await bookingApi.listPublicMeetingChoices(page.id);
      setMethods(choices);
      setMethodId(choices.length === 1 ? choices[0].id : null);
      const nextSlots = await bookingApi.listPublicSlots(page.id);
      setSlots(nextSlots);
      const first = nextSlots[0] ? new Date(nextSlots[0].start) : new Date();
      setVisible({ year: first.getFullYear(), month: first.getMonth() });
      setDayKey(nextSlots[0] ? localDayKey(first) : null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!title) return;
    const previous = document.title;
    document.title = `${title} · DayPilot`;
    return () => {
      document.title = previous;
    };
  }, [title]);

  function shiftMonth(delta: number) {
    setVisible((current) => {
      const next = new Date(current.year, current.month + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
  }

  async function confirm(e: React.FormEvent) {
    e.preventDefault();
    if (!linkId || !selected) return;
    if (!name.trim()) {
      setError("Enter your name");
      return;
    }
    if (!email.includes("@")) {
      setError("Enter a valid email");
      return;
    }
    if (methods.length > 0 && !methodId) {
      setError("Choose how you want to meet");
      return;
    }
    const callback =
      methodId === "phone" ? normalizeCallbackNumber(guestPhone) : null;
    if (methodId === "phone" && guestPhone.trim() && !callback) {
      setError("Enter a phone number with at least 8 digits, or leave it blank");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const result = await bookingApi.confirmPublicBooking({
        bookingLinkId: linkId,
        start: selected.start,
        end: selected.end,
        bookerName: name.trim(),
        bookerEmail: email.trim(),
        meetingMethod: methodId,
        guestPhone: callback,
      });
      setEmailSent(result.email === "sent");
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Booking failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--background-primary)]">
      <header className="border-b border-[var(--border-subtle)] px-4 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <BrandLogo href="/" />
          <p className="text-sm text-[var(--text-secondary)]">
            No account needed
          </p>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8 md:py-12">
        {loading ? (
          <p className="text-[var(--text-secondary)]">
            Loading available times…
          </p>
        ) : !slug ? (
          <EmptyState
            title="This page needs a booking link"
            body="Ask the person who invited you for their DayPilot link. It looks like daypilot.co/book/their-name."
          />
        ) : !linkId ? (
          <EmptyState
            title="Link not found"
            body="This booking page is paused or does not exist. Ask the host for a new link."
          />
        ) : step === "done" && selected ? (
          <section className="mx-auto max-w-lg rounded-[var(--radius-xl)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-6 md:p-8">
            <p className="text-sm font-medium text-[var(--brand-500)]">
              DayPilot
            </p>
            <h1 className="mt-2 text-2xl font-bold text-[var(--text-primary)]">
              You&apos;re booked
            </h1>
            <p className="mt-3 text-sm text-[var(--text-secondary)]">
              {title} · {duration} min
            </p>
            <p className="mt-1 text-base text-[var(--text-primary)]">
              {formatWhen(selected.start)}
            </p>
            {methodId ? (
              <p className="mt-4 text-sm text-[var(--text-primary)]">
                {methodId === "phone"
                  ? "The host will call you. Their number is in the confirmation email, not on this page."
                  : "The join details are in the confirmation email, not on this page."}
              </p>
            ) : null}
            <p className="mt-4 text-sm text-[var(--text-secondary)]">
              {emailSent
                ? "We emailed a confirmation with a calendar file attached. You can also save that file here."
                : "The host will see this on their DayPilot calendar. The confirmation email did not send, so save the calendar file and keep this time."}{" "}
              Shown in your timezone ({formatZone(viewerZone)}).
            </p>
            <Button
              type="button"
              className="mt-4 w-full"
              onClick={() =>
                downloadBookingIcs({
                  uid: `booking-${linkId}-${selected.start}@daypilot.co`,
                  title,
                  description: `${title}. Booked on DayPilot.`,
                  start: selected.start,
                  end: selected.end,
                  attendeeName: name.trim() || "Guest",
                  attendeeEmail: email.trim(),
                })
              }
            >
              Save calendar file
            </Button>
          </section>
        ) : (
          <section className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] shadow-sm">
            <div className="grid lg:grid-cols-[280px_minmax(0,1fr)]">
              <aside className="border-b border-[var(--border-subtle)] p-6 lg:border-b-0 lg:border-r">
                <p className="text-sm font-medium text-[var(--brand-500)]">
                  DayPilot
                </p>
                <h1 className="mt-3 text-2xl font-bold text-[var(--text-primary)]">
                  {title}
                </h1>
                <p className="mt-3 text-sm text-[var(--text-secondary)]">
                  {duration} min
                </p>
                {description ? (
                  <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
                    {description}
                  </p>
                ) : (
                  <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
                    Pick a day, then a time. You do not need the DayPilot app or
                    an account.
                  </p>
                )}
                <p className="mt-4 text-xs leading-relaxed text-[var(--text-tertiary)]">
                  Times are shown in your timezone ({formatZone(viewerZone)}).
                  The host set these hours in {formatZone(hostZone)}.
                </p>
                {paused ? (
                  <p className="mt-4 text-sm text-[var(--warning)]">
                    This link is paused. Guests cannot book it. You are seeing a
                    preview because you own it.
                  </p>
                ) : null}
              </aside>

              {step === "details" && selected ? (
                <form onSubmit={confirm} className="space-y-4 p-6">
                  <button
                    type="button"
                    onClick={() => {
                      setStep("time");
                      setError("");
                    }}
                    className="text-sm font-medium text-[var(--brand-500)]"
                  >
                    Back to times
                  </button>
                  <h2 className="text-lg font-bold text-[var(--text-primary)]">
                    Your details
                  </h2>
                  <p className="text-sm text-[var(--text-secondary)]">
                    {formatWhen(selected.start)} · {duration} min
                  </p>
                  {error ? (
                    <p className="text-sm text-[var(--error)]" role="alert">
                      {error}
                    </p>
                  ) : null}
                  <label className="block space-y-1">
                    <span className="text-sm font-medium text-[var(--text-primary)]">
                      Name
                    </span>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      autoComplete="name"
                      required
                      className="w-full rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--background-primary)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--brand-500)]"
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-sm font-medium text-[var(--text-primary)]">
                      Email
                    </span>
                    <input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      type="email"
                      autoComplete="email"
                      required
                      className="w-full rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--background-primary)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--brand-500)]"
                    />
                  </label>
                  {methods.length > 0 ? (
                    <fieldset className="space-y-2">
                      <legend className="text-sm font-medium text-[var(--text-primary)]">
                        How do you want to meet?
                      </legend>
                      {methods.map((method) => (
                        <label
                          key={method.id}
                          className={`block rounded-[var(--radius-md)] border px-3 py-2 text-sm ${
                            methodId === method.id
                              ? "border-[var(--brand-500)]"
                              : "border-[var(--border-subtle)]"
                          }`}
                        >
                          <span className="flex items-start gap-2">
                            <input
                              type="radio"
                              name="meeting-method"
                              value={method.id}
                              checked={methodId === method.id}
                              onChange={() => setMethodId(method.id)}
                              className="mt-1"
                            />
                            <span>
                              <span className="font-medium text-[var(--text-primary)]">
                                {method.label}
                              </span>
                              <span className="mt-1 block text-[var(--text-secondary)]">
                                {method.detail}
                              </span>
                            </span>
                          </span>
                        </label>
                      ))}
                    </fieldset>
                  ) : null}
                  {methodId === "phone" ? (
                    <label className="block space-y-1">
                      <span className="text-sm font-medium text-[var(--text-primary)]">
                        Your number, if you want a callback
                      </span>
                      <input
                        value={guestPhone}
                        onChange={(e) => setGuestPhone(e.target.value)}
                        type="tel"
                        autoComplete="tel"
                        aria-describedby="callback-hint"
                        className="w-full rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--background-primary)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--brand-500)]"
                      />
                      <span
                        id="callback-hint"
                        className="text-xs text-[var(--text-tertiary)]"
                      >
                        Optional. Only the host sees this after you book.
                      </span>
                    </label>
                  ) : null}
                  {methodId ? (
                    <p className="text-sm text-[var(--text-secondary)]">
                      {methods.find((method) => method.id === methodId)?.detail}
                    </p>
                  ) : null}
                  <p className="text-xs text-[var(--text-tertiary)]">
                    The host uses this to see who booked. After you confirm, you
                    can save a calendar file, and DayPilot emails that file when
                    it can.
                  </p>
                  <Button
                    type="submit"
                    disabled={submitting || paused}
                    className="w-full"
                  >
                    {submitting
                      ? "Booking…"
                      : paused
                        ? "Paused"
                        : "Confirm booking"}
                  </Button>
                </form>
              ) : (
                <div className="grid md:grid-cols-[minmax(0,1fr)_220px]">
                  <div className="p-6">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <h2 className="text-base font-semibold text-[var(--text-primary)]">
                        {monthLabel}
                      </h2>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => shiftMonth(-1)}
                          className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] px-3 py-1 text-sm text-[var(--text-primary)]"
                          aria-label="Previous month"
                        >
                          Prev
                        </button>
                        <button
                          type="button"
                          onClick={() => shiftMonth(1)}
                          className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] px-3 py-1 text-sm text-[var(--text-primary)]"
                          aria-label="Next month"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-center text-xs text-[var(--text-tertiary)]">
                      {WEEKDAYS.map((day) => (
                        <div key={day} className="py-1">
                          {day}
                        </div>
                      ))}
                    </div>
                    <div className="mt-1 grid grid-cols-7 gap-1">
                      {cells.map((date, index) => {
                        if (!date) {
                          return <div key={`pad-${index}`} className="h-10" />;
                        }
                        const key = localDayKey(date);
                        const open = slotsByDay.has(key);
                        const active = key === dayKey;
                        return (
                          <button
                            key={key}
                            type="button"
                            disabled={!open}
                            aria-pressed={active}
                            aria-label={
                              open
                                ? `${formatDayLabel(date)}, available`
                                : `${formatDayLabel(date)}, no times`
                            }
                            onClick={() => {
                              setDayKey(key);
                              setSelected(null);
                            }}
                            className={`h-10 rounded-full text-sm ${
                              active
                                ? "bg-[var(--brand-500)] font-semibold text-[var(--text-inverse)]"
                                : open
                                  ? "text-[var(--text-primary)] hover:bg-[var(--surface-secondary)]"
                                  : "cursor-default text-[var(--text-tertiary)]"
                            }`}
                          >
                            {date.getDate()}
                          </button>
                        );
                      })}
                    </div>
                    {error ? (
                      <p
                        className="mt-4 text-sm text-[var(--error)]"
                        role="alert"
                      >
                        {error}
                      </p>
                    ) : null}
                    {slots.length === 0 ? (
                      <p className="mt-4 text-sm text-[var(--text-secondary)]">
                        No open times in the next three weeks.
                      </p>
                    ) : null}
                  </div>
                  <div className="border-t border-[var(--border-subtle)] p-4 md:border-t-0 md:border-l">
                    <h2 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">
                      {dayKey && daySlots[0]
                        ? formatDayLabel(new Date(daySlots[0].start))
                        : "Times"}
                    </h2>
                    {daySlots.length === 0 ? (
                      <p className="text-sm text-[var(--text-secondary)]">
                        Pick a day with a time.
                      </p>
                    ) : (
                      <ul className="max-h-80 space-y-2 overflow-y-auto">
                        {daySlots.map((slot) => (
                          <li key={slot.id}>
                            <button
                              type="button"
                              onClick={() => {
                                setSelected(slot);
                                setStep("details");
                                setError("");
                              }}
                              className="w-full rounded-[var(--radius-md)] border border-[var(--brand-500)] px-3 py-2 text-sm font-semibold text-[var(--brand-500)] hover:bg-[color-mix(in_srgb,var(--brand-500)_12%,transparent)]"
                            >
                              {formatTime(slot.start)}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <section className="mx-auto max-w-lg space-y-2 rounded-[var(--radius-xl)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-6">
      <h1 className="text-2xl font-bold text-[var(--text-primary)]">{title}</h1>
      <p className="text-sm text-[var(--text-secondary)]">{body}</p>
    </section>
  );
}
