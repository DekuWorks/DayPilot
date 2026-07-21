import { createClient } from "@/lib/supabase/client";

export type AppNotification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  resourceType: string | null;
  resourceId: string | null;
  readAt: string | null;
  createdAt: string;
};

type Row = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  resource_type: string | null;
  resource_id: string | null;
  read_at: string | null;
  created_at: string;
};

function mapRow(row: Row): AppNotification {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    resourceType: row.resource_type,
    resourceId: row.resource_id,
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}

const SELECT =
  "id, type, title, body, resource_type, resource_id, read_at, created_at";

export async function listNotifications(limit = 30): Promise<AppNotification[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("notifications")
    .select(SELECT)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return ((data as Row[]) ?? []).map(mapRow);
}

export async function unreadCount(): Promise<number> {
  const supabase = createClient();
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .is("read_at", null);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function markRead(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function markAllRead(): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .is("read_at", null);
  if (error) throw new Error(error.message);
}

export async function createNotification(
  userId: string,
  data: {
    type: string;
    title: string;
    body?: string;
    resourceType?: string;
    resourceId?: string;
  }
): Promise<AppNotification> {
  const supabase = createClient();
  const { data: row, error } = await supabase
    .from("notifications")
    .insert({
      user_id: userId,
      type: data.type,
      title: data.title,
      body: data.body ?? null,
      resource_type: data.resourceType ?? null,
      resource_id: data.resourceId ?? null,
    })
    .select(SELECT)
    .single();
  if (error || !row)
    throw new Error(error?.message ?? "Failed to create notification");
  return mapRow(row as Row);
}

/** Ensure the user has reminder notifications for meetings in the next 24h. */
export async function syncUpcomingMeetingReminders(
  userId: string
): Promise<void> {
  const supabase = createClient();
  const now = new Date();
  const soon = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const { data: events } = await supabase
    .from("events")
    .select("id, title, start_time, start")
    .gte("start_time", now.toISOString())
    .lte("start_time", soon.toISOString())
    .limit(20);

  const rows = events ?? [];
  if (rows.length === 0) return;

  const { data: existing } = await supabase
    .from("notifications")
    .select("resource_id")
    .eq("user_id", userId)
    .eq("type", "meeting_reminder")
    .in(
      "resource_id",
      rows.map((e) => e.id)
    );

  const have = new Set((existing ?? []).map((n) => n.resource_id));

  const inserts = rows
    .filter((e) => !have.has(e.id))
    .map((e) => {
      const start = e.start_time || e.start;
      const when = start
        ? new Date(start).toLocaleString(undefined, {
            weekday: "short",
            hour: "numeric",
            minute: "2-digit",
          })
        : "soon";
      return {
        user_id: userId,
        type: "meeting_reminder",
        title: e.title || "Upcoming meeting",
        body: `Starts ${when}`,
        resource_type: "event",
        resource_id: e.id,
      };
    });

  if (inserts.length > 0) {
    await supabase.from("notifications").insert(inserts);
  }
}
