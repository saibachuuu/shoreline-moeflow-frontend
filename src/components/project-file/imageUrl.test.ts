import { addThumbnailRevision, getPreferredImageUrl } from './imageUrl';

describe('image URL selection', () => {
  test('prefers a generated resample and falls back while it is generating', () => {
    expect(
      getPreferredImageUrl({
        url: '/original.jpg',
        resampleUrl: '/resample.webp',
      }),
    ).toBe('/resample.webp');
    expect(
      getPreferredImageUrl({ url: '/original.jpg', resampleUrl: 'generating' }),
    ).toBe('/original.jpg');
  });

  test('can explicitly select the original image', () => {
    expect(
      getPreferredImageUrl(
        { url: '/original.jpg', resampleUrl: '/resample.webp' },
        true,
      ),
    ).toBe('/original.jpg');
  });

  test('adds a cache-busting revision without breaking existing query strings', () => {
    expect(addThumbnailRevision('/image.webp', 123)).toBe(
      '/image.webp?thumbnail_revision=123',
    );
    expect(addThumbnailRevision('/image.webp?token=abc', 123)).toBe(
      '/image.webp?token=abc&thumbnail_revision=123',
    );
    expect(addThumbnailRevision('/image.webp', 0)).toBe('/image.webp');
  });

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
    try {
      const cdnUrl = getPreferredImageUrl({
        url: 'https://m.usag.cc/storage/files/1.jpg',
      });
      expect(cdnUrl).toContain('/storage/files/1.jpg');
      expect(cdnUrl).not.toContain('https://m.usag.cc');
    } finally {
      (global as any).window = originalWindow;
      (global as any).localStorage = originalLocalStorage;
    }
  });
});
