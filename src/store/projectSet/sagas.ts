import { cancelled, put, takeLatest } from 'redux-saga/effects';
import { api, BasicSuccessResult } from '@/apis';
import { toLowerCamelCase } from '@/utils';
import { getCancelToken } from '@/utils/api';
import {
  clearCurrentProjectSet,
  setCurrentProjectSet,
  setCurrentProjectSetSaga,
} from './slice';
import { UserProjectSet } from '@/interfaces';

// worker Sage
function* setCurrentProjectSetWorker(
  action: ReturnType<typeof setCurrentProjectSetSaga>,
) {
  // 清空当前 projectSet
  yield put(clearCurrentProjectSet());
  // Project-set list entries contain only navigation fields. Settings must
  // load the detail representation explicitly.
  const [cancelToken, cancel] = getCancelToken();
  try {
    const result: BasicSuccessResult<UserProjectSet> =
      yield api.projectSet.getProjectSet({
        id: action.payload.id,
        configs: { cancelToken },
      });
    yield put(setCurrentProjectSet(toLowerCamelCase(result.data)));
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
  yield takeLatest(setCurrentProjectSetSaga.type, setCurrentProjectSetWorker);
}

// root Saga
export default watcher;
