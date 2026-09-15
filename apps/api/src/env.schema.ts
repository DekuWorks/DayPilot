/**
 * Env validation at bootstrap. Fails fast with a clear error if required vars are missing.
 * Production: JWT_SECRET + CORS_ORIGIN required; encryption key strongly recommended.
 */
import { JWT_SECRET_DEV_PLACEHOLDER } from './common/jwt-secret';
import { parseCorsOriginList } from './common/cors-origin';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`[Env] ${message}`);
  }
}

export const envSchema = {
  parse(env: Record<string, unknown>): Record<string, unknown> {
    const nodeEnv = env.NODE_ENV as string | undefined;
    const isProd = nodeEnv === 'production';

    if (isProd) {
      const jwtSecret = env.JWT_SECRET as string | undefined;
      assert(!!jwtSecret, 'JWT_SECRET is required in production.');
      assert(
        jwtSecret !== JWT_SECRET_DEV_PLACEHOLDER,
        'JWT_SECRET must not be the default placeholder in production.',
      );
      assert(
        parseCorsOriginList(env.CORS_ORIGIN as string | undefined).length > 0,
        'CORS_ORIGIN is required in production (comma-separated allowlist).',
      );
      if (!env.CALENDAR_TOKEN_ENCRYPTION_KEY) {
        console.warn(
          '[Env] CALENDAR_TOKEN_ENCRYPTION_KEY is unset — calendar OAuth tokens stay plaintext at rest.',
        );
      }
    }

    const databaseUrl = env.DATABASE_URL as string | undefined;
    if (databaseUrl && typeof databaseUrl === 'string') {
      const valid =
        databaseUrl.startsWith('postgresql://') ||
        databaseUrl.startsWith('postgres://') ||
        databaseUrl.startsWith('file:') ||
        databaseUrl.startsWith('sqlite:');
      assert(
        valid,
        'DATABASE_URL must be a postgresql, postgres, file, or sqlite URL.',
      );
    }

    return env;
  },
};
