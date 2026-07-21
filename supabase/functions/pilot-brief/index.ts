// DayPilot Pilot Brief — grounded daily summary (AI optional, fallback always works)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type BriefContent = {
  summary: string;
  events_today: number;
  tasks_due: number;
  tasks_overdue: number;
  suggestions: string[];
  conflicts: string[];
  focus_windows: string[];
  source: "ai" | "fallback";
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

function buildFallback(input: {
  name: string;
  events: Array<{ title: string; start: string; end: string }>;
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

  return {
    summary,
    events_today: input.events.length,
    tasks_due: input.tasksDue.length,
    tasks_overdue: input.tasksOverdue.length,
    suggestions,
    conflicts: [],
    focus_windows: [],
    source: "fallback",
  };
}

async function maybeAiSummary(
  context: Record<string, unknown>
): Promise<string | null> {
  const key = Deno.env.get("OPENAI_API_KEY");
  if (!key) return null;
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
    if (!res.ok) return null;
    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() ?? null;
  } catch {
    return null;
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

    const { data: eventRows } = await admin
      .from("events")
      .select("title, start_time, end_time, start, end")
      .eq("user_id", user.id)
      .gte("start_time", from)
      .lte("start_time", to);

    const events = (eventRows ?? []).map((e) => ({
      title: e.title as string,
      start: (e.start_time || e.start) as string,
      end: (e.end_time || e.end) as string,
    }));

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

    const aiText = await maybeAiSummary({
      name,
      date: dateKey,
      events: events.map((e) => ({
        title: e.title,
        start: e.start,
        end: e.end,
      })),
      tasks_due: tasksDue.map((t) => t.title),
      tasks_overdue: tasksOverdue.map((t) => t.title),
    });
    if (aiText) {
      content = { ...content, summary: aiText, source: "ai" };
    }

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
