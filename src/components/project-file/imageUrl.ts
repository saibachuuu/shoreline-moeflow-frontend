type ImageUrls = {
  url?: string;
  resampleUrl?: string;
};

export function getPreferredImageUrl(
  file: ImageUrls,
  useOriginalImage = false,
): string | undefined {
  const hasResampleImage = Boolean(
    file.resampleUrl && file.resampleUrl !== 'generating',
  );
  return useOriginalImage || !hasResampleImage ? file.url : file.resampleUrl;
}

export function addThumbnailRevision(
  url: string | undefined,
  revision: number,
): string | undefined {
  if (!url || revision <= 0) return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}thumbnail_revision=${revision}`;
}
