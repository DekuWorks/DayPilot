import {
  RAILWAY_API_ORIGIN,
  emailFromJwt,
  redactOAuthUrl,
  resolveOAuthCallbackBase,
  summarizeMicrosoftOAuthError,
} from './oauth-callback-base';

describe('resolveOAuthCallbackBase', () => {
  it('skips api.daypilot.co and uses the Railway origin', () => {
    expect(
      resolveOAuthCallbackBase({
        apiUrl: 'https://api.daypilot.co',
        railwayPublicDomain: 'api.daypilot.co',
      }),
    ).toBe(RAILWAY_API_ORIGIN);
  });

  it('keeps the live Railway API_URL', () => {
    expect(
      resolveOAuthCallbackBase({
        apiUrl: 'https://api-production-6c2c.up.railway.app',
      }),
    ).toBe('https://api-production-6c2c.up.railway.app');
  });

  it('prefers an explicit OAUTH_CALLBACK_BASE', () => {
    expect(
      resolveOAuthCallbackBase({
        oauthCallbackBase: 'https://api-production-6c2c.up.railway.app',
        apiUrl: 'https://api.daypilot.co',
      }),
    ).toBe('https://api-production-6c2c.up.railway.app');
  });
});

describe('summarizeMicrosoftOAuthError', () => {
  it('extracts error code without dumping the body', () => {
    const summary = summarizeMicrosoftOAuthError(
      JSON.stringify({
        error: 'invalid_grant',
        error_codes: [70000],
        error_description: 'AADSTS70000: The request was denied.\r\nTrace ID: abc',
      }),
    );
    expect(summary).toContain('invalid_grant');
    expect(summary).toContain('70000');
    expect(summary).not.toContain('Trace ID');
  });
});

describe('emailFromJwt', () => {
  it('reads email from a JWT payload', () => {
    const payload = Buffer.from(
      JSON.stringify({ email: 'marcus@example.com' }),
    ).toString('base64url');
    expect(emailFromJwt(`hdr.${payload}.sig`)).toBe('marcus@example.com');
  });
});

describe('redactOAuthUrl', () => {
  it('hides code and state', () => {
    expect(
      redactOAuthUrl(
        '/calendar-connections/outlook/callback?code=SECRET&state=JWT',
      ),
    ).toBe(
      '/calendar-connections/outlook/callback?code=[redacted]&state=[redacted]',
    );
  });
});
