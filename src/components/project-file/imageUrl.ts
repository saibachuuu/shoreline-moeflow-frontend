import { resolveMediaUrl } from '@/services/runtimeExtensions';

type ImageUrls = {
  url?: string;
  resampleUrl?: string;
};

export { resolveMediaUrl };

export function getPreferredImageUrl(
  file: ImageUrls,
  useOriginalImage = false,
): string | undefined {
  const hasResampleImage = Boolean(
    file.resampleUrl && file.resampleUrl !== 'generating',
  );
  const rawUrl =
    useOriginalImage || !hasResampleImage ? file.url : file.resampleUrl;
  return resolveMediaUrl(rawUrl);
}

export function addThumbnailRevision(
  url: string | undefined,
  revision: number,
): string | undefined {
  if (!url || revision <= 0) return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}thumbnail_revision=${revision}`;
}
