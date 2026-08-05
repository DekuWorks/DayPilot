import {
  appSpecificPasswordVariants,
  decodeCalendarIds,
  encodeCalendarIds,
  looksLikeAppSpecificPassword,
  normalizeAppSpecificPassword,
  parseIcsEvents,
} from './icloud-caldav';

describe('icloud-caldav helpers', () => {
  it('strips spaces and unicode spaces from app-specific passwords', () => {
    expect(normalizeAppSpecificPassword('abcd efgh ijkl mnop')).toBe(
      'abcdefghijklmnop',
    );
    expect(normalizeAppSpecificPassword('abcd-efgh-ijkl-mnop')).toBe(
      'abcd-efgh-ijkl-mnop',
    );
    expect(normalizeAppSpecificPassword('abcd\u00A0efgh\u00A0ijkl\u00A0mnop')).toBe(
      'abcdefghijklmnop',
    );
  });

  it('builds hyphenated and bare password variants', () => {
    expect(appSpecificPasswordVariants('abcd efgh ijkl mnop')).toEqual([
      'abcdefghijklmnop',
      'abcd-efgh-ijkl-mnop',
    ]);
    expect(appSpecificPasswordVariants('abcd-efgh-ijkl-mnop')).toEqual([
      'abcd-efgh-ijkl-mnop',
      'abcdefghijklmnop',
    ]);
  });

  it('detects app-specific password shape', () => {
    expect(looksLikeAppSpecificPassword('abcd-efgh-ijkl-mnop')).toBe(true);
    expect(looksLikeAppSpecificPassword('abcdefghijklmnop')).toBe(true);
    expect(looksLikeAppSpecificPassword('my-apple-id-password')).toBe(false);
    expect(looksLikeAppSpecificPassword('short')).toBe(false);
  });

  it('encodes and decodes calendar id lists', () => {
    expect(encodeCalendarIds(['https://a/'])).toBe('https://a/');
    expect(JSON.parse(encodeCalendarIds(['https://a/', 'https://b/']))).toEqual([
      'https://a/',
      'https://b/',
    ]);
    expect(decodeCalendarIds('https://a/')).toEqual(['https://a/']);
    expect(decodeCalendarIds('["https://a/","https://b/"]')).toEqual([
      'https://a/',
      'https://b/',
    ]);
  });

  it('parses VEVENT blocks from ICS', () => {
    const ics = `BEGIN:VCALENDAR
BEGIN:VEVENT
UID:evt-1
SUMMARY:Standup
DTSTART:20260805T150000Z
DTEND:20260805T153000Z
LOCATION:Zoom
END:VEVENT
END:VCALENDAR`;
    const events = parseIcsEvents(ics);
    expect(events).toHaveLength(1);
    expect(events[0]?.uid).toBe('evt-1');
    expect(events[0]?.title).toBe('Standup');
    expect(events[0]?.location).toBe('Zoom');
  });
});
