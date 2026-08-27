import { getTokenCookieOptions } from './cookie';

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
});
