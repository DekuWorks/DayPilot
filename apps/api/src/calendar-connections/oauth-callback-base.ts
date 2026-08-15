/** Custom API host that does not resolve (GoDaddy CNAME still pending). */
export const DEAD_CUSTOM_API_HOSTS = new Set(['api.daypilot.co']);

/** Live Railway origin — use until api.daypilot.co DNS works. */
export const RAILWAY_API_ORIGIN = 'https://api-production-6c2c.up.railway.app';

export function resolveOAuthCallbackBase(env: {
  oauthCallbackBase?: string | null;
  apiUrl?: string | null;
  url?: string | null;
  railwayPublicDomain?: string | null;
}): string {
  const fromDomain = env.railwayPublicDomain
    ? env.railwayPublicDomain.startsWith('http')
      ? env.railwayPublicDomain
      : `https://${env.railwayPublicDomain}`
    : null;

  const candidates = [
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
      if (DEAD_CUSTOM_API_HOSTS.has(host)) continue;
      return normalized;
    } catch {
      continue;
    }
  }
  return 'http://localhost:3001';
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
    };
    const email = payload.email || payload.preferred_username || payload.upn;
    return email ? String(email) : null;
  } catch {
    return null;
  }
}

export function redactOAuthUrl(url: string): string {
  return url.replace(
    /([?&](code|state|error_description)=)[^&]*/gi,
    '$1[redacted]',
  );
}
