/**
 * Env validation at bootstrap. Fails fast with a clear error if required vars are missing.
 * Production: JWT_SECRET is required and must not be the default placeholder.
 */
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
        jwtSecret !== 'change-me-in-production',
        'JWT_SECRET must not be the default placeholder in production.',
      );
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
