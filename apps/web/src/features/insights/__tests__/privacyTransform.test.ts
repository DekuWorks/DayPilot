/**
 * Unit tests for busy-only privacy transform
 */

import type { ShareMode } from '@daypilot/types';

type LocalEvent = {
  id: string;
  title: string;
  description: string | null;
  start: string;
  end: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  all_day?: boolean;
};

function transformEventsForPrivacy(
  events: LocalEvent[],
  mode: ShareMode
): Array<{
  id: string;
  title: string;
  start: Date;
  end: Date;
}> {
  if (mode === 'readOnly') {
    return events
      .filter(e => !e.all_day)
      .map(e => ({
        id: e.id,
        title: e.title,
        start: new Date(e.start),
        end: new Date(e.end),
      }));
  } else {
    // Busy-only: replace titles with "Busy"
    return events
      .filter(e => !e.all_day)
      .map(e => ({
        id: e.id,
        title: 'Busy',
        start: new Date(e.start),
        end: new Date(e.end),
      }));
  }
}

describe('privacyTransform', () => {
  const mockEvents: LocalEvent[] = [
    {
      id: '1',
      title: 'Team Meeting',
      description: 'Discuss Q4 goals',
      start: '2024-01-15T10:00:00Z',
      end: '2024-01-15T11:00:00Z',
      status: 'scheduled',
      all_day: false,
    },
    {
      id: '2',
      title: 'Lunch Break',
      description: 'Personal time',
      start: '2024-01-15T12:00:00Z',
      end: '2024-01-15T13:00:00Z',
      status: 'scheduled',
      all_day: false,
    },
  ];

  it('should preserve event titles in readOnly mode', () => {
    const transformed = transformEventsForPrivacy(mockEvents, 'readOnly');

    expect(transformed[0].title).toBe('Team Meeting');
    expect(transformed[1].title).toBe('Lunch Break');
  });

  it('should replace titles with "Busy" in busyOnly mode', () => {
    const transformed = transformEventsForPrivacy(mockEvents, 'busyOnly');

    expect(transformed[0].title).toBe('Busy');
    expect(transformed[1].title).toBe('Busy');
  });

  it('should preserve time information in both modes', () => {
    const readOnly = transformEventsForPrivacy(mockEvents, 'readOnly');
    const busyOnly = transformEventsForPrivacy(mockEvents, 'busyOnly');

    expect(readOnly[0].start.getTime()).toBe(busyOnly[0].start.getTime());
    expect(readOnly[0].end.getTime()).toBe(busyOnly[0].end.getTime());
  });

  it('should filter out all-day events', () => {
    const eventsWithAllDay: LocalEvent[] = [
      ...mockEvents,
      {
        id: '3',
        title: 'Holiday',
        description: '',
        start: '2024-01-16T00:00:00Z',
        end: '2024-01-16T23:59:59Z',
        status: 'scheduled',
        all_day: true,
      },
    ];

    const transformed = transformEventsForPrivacy(eventsWithAllDay, 'readOnly');

    expect(transformed.length).toBe(2); // All-day event filtered out
  });
});
