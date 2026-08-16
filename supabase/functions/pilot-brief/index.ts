// DayPilot Pilot Brief — grounded daily summary (AI optional, fallback always works)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const NEST_API_URL = (
  Deno.env.get("NEST_API_URL") ??
  Deno.env.get("DAYPILOT_API_URL") ??
  "https://api-production-6c2c.up.railway.app"
).replace(/\/$/, "");

type BriefEvent = { title: string; start: string; end: string };

type BriefContent = {
  summary: string;
  events_today: number;
  tasks_due: number;
  tasks_overdue: number;
  suggestions: string[];
  conflicts: string[];
  focus_windows: string[];
  follow_ups: string[];
  source: "ai" | "fallback";
};

type ChatMessageRow = {
  id: string;
  brief_date: string;
  role: "user" | "assistant";
  content: string;
  follow_ups: string[];
  created_at: string;
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function formatClock(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleTimeString("en-GB", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function eventKey(e: BriefEvent) {
  return `${e.title}|${e.start}|${e.end}`;
}

function mergeEvents(a: BriefEvent[], b: BriefEvent[]) {
  const seen = new Set<string>();
  const out: BriefEvent[] = [];
  for (const e of [...a, ...b]) {
    if (!e.title || !e.start) continue;
    const k = eventKey(e);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(e);
  }
  return out.sort(
    (x, y) => new Date(x.start).getTime() - new Date(y.start).getTime()
  );
}

function detectConflicts(events: BriefEvent[]): string[] {
  const conflicts: string[] = [];
  for (let i = 0; i < events.length; i++) {
    for (let j = i + 1; j < events.length; j++) {
      const a = events[i];
      const b = events[j];
      const aStart = new Date(a.start).getTime();
      const aEnd = new Date(a.end || a.start).getTime();
      const bStart = new Date(b.start).getTime();
      const bEnd = new Date(b.end || b.start).getTime();
      if (aStart < bEnd && bStart < aEnd) {
        conflicts.push(`${a.title} overlaps ${b.title}`);
      }
    }
  }
  return conflicts.slice(0, 5);
}

function focusWindows(events: BriefEvent[], dayStart: Date): string[] {
  const windowStart = new Date(dayStart);
  windowStart.setHours(8, 0, 0, 0);
  const windowEnd = new Date(dayStart);
  windowEnd.setHours(18, 0, 0, 0);
  const blocks = events
    .map((e) => ({
      start: new Date(e.start).getTime(),
      end: new Date(e.end || e.start).getTime(),
    }))
    .filter((b) => b.end > windowStart.getTime() && b.start < windowEnd.getTime())
    .sort((a, b) => a.start - b.start);

  const gaps: string[] = [];
  let cursor = windowStart.getTime();
  for (const b of blocks) {
    if (b.start - cursor >= 45 * 60 * 1000) {
      gaps.push(`${formatClock(new Date(cursor).toISOString())}–${formatClock(new Date(b.start).toISOString())}`);
    }
    cursor = Math.max(cursor, b.end);
  }
  if (windowEnd.getTime() - cursor >= 45 * 60 * 1000) {
    gaps.push(
      `${formatClock(new Date(cursor).toISOString())}–${formatClock(windowEnd.toISOString())}`
    );
  }
  return gaps.slice(0, 4);
}

function buildFallback(input: {
  name: string;
  events: BriefEvent[];
  tasksDue: Array<{ title: string }>;
  tasksOverdue: Array<{ title: string }>;
}): BriefContent {
  const suggestions: string[] = [];
  if (input.tasksOverdue.length) {
    suggestions.push(
      `Clear ${input.tasksOverdue.length} overdue task${input.tasksOverdue.length === 1 ? "" : "s"} first.`
    );
  }
  if (input.events.length >= 4) {
    suggestions.push("Protect a focus block between meetings if you can.");
  } else if (input.events.length === 0) {
    suggestions.push("Light meeting day — schedule deep work on priority tasks.");
  } else {
    suggestions.push(
      "Your day looks balanced. Review tasks before your first meeting."
    );
  }
  if (input.tasksDue.length) {
    suggestions.push(
      `Finish or reschedule: ${input.tasksDue
        .slice(0, 3)
        .map((t) => t.title)
        .join(", ")}.`
    );
  }

  const summary = `Hello ${input.name}, you have ${input.events.length} meeting${
    input.events.length === 1 ? "" : "s"
  } and ${input.tasksDue.length} task${
    input.tasksDue.length === 1 ? "" : "s"
  } due today${
    input.tasksOverdue.length
      ? `, plus ${input.tasksOverdue.length} overdue`
      : ""
  }.`;

  const conflicts = detectConflicts(input.events);
  const windows = focusWindows(input.events, startOfDay(new Date()));
  const content: BriefContent = {
    summary,
    events_today: input.events.length,
    tasks_due: input.tasksDue.length,
    tasks_overdue: input.tasksOverdue.length,
    suggestions,
    conflicts,
    focus_windows: windows,
    follow_ups: [],
    source: "fallback",
  };
  content.follow_ups = buildFollowUps(content);
  return content;
}

function buildFollowUps(content: BriefContent): string[] {
  const out: string[] = [];
  if (content.tasks_overdue > 0) {
    out.push("Which overdue task should I clear first?");
  }
  if (content.conflicts.length) {
    out.push("How should I resolve today's overlap?");
  }
  if (content.focus_windows.length) {
    out.push("Which focus window should I protect?");
  }
  if (content.events_today > 0 && out.length < 3) {
    out.push("Walk me through my meetings.");
  }
  if (out.length < 3) {
    out.push("What should I tackle first?");
  }
  return out.slice(0, 3);
}

function fallbackChatReply(
  message: string,
  input: {
    events: BriefEvent[];
    tasksDue: Array<{ title: string }>;
    tasksOverdue: Array<{ title: string }>;
    brief?: BriefContent | null;
  }
): { reply: string; follow_ups: string[] } {
  const q = message.toLowerCase();
  const brief = input.brief;
  const windows = brief?.focus_windows ?? [];
  const conflicts = brief?.conflicts ?? detectConflicts(input.events);
  const follow_ups = brief ? buildFollowUps(brief) : [
    "What should I tackle first?",
    "Where can I fit a focus block?",
    "Any conflicts I should fix?",
  ];

  if (q.includes("focus") || q.includes("deep work") || q.includes("block")) {
    return {
      reply: windows.length
        ? `You have ${windows.length} focus window${
            windows.length === 1 ? "" : "s"
          } today: ${windows.join(", ")}. Protect the longest one if you can.`
        : "I cannot see a clear 45-minute gap between 08:00 and 18:00. A shorter block before your first meeting may still help.",
      follow_ups,
    };
  }
  if (q.includes("overdue") || q.includes("task")) {
    const overdue = input.tasksOverdue.map((t) => t.title).filter(Boolean);
    const due = input.tasksDue.map((t) => t.title).filter(Boolean);
    if (overdue.length) {
      return {
        reply: `You have ${overdue.length} overdue task${
          overdue.length === 1 ? "" : "s"
        }: ${overdue.slice(0, 5).join(", ")}. Clear those before taking on new work.`,
        follow_ups,
      };
    }
    if (due.length) {
      return {
        reply: `Due today: ${due.slice(0, 5).join(", ")}. Start with the one that unblocks the rest of the day.`,
        follow_ups,
      };
    }
    return {
      reply: "No open tasks are due today. Use a focus window for the work you have been putting off.",
      follow_ups,
    };
  }
  if (q.includes("conflict") || q.includes("overlap")) {
    return {
      reply: conflicts.length
        ? `I can see ${conflicts.length} overlap${
            conflicts.length === 1 ? "" : "s"
          }: ${conflicts.join("; ")}. Move or shorten the lower-priority one.`
        : "No overlapping events show up on today's calendar.",
      follow_ups,
    };
  }
  if (q.includes("meeting") || q.includes("calendar") || q.includes("event")) {
    if (!input.events.length) {
      return {
        reply: "Your calendar looks clear today. That is a good day to protect a long focus block.",
        follow_ups,
      };
    }
    const lines = input.events
      .slice(0, 6)
      .map((e) => `${formatClock(e.start)} ${e.title}`)
      .join("; ");
    return {
      reply: `You have ${input.events.length} meeting${
        input.events.length === 1 ? "" : "s"
      } today: ${lines}.`,
      follow_ups,
    };
  }

  const summary =
    brief?.summary ??
    `You have ${input.events.length} meeting${
      input.events.length === 1 ? "" : "s"
    } and ${input.tasksDue.length} task${
      input.tasksDue.length === 1 ? "" : "s"
    } due today.`;
  return {
    reply: `${summary} Ask about meetings, tasks, conflicts, or focus windows and I will stay grounded in today's data.`,
    follow_ups,
  };
}

function parseChatCompletion(text: string): { reply: string; follow_ups: string[] } {
  const trimmed = text.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try {
      const parsed = JSON.parse(trimmed.slice(start, end + 1));
      const reply =
        typeof parsed.reply === "string" ? parsed.reply.trim() : "";
      const follow_ups = Array.isArray(parsed.follow_ups)
        ? parsed.follow_ups
            .map((s: unknown) => (typeof s === "string" ? s.trim() : ""))
            .filter(Boolean)
            .slice(0, 3)
        : [];
      if (reply) return { reply, follow_ups };
    } catch {
      // fall through to plain text
    }
  }
  return { reply: trimmed, follow_ups: [] };
}

async function maybeAiSummary(
  context: Record<string, unknown>
): Promise<{ text: string | null; error?: string }> {
  const key = Deno.env.get("OPENAI_API_KEY");
  if (!key) return { text: null, error: "missing_key" };
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: Deno.env.get("OPENAI_MODEL") ?? "gpt-4o-mini",
        temperature: 0.4,
        messages: [
          {
            role: "system",
            content:
              "You write concise DayPilot Pilot Briefs. Use only the provided JSON context. No medical claims. 2-4 sentences.",
          },
          { role: "user", content: JSON.stringify(context) },
        ],
      }),
    });
    if (!res.ok) {
      return { text: null, error: `openai_${res.status}` };
    }
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content?.trim() ?? null;
    return { text, error: text ? undefined : "empty_completion" };
  } catch {
    return { text: null, error: "openai_network" };
  }
}

async function maybeAiChat(input: {
  context: Record<string, unknown>;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  message: string;
}): Promise<{ text: string | null; error?: string }> {
  const key = Deno.env.get("OPENAI_API_KEY");
  if (!key) return { text: null, error: "missing_key" };
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: Deno.env.get("OPENAI_MODEL") ?? "gpt-4o-mini",
        temperature: 0.4,
        messages: [
          {
            role: "system",
            content:
              "You are DayPilot Pilot, a scheduling assistant. Use British English. Use only the provided JSON context and chat history. Do not invent events or tasks. 2-6 sentences. If asked to create or move calendar items, explain the steps in DayPilot rather than claiming you already did it. Reply with JSON only: {\"reply\":\"...\",\"follow_ups\":[\"short question\", \"...\"]}. follow_ups: 0-3 questions the user might ask next.",
          },
          {
            role: "user",
            content: JSON.stringify({
              day_context: input.context,
              history: input.history,
              question: input.message,
            }),
          },
        ],
      }),
    });
    if (!res.ok) {
      return { text: null, error: `openai_${res.status}` };
    }
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content?.trim() ?? null;
    return { text, error: text ? undefined : "empty_completion" };
  } catch {
    return { text: null, error: "openai_network" };
  }
}

async function loadSupabaseEvents(
  admin: ReturnType<typeof createClient>,
  userId: string,
  from: string,
  to: string
): Promise<BriefEvent[]> {
  const { data: byStartTime } = await admin
    .from("events")
    .select("title, start_time, end_time, start, end")
    .eq("user_id", userId)
    .gte("start_time", from)
    .lte("start_time", to);

  let rows = byStartTime ?? [];
  if (rows.length === 0) {
    const { data: byStart } = await admin
      .from("events")
      .select("title, start_time, end_time, start, end")
      .eq("user_id", userId)
      .gte("start", from)
      .lte("start", to);
    rows = byStart ?? [];
  }

  return rows.map((e) => ({
    title: (e.title as string) ?? "Event",
    start: (e.start_time || e.start) as string,
    end: (e.end_time || e.end) as string,
  }));
}

async function loadNestEvents(
  supabaseAccessToken: string,
  from: string,
  to: string
): Promise<BriefEvent[]> {
  try {
    const exchange = await fetch(`${NEST_API_URL}/auth/supabase-exchange`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken: supabaseAccessToken }),
    });
    if (!exchange.ok) return [];
    const tokens = await exchange.json();
    const access = tokens.accessToken ?? tokens.access_token;
    if (!access) return [];
    const q = new URLSearchParams({ from, to });
    const ev = await fetch(`${NEST_API_URL}/events?${q}`, {
      headers: { Authorization: `Bearer ${access}` },
    });
    if (!ev.ok) return [];
    const rows = await ev.json();
    if (!Array.isArray(rows)) return [];
    return rows.map((e: { title?: string; start?: string; end?: string }) => ({
      title: e.title ?? "Event",
      start: e.start ?? "",
      end: e.end ?? e.start ?? "",
    }));
  } catch {
    return [];
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);
    const supabaseAccessToken = authHeader.replace(/^Bearer\s+/i, "");

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();
    if (authError || !user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(supabaseUrl, serviceKey);
    const body = await req.json().catch(() => ({}));
    const action = typeof body.action === "string" ? body.action : "generate";
    const briefDate = body.date ? new Date(body.date) : new Date();
    const dateKey = briefDate.toISOString().slice(0, 10);
    const dayStart = startOfDay(briefDate);
    const dayEnd = endOfDay(briefDate);
    const from = dayStart.toISOString();
    const to = dayEnd.toISOString();

    const { data: profile } = await admin
      .from("profiles")
      .select("first_name, last_name, display_name, name, username, email")
      .eq("id", user.id)
      .maybeSingle();

    const name =
      profile?.first_name ||
      profile?.display_name ||
      profile?.name ||
      user.user_metadata?.first_name ||
      user.email?.split("@")[0] ||
      "there";

    const [supabaseEvents, nestEvents] = await Promise.all([
      loadSupabaseEvents(admin, user.id, from, to),
      loadNestEvents(supabaseAccessToken, from, to),
    ]);
    const events = mergeEvents(supabaseEvents, nestEvents);

    const { data: taskRows } = await admin
      .from("tasks")
      .select("title, status, due_at, due_date")
      .eq("user_id", user.id)
      .neq("status", "completed");

    const tasksDue: Array<{ title: string }> = [];
    const tasksOverdue: Array<{ title: string }> = [];
    for (const t of taskRows ?? []) {
      const dueRaw = t.due_at || t.due_date;
      if (!dueRaw) {
        tasksDue.push({ title: t.title as string });
        continue;
      }
      const dueMs = new Date(dueRaw as string).getTime();
      if (dueMs < dayStart.getTime()) {
        tasksOverdue.push({ title: t.title as string });
      } else if (dueMs <= dayEnd.getTime()) {
        tasksDue.push({ title: t.title as string });
      }
    }

    let content = buildFallback({ name, events, tasksDue, tasksOverdue });
    content = {
      ...content,
      focus_windows: focusWindows(events, dayStart),
      conflicts: detectConflicts(events),
    };
    content.follow_ups = buildFollowUps(content);

    if (action === "chat") {
      const message =
        typeof body.message === "string" ? body.message.trim() : "";
      if (!message) return json({ error: "Message is required" }, 400);
      if (message.length > 2000) {
        return json({ error: "Message is too long" }, 400);
      }

      const { data: existingBrief } = await admin
        .from("pilot_briefs")
        .select("content")
        .eq("user_id", user.id)
        .eq("brief_date", dateKey)
        .maybeSingle();
      const savedContent = existingBrief?.content as BriefContent | undefined;
      if (savedContent?.summary) {
        content = {
          ...content,
          summary: savedContent.summary,
          source: savedContent.source === "ai" ? "ai" : content.source,
          suggestions: savedContent.suggestions ?? content.suggestions,
        };
        content.follow_ups = buildFollowUps(content);
      }

      const { data: historyRows } = await admin
        .from("pilot_brief_messages")
        .select("role, content")
        .eq("user_id", user.id)
        .eq("brief_date", dateKey)
        .order("created_at", { ascending: true })
        .limit(20);

      const history = (historyRows ?? [])
        .filter(
          (row) =>
            (row.role === "user" || row.role === "assistant") &&
            typeof row.content === "string"
        )
        .map((row) => ({
          role: row.role as "user" | "assistant",
          content: row.content as string,
        }));

      const dayContext = {
        name,
        date: dateKey,
        events: events.map((e) => ({
          title: e.title,
          start: e.start,
          end: e.end,
        })),
        tasks_due: tasksDue.map((t) => t.title),
        tasks_overdue: tasksOverdue.map((t) => t.title),
        focus_windows: content.focus_windows,
        conflicts: content.conflicts,
        brief_summary: content.summary,
        suggestions: content.suggestions,
      };

      const aiChat = await maybeAiChat({
        context: dayContext,
        history,
        message,
      });
      const parsed = aiChat.text
        ? parseChatCompletion(aiChat.text)
        : fallbackChatReply(message, {
            events,
            tasksDue,
            tasksOverdue,
            brief: content,
          });
      const replyText = parsed.reply ||
        fallbackChatReply(message, {
          events,
          tasksDue,
          tasksOverdue,
          brief: content,
        }).reply;
      const followUps = parsed.follow_ups.length
        ? parsed.follow_ups
        : content.follow_ups;

      const { data: userRow, error: userSaveError } = await admin
        .from("pilot_brief_messages")
        .insert({
          user_id: user.id,
          brief_date: dateKey,
          role: "user",
          content: message,
          follow_ups: [],
        })
        .select("id, brief_date, role, content, follow_ups, created_at")
        .single();
      if (userSaveError || !userRow) {
        return json(
          { error: userSaveError?.message ?? "Could not save your message" },
          500
        );
      }

      const { data: replyRow, error: replySaveError } = await admin
        .from("pilot_brief_messages")
        .insert({
          user_id: user.id,
          brief_date: dateKey,
          role: "assistant",
          content: replyText,
          follow_ups: followUps,
        })
        .select("id, brief_date, role, content, follow_ups, created_at")
        .single();
      if (replySaveError || !replyRow) {
        return json(
          { error: replySaveError?.message ?? "Could not save the reply" },
          500
        );
      }

      const asMessage = (row: Record<string, unknown>): ChatMessageRow => ({
        id: String(row.id),
        brief_date: String(row.brief_date),
        role: row.role === "assistant" ? "assistant" : "user",
        content: String(row.content ?? ""),
        follow_ups: Array.isArray(row.follow_ups)
          ? row.follow_ups.map((s) => String(s))
          : [],
        created_at: String(row.created_at ?? ""),
      });

      return json({
        user_message: asMessage(userRow),
        reply: asMessage(replyRow),
        source: aiChat.text ? "ai" : "fallback",
        ai_error: aiChat.error ?? null,
      });
    }

    const ai = await maybeAiSummary({
      name,
      date: dateKey,
      events: events.map((e) => ({
        title: e.title,
        start: e.start,
        end: e.end,
      })),
      tasks_due: tasksDue.map((t) => t.title),
      tasks_overdue: tasksOverdue.map((t) => t.title),
      focus_windows: content.focus_windows,
      conflicts: content.conflicts,
    });
    if (ai.text) {
      content = { ...content, summary: ai.text, source: "ai" };
    }
    content.follow_ups = buildFollowUps(content);

    const inputSnapshot = {
      date: dateKey,
      events_count: events.length,
      tasks_due_count: tasksDue.length,
      tasks_overdue_count: tasksOverdue.length,
    };

    const { data: saved, error: saveError } = await admin
      .from("pilot_briefs")
      .upsert(
        {
          user_id: user.id,
          brief_date: dateKey,
          input_snapshot: inputSnapshot,
          content,
          model_metadata: {
            source: content.source,
            ai_error: ai.error ?? null,
            model:
              content.source === "ai"
                ? Deno.env.get("OPENAI_MODEL") ?? "gpt-4o-mini"
                : null,
          },
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,brief_date" }
      )
      .select("id, brief_date, content, created_at, updated_at")
      .single();

    if (saveError) {
      return json({ error: saveError.message, content }, 500);
    }

    return json({ brief: saved });
  } catch (e) {
    return json(
      { error: e instanceof Error ? e.message : "Pilot Brief failed" },
      500
    );
  }
});
