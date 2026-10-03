import { createClient } from "@/lib/supabase/client";
import { getApiUrl } from "@/lib/api";
import type { CalendarBooking } from "@/lib/booking-calendar";
import { buildPublicSlots } from "@/lib/booking-slots";
import {
  normalizeCallbackNumber,
  normalizeHttpUrl,
  type ConfiguredMethod,
  type HostMeetingDraft,
  type PublicMeetingChoice,
} from "@/lib/meeting-choice";

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

export async function listPublicMeetingChoices(
  bookingLinkId: string,
): Promise<PublicMeetingChoice[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("public_meeting_choices", {
    link_id: bookingLinkId,
  });
  if (error) {
    if (/public_meeting_choices|PGRST202|schema cache/i.test(error.message)) {
      return [];
    }
    throw new Error(error.message);
  }
  return ((data as PublicMeetingChoice[]) ?? []).filter((choice) =>
    ["link", "phone", "slack", "discord"].includes(choice.id),
  );
}

export async function getMeetingSetup(
  bookingLinkId: string,
): Promise<HostMeetingDraft> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("booking_link_meetings")
    .select(
      "methods, host_meeting_url, host_phone, host_slack_url, host_discord_url",
    )
    .eq("booking_link_id", bookingLinkId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const row = data as {
    methods?: string[] | null;
    host_meeting_url?: string | null;
    host_phone?: string | null;
    host_slack_url?: string | null;
    host_discord_url?: string | null;
  } | null;
  const methods = new Set(row?.methods ?? []);
  return {
    link: methods.has("link"),
    linkUrl: row?.host_meeting_url ?? "",
    phone: methods.has("phone"),
    phoneNumber: row?.host_phone ?? "",
    slack: methods.has("slack"),
    slackUrl: row?.host_slack_url ?? "",
    discord: methods.has("discord"),
    discordUrl: row?.host_discord_url ?? "",
  };
}

export async function saveMeetingSetup(
  bookingLinkId: string,
  draft: HostMeetingDraft,
): Promise<void> {
  const methods: ConfiguredMethod[] = [];
  const linkUrl = draft.link ? normalizeHttpUrl(draft.linkUrl) : null;
  const phoneNumber = draft.phone
    ? normalizeCallbackNumber(draft.phoneNumber)
    : null;
  const slackUrl = draft.slack ? normalizeHttpUrl(draft.slackUrl) : null;
  const discordUrl = draft.discord ? normalizeHttpUrl(draft.discordUrl) : null;
  if (draft.link && !linkUrl) {
    throw new Error("Add an http or https meeting link before enabling it.");
  }
  if (draft.phone && !phoneNumber) {
    throw new Error("Add a phone number before enabling phone calls.");
  }
  if (draft.slack && !slackUrl) {
    throw new Error("Add an http or https Slack link before enabling it.");
  }
  if (draft.discord && !discordUrl) {
    throw new Error("Add an http or https Discord link before enabling it.");
  }
  if (linkUrl) methods.push("link");
  if (phoneNumber) methods.push("phone");
  if (slackUrl) methods.push("slack");
  if (discordUrl) methods.push("discord");

  const supabase = createClient();
  const { error } = await supabase.from("booking_link_meetings").upsert(
    {
      booking_link_id: bookingLinkId,
      methods,
      host_meeting_url: linkUrl,
      host_phone: phoneNumber,
      host_slack_url: slackUrl,
      host_discord_url: discordUrl,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "booking_link_id" },
  );
  if (error) throw new Error(error.message);
}

export async function confirmPublicBooking(input: {
  bookingLinkId: string;
  start: string;
  end: string;
  bookerName: string;
  bookerEmail: string;
  meetingMethod?: ConfiguredMethod | null;
  guestPhone?: string | null;
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
    booker_phone: input.guestPhone ?? null,
    start_time: input.start,
    end_time: input.end,
    timezone: tz,
    status: "confirmed",
    meeting_method: input.meetingMethod ?? null,
  });
  if (error) {
    if (/duplicate|bookings_one_confirmed_slot|23505/i.test(error.message)) {
      return { email: await requestBookingEmail(input) };
    }
    throw new Error(error.message);
  }
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
