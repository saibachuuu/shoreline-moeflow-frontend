import axios, { AxiosHeaders } from 'axios';
import { configureClient } from './runtime';
import { getNetworkRoute } from './networkRoute';
jest.mock('./networkRoute', () => ({
  ...jest.requireActual('./networkRoute'),
  getNetworkRoute: jest.fn(() => 'direct'),
}));
const route = jest.mocked(getNetworkRoute);
afterEach(() => {
  route.mockReturnValue('direct');
});
function clientFor(data: unknown) {
  const client = axios.create({
    baseURL: 'https://direct.example/custom-api/',
    adapter: async (config) => ({
      data,
      config,
      headers: new AxiosHeaders(),
      status: 200,
      statusText: 'OK',
    }),
  });
  configureClient(client);
  return client;
}
test('direct requests retain the configured runtime base and media data', async () => {
  const data = { url: '/storage/file.jpg' };
  const result = await clientFor(data).get('/files');
  expect(result.config.baseURL).toBe('https://direct.example/custom-api/');
  expect(result.data).toEqual(data);
});
test('CDN requests rewrite the API base and nested media URLs without losing query signatures', async () => {
  route.mockReturnValue('cdn');
  const result = await clientFor({
    files: [{ url: 'https://direct.example/storage/file.jpg?token=abc' }],
    status: 'generating',
  }).get('/files');
  expect(result.config.baseURL).not.toContain('direct.example');
  expect(result.data.files[0].url).toContain('/storage/file.jpg?token=abc');
  expect(result.data.files[0].url).not.toContain('direct.example');
  expect(result.data.status).toBe('generating');
});
test('binary download responses are not rewritten', async () => {
  route.mockReturnValue('cdn');
  const data = new ArrayBuffer(4);
  expect((await clientFor(data).get('/download')).data).toBe(data);
});
