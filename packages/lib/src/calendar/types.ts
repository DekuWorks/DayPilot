/** Shared calendar provider identity (API boundary). Nest maps outlook ↔ microsoft. */
export type CalendarProvider =
  | 'daypilot'
  | 'google'
  | 'microsoft'
  | 'apple_eventkit'
  | 'local_device';

export type DateRange = {
  start: Date | string;
  end: Date | string;
};

export type ExternalCalendar = {
  id: string;
  externalCalendarId: string;
  title: string;
  provider: CalendarProvider;
  calendarType?: string | null;
  sourceName?: string | null;
  color?: string | null;
  isPrimary: boolean;
  isReadOnly: boolean;
  isSelected: boolean;
  isVisible: boolean;
  deviceId?: string | null;
};

export type ExternalCalendarEvent = {
  externalEventId: string;
  externalCalendarId: string;
  title: string;
  description?: string | null;
  location?: string | null;
  startsAt: string;
  endsAt: string;
  allDay?: boolean;
  timezone?: string | null;
  recurrenceRule?: string | null;
  sourceUpdatedAt?: string | null;
  metadata?: Record<string, unknown>;
};

export type CalendarEventInput = {
  title: string;
  description?: string | null;
  location?: string | null;
  startsAt: string;
  endsAt: string;
  allDay?: boolean;
  timezone?: string | null;
  recurrenceRule?: string | null;
  externalCalendarId?: string;
};

export type CalendarProviderCapabilities = {
  readEvents: boolean;
  createEvents: boolean;
  updateEvents: boolean;
  deleteEvents: boolean;
  serverSideSync: boolean;
  backgroundSync: boolean;
  requiresDevice: boolean;
};

export const APPLE_EVENTKIT_CAPABILITIES: CalendarProviderCapabilities = {
  readEvents: true,
  createEvents: true,
  updateEvents: true,
  deleteEvents: true,
  serverSideSync: false,
  backgroundSync: false,
  requiresDevice: true,
};

export interface CalendarProviderAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  getCalendars(): Promise<ExternalCalendar[]>;
  getEvents(range: DateRange): Promise<ExternalCalendarEvent[]>;
  createEvent(event: CalendarEventInput): Promise<ExternalCalendarEvent>;
  updateEvent(
    externalEventId: string,
    event: CalendarEventInput,
  ): Promise<ExternalCalendarEvent>;
  deleteEvent(externalEventId: string): Promise<void>;
}

export type NormalizedCalendarEvent = {
  title: string;
  description: string | null;
  location: string | null;
  startsAt: Date;
  endsAt: Date;
  allDay: boolean;
  timezone: string | null;
  recurrenceRule: string | null;
  externalEventId: string | null;
  externalCalendarId: string | null;
  provider: CalendarProvider;
  sourceUpdatedAt: Date | null;
  metadata: Record<string, unknown>;
};

export type CalendarSourceClass =
  | 'icloud'
  | 'google'
  | 'exchange'
  | 'subscribed'
  | 'birthdays'
  | 'local'
  | 'unknown';
