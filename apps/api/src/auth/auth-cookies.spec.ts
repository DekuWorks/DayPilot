import { ACCESS_COOKIE, readCookie } from './auth-cookies';

describe('readCookie', () => {
  it('reads the named cookie and ignores others', () => {
    expect(
      readCookie('other=1; dp_access=abc.def; extra=2', ACCESS_COOKIE),
    ).toBe('abc.def');
    expect(readCookie('dp_access=a%2Fb', ACCESS_COOKIE)).toBe('a/b');
    expect(readCookie(undefined, ACCESS_COOKIE)).toBeNull();
  });
});
