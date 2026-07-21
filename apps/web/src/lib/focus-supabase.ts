import { createClient } from "@/lib/supabase/client";

export type FocusSession = {
  id: string;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number | null;
  status: string;
  notes: string | null;
};

type Row = {
  id: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  status: string;
  notes: string | null;
};

function mapRow(row: Row): FocusSession {
  return {
    id: row.id,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    durationSeconds: row.duration_seconds,
    status: row.status,
    notes: row.notes,
  };
}

export async function listFocusSessions(params?: {
  from?: string;
}): Promise<FocusSession[]> {
  const supabase = createClient();
  let query = supabase
    .from("focus_sessions")
    .select("id, started_at, ended_at, duration_seconds, status, notes")
    .order("started_at", { ascending: false })
    .limit(100);
  if (params?.from) query = query.gte("started_at", params.from);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return ((data as Row[]) ?? []).map(mapRow);
}

export async function startFocusSession(userId: string): Promise<FocusSession> {
  const supabase = createClient();
  // End any lingering active sessions
  await supabase
    .from("focus_sessions")
    .update({
      status: "cancelled",
      ended_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("status", "active");

  const { data: row, error } = await supabase
    .from("focus_sessions")
    .insert({
      user_id: userId,
      status: "active",
      started_at: new Date().toISOString(),
    })
    .select("id, started_at, ended_at, duration_seconds, status, notes")
    .single();
  if (error || !row) throw new Error(error?.message ?? "Failed to start focus");
  return mapRow(row as Row);
}

export async function completeFocusSession(id: string): Promise<FocusSession> {
  const supabase = createClient();
  const { data: existing, error: readErr } = await supabase
    .from("focus_sessions")
    .select("id, started_at, ended_at, duration_seconds, status, notes")
    .eq("id", id)
    .single();
  if (readErr || !existing) throw new Error(readErr?.message ?? "Not found");

  const ended = new Date();
  const started = new Date((existing as Row).started_at);
  const durationSeconds = Math.max(
    0,
    Math.round((ended.getTime() - started.getTime()) / 1000)
  );

  const { data: row, error } = await supabase
    .from("focus_sessions")
    .update({
      status: "completed",
      ended_at: ended.toISOString(),
      duration_seconds: durationSeconds,
    })
    .eq("id", id)
    .select("id, started_at, ended_at, duration_seconds, status, notes")
    .single();
  if (error || !row) throw new Error(error?.message ?? "Failed to complete focus");
  return mapRow(row as Row);
}

export async function getActiveFocusSession(): Promise<FocusSession | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("focus_sessions")
    .select("id, started_at, ended_at, duration_seconds, status, notes")
    .eq("status", "active")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapRow(data as Row) : null;
}
