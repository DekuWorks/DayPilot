import {
  assertProductionCorsOrigin,
  corsOriginOption,
  parseCorsOriginList,
  socketCorsOrigin,
} from './cors-origin';

function allowViaSocket(
  origin: string | undefined,
  raw?: string,
  nodeEnv?: string,
): Promise<boolean> {
  return new Promise((resolve, reject) => {
    socketCorsOrigin(raw, nodeEnv)(origin, (err, allow) => {
      if (err) reject(err);
      else resolve(!!allow);
    });
  });
}

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
  });

  it('allows all origins in development when unset', () => {
    expect(corsOriginOption(undefined, 'development')).toBe(true);
  });

  it('socket CORS matches HTTP localhost relaxation in development', async () => {
    const raw = 'http://localhost:3000';
    await expect(
      allowViaSocket('http://localhost:5173', raw, 'development'),
    ).resolves.toBe(true);
    await expect(
      allowViaSocket('http://127.0.0.1:41234', raw, 'development'),
    ).resolves.toBe(true);
    await expect(
      allowViaSocket('https://evil.example', raw, 'development'),
    ).resolves.toBe(false);
  });

  it('socket CORS stays strict in production', async () => {
    const raw = 'https://daypilot.co';
    await expect(
      allowViaSocket('https://daypilot.co', raw, 'production'),
    ).resolves.toBe(true);
    await expect(
      allowViaSocket('http://localhost:3000', raw, 'production'),
    ).resolves.toBe(false);
  });
});
