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

export type CorsOriginOption =
  | boolean
  | string[]
  | ((
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => void);

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
    if (list.includes(origin)) {
      callback(null, true);
      return;
    }
    try {
      const u = new URL(origin);
      if (
        u.protocol === 'http:' &&
        (u.hostname === 'localhost' || u.hostname === '127.0.0.1')
      ) {
        callback(null, true);
        return;
      }
    } catch {
      // ignore
    }
    callback(null, false);
  };
}

/** Socket.IO-friendly origin setting (same policy as HTTP). */
export function socketCorsOrigin(
  raw: string | undefined = process.env.CORS_ORIGIN,
  nodeEnv = process.env.NODE_ENV,
): boolean | string[] {
  const list = parseCorsOriginList(raw);
  if (nodeEnv === 'production') {
    return list;
  }
  if (list.length === 0) {
    return true;
  }
  return list;
}
