import { RRule } from 'rrule';
import type { Event } from '@daypilot/types';

/**
 * Expand a recurring event into individual instances for display
 */
export function expandRecurringEvent(
  event: Event,
  startDate: Date,
  endDate: Date
): Array<{ start: Date; end: Date; id: string }> {
  if (!event.recurrence_rule) {
    return [];
  }

  try {
    const rule = RRule.fromString(event.recurrence_rule);
    const eventStart = new Date(event.start);
    const eventEnd = new Date(event.end);
    const duration = eventEnd.getTime() - eventStart.getTime();

    // Set the rule's dtstart to the event's start time
    const options = rule.options;
    options.dtstart = eventStart;

    // Set until date if provided
    if (event.recurrence_end_date) {
      options.until = new Date(event.recurrence_end_date);
    }

    const expandedRule = new RRule(options);
    const occurrences = expandedRule.between(startDate, endDate, true);

    return occurrences.map(occurrenceStart => ({
      start: occurrenceStart,
      end: new Date(occurrenceStart.getTime() + duration),
      id: `${event.id}-${occurrenceStart.getTime()}`,
    }));
  } catch (error) {
    console.error('Error expanding recurring event:', error);
    return [];
  }
}

/**
 * Get a human-readable description of a recurrence rule
 */
export function getRecurrenceDescription(
  recurrenceRule: string | null
): string {
  if (!recurrenceRule) return '';

  try {
    const rule = RRule.fromString(recurrenceRule);
    return rule.toText();
  } catch {
    return 'Recurring';
  }
}
