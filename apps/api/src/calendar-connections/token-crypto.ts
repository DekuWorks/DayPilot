import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

export const TOKEN_CIPHER_PREFIX = 'enc:v1:';

const ALGO = 'aes-256-gcm';
const IV_LENGTH = 12;

let warnedMissingKey = false;

export function resolveTokenEncryptionKey(
  raw: string | undefined | null,
): Buffer | null {
  const value = raw?.trim();
  if (!value) return null;
  if (/^[0-9a-fA-F]{64}$/.test(value)) {
    return Buffer.from(value, 'hex');
  }
  try {
    const decoded = Buffer.from(value, 'base64');
    if (decoded.length === 32) return decoded;
  } catch {
    // fall through
  }
  return null;
}

export function isSealedToken(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.startsWith(TOKEN_CIPHER_PREFIX);
}

/** Encrypt a calendar token. Plaintext pass-through when no key is configured. */
export function sealToken(
  value: string | null | undefined,
  key = resolveTokenEncryptionKey(process.env.CALENDAR_TOKEN_ENCRYPTION_KEY),
): string | null | undefined {
  if (value == null) return value;
  if (!value) return value;
  if (isSealedToken(value)) return value;
  if (!key) {
    if (!warnedMissingKey && process.env.NODE_ENV !== 'test') {
      warnedMissingKey = true;
      console.warn(
        'CALENDAR_TOKEN_ENCRYPTION_KEY is unset — calendar tokens stay plaintext',
      );
    }
    return value;
  }
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGO, key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(value, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return `${TOKEN_CIPHER_PREFIX}${iv.toString('hex')}:${tag.toString('hex')}:${ciphertext.toString('hex')}`;
}

/** Decrypt a sealed token. Legacy plaintext is returned unchanged. */
export function openToken(
  value: string | null | undefined,
  key = resolveTokenEncryptionKey(process.env.CALENDAR_TOKEN_ENCRYPTION_KEY),
): string | null | undefined {
  if (value == null) return value;
  if (!isSealedToken(value)) return value;
  if (!key) {
    throw new Error(
      'Encrypted calendar token found but CALENDAR_TOKEN_ENCRYPTION_KEY is missing',
    );
  }
  const body = value.slice(TOKEN_CIPHER_PREFIX.length);
  const [ivHex, tagHex, dataHex] = body.split(':');
  if (!ivHex || !tagHex || !dataHex) {
    throw new Error('Encrypted calendar token is malformed');
  }
  const decipher = createDecipheriv(ALGO, key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  return Buffer.concat([
    decipher.update(Buffer.from(dataHex, 'hex')),
    decipher.final(),
  ]).toString('utf8');
}

export function sealConnectionTokenFields(
  data: Record<string, unknown>,
): Record<string, unknown> {
  const next = { ...data };
  if (typeof next.accessToken === 'string') {
    next.accessToken = sealToken(next.accessToken);
  }
  if (typeof next.refreshToken === 'string') {
    next.refreshToken = sealToken(next.refreshToken);
  }
  return next;
}

export function openConnectionTokenFields<T>(row: T): T {
  if (row == null || typeof row !== 'object') return row;
  const record = row as Record<string, unknown>;
  if (typeof record.accessToken === 'string') {
    record.accessToken = openToken(record.accessToken);
  }
  if (typeof record.refreshToken === 'string') {
    record.refreshToken = openToken(record.refreshToken);
  }
  return row;
}

export function sealPrismaConnectionArgs(args: {
  data?: unknown;
  create?: unknown;
  update?: unknown;
}): void {
  if (args.data && typeof args.data === 'object') {
    if (Array.isArray(args.data)) {
      args.data = args.data.map((row) =>
        sealConnectionTokenFields(row as Record<string, unknown>),
      );
    } else {
      args.data = sealConnectionTokenFields(
        args.data as Record<string, unknown>,
      );
    }
  }
  if (args.create && typeof args.create === 'object') {
    args.create = sealConnectionTokenFields(
      args.create as Record<string, unknown>,
    );
  }
  if (args.update && typeof args.update === 'object') {
    args.update = sealConnectionTokenFields(
      args.update as Record<string, unknown>,
    );
  }
}

export function openPrismaConnectionResult<T>(result: T): T {
  if (Array.isArray(result)) {
    return result.map((row) => openConnectionTokenFields(row)) as T;
  }
  return openConnectionTokenFields(result);
}
