const DEV_PLACEHOLDER = 'change-me-in-production';

/**
 * Resolve JWT signing/verification secret.
 * Production must set JWT_SECRET (enforced in env.schema); never fall back
 * to the placeholder there. Dev may use the placeholder for local bootstraps.
 */
export function resolveJwtSecret(
  secret: string | undefined,
  nodeEnv = process.env.NODE_ENV,
): string {
  if (secret && secret.length > 0) {
    return secret;
  }
  if (nodeEnv === 'production') {
    throw new Error('[Env] JWT_SECRET is required in production.');
  }
  return DEV_PLACEHOLDER;
}

export { DEV_PLACEHOLDER as JWT_SECRET_DEV_PLACEHOLDER };
