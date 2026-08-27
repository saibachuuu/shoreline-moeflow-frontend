jest.mock('../../apis', () => ({
  __esModule: true,
  default: {
    getTeam: jest.fn(),
  },
}));

jest.mock('../../utils/api', () => ({
  getCancelToken: () => [undefined, jest.fn()],
}));

import { put } from 'redux-saga/effects';
import api from '../../apis';
import { UserTeam } from '../../interfaces';
import { clearCurrentTeam, editTeam, setCurrentTeam, setCurrentTeamSaga } from './slice';
import { hasTeamIdentityDetails, setCurrentTeamWorker } from './sagas';

const getTeam = api.getTeam as jest.Mock;

describe('team selection saga', () => {
  beforeEach(() => {
    getTeam.mockReset();
  });

  test('recognizes viewer-specific team details', () => {
    expect(hasTeamIdentityDetails({
      baseTag: 'member',
      effectivePermissions: ['team:ACCESS'],
      ocrQuotaMonth: 0,
      archiveApiKeys: [],
    })).toBe(true);
    expect(hasTeamIdentityDetails({ baseTag: 'member', effectivePermissions: [] })).toBe(false);
    expect(hasTeamIdentityDetails({ baseTag: 'member' })).toBe(false);
    expect(hasTeamIdentityDetails({ effectivePermissions: [] })).toBe(false);
  });

  test('uses a complete cached team without requesting details', () => {
    const team = {
      id: 'team-1',
      baseTag: 'member' as const,
      effectivePermissions: ['team:ACCESS'],
      ocrQuotaMonth: 0,
      archiveApiKeys: [],
    };
    const worker = setCurrentTeamWorker(setCurrentTeamSaga({ id: team.id }));

    expect(worker.next().value).toEqual(put(clearCurrentTeam()));
    expect(worker.next().value).toMatchObject({ type: 'SELECT' });
    expect(worker.next([team]).value).toEqual(put(setCurrentTeam(team as unknown as UserTeam)));
    expect(worker.next().done).toBe(true);
    expect(getTeam).not.toHaveBeenCalled();
  });

  test('refreshes a cached team whose permission list is empty', () => {
    const cachedTeam = {
      id: 'team-1',
      baseTag: 'admin' as const,
      effectivePermissions: [],
    };
    const detailedTeam = {
      id: 'team-1',
      baseTag: 'admin',
      effective_permissions: ['team:ACCESS', 'team:CREATE_PROJECT_SET'],
    };
    const expectedTeam = {
      id: 'team-1',
      baseTag: 'admin',
      effectivePermissions: ['team:ACCESS', 'team:CREATE_PROJECT_SET'],
    };
    getTeam.mockResolvedValue({ data: detailedTeam });
    const worker = setCurrentTeamWorker(setCurrentTeamSaga({ id: cachedTeam.id }));

    worker.next();
    worker.next();
    const request = worker.next([cachedTeam]).value;
    expect(getTeam).toHaveBeenCalledWith({
      id: cachedTeam.id,
      configs: { cancelToken: undefined },
    });
    expect(request).toEqual(expect.any(Promise));
    expect(worker.next({ data: detailedTeam }).value).toEqual(put(editTeam(expectedTeam as unknown as UserTeam)));
    expect(worker.next().value).toEqual(put(setCurrentTeam(expectedTeam as unknown as UserTeam)));
  });

  test('refreshes an incomplete cached team and updates the cache', () => {
    const cachedTeam = { id: 'team-1' };
    const detailedTeam = {
      id: 'team-1',
      baseTag: 'admin',
      effective_permissions: ['team:ACCESS'],
    };
    const expectedTeam = {
      id: 'team-1',
      baseTag: 'admin',
      effectivePermissions: ['team:ACCESS'],
    };
    getTeam.mockResolvedValue({ data: detailedTeam });
    const worker = setCurrentTeamWorker(setCurrentTeamSaga({ id: cachedTeam.id }));

    worker.next();
    worker.next();
    const request = worker.next([cachedTeam]).value;
    expect(getTeam).toHaveBeenCalledWith({
      id: cachedTeam.id,
      configs: { cancelToken: undefined },
    });
    expect(request).toEqual(expect.any(Promise));
    expect(worker.next({ data: detailedTeam }).value).toEqual(put(editTeam(expectedTeam as unknown as UserTeam)));
    expect(worker.next().value).toEqual(put(setCurrentTeam(expectedTeam as unknown as UserTeam)));
  });
});
