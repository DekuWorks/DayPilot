"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/Button";
import * as bookingApi from "@/lib/booking-supabase";
import type { PublicSlot } from "@/lib/booking-supabase";

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
  const [linkId, setLinkId] = useState<string | null>(null);
  const [slots, setSlots] = useState<PublicSlot[]>([]);
  const [selected, setSelected] = useState<PublicSlot | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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
      setSlots(await bookingApi.listPublicSlots(page.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    void load();
  }, [load]);

  async function confirm(e: React.FormEvent) {
    e.preventDefault();
    if (!linkId || !selected) return;
    if (!email.includes("@")) {
      setError("Enter a valid email");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await bookingApi.confirmPublicBooking({
        bookingLinkId: linkId,
        start: selected.start,
        end: selected.end,
        bookerName: name,
        bookerEmail: email,
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Booking failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--background-primary)]">
      <nav className="border-b border-[var(--border-subtle)] px-4 py-4">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <BrandLogo />
          <Link
            href="/login"
            className="text-sm text-[var(--brand-500)] font-medium"
          >
            Sign in
          </Link>
        </div>
      </nav>
      <main className="mx-auto max-w-lg px-4 py-10 space-y-6">
        {loading ? (
          <p className="text-[var(--text-secondary)]">Loading…</p>
        ) : !linkId ? (
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">
              Link not found
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">
              This booking page is inactive or doesn&apos;t exist.
            </p>
          </div>
        ) : done ? (
          <div className="space-y-2 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-6">
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">
              You&apos;re booked
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">
              Confirmation sent for{" "}
              {selected
                ? new Date(selected.start).toLocaleString()
                : "your slot"}
              .
            </p>
          </div>
        ) : (
          <>
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                {title}
              </h1>
              {description && (
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  {description}
                </p>
              )}
            </div>
            {error && <p className="text-sm text-[var(--error)]">{error}</p>}
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                Available times
              </h2>
              {slots.length === 0 ? (
                <p className="text-sm text-[var(--text-secondary)]">
                  No open slots in the next three weeks.
                </p>
              ) : (
                <ul className="max-h-72 space-y-1 overflow-y-auto rounded-xl border border-[var(--border-subtle)] p-2">
                  {slots.map((s) => {
                    const active = selected?.id === s.id;
                    return (
                      <li key={s.id}>
                        <button
                          type="button"
                          onClick={() => setSelected(s)}
                          className={`w-full rounded-lg px-3 py-2 text-left text-sm ${
                            active
                              ? "bg-[var(--brand-500)] text-[var(--text-inverse)]"
                              : "hover:bg-[var(--surface-secondary)] text-[var(--text-primary)]"
                          }`}
                        >
                          {new Date(s.start).toLocaleString(undefined, {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            <form onSubmit={confirm} className="space-y-3">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="w-full rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--brand-500)]"
              />
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                type="email"
                required
                className="w-full rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--brand-500)]"
              />
              <Button
                type="submit"
                disabled={!selected || submitting}
                className="w-full"
              >
                {submitting ? "Booking…" : "Confirm booking"}
              </Button>
            </form>
          </>
        )}
      </main>
    </div>
  );
}
