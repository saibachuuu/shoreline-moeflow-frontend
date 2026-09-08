import { createSlice, PayloadAction } from '@reduxjs/toolkit';

/**
 * 本地用户在各项目中的手动编辑状态。
 *
 * 同一个项目可能被多个窗口同时编辑（例如先打开项目设置，再打开成员编辑弹窗），
 * 因此每个窗口注册一个 instanceId，只有该项目的全部窗口都离开后才屏蔽自己。
 *
 * `entries[projectId]`：
 * - 有内容：至少一个窗口正在编辑，取最近注册的 action 展示；
 * - 空对象：曾经编辑过、现在全部窗口都离开，需要在前端立即屏蔽服务器返回的自己；
 * - 不存在：从未手动记录过，保留服务器返回的状态。
 */
export interface PresenceState {
  entries: Record<string, Record<string, string>>;
}

export const initialState: PresenceState = {
  entries: {},
};

const slice = createSlice({
  name: 'presence',
  initialState,
  reducers: {
    /** 打开窗口：注册当前窗口的编辑状态 */
    registerLocalProjectPresence(
      state,
      action: PayloadAction<{
        projectId: string;
        instanceId: string;
        action: string;
      }>,
    ) {
      const { projectId, instanceId } = action.payload;
      if (!state.entries[projectId]) {
        state.entries[projectId] = {};
      }
      state.entries[projectId][instanceId] = action.payload.action;
    },
    /** 离开窗口：注销当前窗口；若该项目还有其他窗口，编辑状态继续保留 */
    unregisterLocalProjectPresence(
      state,
      action: PayloadAction<{ projectId: string; instanceId: string }>,
    ) {
      const { projectId, instanceId } = action.payload;
      const projectEntries = state.entries[projectId];
      if (projectEntries) {
        delete projectEntries[instanceId];
      }
    },
  },
});

export const { registerLocalProjectPresence, unregisterLocalProjectPresence } =
  slice.actions;
export default slice.reducer;
