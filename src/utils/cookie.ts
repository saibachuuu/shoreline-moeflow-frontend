import { Cookies } from 'react-cookie';
import { jwtDecode } from 'jwt-decode';

const cookies = new Cookies();

const DEFAULT_REMEMBER_MAX_AGE = 30 * 24 * 60 * 60; // 30 天

const isSecureCookieContext = () =>
  typeof window !== 'undefined' && window.location.protocol === 'https:';

/**
 * Browser-side cookies cannot set HttpOnly.  Secure/SameSite still prevent
 * accidental plaintext transport and reduce cross-site request exposure;
 * server-managed HttpOnly sessions remain the stronger future option.
 */
const getTokenCookieOptions = (rememberMe?: boolean, maxAge?: number) => {
  const hasValidMaxAge =
    Boolean(rememberMe) &&
    typeof maxAge === 'number' &&
    Number.isFinite(maxAge) &&
    maxAge > 0;

  return {
    path: '/',
    secure: isSecureCookieContext(),
    sameSite: 'lax' as const,
    ...(hasValidMaxAge ? { maxAge: Math.floor(maxAge) } : {}),
  };
};

/**
 * 解析 token 的剩余有效秒数。
 * 注意：jwtDecode 默认解码 payload；若传 { header: true } 会解码头部，导致读取不到 exp。
 */
const resolveTokenMaxAge = (
  token: string,
  rememberMe?: boolean,
): number | undefined => {
  if (!rememberMe) {
    return undefined;
  }
  try {
    const payload = jwtDecode<{ exp?: number }>(token);
    if (typeof payload?.exp === 'number' && Number.isFinite(payload.exp)) {
      const remainingSeconds = Math.floor(payload.exp - Date.now() / 1000);
      if (remainingSeconds > 0) {
        return remainingSeconds;
      }
    }
  } catch (error) {
    // 非标准 JWT 或格式异常时，记录 debug 并回退默认过期时长
    console.debug('[cookie] Could not parse exp from token payload, using default maxAge');
  }
  return DEFAULT_REMEMBER_MAX_AGE;
};

/**
 * 将 Cookie 中取出的字符串转为布尔值
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const toBoolean = (value: string | undefined) => {
  return value?.toLowerCase() === 'true';
};

/**
 * 从 Cookie 中获取 token
 */
const getToken = (): string | undefined => {
  return cookies.get('token');
};

/**
 * 向 Cookie 设置 token
 * @param token 用户令牌
 * @param rememberMe 是否记住登录状态
 */
const setToken = (token: string, rememberMe?: boolean) => {
  try {
    const maxAge = resolveTokenMaxAge(token, rememberMe);
    cookies.set('token', token, getTokenCookieOptions(rememberMe, maxAge));
  } catch (error) {
    console.error('[cookie] Failed to set token cookie:', error);
  }
};

/**
 * 从 Cookie 中删除 token
 */
const removeToken = () => {
  cookies.remove('token', getTokenCookieOptions());
};

export { getToken, getTokenCookieOptions, resolveTokenMaxAge, setToken, removeToken };

