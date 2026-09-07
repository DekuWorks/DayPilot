import {
  isSealedToken,
  openToken,
  resolveTokenEncryptionKey,
  sealToken,
  TOKEN_CIPHER_PREFIX,
} from './token-crypto';

const KEY_HEX = 'a'.repeat(64);
const KEY = resolveTokenEncryptionKey(KEY_HEX)!;

describe('token-crypto', () => {
  it('resolves 32-byte hex and base64 keys', () => {
    expect(resolveTokenEncryptionKey(KEY_HEX)?.length).toBe(32);
    expect(
      resolveTokenEncryptionKey(Buffer.alloc(32, 7).toString('base64'))?.length,
    ).toBe(32);
    expect(resolveTokenEncryptionKey('too-short')).toBeNull();
    expect(resolveTokenEncryptionKey('')).toBeNull();
  });

  it('round-trips a token and does not double-seal', () => {
    const sealed = sealToken('ya29.oauth-token', KEY);
    expect(sealed).toBeTruthy();
    expect(isSealedToken(sealed)).toBe(true);
    expect(sealed!.startsWith(TOKEN_CIPHER_PREFIX)).toBe(true);
    expect(sealed).not.toContain('ya29.oauth-token');
    expect(openToken(sealed, KEY)).toBe('ya29.oauth-token');
    expect(sealToken(sealed, KEY)).toBe(sealed);
  });

  it('passes through plaintext when no key is set', () => {
    expect(sealToken('plain-token', null)).toBe('plain-token');
    expect(openToken('legacy-plain', KEY)).toBe('legacy-plain');
  });

  it('leaves null and empty values alone', () => {
    expect(sealToken(null, KEY)).toBeNull();
    expect(sealToken('', KEY)).toBe('');
    expect(openToken(undefined, KEY)).toBeUndefined();
  });
});
