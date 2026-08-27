import { cancelled, put, select, takeLatest } from 'redux-saga/effects';
import api from '../../apis';
import { toLowerCamelCase } from '../../utils';
import { getCancelToken } from '../../utils/api';
import {
  clearCurrentTeam,
  editTeam,
  setCurrentTeam,
  setCurrentTeamSaga,
} from './slice';
import { AppState } from '..';
import { UserTeam } from '../../interfaces';

/** Team list responses are not guaranteed to include viewer-specific fields. */
export const hasTeamIdentityDetails = (
  team: Pick<UserTeam, 'baseTag' | 'effectivePermissions'> & {
    ocrQuotaMonth?: number;
    archiveApiKeys?: unknown[];
  },
): boolean => Boolean(
  team.baseTag &&
  Array.isArray(team.effectivePermissions) &&
  team.effectivePermissions.length > 0 &&
  typeof team.ocrQuotaMonth === 'number' &&
  Array.isArray(team.archiveApiKeys),
);

// worker Sage
export function* setCurrentTeamWorker(
  action: ReturnType<typeof setCurrentTeamSaga>,
) {
  // 清空当前 team
  yield put(clearCurrentTeam());
  const teams = yield select((state: AppState) => state.team.teams);
  const team = teams.find((team: UserTeam) => team.id === action.payload.id);
  if (team && hasTeamIdentityDetails(team)) {
    // 缓存中已有查看者相关的身份字段，可以直接使用。
    yield put(setCurrentTeam(team));
  } else {
    // 列表接口刻意不包含设置字段，必须获取团队详情。
    const [cancelToken, cancel] = getCancelToken();
    try {
      const result = yield api.getTeam({
        id: action.payload.id,
        configs: { cancelToken },
      });
      const detailedTeam = toLowerCamelCase<UserTeam>(result.data);
      // 回写列表缓存，避免同一会话反复请求缺少身份字段的团队。
      yield put(editTeam(detailedTeam));
      yield put(setCurrentTeam(detailedTeam));
    } catch (error) {
      error.default();
    } finally {
      if (yield cancelled()) {
        cancel();
      }
    }
  }
}

// watcher Saga
function* watcher() {
  yield takeLatest(setCurrentTeamSaga.type, setCurrentTeamWorker);
}

// root Saga
export default watcher;
