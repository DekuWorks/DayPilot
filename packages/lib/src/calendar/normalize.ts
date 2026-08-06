import type {
  CalendarEventInput,
  CalendarProvider,
  ExternalCalendarEvent,
  NormalizedCalendarEvent,
} from './types';

function asDate(value: Date | string | null | undefined): Date | null {
  if (value == null) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function requireDate(value: Date | string, fallback?: Date): Date {
  const d = asDate(value);
  if (d) return d;
  if (fallback) return fallback;
  return new Date();
}

export function normalizeDayPilotEvent(input: {
  id?: string;
  title: string;
  description?: string | null;
  location?: string | null;
  start: Date | string;
  end: Date | string;
  allDay?: boolean;
  timezone?: string | null;
  recurrenceRule?: string | null;
  externalId?: string | null;
  externalCalendarId?: string | null;
  metadata?: Record<string, unknown>;
}): NormalizedCalendarEvent {
  const startsAt = requireDate(input.start);
  const endsAt = requireDate(input.end, startsAt);
  return {
    title: (input.title || '(No title)').trim() || '(No title)',
    description: input.description ?? null,
    location: input.location ?? null,
    startsAt,
    endsAt: endsAt < startsAt ? startsAt : endsAt,
    allDay: !!input.allDay,
    timezone: input.timezone ?? null,
    recurrenceRule: input.recurrenceRule ?? null,
    externalEventId: input.externalId ?? input.id ?? null,
    externalCalendarId: input.externalCalendarId ?? null,
    provider: 'daypilot',
    sourceUpdatedAt: null,
    metadata: input.metadata ?? {},
  };
}

export function normalizeEventKitEvent(input: {
  externalEventId: string;
  externalCalendarId: string;
  title?: string | null;
  description?: string | null;
  location?: string | null;
  startsAt: Date | string;
  endsAt: Date | string;
  allDay?: boolean;
  timezone?: string | null;
  recurrenceRule?: string | null;
  sourceUpdatedAt?: Date | string | null;
  metadata?: Record<string, unknown>;
}): NormalizedCalendarEvent {
  const startsAt = requireDate(input.startsAt);
  const endsAt = requireDate(input.endsAt, startsAt);
  return {
    title: (input.title || '(No title)').trim() || '(No title)',
    description: input.description ?? null,
    location: input.location ?? null,
    startsAt,
    endsAt: endsAt < startsAt ? startsAt : endsAt,
    allDay: !!input.allDay,
    timezone: input.timezone ?? null,
    recurrenceRule: input.recurrenceRule ?? null,
    externalEventId: input.externalEventId,
    externalCalendarId: input.externalCalendarId,
    provider: 'apple_eventkit',
    sourceUpdatedAt: asDate(input.sourceUpdatedAt ?? null),
    metadata: {
      ...(input.metadata ?? {}),
      origin: 'eventkit',
    },
  };
}

export function normalizeGoogleEvent(input: {
  id: string;
  summary?: string | null;
  description?: string | null;
  location?: string | null;
  start?: { dateTime?: string | null; date?: string | null; timeZone?: string | null };
  end?: { dateTime?: string | null; date?: string | null; timeZone?: string | null };
  recurrence?: string[] | null;
  updated?: string | null;
  calendarId?: string | null;
}): NormalizedCalendarEvent {
  const allDay = !!(input.start?.date && !input.start?.dateTime);
  const startsAt = requireDate(
    input.start?.dateTime || input.start?.date || new Date().toISOString(),
  );
  const endsAt = requireDate(
    input.end?.dateTime || input.end?.date || startsAt.toISOString(),
    startsAt,
  );
  return {
    title: (input.summary || '(No title)').trim() || '(No title)',
    description: input.description ?? null,
    location: input.location ?? null,
    startsAt,
    endsAt: endsAt < startsAt ? startsAt : endsAt,
    allDay,
    timezone: input.start?.timeZone ?? input.end?.timeZone ?? null,
    recurrenceRule: input.recurrence?.[0] ?? null,
    externalEventId: input.id,
    externalCalendarId: input.calendarId ?? null,
    provider: 'google',
    sourceUpdatedAt: asDate(input.updated ?? null),
    metadata: { origin: 'google' },
  };
}

export function serializeEventForEventKit(
  event: CalendarEventInput | NormalizedCalendarEvent,
): ExternalCalendarEvent {
  const startsAt =
    'startsAt' in event
      ? event.startsAt instanceof Date
        ? event.startsAt.toISOString()
        : String(event.startsAt)
      : '';
  const endsAt =
    'endsAt' in event
      ? event.endsAt instanceof Date
        ? event.endsAt.toISOString()
        : String(event.endsAt)
      : '';
  return {
    externalEventId:
      'externalEventId' in event && event.externalEventId
        ? event.externalEventId
        : '',
    externalCalendarId: event.externalCalendarId ?? '',
    title: event.title,
    description: event.description ?? null,
    location: event.location ?? null,
    startsAt,
    endsAt,
    allDay: !!event.allDay,
    timezone: event.timezone ?? null,
    recurrenceRule: event.recurrenceRule ?? null,
    metadata: 'metadata' in event ? event.metadata : {},
  };
}

export function serializeEventForGoogle(event: NormalizedCalendarEvent): {
  summary: string;
  description?: string;
  location?: string;
  start: { dateTime?: string; date?: string; timeZone?: string };
  end: { dateTime?: string; date?: string; timeZone?: string };
} {
  const tz = event.timezone ?? undefined;
  if (event.allDay) {
    const startDate = event.startsAt.toISOString().slice(0, 10);
    const endDate = event.endsAt.toISOString().slice(0, 10);
    return {
      summary: event.title,
      description: event.description ?? undefined,
      location: event.location ?? undefined,
      start: { date: startDate },
      end: { date: endDate },
    };
  }
  return {
    summary: event.title,
    description: event.description ?? undefined,
    location: event.location ?? undefined,
    start: { dateTime: event.startsAt.toISOString(), timeZone: tz },
    end: { dateTime: event.endsAt.toISOString(), timeZone: tz },
  };
}

export function nestProviderToShared(
  provider: string,
): CalendarProvider {
  if (provider === 'outlook') return 'microsoft';
  if (provider === 'apple') return 'apple_eventkit';
  if (
    provider === 'google' ||
    provider === 'microsoft' ||
    provider === 'apple_eventkit' ||
    provider === 'daypilot' ||
    provider === 'local_device'
  ) {
    return provider;
  }
  return 'local_device';
}
