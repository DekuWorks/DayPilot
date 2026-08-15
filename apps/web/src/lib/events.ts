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
    calendarId: e.calendarId ?? null,
    externalCalendarId: e.externalCalendarId ?? null,
    calendarColor: e.calendarColor ?? null,
    allDay: false,
    source: e.source,
    syncDirection: e.syncDirection,
  };
}

/** Only DayPilot-created events. Imported calendars cannot be deleted. */
export function canDeleteCalendarEvent(event: {
  source?: string | null;
  syncDirection?: string | null;
}): boolean {
  if (event.syncDirection === "imported") return false;
  return (event.source ?? "native") === "native";
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

export { calendarChipStyle } from "./event-color";

export function getApiBase(): string {
  return getApiUrl();
}

export { getAuthHeaders, getApiErrorMessage };
