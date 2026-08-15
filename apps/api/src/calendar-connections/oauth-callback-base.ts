/** First-party API host (same site as daypilot.co). Prefer when HTTPS answers. */
export const FIRST_PARTY_API_HOST = 'api.daypilot.co';
export const FIRST_PARTY_API_ORIGIN = `https://${FIRST_PARTY_API_HOST}`;

/** Live Railway origin — fallback while api.daypilot.co DNS/TLS is down. */
export const RAILWAY_API_ORIGIN = 'https://api-production-6c2c.up.railway.app';

/** @deprecated Use FIRST_PARTY_API_HOST + firstPartyApiHostReady() */
export const DEAD_CUSTOM_API_HOSTS = new Set([FIRST_PARTY_API_HOST]);

export const GRAPH_MICROSOFT_BASE = 'https://graph.microsoft.com/v1.0';

const MULTI_TENANT_AUTHORITIES = new Set([
  'common',
  'organizations',
  'consumers',
]);

const FIRST_PARTY_CHECK_TTL_MS = 60_000;
let firstPartyCache: { ready: boolean; checkedAt: number } | null = null;

/**
 * Outlook Connect must use /common (or /consumers) so personal Microsoft
 * accounts work. A directory GUID on MICROSOFT_TENANT_ID makes Microsoft
 * return error=server_error / AADSTS50020 for MSA logins.
 * @see https://learn.microsoft.com/en-us/troubleshoot/entra/entra-id/app-integration/error-code-aadsts50020-user-account-identity-provider-does-not-exist
 */
export function resolveMicrosoftAuthorityTenant(
  tenantId?: string | null,
): string {
  const tenant = tenantId?.trim().toLowerCase();
  if (!tenant) return 'common';
  if (MULTI_TENANT_AUTHORITIES.has(tenant)) return tenant;
  return 'common';
}

/**
 * Pick the OAuth redirect origin. Prefer api.daypilot.co only when it
 * actually answers (DNS + TLS). Otherwise skip it so Microsoft is not
 * sent to NXDOMAIN. State is the signed `state` query param only —
 * never a Set-Cookie on railway.app (Chrome bounce-tracking deletes it).
 */
export function resolveOAuthCallbackBase(
  env: {
    oauthCallbackBase?: string | null;
    apiUrl?: string | null;
    url?: string | null;
    railwayPublicDomain?: string | null;
  },
  firstPartyReady = false,
): string {
  const fromDomain = env.railwayPublicDomain
    ? env.railwayPublicDomain.startsWith('http')
      ? env.railwayPublicDomain
      : `https://${env.railwayPublicDomain}`
    : null;

  const candidates = firstPartyReady
    ? [
        env.oauthCallbackBase,
        FIRST_PARTY_API_ORIGIN,
        env.apiUrl,
        env.url,
        fromDomain,
        RAILWAY_API_ORIGIN,
      ]
    : [
        env.oauthCallbackBase,
        env.apiUrl,
        env.url,
        fromDomain,
        RAILWAY_API_ORIGIN,
      ];

  for (const raw of candidates) {
    if (!raw?.trim()) continue;
    const normalized = normalizeOrigin(raw);
    if (!normalized) continue;
    try {
      const host = new URL(normalized).hostname.toLowerCase();
      if (host === FIRST_PARTY_API_HOST && !firstPartyReady) continue;
      return normalized;
    } catch {
      continue;
    }
  }
  return 'http://localhost:3001';
}

/** True when https://api.daypilot.co/health answers. Cached for 60s. */
export async function firstPartyApiHostReady(
  fetchImpl: typeof fetch = fetch,
  lookupImpl?: (host: string) => Promise<unknown>,
): Promise<boolean> {
  if (
    firstPartyCache &&
    Date.now() - firstPartyCache.checkedAt < FIRST_PARTY_CHECK_TTL_MS
  ) {
    return firstPartyCache.ready;
  }
  const ready = await probeFirstPartyApi(fetchImpl, lookupImpl);
  firstPartyCache = { ready, checkedAt: Date.now() };
  return ready;
}

/** Test helper — clears the DNS/health cache. */
export function resetFirstPartyApiHostCache(): void {
  firstPartyCache = null;
}

async function probeFirstPartyApi(
  fetchImpl: typeof fetch,
  lookupImpl?: (host: string) => Promise<unknown>,
): Promise<boolean> {
  try {
    if (lookupImpl) {
      await lookupImpl(FIRST_PARTY_API_HOST);
    } else {
      const { lookup } = await import('node:dns/promises');
      await lookup(FIRST_PARTY_API_HOST);
    }
  } catch {
    return false;
  }
  try {
    const res = await fetchImpl(`${FIRST_PARTY_API_ORIGIN}/health`, {
      signal: AbortSignal.timeout(2500),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function normalizeOrigin(raw: string): string | null {
  const trimmed = raw.trim().replace(/\/$/, '');
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

/** Log-safe Microsoft token/authorize error (no secrets). */
export function summarizeMicrosoftOAuthError(body: string): string {
  try {
    const parsed = JSON.parse(body) as {
      error?: string;
      error_codes?: number[];
      error_description?: string;
    };
    const codes = Array.isArray(parsed.error_codes)
      ? parsed.error_codes.join(',')
      : '';
    const desc = (parsed.error_description ?? '').split('\r\n')[0].slice(0, 160);
    return [parsed.error, codes && `codes=${codes}`, desc]
      .filter(Boolean)
      .join(' ');
  } catch {
    return body.replace(/client_secret=[^&\s]+/gi, 'client_secret=[redacted]').slice(0, 160);
  }
}

/** Log-safe Microsoft Graph error (status/code/message only). */
export function summarizeGraphError(err: unknown): string {
  if (!err || typeof err !== 'object') {
    return err instanceof Error ? err.message : String(err);
  }
  const e = err as {
    statusCode?: number;
    code?: string;
    message?: string;
    body?: string;
  };
  let bodyError = '';
  if (typeof e.body === 'string') {
    try {
      const parsed = JSON.parse(e.body) as {
        error?: { code?: string; message?: string };
      };
      bodyError = [parsed.error?.code, parsed.error?.message]
        .filter(Boolean)
        .join(' ');
    } catch {
      bodyError = e.body.slice(0, 120);
    }
  }
  return [
    e.statusCode != null && `status=${e.statusCode}`,
    e.code && `code=${e.code}`,
    (e.message ?? bodyError).slice(0, 160),
  ]
    .filter(Boolean)
    .join(' ');
}

export function emailFromJwt(idToken?: string | null): string | null {
  if (!idToken) return null;
  const parts = idToken.split('.');
  if (parts.length < 2) return null;
  try {
    const json = Buffer.from(parts[1], 'base64url').toString('utf8');
    const payload = JSON.parse(json) as {
      email?: string;
      preferred_username?: string;
      upn?: string;
      unique_name?: string;
    };
    const email =
      payload.email ||
      payload.preferred_username ||
      payload.upn ||
      payload.unique_name;
    return email ? String(email) : null;
  } catch {
    return null;
  }
}

/** Mailbox from id_token, then access_token JWT (Graph /me may fail for MSA). */
export function mailboxFromTokenResponse(tokens: {
  idToken?: string | null;
  accessToken?: string | null;
}): string | null {
  return emailFromJwt(tokens.idToken) ?? emailFromJwt(tokens.accessToken);
}

export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`${label} timed out after ${ms}ms`)),
          ms,
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function redactOAuthUrl(url: string): string {
  return url.replace(
    /([?&](code|state|error_description)=)[^&]*/gi,
    '$1[redacted]',
  );
}
