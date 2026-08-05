/**
 * Unified calendar events for the web app.
 * Prefer Nest (Google/Outlook/Apple sync + native) when a Nest JWT exists;
 * fall back to Supabase-only events otherwise.
 */
import { getApiUrl, getAuthHeaders, getApiErrorMessage } from "./api";
import * as nestEvents from "./events-api";
import * as supabaseEvents from "./events-supabase";
import type { CalendarEvent } from "./events-supabase";
import { ensureNestSession, hasNestAccessToken } from "./supabase/auth";

export type { CalendarEvent } from "./events-supabase";

async function preferNest(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (hasNestAccessToken()) return true;
  const ready = await ensureNestSession({ timeoutMs: 5_000 });
  return ready.ok;
}

function mapNestToCalendar(e: nestEvents.Event): CalendarEvent {
  return {
    id: e.id,
    title: e.title,
    start: e.start,
    end: e.end,
    description: e.description ?? null,
    location: e.location ?? null,
    meetingUrl: null,
    calendarId: null,
    allDay: false,
    source: e.source,
  };
}

export async function listEvents(params?: {
  from?: string;
  to?: string;
}): Promise<CalendarEvent[]> {
  if (await preferNest()) {
    try {
      const rows = await nestEvents.listEvents(params);
      return rows.map(mapNestToCalendar);
    } catch {
      // Nest down / expired — fall through to Supabase so the UI still loads.
    }
  }
  return supabaseEvents.listEvents(params);
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
  if (await preferNest()) {
    try {
      const created = await nestEvents.createEvent({
        title: data.title,
        start: data.start,
        end: data.end,
        description: data.description,
        location: data.location,
      });
      return mapNestToCalendar(created);
    } catch (e) {
      // If Nest rejects, surface the error (synced calendar path).
      throw e instanceof Error ? e : new Error("Failed to create event");
    }
  }
  return supabaseEvents.createEvent(userId, data);
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
  if (await preferNest()) {
    const updated = await nestEvents.updateEvent(id, {
      title: data.title,
      start: data.start,
      end: data.end,
      description: data.description,
      location: data.location,
    });
    return mapNestToCalendar(updated);
  }
  return supabaseEvents.updateEvent(id, data);
}

export async function deleteEvent(id: string): Promise<void> {
  if (await preferNest()) {
    await nestEvents.deleteEvent(id);
    return;
  }
  await supabaseEvents.deleteEvent(id);
}

/** Source accent colours for calendar chips (parity with Flutter). */
export function sourceAccent(source?: string | null): {
  border: string;
  bg: string;
} {
  switch (source) {
    case "google":
      return {
        border: "#4285F4",
        bg: "color-mix(in srgb, #4285F4 18%, transparent)",
      };
    case "outlook":
      return {
        border: "#6366F1",
        bg: "color-mix(in srgb, #6366F1 18%, transparent)",
      };
    case "apple":
      return {
        border: "#A3A3A3",
        bg: "color-mix(in srgb, #A3A3A3 20%, transparent)",
      };
    default:
      return {
        border: "var(--brand-500)",
        bg: "color-mix(in srgb, var(--brand-500) 15%, transparent)",
      };
  }
}

export function getApiBase(): string {
  return getApiUrl();
}

export { getAuthHeaders, getApiErrorMessage };
