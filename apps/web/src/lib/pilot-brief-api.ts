import { createClient } from "@/lib/supabase/client";

export type PilotBriefContent = {
  summary: string;
  events_today: number;
  tasks_due: number;
  tasks_overdue: number;
  suggestions: string[];
  conflicts: string[];
  focus_windows: string[];
  source: "ai" | "fallback";
};

export type PilotBrief = {
  id: string;
  brief_date: string;
  content: PilotBriefContent;
  created_at: string;
  updated_at: string;
};

export async function generatePilotBrief(date?: string): Promise<PilotBrief> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Not signed in");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");

  const res = await fetch(`${url}/functions/v1/pilot-brief`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ date }),
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(payload.error ?? "Failed to generate Pilot Brief");
  }
  return payload.brief as PilotBrief;
}

export async function getTodayBrief(): Promise<PilotBrief | null> {
  const supabase = createClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("pilot_briefs")
    .select("id, brief_date, content, created_at, updated_at")
    .eq("brief_date", today)
    .maybeSingle();
  if (error) return null;
  return data as PilotBrief | null;
}
