import type { AxiosInstance } from 'axios';

export interface RuntimeExtension {
  configureClient?: (client: AxiosInstance) => void;
  apiBaseURL?: (baseURL: string) => string;
  mediaURL?: (url: string) => string;
}
let extensions: readonly RuntimeExtension[] = [];
export function setRuntimeExtensions(value: readonly RuntimeExtension[]) {
  extensions = value;
}
export function configureApiClient(client: AxiosInstance) {
  extensions.forEach((extension) => extension.configureClient?.(client));
}
export function resolveApiBaseURL(
  baseURL: string = process.env.REACT_APP_BASE_URL || '/api/',
) {
  return extensions.reduce(
    (url, extension) => extension.apiBaseURL?.(url) ?? url,
    baseURL,
  );
}
export function resolveMediaUrl(
  url: string | null | undefined,
): string | undefined {
  if (!url) return url ?? undefined;
  return extensions.reduce(
    (value, extension) => extension.mediaURL?.(value) ?? value,
    url,
  );
}
