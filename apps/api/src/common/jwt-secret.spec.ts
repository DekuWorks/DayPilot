import { JWT_SECRET_DEV_PLACEHOLDER, resolveJwtSecret } from './jwt-secret';

describe('resolveJwtSecret', () => {
  it('returns configured secret', () => {
    expect(resolveJwtSecret('real-secret')).toBe('real-secret');
  });

  it('uses placeholder only outside production', () => {
    expect(resolveJwtSecret(undefined, 'development')).toBe(
      JWT_SECRET_DEV_PLACEHOLDER,
    );
  });

  it('throws in production when missing', () => {
    expect(() => resolveJwtSecret(undefined, 'production')).toThrow(
      /JWT_SECRET/,
    );
    expect(() => resolveJwtSecret('', 'production')).toThrow(/JWT_SECRET/);
  });
});
