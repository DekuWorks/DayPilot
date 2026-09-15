import {
  assertProductionCorsOrigin,
  corsOriginOption,
  parseCorsOriginList,
  socketCorsOrigin,
} from './cors-origin';

describe('cors-origin', () => {
  it('parses comma-separated origins', () => {
    expect(parseCorsOriginList('https://a.com, https://b.com')).toEqual([
      'https://a.com',
      'https://b.com',
    ]);
    expect(parseCorsOriginList('')).toEqual([]);
    expect(parseCorsOriginList(undefined)).toEqual([]);
  });

  it('fails production when CORS_ORIGIN is empty', () => {
    expect(() => assertProductionCorsOrigin(undefined, 'production')).toThrow(
      /CORS_ORIGIN/,
    );
    expect(() => assertProductionCorsOrigin('', 'production')).toThrow(
      /CORS_ORIGIN/,
    );
    expect(() =>
      assertProductionCorsOrigin('https://daypilot.co', 'production'),
    ).not.toThrow();
  });

  it('returns allowlist array in production', () => {
    expect(
      corsOriginOption('https://a.com,https://b.com', 'production'),
    ).toEqual(['https://a.com', 'https://b.com']);
    expect(socketCorsOrigin('https://a.com', 'production')).toEqual([
      'https://a.com',
    ]);
  });

  it('allows all origins in development when unset', () => {
    expect(corsOriginOption(undefined, 'development')).toBe(true);
    expect(socketCorsOrigin(undefined, 'development')).toBe(true);
  });
});
