import { createClient } from "@/lib/supabase/client";

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

export async function listMyBookingLinks(userId: string): Promise<BookingLink[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("booking_links")
    .select("id, slug, title, description, duration, is_active")
    .eq("owner_user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return ((data as Row[]) ?? []).map(mapRow);
}

export async function createBookingLink(
  userId: string,
  data: { slug: string; title: string; duration?: number }
): Promise<BookingLink> {
  const supabase = createClient();
  const { data: row, error } = await supabase
    .from("booking_links")
    .insert({
      owner_user_id: userId,
      slug: data.slug,
      title: data.title,
      duration: data.duration ?? 30,
      timezone: "America/New_York",
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
  isActive: boolean
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
} | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("booking_links")
    .select("id, slug, title, description, duration")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const row = data as Row & { duration: number };
  return {
    id: row.id,
    slug: row.slug,
    title: row.title?.trim() || "Book time",
    description: row.description,
    duration: row.duration,
  };
}

type Rule = {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean | null;
};

function parseTime(v: string): { h: number; m: number } {
  const [h, m] = v.split(":").map((x) => parseInt(x, 10));
  return { h: h || 0, m: m || 0 };
}

export type PublicSlot = {
  id: string;
  start: string;
  end: string;
};

/** Generate open slots for the next 21 days (same logic as mobile). */
export async function listPublicSlots(
  bookingLinkId: string
): Promise<PublicSlot[]> {
  const supabase = createClient();
  const { data: link, error: linkErr } = await supabase
    .from("booking_links")
    .select("duration")
    .eq("id", bookingLinkId)
    .single();
  if (linkErr) throw new Error(linkErr.message);
  const durationMin = Number((link as { duration: number }).duration ?? 30);

  const { data: rulesRaw, error: rulesErr } = await supabase
    .from("availability_rules")
    .select("day_of_week, start_time, end_time, is_available")
    .eq("booking_link_id", bookingLinkId);
  if (rulesErr) throw new Error(rulesErr.message);
  const rules = ((rulesRaw as Rule[]) ?? []).filter(
    (r) => r.is_available !== false
  );
  if (rules.length === 0) return [];

  const { data: excludedRaw } = await supabase
    .from("booking_excluded_dates")
    .select("excluded_date")
    .eq("booking_link_id", bookingLinkId);
  const excluded = new Set(
    ((excludedRaw as { excluded_date: string }[]) ?? []).map((e) =>
      e.excluded_date.slice(0, 10)
    )
  );

  const { data: bookingsRaw } = await supabase
    .from("bookings")
    .select("start_time, end_time, status")
    .eq("booking_link_id", bookingLinkId)
    .neq("status", "cancelled");
  const busy = ((bookingsRaw as { start_time: string; end_time: string }[]) ??
    []
  ).map((b) => ({
    start: new Date(b.start_time).getTime(),
    end: new Date(b.end_time).getTime(),
  }));

  const slots: PublicSlot[] = [];
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  for (let d = 0; d < 21; d++) {
    const day = new Date(today);
    day.setDate(today.getDate() + d);
    const key = day.toISOString().slice(0, 10);
    if (excluded.has(key)) continue;
    const dow = day.getDay(); // 0=Sun
    for (const rule of rules) {
      if (rule.day_of_week !== dow) continue;
      const startT = parseTime(String(rule.start_time));
      const endT = parseTime(String(rule.end_time));
      let cursor = new Date(
        day.getFullYear(),
        day.getMonth(),
        day.getDate(),
        startT.h,
        startT.m
      );
      const dayEnd = new Date(
        day.getFullYear(),
        day.getMonth(),
        day.getDate(),
        endT.h,
        endT.m
      );
      while (cursor < dayEnd) {
        const slotEnd = new Date(cursor.getTime() + durationMin * 60_000);
        if (slotEnd > dayEnd) break;
        if (slotEnd > now) {
          const cs = cursor.getTime();
          const ce = slotEnd.getTime();
          const overlaps = busy.some((b) => cs < b.end && ce > b.start);
          if (!overlaps) {
            slots.push({
              id: `${bookingLinkId}|${cursor.toISOString()}`,
              start: cursor.toISOString(),
              end: slotEnd.toISOString(),
            });
          }
        }
        cursor = slotEnd;
      }
    }
  }
  return slots;
}

export async function confirmPublicBooking(input: {
  bookingLinkId: string;
  start: string;
  end: string;
  bookerName: string;
  bookerEmail: string;
}): Promise<void> {
  const supabase = createClient();
  const { data: link } = await supabase
    .from("booking_links")
    .select("timezone")
    .eq("id", input.bookingLinkId)
    .single();
  const tz =
    (link as { timezone?: string } | null)?.timezone ?? "America/New_York";
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
}
