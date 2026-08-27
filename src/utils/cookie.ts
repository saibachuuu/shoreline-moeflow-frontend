import { Cookies } from 'react-cookie';
import { jwtDecode } from 'jwt-decode';

const cookies = new Cookies();

const isSecureCookieContext = () =>
  typeof window !== 'undefined' && window.location.protocol === 'https:';

/**
 * Browser-side cookies cannot set HttpOnly.  Secure/SameSite still prevent
 * accidental plaintext transport and reduce cross-site request exposure;
 * server-managed HttpOnly sessions remain the stronger future option.
 */
const getTokenCookieOptions = (rememberMe?: boolean, maxAge?: number) => ({
  path: '/',
  secure: isSecureCookieContext(),
  sameSite: 'lax' as const,
  ...(rememberMe && maxAge !== undefined ? { maxAge } : {}),
});

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
 */
const setToken = (token: string, rememberMe?: boolean) => {
  const { exp } = jwtDecode(token, { header: true }) as { exp: number }; // token 过期时间（时间戳）
  const maxAge = exp - Math.floor(new Date().getTime() / 1000); // Cookie 过期时间（x秒后）
  cookies.set('token', token, getTokenCookieOptions(rememberMe, maxAge));
};

/**
 * 从 Cookie 中删除 token
 */
const removeToken = () => {
  cookies.remove('token', getTokenCookieOptions());
};

export { getToken, getTokenCookieOptions, setToken, removeToken };
