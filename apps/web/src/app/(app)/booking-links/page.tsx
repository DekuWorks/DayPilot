"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/Button";
import { useAuth } from "@/providers/AuthProvider";
import * as bookingApi from "@/lib/booking-supabase";
import type { BookingLink } from "@/lib/booking-supabase";

export default function BookingLinksPage() {
  const { user } = useAuth();
  const [links, setLinks] = useState<BookingLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("Book time with me");
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      setLinks(await bookingApi.listMyBookingLinks(user.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const clean = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (clean.length < 3) {
      setError("Slug must be at least 3 characters (a-z, 0-9, -)");
      return;
    }
    setCreating(true);
    setError("");
    try {
      await bookingApi.createBookingLink(user.id, {
        slug: clean,
        title: title.trim() || "Book time with me",
      });
      setSlug("");
      setTitle("Book time with me");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setCreating(false);
    }
  }

  async function toggle(link: BookingLink) {
    try {
      await bookingApi.setBookingLinkActive(link.id, !link.isActive);
      setLinks((prev) =>
        prev.map((l) =>
          l.id === link.id ? { ...l, isActive: !l.isActive } : l
        )
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update");
    }
  }

  function copyLink(s: string) {
    const url = `${window.location.origin}/book/${s}`;
    void navigator.clipboard.writeText(url);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          Booking links
        </h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Share a link so others can book time on your calendar.
        </p>
      </div>

      {error && <p className="text-sm text-[var(--error)]">{error}</p>}

      <form
        onSubmit={handleCreate}
        className="space-y-3 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4"
      >
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">
          New link
        </h2>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          className="w-full rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--brand-500)]"
        />
        <div className="flex items-center gap-2">
          <span className="text-sm text-[var(--text-tertiary)]">/book/</span>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="marcus"
            className="min-w-0 flex-1 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--brand-500)]"
          />
          <Button type="submit" disabled={creating}>
            {creating ? "Creating…" : "Create"}
          </Button>
        </div>
        <p className="text-xs text-[var(--text-tertiary)]">
          Defaults to Mon–Fri 9:00–17:00 availability.
        </p>
      </form>

      <ul className="space-y-2">
        {loading ? (
          <li className="text-sm text-[var(--text-secondary)]">Loading…</li>
        ) : links.length === 0 ? (
          <li className="text-sm text-[var(--text-secondary)]">
            No booking links yet.
          </li>
        ) : (
          links.map((link) => (
            <li
              key={link.id}
              className="flex flex-wrap items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-[var(--text-primary)]">
                  {link.title || link.slug}
                </p>
                <p className="text-xs text-[var(--text-secondary)]">
                  /book/{link.slug} · {link.duration} min ·{" "}
                  {link.isActive ? "Active" : "Paused"}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                type="button"
                onClick={() => copyLink(link.slug)}
              >
                Copy
              </Button>
              <Link
                href={`/book/${link.slug}`}
                className="text-sm font-medium text-[var(--brand-500)]"
              >
                Open
              </Link>
              <Button
                size="sm"
                variant="outline"
                type="button"
                onClick={() => void toggle(link)}
              >
                {link.isActive ? "Pause" : "Activate"}
              </Button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
