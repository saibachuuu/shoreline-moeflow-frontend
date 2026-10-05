/**
 * 多线路（直连 / CDN 加速）路由配置与 URL 解析工具
 */
export type NetworkRoute = 'direct' | 'cdn';

export const NETWORK_ROUTE_KEY = 'moeflow_network_route';

/**
 * 获取当前选择的线路偏好（默认为直连 'direct'）
 */
export function getNetworkRoute(): NetworkRoute {
  if (typeof window === 'undefined') return 'direct';
  try {
    const saved = localStorage.getItem(NETWORK_ROUTE_KEY);
    if (saved === 'cdn' || saved === 'direct') {
      return saved;
    }
  } catch {}
  return 'direct';
}

/**
 * 保存线路偏好到 localStorage
 */
export function setNetworkRouteStorage(route: NetworkRoute): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(NETWORK_ROUTE_KEY, route);
  } catch {}
}

/**
 * 缺省规则：对域名最子一级的部分末尾追加后缀（例如 "cdn" 或 "media"）
 *
 * 示例：
 * - m.usag.cc + 'cdn' -> mcdn.usag.cc
 * - m.usag.cc + 'media' -> mmedia.usag.cc
 * - moedev.usag.cc + 'cdn' -> moedevcdn.usag.cc
 * - dash.usag.cc + 'media' -> dashmedia.usag.cc
 * - localhost + 'cdn' -> localhostcdn
 */
export function deriveDefaultCdnDomain(
  baseHost: string,
  suffix: 'cdn' | 'media',
): string {
  const trimmed = baseHost.trim().toLowerCase();
  if (!trimmed) return '';

  const parts = trimmed.split('.');
  if (parts.length >= 2) {
    const child = parts[0];
    const rest = parts.slice(1).join('.');
    return `${child}${suffix}.${rest}`;
  }
  return `${trimmed}${suffix}`;
}

/**
 * 获取基础域名（优先使用 process.env.DOMAIN，否则取当前 window.location.hostname）
 */
export function getBaseHostname(): string {
  const envDomain = process.env.DOMAIN?.trim();
  if (envDomain) {
    return envDomain;
  }
  if (typeof window !== 'undefined' && window.location?.hostname) {
    return window.location.hostname;
  }
  return 'localhost';
}

/**
 * 规范化 Base URL，确保带有协议且以 / 结尾
 */
function normalizeUrl(input: string, defaultPath: string): string {
  let val = input.trim();
  if (!val) return '';

  // 若没有协议头，自动补上当前协议或 https:
  if (!val.startsWith('http://') && !val.startsWith('https://')) {
    const protocol =
      typeof window !== 'undefined' && window.location.protocol === 'http:'
        ? 'http:'
        : 'https:';
    val = `${protocol}//${val}`;
  }

  // 检查是否包含自定义 path，若仅为 host 则追加 defaultPath
  try {
    const parsed = new URL(val);
    if (!parsed.pathname || parsed.pathname === '/') {
      parsed.pathname = defaultPath;
    }
    let res = parsed.toString();
    if (!res.endsWith('/')) {
      res = `${res}/`;
    }
    return res;
  } catch {
    if (!val.endsWith('/')) {
      val = `${val}/`;
    }
    return val;
  }
}

/**
 * 获取 CDN API 基础地址（例如 https://mcdn.usag.cc/api/）
 */
export function getCdnApiBaseURL(): string {
  const envCdnApi =
    process.env.CDN_API_DOMAIN?.trim() ||
    process.env.VITE_CDN_API_DOMAIN?.trim() ||
    process.env.REACT_APP_CDN_API_DOMAIN?.trim();

  if (envCdnApi) {
    return normalizeUrl(envCdnApi, '/api/');
  }

  // 缺省状态：对最子一级末尾加 "cdn"
  const baseHost = getBaseHostname();
  const derivedHost = deriveDefaultCdnDomain(baseHost, 'cdn');
  return normalizeUrl(derivedHost, '/api/');
}

/**
 * 获取 CDN 媒体基础地址（例如 https://mmedia.usag.cc/storage/）
 */
export function getCdnMediaBaseURL(): string {
  const envCdnMedia =
    process.env.CDN_MEDIA_DOMAIN?.trim() ||
    process.env.VITE_CDN_MEDIA_DOMAIN?.trim() ||
    process.env.REACT_APP_CDN_MEDIA_DOMAIN?.trim();

  if (envCdnMedia) {
    return normalizeUrl(envCdnMedia, '/storage/');
  }

  // 缺省状态：对最子一级末尾加 "media"
  const baseHost = getBaseHostname();
  const derivedHost = deriveDefaultCdnDomain(baseHost, 'media');
  return normalizeUrl(derivedHost, '/storage/');
}

/**
 * 获取当前生效的 API Base URL
 */
export function getEffectiveApiBaseURL(
  route: NetworkRoute = getNetworkRoute(),
): string {
  if (route === 'cdn') {
    return getCdnApiBaseURL();
  }
  return process.env.REACT_APP_BASE_URL || '/api/';
}

/**
 * 将可能包含直连媒体域名的 URL 动态映射为 CDN 媒体域名
 */
export function resolveMediaUrl(
  url: string | undefined | null,
  route: NetworkRoute = getNetworkRoute(),
): string | undefined {
  if (!url || url === 'generating') return url ?? undefined;
  if (route !== 'cdn') return url;

  const cdnMediaBase = getCdnMediaBaseURL();
  if (!cdnMediaBase) return url;

  // 识别 /storage/ 路径
  const storageIndex = url.indexOf('/storage/');
  if (storageIndex !== -1) {
    const relativePath = url.substring(storageIndex + '/storage/'.length);
    const separator = cdnMediaBase.endsWith('/') ? '' : '/';
    return `${cdnMediaBase}${separator}${relativePath}`;
  }

  return url;
}
