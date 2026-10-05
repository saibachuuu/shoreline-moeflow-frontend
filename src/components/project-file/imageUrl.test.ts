import { setRuntimeExtensions } from '@/services/runtimeExtensions';
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

  test('applies the registered media URL extension', () => {
    setRuntimeExtensions([
      { mediaURL: (url) => url.replace('/original/', '/resolved/') },
    ]);
    try {
      expect(getPreferredImageUrl({ url: '/original/image.jpg' })).toBe(
        '/resolved/image.jpg',
      );
    } finally {
      setRuntimeExtensions([]);
    }
  });
});
