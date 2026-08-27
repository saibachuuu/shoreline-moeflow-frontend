const mockRequest = jest.fn();

jest.mock('./index', () => ({ request: mockRequest }));

import fileApi from './file';
import projectApi from './project';
import memberApi from './member';

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

  test('uses identity member changes instead of workers endpoints', async () => {
    await memberApi.applyProjectMemberChanges({
      projectID: 'project-1',
      data: {
        operations: [{
          operationId: 'op-1',
          action: 'update',
          memberId: 'member-1',
          expectedMemberVersion: 2,
          changes: { tags: ['translator', 'proofreader'] },
        }],
      },
    });
    expect(mockRequest).toHaveBeenLastCalledWith({
      method: 'POST',
      url: '/v1/projects/project-1/members/changes',
      data: {
        operations: [{
          operation_id: 'op-1',
          action: 'update',
          member_id: 'member-1',
          expected_member_version: 2,
          changes: { tags: ['translator', 'proofreader'] },
        }],
      },
    });
  });

  test('sends selected project sets for worker/role searches', async () => {
    await projectApi.getTeamProjects({
      teamID: 'team-1',
      params: {
        page: 2,
        limit: 30,
        mode: 'search-worker',
        projectSets: ['set-1', 'set-2'],
        tag: 'translator',
        workerName: 'Alice',
      },
    });

    expect(mockRequest).toHaveBeenLastCalledWith({
      method: 'GET',
      url: '/v1/teams/team-1/projects',
      params: {
        page: 2,
        limit: 30,
        mode: 'search-worker',
        project_sets: ['set-1', 'set-2'],
        tag: 'translator',
        worker_name: 'Alice',
      },
    });
  });
});
