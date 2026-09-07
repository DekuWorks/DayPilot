import {
  googleEventTimeFields,
  outlookEventTimeFields,
} from './provider-event-fields';

describe('googleEventTimeFields', () => {
  it('marks date-only Google events as all-day', () => {
    expect(
      googleEventTimeFields({
        start: { date: '2026-09-07', timeZone: 'Europe/London' },
        end: { date: '2026-09-08' },
      }),
    ).toEqual({
      allDay: true,
      timezone: 'Europe/London',
      recurrenceRule: null,
      seriesId: null,
    });
  });

  it('keeps timed events as not all-day and stores RRULE when present', () => {
    expect(
      googleEventTimeFields({
        start: {
          dateTime: '2026-09-07T09:00:00+01:00',
          timeZone: 'Europe/London',
        },
        end: { dateTime: '2026-09-07T10:00:00+01:00' },
        recurrence: ['RRULE:FREQ=WEEKLY;BYDAY=MO'],
        recurringEventId: 'series-1',
      }),
    ).toEqual({
      allDay: false,
      timezone: 'Europe/London',
      recurrenceRule: 'RRULE:FREQ=WEEKLY;BYDAY=MO',
      seriesId: 'series-1',
    });
  });
});

describe('outlookEventTimeFields', () => {
  it('uses isAllDay and the start timezone', () => {
    expect(
      outlookEventTimeFields({
        isAllDay: true,
        start: { dateTime: '2026-09-07T00:00:00.0000000', timeZone: 'UTC' },
        end: { dateTime: '2026-09-08T00:00:00.0000000', timeZone: 'UTC' },
      }),
    ).toEqual({
      allDay: true,
      timezone: 'UTC',
      recurrenceRule: null,
      seriesId: null,
    });
  });

  it('maps an Outlook weekly pattern', () => {
    expect(
      outlookEventTimeFields({
        isAllDay: false,
        start: { dateTime: '2026-09-07T09:00:00.0000000', timeZone: 'UTC' },
        seriesMasterId: 'master-1',
        recurrence: { pattern: { type: 'weekly', interval: 1 } },
      }),
    ).toEqual({
      allDay: false,
      timezone: 'UTC',
      recurrenceRule: 'FREQ=WEEKLY;INTERVAL=1',
      seriesId: 'master-1',
    });
  });
});
