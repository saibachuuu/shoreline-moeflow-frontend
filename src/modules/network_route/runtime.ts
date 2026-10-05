import type { AxiosInstance } from 'axios';
import {
  getNetworkRoute,
  getCdnApiBaseURL,
  resolveMediaUrl,
} from './networkRoute';
function rewriteStorageUrls(data: unknown): unknown {
  if (!data) return data;
  if (typeof Blob !== 'undefined' && data instanceof Blob) return data;
  if (typeof ArrayBuffer !== 'undefined' && data instanceof ArrayBuffer)
    return data;
  if (typeof FormData !== 'undefined' && data instanceof FormData) return data;

  if (typeof data === 'string') {
    if (data.includes('/storage/')) {
      return resolveMediaUrl(data, 'cdn') ?? data;
    }
    return data;
  }
  if (Array.isArray(data)) {
    return data.map(rewriteStorageUrls);
  }
  if (typeof data === 'object') {
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(data)) {
      const val = (data as Record<string, unknown>)[key];
      if (typeof val === 'string' && val.includes('/storage/')) {
        result[key] = resolveMediaUrl(val, 'cdn');
      } else if (val && typeof val === 'object') {
        result[key] = rewriteStorageUrls(val);
      } else {
        result[key] = val;
      }
    }
    return result;
  }
  return data;
}

export function configureClient(instance: AxiosInstance) {
  instance.interceptors.request.use((request) => {
    if (getNetworkRoute() === 'cdn') request.baseURL = getCdnApiBaseURL();
    return request;
  });
  instance.interceptors.response.use((response) => {
    if (getNetworkRoute() === 'cdn' && response.data)
      response.data = rewriteStorageUrls(response.data);
    return response;
  });
}
