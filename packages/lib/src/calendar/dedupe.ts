import type { CalendarProvider, CalendarSourceClass } from './types';

/** Official cloud APIs beat EventKit; EventKit beats bare local. */
export function resolveProviderPriority(provider: CalendarProvider): number {
  switch (provider) {
    case 'google':
    case 'microsoft':
      return 1;
    case 'apple_eventkit':
      return 2;
    case 'local_device':
      return 3;
    case 'daypilot':
      return 0;
    default:
      return 99;
  }
}

export function classifyDeviceCalendarSource(input: {
  title?: string | null;
  sourceName?: string | null;
  accountType?: string | null;
  calendarType?: string | null;
}): CalendarSourceClass {
  const blob = [
    input.title,
    input.sourceName,
    input.accountType,
    input.calendarType,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (blob.includes('birthday')) return 'birthdays';
  if (
    blob.includes('holiday') ||
    blob.includes('subscribed') ||
    blob.includes('subscription')
  ) {
    return 'subscribed';
  }
  if (blob.includes('google') || blob.includes('gmail')) return 'google';
  if (
    blob.includes('exchange') ||
    blob.includes('outlook') ||
    blob.includes('office365') ||
    blob.includes('microsoft')
  ) {
    return 'exchange';
  }
  if (
    blob.includes('icloud') ||
    blob.includes('caldav') ||
    blob.includes('apple')
  ) {
    return 'icloud';
  }
  if (blob.includes('local')) return 'local';
  return 'unknown';
}

export function detectDuplicateCalendar(input: {
  sourceClass: CalendarSourceClass;
  hasGoogleConnection: boolean;
  hasMicrosoftConnection: boolean;
}): { isDuplicate: boolean; reason?: string } {
  if (input.sourceClass === 'google' && input.hasGoogleConnection) {
    return {
      isDuplicate: true,
      reason:
        'This Google calendar is already connected directly to DayPilot. To prevent duplicate events, it will not be imported from the device.',
    };
  }
  if (input.sourceClass === 'exchange' && input.hasMicrosoftConnection) {
    return {
      isDuplicate: true,
      reason:
        'This Outlook calendar is already connected directly to DayPilot. To prevent duplicate events, it will not be imported from the device.',
    };
  }
  return { isDuplicate: false };
}

export function generateEventFingerprint(input: {
  uid?: string | null;
  title: string;
  startsAt: Date | string;
  endsAt: Date | string;
  organizer?: string | null;
}): string {
  const start =
    input.startsAt instanceof Date
      ? input.startsAt.toISOString()
      : String(input.startsAt);
  const end =
    input.endsAt instanceof Date
      ? input.endsAt.toISOString()
      : String(input.endsAt);
  const title = input.title.trim().toLowerCase();
  const uid = (input.uid || '').trim().toLowerCase();
  const organizer = (input.organizer || '').trim().toLowerCase();
  return [uid, title, start, end, organizer].join('|');
}

export function detectDuplicateEvent(
  candidate: string,
  existing: Set<string>,
): boolean {
  return existing.has(candidate);
}
