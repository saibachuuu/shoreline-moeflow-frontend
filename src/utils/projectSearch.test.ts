import { PROJECT_STATUS } from '@/constants';
import { buildTeamProjectSearchParams } from './projectSearch';

describe('team project search params', () => {
  test('keeps an empty worker search in worker mode and preserves the tag filter', () => {
    expect(buildTeamProjectSearchParams({
      page: 1,
      limit: 20,
      status: PROJECT_STATUS.NORMAL,
      searchMode: 'search-worker',
      searchRole: 'translator',
      word: '',
      currentProjectSetID: 'set-current',
      selectedProjectSetIDs: ['set-current', 'set-other'],
    })).toEqual({
      page: 1,
      limit: 20,
      status: PROJECT_STATUS.NORMAL,
      mode: 'search-worker',
      projectSets: ['set-current', 'set-other'],
      tag: 'translator',
    });
  });

  test('browses the current project set for an empty name search', () => {
    expect(buildTeamProjectSearchParams({
      page: 1,
      limit: 20,
      status: PROJECT_STATUS.COMPLETED,
      searchMode: 'search-project-name',
      word: '',
      currentProjectSetID: 'set-current',
      selectedProjectSetIDs: ['set-current', 'set-other'],
    })).toEqual({
      page: 1,
      limit: 20,
      status: PROJECT_STATUS.COMPLETED,
      mode: 'search-project-name',
      projectSets: ['set-current'],
    });
  });

  test('sends worker names only when provided', () => {
    expect(buildTeamProjectSearchParams({
      page: 2,
      limit: 30,
      status: PROJECT_STATUS.NORMAL,
      searchMode: 'search-worker',
      searchRole: 'proofreader',
      word: 'Alice',
      currentProjectSetID: 'set-current',
      selectedProjectSetIDs: ['set-other'],
    })).toMatchObject({
      mode: 'search-worker',
      projectSets: ['set-other'],
      tag: 'proofreader',
      workerName: 'Alice',
    });
  });
});
