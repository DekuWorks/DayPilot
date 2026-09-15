/**
 * Shared CORS origin policy for HTTP (Nest) and WebSocket (Socket.IO).
 * Production requires an explicit CORS_ORIGIN allowlist — never fail open.
 */
export function parseCorsOriginList(raw: string | undefined): string[] {
  if (raw === undefined || raw === '') return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function assertProductionCorsOrigin(
  raw: string | undefined,
  nodeEnv = process.env.NODE_ENV,
): void {
  if (nodeEnv !== 'production') return;
  if (parseCorsOriginList(raw).length === 0) {
    throw new Error(
      '[Env] CORS_ORIGIN is required in production (comma-separated allowlist).',
    );
  }
}

export type CorsOriginCallback = (
  origin: string | undefined,
  callback: (err: Error | null, allow?: boolean) => void,
) => void;

export type CorsOriginOption = boolean | string[] | CorsOriginCallback;

function isDevLocalHttpOrigin(origin: string): boolean {
  try {
    const u = new URL(origin);
    return (
      u.protocol === 'http:' &&
      (u.hostname === 'localhost' || u.hostname === '127.0.0.1')
    );
  } catch {
    return false;
  }
}

/** CORS: production uses CORS_ORIGIN only; dev also allows http localhost / 127.0.0.1. */
export function corsOriginOption(
  raw: string | undefined,
  nodeEnv = process.env.NODE_ENV,
): CorsOriginOption {
  const list = parseCorsOriginList(raw);
  if (nodeEnv === 'production') {
    return list;
  }
  if (list.length === 0) {
    return true;
  }
  return (origin, callback) => {
    if (!origin) {
      callback(null, true);
      return;
    }
    if (list.includes(origin) || isDevLocalHttpOrigin(origin)) {
      callback(null, true);
      return;
    }
    callback(null, false);
  };
}

/**
 * Socket.IO origin policy — same rules as HTTP CORS.
 * Returns a callback that re-reads CORS_ORIGIN / NODE_ENV on each handshake so
 * decorator evaluation at import time does not freeze a stale allowlist.
 */
export function socketCorsOrigin(
  raw?: string | undefined,
  nodeEnv?: string,
): CorsOriginCallback {
  return (origin, callback) => {
    const option = corsOriginOption(
      raw !== undefined ? raw : process.env.CORS_ORIGIN,
      nodeEnv ?? process.env.NODE_ENV,
    );
    if (option === true) {
      callback(null, true);
      return;
    }
    if (Array.isArray(option)) {
      callback(null, !origin || option.includes(origin));
      return;
    }
    option(origin, callback);
  };
}
