import { createClient } from "@/lib/supabase/client";

export type CalendarEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
  description?: string | null;
  location?: string | null;
  meetingUrl?: string | null;
  calendarId?: string | null;
  allDay?: boolean;
  source?: string;
};

type EventRow = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  meeting_url?: string | null;
  calendar_id: string | null;
  all_day?: boolean | null;
  start?: string | null;
  end?: string | null;
  start_time?: string | null;
  end_time?: string | null;
};

function mapRow(row: EventRow): CalendarEvent {
  return {
    id: row.id,
    title: row.title,
    start: row.start_time || row.start || "",
    end: row.end_time || row.end || "",
    description: row.description,
    location: row.location,
    meetingUrl: row.meeting_url ?? null,
    calendarId: row.calendar_id,
    allDay: Boolean(row.all_day),
    source: "native",
  };
}

async function ensureDefaultCalendar(userId: string): Promise<string> {
  const supabase = createClient();
  const { data: existing } = await supabase
    .from("calendars")
    .select("id")
    .eq("owner_id", userId)
    .eq("is_default", true)
    .limit(1)
    .maybeSingle();

  if (existing?.id) return existing.id;

  const { data: anyCal } = await supabase
    .from("calendars")
    .select("id")
    .eq("owner_id", userId)
    .limit(1)
    .maybeSingle();

  if (anyCal?.id) return anyCal.id;

  const { data: created, error } = await supabase
    .from("calendars")
    .insert({
      owner_id: userId,
      name: "My Calendar",
      color: "#42E85F",
      is_default: true,
    })
    .select("id")
    .single();

  if (error || !created) {
    throw new Error(error?.message ?? "Failed to create default calendar");
  }
  return created.id;
}

export async function listEvents(params?: {
  from?: string;
  to?: string;
}): Promise<CalendarEvent[]> {
  const supabase = createClient();
  let query = supabase
    .from("events")
    .select(
      "id, title, description, location, meeting_url, calendar_id, all_day, start, end, start_time, end_time"
    )
    .is("deleted_at", null)
    .order("start_time", { ascending: true });

  if (params?.from) {
    query = query.gte("start_time", params.from);
  }
  if (params?.to) {
    query = query.lte("start_time", params.to);
  }

  const { data, error } = await query;
  if (error) {
    // Fallback if deleted_at column filter fails on older rows
    const fallback = await supabase
      .from("events")
      .select(
        "id, title, description, location, meeting_url, calendar_id, all_day, start, end, start_time, end_time"
      )
      .order("start_time", { ascending: true });
    if (fallback.error) throw new Error(fallback.error.message);
    let rows = (fallback.data as EventRow[]) ?? [];
    if (params?.from) {
      rows = rows.filter(
        (r) => (r.start_time || r.start || "") >= params.from!
      );
    }
    if (params?.to) {
      rows = rows.filter((r) => (r.start_time || r.start || "") <= params.to!);
    }
    return rows.map(mapRow);
  }
  return ((data as EventRow[]) ?? []).map(mapRow);
}

export async function createEvent(
  userId: string,
  data: {
    title: string;
    start: string;
    end: string;
    description?: string;
    location?: string;
    meetingUrl?: string;
  }
): Promise<CalendarEvent> {
  const supabase = createClient();
  const calendarId = await ensureDefaultCalendar(userId);
  const { data: row, error } = await supabase
    .from("events")
    .insert({
      user_id: userId,
      calendar_id: calendarId,
      title: data.title,
      description: data.description ?? null,
      location: data.location ?? null,
      meeting_url: data.meetingUrl ?? null,
      start: data.start,
      end: data.end,
      start_time: data.start,
      end_time: data.end,
      status: "scheduled",
    })
    .select(
      "id, title, description, location, meeting_url, calendar_id, all_day, start, end, start_time, end_time"
    )
    .single();

  if (error || !row) throw new Error(error?.message ?? "Failed to create event");
  return mapRow(row as EventRow);
}

export async function updateEvent(
  id: string,
  data: {
    title?: string;
    start?: string;
    end?: string;
    description?: string;
    location?: string;
    meetingUrl?: string | null;
  }
): Promise<CalendarEvent> {
  const supabase = createClient();
  const patch: Record<string, unknown> = {};
  if (data.title !== undefined) patch.title = data.title;
  if (data.description !== undefined) patch.description = data.description;
  if (data.location !== undefined) patch.location = data.location;
  if (data.meetingUrl !== undefined) patch.meeting_url = data.meetingUrl;
  if (data.start !== undefined) {
    patch.start = data.start;
    patch.start_time = data.start;
  }
  if (data.end !== undefined) {
    patch.end = data.end;
    patch.end_time = data.end;
  }

  const { data: row, error } = await supabase
    .from("events")
    .update(patch)
    .eq("id", id)
    .select(
      "id, title, description, location, meeting_url, calendar_id, all_day, start, end, start_time, end_time"
    )
    .single();

  if (error || !row) throw new Error(error?.message ?? "Failed to update event");
  return mapRow(row as EventRow);
}

export async function deleteEvent(id: string): Promise<void> {
  const supabase = createClient();
  // Soft delete when column exists; otherwise hard delete
  const soft = await supabase
    .from("events")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (soft.error) {
    const hard = await supabase.from("events").delete().eq("id", id);
    if (hard.error) throw new Error(hard.error.message);
  }
}
