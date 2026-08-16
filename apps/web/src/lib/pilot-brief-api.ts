import { createClient } from "@/lib/supabase/client";

export type PilotBriefContent = {
  summary: string;
  events_today: number;
  tasks_due: number;
  tasks_overdue: number;
  suggestions: string[];
  conflicts: string[];
  focus_windows: string[];
  follow_ups?: string[];
  source: "ai" | "fallback";
};

export type PilotBrief = {
  id: string;
  brief_date: string;
  content: PilotBriefContent;
  created_at: string;
  updated_at: string;
};

export type PilotChatMessage = {
  id: string;
  brief_date: string;
  role: "user" | "assistant";
  content: string;
  follow_ups: string[];
  created_at: string;
};

export type PilotChatResult = {
  user_message: PilotChatMessage;
  reply: PilotChatMessage;
  source: "ai" | "fallback";
};

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

async function functionHeaders() {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Not signed in");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");

  return {
    url,
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
      "Content-Type": "application/json",
    },
  };
}

export async function generatePilotBrief(date?: string): Promise<PilotBrief> {
  const { url, headers } = await functionHeaders();
  const res = await fetch(`${url}/functions/v1/pilot-brief`, {
    method: "POST",
    headers,
    body: JSON.stringify({ date }),
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(payload.error ?? "Failed to generate Pilot Brief");
  }
  return payload.brief as PilotBrief;
}

export async function sendPilotBriefChat(
  message: string,
  date?: string
): Promise<PilotChatResult> {
  const { url, headers } = await functionHeaders();
  const res = await fetch(`${url}/functions/v1/pilot-brief`, {
    method: "POST",
    headers,
    body: JSON.stringify({ action: "chat", message, date }),
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(payload.error ?? "Failed to send message");
  }
  return payload as PilotChatResult;
}

export async function getTodayBrief(): Promise<PilotBrief | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("pilot_briefs")
    .select("id, brief_date, content, created_at, updated_at")
    .eq("brief_date", todayKey())
    .maybeSingle();
  if (error) return null;
  return data as PilotBrief | null;
}

export async function getTodayChat(): Promise<PilotChatMessage[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("pilot_brief_messages")
    .select("id, brief_date, role, content, follow_ups, created_at")
    .eq("brief_date", todayKey())
    .order("created_at", { ascending: true });
  if (error || !data) return [];
  return (data as PilotChatMessage[]).map((row) => ({
    ...row,
    follow_ups: Array.isArray(row.follow_ups) ? row.follow_ups : [],
  }));
}

export function briefFollowUps(content: PilotBriefContent): string[] {
  if (content.follow_ups?.length) return content.follow_ups.slice(0, 3);
  const out: string[] = [];
  if (content.tasks_overdue > 0) {
    out.push("Which overdue task should I clear first?");
  }
  if (content.conflicts?.length) {
    out.push("How should I resolve today's overlap?");
  }
  if (content.focus_windows?.length) {
    out.push("Which focus window should I protect?");
  }
  if (out.length < 3) out.push("What should I tackle first?");
  return out.slice(0, 3);
}
