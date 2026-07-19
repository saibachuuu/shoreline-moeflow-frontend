const mockRequest = jest.fn();

jest.mock('./index', () => ({ request: mockRequest }));

import fileApi from './file';
import projectApi from './project';

describe('migrated image and worker APIs', () => {
  beforeEach(() => {
    mockRequest.mockReset();
    mockRequest.mockResolvedValue({ data: {} });
  });

  test('regenerates one file thumbnail with POST', async () => {
    await fileApi.regenerateThumbnail({ fileID: 'file-1' });

    expect(mockRequest).toHaveBeenCalledWith({
      method: 'POST',
      url: '/v1/files/file-1/thumbnail',
    });
  });

  test('regenerates all project thumbnails with POST', async () => {
    await fileApi.regenerateThumbnails({ projectID: 'project-1' });

    expect(mockRequest).toHaveBeenCalledWith({
      method: 'POST',
      url: '/v1/projects/project-1/thumbnails',
    });
  });

  test('uses worker endpoints and preserves worker payloads', async () => {
    const workers = { 翻译: ['Alice'], 校对: ['Bob'] };

    await projectApi.parseProjectWorkers({ id: 'project-1' });
    expect(mockRequest).toHaveBeenLastCalledWith({
      method: 'POST',
      url: '/v1/projects/project-1/workers/parse',
    });

    await projectApi.updateProjectWorkers({
      id: 'project-1',
      data: { workers },
    });
    expect(mockRequest).toHaveBeenLastCalledWith({
      method: 'PUT',
      url: '/v1/projects/project-1/workers',
      data: { workers },
    });
  });
});
