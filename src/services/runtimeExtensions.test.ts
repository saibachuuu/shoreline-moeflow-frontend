import {
  configureApiClient,
  resolveApiBaseURL,
  resolveMediaUrl,
  setRuntimeExtensions,
} from './runtimeExtensions';
import axios from 'axios';
afterEach(() => setRuntimeExtensions([]));
test('no modules: preserves the runtime API base and media URLs', () => {
  expect(resolveApiBaseURL('https://runtime.example/api/')).toBe(
    'https://runtime.example/api/',
  );
  expect(resolveMediaUrl('/storage/photo.jpg')).toBe('/storage/photo.jpg');
  expect(resolveMediaUrl(null)).toBeUndefined();
});
test('applies module extensions in order and configures API clients', () => {
  const configureClient = jest.fn();
  setRuntimeExtensions([
    {
      configureClient,
      apiBaseURL: () => '/custom-api/',
      mediaURL: (url) => '/custom' + url,
    },
  ]);
  const client = axios.create();
  configureApiClient(client);
  expect(configureClient).toHaveBeenCalledWith(client);
  expect(resolveApiBaseURL('/api/')).toBe('/custom-api/');
  expect(resolveMediaUrl('/photo.jpg')).toBe('/custom/photo.jpg');
  setRuntimeExtensions([]);
  expect(resolveApiBaseURL('/api/')).toBe('/api/');
});
