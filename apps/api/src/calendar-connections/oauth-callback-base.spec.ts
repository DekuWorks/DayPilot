import {
  FIRST_PARTY_API_ORIGIN,
  RAILWAY_API_ORIGIN,
  emailFromJwt,
  firstPartyApiHostReady,
  mailboxFromTokenResponse,
  redactOAuthUrl,
  resetFirstPartyApiHostCache,
  resolveMicrosoftAuthorityTenant,
  resolveOAuthCallbackBase,
  summarizeGraphError,
  summarizeMicrosoftOAuthError,
  withTimeout,
} from './oauth-callback-base';

describe('resolveMicrosoftAuthorityTenant', () => {
  it('uses common when MICROSOFT_TENANT_ID is a directory GUID', () => {
    expect(
      resolveMicrosoftAuthorityTenant('e41153b5-1d65-4b0a-aa82-cf7a2d000346'),
    ).toBe('common');
  });

  it('keeps common / consumers / organizations', () => {
    expect(resolveMicrosoftAuthorityTenant('common')).toBe('common');
    expect(resolveMicrosoftAuthorityTenant('consumers')).toBe('consumers');
    expect(resolveMicrosoftAuthorityTenant('organizations')).toBe(
      'organizations',
    );
  });

  it('defaults empty values to common', () => {
    expect(resolveMicrosoftAuthorityTenant(null)).toBe('common');
    expect(resolveMicrosoftAuthorityTenant('  ')).toBe('common');
  });
});

describe('resolveOAuthCallbackBase', () => {
  it('skips api.daypilot.co until the first-party host is ready', () => {
    expect(
      resolveOAuthCallbackBase({
        apiUrl: 'https://api.daypilot.co',
        railwayPublicDomain: 'api.daypilot.co',
      }),
    ).toBe(RAILWAY_API_ORIGIN);
  });

  it('uses api.daypilot.co when DNS/TLS is ready', () => {
    expect(
      resolveOAuthCallbackBase(
        {
          apiUrl: 'https://api-production-6c2c.up.railway.app',
          railwayPublicDomain: 'api.daypilot.co',
        },
        true,
      ),
    ).toBe(FIRST_PARTY_API_ORIGIN);
  });

  it('keeps the live Railway API_URL when first-party is down', () => {
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

describe('firstPartyApiHostReady', () => {
  afterEach(() => {
    resetFirstPartyApiHostCache();
  });

  it('is false when DNS does not answer', async () => {
    await expect(
      firstPartyApiHostReady(fetch, async () => {
        throw new Error('ENOTFOUND');
      }),
    ).resolves.toBe(false);
  });

  it('is true when DNS and /health succeed', async () => {
    const fetchImpl = (async () =>
      ({ ok: true }) as Response) as unknown as typeof fetch;
    await expect(
      firstPartyApiHostReady(fetchImpl, async () => ({ address: '1.2.3.4' })),
    ).resolves.toBe(true);
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

describe('summarizeGraphError', () => {
  it('keeps status and code', () => {
    expect(
      summarizeGraphError({
        statusCode: 401,
        code: 'InvalidAuthenticationToken',
        message: 'Access token has expired.',
      }),
    ).toBe('status=401 code=InvalidAuthenticationToken Access token has expired.');
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

describe('mailboxFromTokenResponse', () => {
  it('prefers id_token then access_token', () => {
    const id = Buffer.from(
      JSON.stringify({ preferred_username: 'msa@outlook.com' }),
    ).toString('base64url');
    const access = Buffer.from(
      JSON.stringify({ upn: 'other@outlook.com' }),
    ).toString('base64url');
    expect(
      mailboxFromTokenResponse({
        idToken: `h.${id}.s`,
        accessToken: `h.${access}.s`,
      }),
    ).toBe('msa@outlook.com');
    expect(mailboxFromTokenResponse({ accessToken: `h.${access}.s` })).toBe(
      'other@outlook.com',
    );
  });
});

describe('withTimeout', () => {
  it('rejects when the work exceeds the limit', async () => {
    await expect(
      withTimeout(new Promise(() => undefined), 10, 'Outlook Graph /me'),
    ).rejects.toThrow('Outlook Graph /me timed out after 10ms');
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
