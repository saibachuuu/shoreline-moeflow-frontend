import { cancelled, put, takeLatest } from 'redux-saga/effects';
import { api, BasicSuccessResult } from '@/apis';
import { toLowerCamelCase } from '@/utils';
import { normalizeProjectStatus } from '@/constants';
import { getCancelToken } from '@/utils/api';
import {
  clearCurrentProject,
  setCurrentProject,
  setCurrentProjectSaga,
} from './slice';
import { Project } from '@/interfaces';

// worker Sage
function* setCurrentProjectWorker(
  action: ReturnType<typeof setCurrentProjectSaga>,
) {
  // 清空当前 project
  yield put(clearCurrentProject());
  // Project list entries are deliberately compact and must never be used as
  // the detail object for settings, preview or file pages.
  const [cancelToken, cancel] = getCancelToken();
  try {
    const result: BasicSuccessResult<Project> = yield api.project.getProject({
      id: action.payload.id,
      configs: { cancelToken },
    });
    const camelProject = toLowerCamelCase(result.data);
    camelProject.status = normalizeProjectStatus(camelProject.status);
    yield put(setCurrentProject(camelProject));
  } catch (error: any) {
    error.default();
  } finally {
    if (yield cancelled()) {
      cancel();
    }
  }
}

// watcher Saga
function* watcher() {
  yield takeLatest(setCurrentProjectSaga.type, setCurrentProjectWorker);
}

// root Saga
export default watcher;
