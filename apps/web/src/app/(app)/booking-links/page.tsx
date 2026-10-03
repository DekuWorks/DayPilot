"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/Button";
import { useAuth } from "@/providers/AuthProvider";
import * as bookingApi from "@/lib/booking-supabase";
import type { BookingLink } from "@/lib/booking-supabase";
import {
  AUTOMATIC_MEETING_NOTES,
  type HostMeetingDraft,
} from "@/lib/meeting-choice";

export default function BookingLinksPage() {
  const { user } = useAuth();
  const [links, setLinks] = useState<BookingLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("Book time with me");
  const [creating, setCreating] = useState(false);
  const [copiedSlug, setCopiedSlug] = useState("");
  const slugPlaceholder = "your-slug";

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

  useEffect(() => {
    if (!user?.username) return;
    setSlug(
      (prev) => prev || user.username!.toLowerCase().replace(/[^a-z0-9-]/g, ""),
    );
  }, [user?.username]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const clean = slug
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "");
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
          l.id === link.id ? { ...l, isActive: !l.isActive } : l,
        ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update");
    }
  }

  async function copyLink(s: string) {
    const url = `${window.location.origin}/book/${s}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedSlug(s);
    } catch {
      setError("Couldn't copy the link. Select it from the Open page instead.");
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          Booking links
        </h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Share a link. It opens in the browser, so they do not need the
          DayPilot app. They pick a time from the hours you set, in your
          timezone. Confirmed bookings show on your DayPilot calendar. The guest
          can save a calendar file, and DayPilot emails that file as a
          confirmation. You can pause the link. New links use weekdays,
          09:00–17:00, until you change them.
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
            placeholder={slugPlaceholder}
            aria-label="Booking link slug"
            className="min-w-0 flex-1 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none focus:ring-2 focus:ring-[var(--brand-500)]"
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
          <li className="rounded-[var(--radius-lg)] border border-dashed border-[var(--border-subtle)] px-4 py-6 text-sm text-[var(--text-secondary)]">
            No booking links yet. Create one above, copy it, and send it to the
            person who needs a time with you.
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
                onClick={() => void copyLink(link.slug)}
                aria-live="polite"
              >
                {copiedSlug === link.slug ? "Copied" : "Copy"}
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
              <MeetingSetup linkId={link.id} onError={setError} />
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

const EMPTY_DRAFT: HostMeetingDraft = {
  link: false,
  linkUrl: "",
  phone: false,
  phoneNumber: "",
  slack: false,
  slackUrl: "",
  discord: false,
  discordUrl: "",
};

function MeetingSetup({
  linkId,
  onError,
}: {
  linkId: string;
  onError: (message: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<HostMeetingDraft>(EMPTY_DRAFT);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  async function load() {
    setOpen(true);
    setLoading(true);
    try {
      setDraft(await bookingApi.getMeetingSetup(linkId));
    } catch (e) {
      onError(e instanceof Error ? e.message : "Could not load meeting setup");
    } finally {
      setLoading(false);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await bookingApi.saveMeetingSetup(linkId, draft);
      onError("");
      setOpen(false);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not save meeting setup");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <Button size="sm" variant="outline" type="button" onClick={() => void load()}>
        Meeting options
      </Button>
    );
  }

  return (
    <form onSubmit={save} className="mt-3 w-full space-y-3 border-t border-[var(--border-subtle)] pt-3">
      {loading ? (
        <p className="text-sm text-[var(--text-secondary)]">Loading meeting options…</p>
      ) : (
        <>
          <MethodRow
            label="Meeting link"
            checked={draft.link}
            onChecked={(link) => setDraft({ ...draft, link })}
            value={draft.linkUrl}
            onValue={(linkUrl) => setDraft({ ...draft, linkUrl })}
            placeholder="https://"
          />
          <MethodRow
            label="Phone call"
            checked={draft.phone}
            onChecked={(phone) => setDraft({ ...draft, phone })}
            value={draft.phoneNumber}
            onValue={(phoneNumber) => setDraft({ ...draft, phoneNumber })}
            placeholder="Your number, sent only after someone books"
          />
          <MethodRow
            label="Slack link"
            checked={draft.slack}
            onChecked={(slack) => setDraft({ ...draft, slack })}
            value={draft.slackUrl}
            onValue={(slackUrl) => setDraft({ ...draft, slackUrl })}
            placeholder="https://"
          />
          <MethodRow
            label="Discord invite"
            checked={draft.discord}
            onChecked={(discord) => setDraft({ ...draft, discord })}
            value={draft.discordUrl}
            onValue={(discordUrl) => setDraft({ ...draft, discordUrl })}
            placeholder="https://"
          />
          <ul className="space-y-1 text-xs text-[var(--text-tertiary)]">
            {AUTOMATIC_MEETING_NOTES.map((note) => (
              <li key={note.id}>
                {note.label}: {note.detail}
              </li>
            ))}
          </ul>
        </>
      )}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={saving || loading}>
          {saving ? "Saving…" : "Save meeting options"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setOpen(false)}
        >
          Close
        </Button>
      </div>
    </form>
  );
}

function MethodRow({
  label,
  checked,
  onChecked,
  value,
  onValue,
  placeholder,
}: {
  label: string;
  checked: boolean;
  onChecked: (value: boolean) => void;
  value: string;
  onValue: (value: string) => void;
  placeholder: string;
}) {
  const fieldId = label.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="space-y-1">
      <label className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChecked(e.target.checked)}
        />
        {label}
      </label>
      {checked ? (
        <input
          id={fieldId}
          aria-label={label}
          value={value}
          onChange={(e) => onValue(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--brand-500)]"
        />
      ) : null}
    </div>
  );
}
