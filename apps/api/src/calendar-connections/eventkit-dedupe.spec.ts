import {
  classifyDeviceCalendarSource,
  detectDuplicateCalendar,
  detectDuplicateEvent,
  generateEventFingerprint,
  resolveProviderPriority,
} from '@daypilot/lib';

describe('EventKit dedupe helpers', () => {
  it('classifies google device calendars', () => {
    expect(
      classifyDeviceCalendarSource({
        title: 'Work',
        accountType: 'com.google',
      }),
    ).toBe('google');
  });

  it('prioritises cloud APIs over EventKit', () => {
    expect(resolveProviderPriority('google')).toBeLessThan(
      resolveProviderPriority('apple_eventkit'),
    );
  });

  it('flags duplicate google calendars when Google is connected', () => {
    const result = detectDuplicateCalendar({
      sourceClass: 'google',
      hasGoogleConnection: true,
      hasMicrosoftConnection: false,
    });
    expect(result.isDuplicate).toBe(true);
  });

  it('fingerprints include uid and times, not title alone', () => {
    const a = generateEventFingerprint({
      uid: 'abc',
      title: 'Standup',
      startsAt: '2026-08-06T10:00:00.000Z',
      endsAt: '2026-08-06T10:30:00.000Z',
    });
    const b = generateEventFingerprint({
      uid: 'abc',
      title: 'Different title',
      startsAt: '2026-08-06T10:00:00.000Z',
      endsAt: '2026-08-06T10:30:00.000Z',
    });
    expect(a).not.toEqual(b);
    expect(detectDuplicateEvent(a, new Set([a]))).toBe(true);
    expect(detectDuplicateEvent(b, new Set([a]))).toBe(false);
  });
});
