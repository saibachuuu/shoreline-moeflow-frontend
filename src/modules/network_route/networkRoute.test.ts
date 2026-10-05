import { setRuntimeExtensions } from '@/services/runtimeExtensions';
import { getPreferredImageUrl } from '@/components/project-file/imageUrl';
import {
  deriveDefaultCdnDomain,
  getEffectiveApiBaseURL,
  resolveMediaUrl,
} from './networkRoute';

describe('deriveDefaultCdnDomain', () => {
  test('derives CDN domain by appending cdn to the child-most subdomain part', () => {
    expect(deriveDefaultCdnDomain('m.usag.cc', 'cdn')).toBe('mcdn.usag.cc');
    expect(deriveDefaultCdnDomain('moedev.usag.cc', 'cdn')).toBe(
      'moedevcdn.usag.cc',
    );
    expect(deriveDefaultCdnDomain('dash.usag.cc', 'cdn')).toBe(
      'dashcdn.usag.cc',
    );
    expect(deriveDefaultCdnDomain('site.dev.usag.cc', 'cdn')).toBe(
      'sitecdn.dev.usag.cc',
    );
  });

  test('derives Media domain by appending media to the child-most subdomain part', () => {
    expect(deriveDefaultCdnDomain('m.usag.cc', 'media')).toBe('mmedia.usag.cc');
    expect(deriveDefaultCdnDomain('moedev.usag.cc', 'media')).toBe(
      'moedevmedia.usag.cc',
    );
    expect(deriveDefaultCdnDomain('dash.usag.cc', 'media')).toBe(
      'dashmedia.usag.cc',
    );
    expect(deriveDefaultCdnDomain('site.dev.usag.cc', 'media')).toBe(
      'sitemedia.dev.usag.cc',
    );
  });

  test('handles single-label hosts gracefully', () => {
    expect(deriveDefaultCdnDomain('localhost', 'cdn')).toBe('localhostcdn');
    expect(deriveDefaultCdnDomain('localhost', 'media')).toBe('localhostmedia');
  });
});

describe('resolveMediaUrl', () => {
  test('keeps URL unchanged in direct route mode', () => {
    const rawUrl = 'https://dash.usag.cc/storage/files/123/page1.jpg';
    expect(resolveMediaUrl(rawUrl, 'direct')).toBe(rawUrl);
    expect(resolveMediaUrl('/storage/files/123/page1.jpg', 'direct')).toBe(
      '/storage/files/123/page1.jpg',
    );
  });

  test('replaces storage prefix with CDN media domain in cdn route mode', () => {
    const directUrl = 'https://dash.usag.cc/storage/files/abc/preview.webp';
    const resolved = resolveMediaUrl(directUrl, 'cdn');
    expect(resolved).toContain('/storage/files/abc/preview.webp');
    expect(resolved).not.toContain('https://dash.usag.cc');
  });

  test('preserves generating status and empty urls', () => {
    expect(resolveMediaUrl('generating', 'cdn')).toBe('generating');
    expect(resolveMediaUrl(undefined, 'cdn')).toBeUndefined();
    expect(resolveMediaUrl(null, 'cdn')).toBeUndefined();
  });
});

describe('getEffectiveApiBaseURL', () => {
  test('returns direct base URL for direct mode', () => {
    expect(getEffectiveApiBaseURL('direct')).toBe('/api/');
  });

  test('returns CDN API base URL for cdn mode', () => {
    const cdnBase = getEffectiveApiBaseURL('cdn');
    expect(cdnBase).toContain('/api/');
  });
});

describe('media integration', () => {
  test('resolves storage url to cdn in cdn mode', () => {
    const store: Record<string, string> = { moeflow_network_route: 'cdn' };
    const originalWindow = (global as any).window;
    const originalLocalStorage = (global as any).localStorage;
    (global as any).window = {
      location: { hostname: 'm.usag.cc', protocol: 'https:' },
    };
    (global as any).localStorage = {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => {
        store[k] = v;
      },
      removeItem: (k: string) => {
        delete store[k];
      },
    };
    setRuntimeExtensions([{ mediaURL: (url) => resolveMediaUrl(url) ?? url }]);
    try {
      const cdnUrl = getPreferredImageUrl({
        url: 'https://m.usag.cc/storage/files/1.jpg',
      });
      expect(cdnUrl).toContain('/storage/files/1.jpg');
      expect(cdnUrl).not.toContain('https://m.usag.cc');
    } finally {
      setRuntimeExtensions([]);
      (global as any).window = originalWindow;
      (global as any).localStorage = originalLocalStorage;
    }
  });
});
