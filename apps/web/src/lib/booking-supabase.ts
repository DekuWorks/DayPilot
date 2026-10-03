import { createClient } from "@/lib/supabase/client";
import { getApiUrl } from "@/lib/api";
import type { CalendarBooking } from "@/lib/booking-calendar";
import { buildPublicSlots } from "@/lib/booking-slots";

export type BookingLink = {
  id: string;
  slug: string;
  title: string | null;
  description: string | null;
  duration: number;
  isActive: boolean;
};

type Row = {
  id: string;
  slug: string;
  title: string | null;
  description: string | null;
  duration: number;
  is_active: boolean;
};

function mapRow(row: Row): BookingLink {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    duration: row.duration,
    isActive: row.is_active,
  };
}

export async function listMyBookingLinks(
  userId: string,
): Promise<BookingLink[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("booking_links")
    .select("id, slug, title, description, duration, is_active")
    .eq("owner_user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return ((data as Row[]) ?? []).map(mapRow);
}

export function browserTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export async function createBookingLink(
  userId: string,
  data: { slug: string; title: string; duration?: number; timeZone?: string },
): Promise<BookingLink> {
  const supabase = createClient();
  const { data: row, error } = await supabase
    .from("booking_links")
    .insert({
      owner_user_id: userId,
      slug: data.slug,
      title: data.title,
      duration: data.duration ?? 30,
      timezone: data.timeZone || browserTimeZone(),
      is_active: true,
      type: "one-on-one",
    })
    .select("id, slug, title, description, duration, is_active")
    .single();
  if (error || !row) throw new Error(error?.message ?? "Failed to create link");

  const linkId = (row as Row).id;
  const rules = [1, 2, 3, 4, 5].map((day) => ({
    booking_link_id: linkId,
    day_of_week: day,
    start_time: "09:00",
    end_time: "17:00",
    is_available: true,
  }));
  const { error: rulesErr } = await supabase
    .from("availability_rules")
    .insert(rules);
  if (rulesErr) throw new Error(rulesErr.message);

  return mapRow(row as Row);
}

export async function setBookingLinkActive(
  id: string,
  isActive: boolean,
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("booking_links")
    .update({
      is_active: isActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function getPublicBookingLink(slug: string): Promise<{
  id: string;
  slug: string;
  title: string;
  description: string | null;
  duration: number;
  timeZone: string;
  paused: boolean;
} | null> {
  const supabase = createClient();
  // Active links are public. A paused link is visible only to its owner, so
  // they can preview the page. Guests get no row from RLS.
  const { data, error } = await supabase
    .from("booking_links")
    .select("id, slug, title, description, duration, timezone, is_active")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const row = data as Row & {
    duration: number;
    timezone?: string | null;
    is_active?: boolean;
  };
  return {
    id: row.id,
    slug: row.slug,
    title: row.title?.trim() || "Book time",
    description: row.description,
    duration: row.duration,
    timeZone: row.timezone?.trim() || "UTC",
    paused: row.is_active === false,
  };
}

type Rule = {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean | null;
};

export type PublicSlot = {
  id: string;
  start: string;
  end: string;
};

/** Open slots for the next 21 days, using the link's timezone. */
export async function listPublicSlots(
  bookingLinkId: string,
): Promise<PublicSlot[]> {
  const supabase = createClient();
  const { data: link, error: linkErr } = await supabase
    .from("booking_links")
    .select("duration, timezone")
    .eq("id", bookingLinkId)
    .single();
  if (linkErr) throw new Error(linkErr.message);
  const linkRow = link as { duration: number; timezone?: string | null };

  const { data: rulesRaw, error: rulesErr } = await supabase
    .from("availability_rules")
    .select("day_of_week, start_time, end_time, is_available")
    .eq("booking_link_id", bookingLinkId);
  if (rulesErr) throw new Error(rulesErr.message);
  const rules = ((rulesRaw as Rule[]) ?? []).filter(
    (rule) => rule.is_available !== false,
  );

  const { data: excludedRaw } = await supabase
    .from("booking_excluded_dates")
    .select("excluded_date")
    .eq("booking_link_id", bookingLinkId);

  const { data: bookingsRaw } = await supabase
    .from("bookings")
    .select("start_time, end_time")
    .eq("booking_link_id", bookingLinkId)
    .neq("status", "cancelled");

  return buildPublicSlots({
    linkId: bookingLinkId,
    timeZone: linkRow.timezone || "UTC",
    durationMin: Number(linkRow.duration ?? 30),
    rules: rules.map((rule) => ({
      dayOfWeek: Number(rule.day_of_week),
      start: String(rule.start_time),
      end: String(rule.end_time),
    })),
    excludedDates: ((excludedRaw as { excluded_date: string }[]) ?? []).map(
      (row) => String(row.excluded_date),
    ),
    busy: (
      (bookingsRaw as { start_time: string; end_time: string }[]) ?? []
    ).map((row) => ({
      start: row.start_time,
      end: row.end_time,
    })),
  });
}

/** Confirmed bookings owned by this user, for the calendar they actually see. */
export async function listConfirmedBookingsForCalendar(
  userId: string,
  range?: { from?: string; to?: string },
): Promise<CalendarBooking[]> {
  const supabase = createClient();
  const { data: links, error: linkErr } = await supabase
    .from("booking_links")
    .select("id, title")
    .eq("owner_user_id", userId);
  if (linkErr) throw new Error(linkErr.message);
  const linkRows = (links as { id: string; title: string | null }[]) ?? [];
  if (linkRows.length === 0) return [];
  const titles = new Map(linkRows.map((row) => [row.id, row.title ?? ""]));

  let query = supabase
    .from("bookings")
    .select(
      "id, booker_name, booker_email, start_time, end_time, booking_link_id",
    )
    .in(
      "booking_link_id",
      linkRows.map((row) => row.id),
    )
    .eq("status", "confirmed");
  if (range?.from) query = query.gt("end_time", range.from);
  if (range?.to) query = query.lt("start_time", range.to);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (
    (data as {
      id: string;
      booker_name: string | null;
      booker_email: string | null;
      start_time: string;
      end_time: string;
      booking_link_id: string;
    }[]) ?? []
  ).map((row) => ({
    id: row.id,
    title: titles.get(row.booking_link_id) || "Booking",
    bookerName: row.booker_name || "Guest",
    bookerEmail: row.booker_email || "",
    start: row.start_time,
    end: row.end_time,
  }));
}

export type BookingEmailStatus = "sent" | "not_sent";

export async function confirmPublicBooking(input: {
  bookingLinkId: string;
  start: string;
  end: string;
  bookerName: string;
  bookerEmail: string;
}): Promise<{ email: BookingEmailStatus }> {
  const supabase = createClient();
  const { data: link } = await supabase
    .from("booking_links")
    .select("timezone")
    .eq("id", input.bookingLinkId)
    .single();
  const tz = (link as { timezone?: string } | null)?.timezone ?? "UTC";
  const { error } = await supabase.from("bookings").insert({
    booking_link_id: input.bookingLinkId,
    booker_name: input.bookerName.trim() || "Guest",
    booker_email: input.bookerEmail.trim(),
    start_time: input.start,
    end_time: input.end,
    timezone: tz,
    status: "confirmed",
  });
  if (error) throw new Error(error.message);
  return { email: await requestBookingEmail(input) };
}

async function requestBookingEmail(input: {
  bookingLinkId: string;
  start: string;
  bookerEmail: string;
}): Promise<BookingEmailStatus> {
  try {
    const res = await fetch(`${getApiUrl()}/bookings/confirmation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bookingLinkId: input.bookingLinkId,
        start: input.start,
        bookerEmail: input.bookerEmail.trim(),
      }),
    });
    if (!res.ok) return "not_sent";
    const body = (await res.json()) as { sent?: boolean };
    return body.sent ? "sent" : "not_sent";
  } catch {
    return "not_sent";
  }
}
