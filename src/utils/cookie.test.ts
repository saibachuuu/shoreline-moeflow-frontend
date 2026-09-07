import { getTokenCookieOptions, resolveTokenMaxAge } from './cookie';

describe('token cookie options', () => {
  test('uses a session cookie by default with SameSite protection', () => {
    expect(getTokenCookieOptions()).toEqual({
      path: '/',
      secure: false,
      sameSite: 'lax',
    });
  });

  test('adds maxAge only for remembered sessions', () => {
    expect(getTokenCookieOptions(true, 3600)).toEqual({
      path: '/',
      secure: false,
      sameSite: 'lax',
      maxAge: 3600,
    });
    expect(getTokenCookieOptions(false, 3600)).toEqual({
      path: '/',
      secure: false,
      sameSite: 'lax',
    });
  });

  test('does not set maxAge when maxAge is NaN or non-positive', () => {
    expect(getTokenCookieOptions(true, NaN)).toEqual({
      path: '/',
      secure: false,
      sameSite: 'lax',
    });
    expect(getTokenCookieOptions(true, -100)).toEqual({
      path: '/',
      secure: false,
      sameSite: 'lax',
    });
    expect(getTokenCookieOptions(true, 0)).toEqual({
      path: '/',
      secure: false,
      sameSite: 'lax',
    });
  });
});

describe('resolveTokenMaxAge', () => {
  test('returns undefined when rememberMe is false or omitted', () => {
    expect(resolveTokenMaxAge('some-token', false)).toBeUndefined();
    expect(resolveTokenMaxAge('some-token')).toBeUndefined();
  });

  test('falls back to default 30 days when token cannot be decoded', () => {
    expect(resolveTokenMaxAge('invalid-token', true)).toBe(30 * 24 * 60 * 60);
  });

  test('extracts exp correctly from JWT payload', () => {
    const futureExp = Math.floor(Date.now() / 1000) + 7200;
    // Base64URL encode header and payload: header = {"alg":"HS256"}, payload = {"exp": futureExp}
    const headerB64 = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const payloadB64 = Buffer.from(JSON.stringify({ exp: futureExp })).toString('base64url');
    const mockJwt = `${headerB64}.${payloadB64}.fakeSignature`;

    const remaining = resolveTokenMaxAge(mockJwt, true);
    expect(remaining).toBeGreaterThan(7100);
    expect(remaining).toBeLessThanOrEqual(7200);
  });
});
