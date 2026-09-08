import { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector, useStore } from 'react-redux';
import {
  ActivePresenceUser,
  postProjectHeartbeat,
  postProjectLeave,
} from '@/apis/project';
import { AppState } from '@/store';
import {
  registerLocalProjectPresence,
  unregisterLocalProjectPresence,
} from '@/store/presence/slice';
import { mergeProjectPresence } from '@/utils/projectPresence';

interface UseProjectHeartbeatOptions {
  enabled?: boolean;
  action?: string;
  intervalMs?: number;
}

/** 每个 hook 实例（窗口）的唯一 ID 序号 */
let presenceInstanceSeq = 0;

/**
 * 监听用户在项目内的活跃状态。
 *
 * 进入/离开窗口时会**立即**在前端本地更新自己的编辑状态（不等服务器轮询），
 * 同时照常发送心跳/下线通知。同一项目可能有多个窗口同时打开（例如项目设置
 * 与成员编辑弹窗），每个窗口注册一个实例 ID：只要还有窗口在编辑，编辑状态
 * 就一直激活，只有全部窗口关闭后才通知服务器下线。
 *
 * 返回的 `presence` 已合并「本地自己 + 服务器其他人」。
 */
export function useProjectHeartbeat(
  projectID?: string | null,
  options: UseProjectHeartbeatOptions = {},
) {
  const { enabled = true, action = 'working', intervalMs = 15000 } = options;

  const dispatch = useDispatch();
  const store = useStore<AppState>();
  const currentUser = useSelector((state: AppState) => state.user);
  const [serverUsers, setServerUsers] = useState<ActivePresenceUser[]>([]);

  const actionRef = useRef(action);
  actionRef.current = action;

  // 每个窗口一个唯一实例 ID，用于同一项目多窗口的引用计数
  const instanceIdRef = useRef<string>('');
  if (!instanceIdRef.current) {
    instanceIdRef.current = `presence-instance-${++presenceInstanceSeq}`;
  }
  const instanceId = instanceIdRef.current;

  // 打开窗口：注册自己的编辑状态；关闭窗口：注销自己。
  useEffect(() => {
    if (!projectID || !enabled) {
      return;
    }
    const currentProjectID = projectID;
    dispatch(
      registerLocalProjectPresence({
        projectId: currentProjectID,
        instanceId,
        action: actionRef.current,
      }),
    );
    return () => {
      dispatch(
        unregisterLocalProjectPresence({
          projectId: currentProjectID,
          instanceId,
        }),
      );
      // 仅当该项目已无任何窗口在编辑时，才通知服务器下线
      const remaining = store.getState().presence.entries[currentProjectID];
      if (!remaining || Object.keys(remaining).length === 0) {
        postProjectLeave({
          projectID: currentProjectID,
        }).catch(() => {});
      }
    };
  }, [projectID, enabled, instanceId, dispatch, store]);

  // action 变化（例如设置页切换 tab）时，本地状态立即跟随变化。
  useEffect(() => {
    if (!projectID || !enabled) {
      return;
    }
    dispatch(
      registerLocalProjectPresence({
        projectId: projectID,
        instanceId,
        action,
      }),
    );
  }, [projectID, enabled, instanceId, action, dispatch]);

  // 定时上报心跳，并同步服务器返回的活跃人员（用于展示其他人）。
  useEffect(() => {
    if (!projectID || !enabled) {
      return;
    }

    const currentProjectID = projectID;

    // 切换项目时先清空旧数据，避免短暂显示上一个项目的活跃人员
    setServerUsers([]);

    // 发送单次心跳
    const sendHeartbeat = () => {
      // 只有当前页面可见时才上报心跳，避免切走页面长时间挂机误报为“正在工作”
      if (
        typeof document !== 'undefined' &&
        document.visibilityState === 'hidden'
      ) {
        return;
      }
      postProjectHeartbeat({
        projectID: currentProjectID,
        action: actionRef.current,
      })
        .then((result) => {
          // 后端返回 snake_case（active_users），这里同时兼容 camelCase。
          const data = result.data as {
            activeUsers?: ActivePresenceUser[];
            active_users?: ActivePresenceUser[];
          };
          const users = data?.activeUsers || data?.active_users;
          setServerUsers(Array.isArray(users) ? users : []);
        })
        .catch(() => {
          // 忽略心跳网络微抖动
        });
    };

    // 立即上报首次心跳
    sendHeartbeat();

    // 定时器定时上报
    const timer = setInterval(sendHeartbeat, intervalMs);

    // 当用户切回窗口时，如果可见立即补发一次心跳
    const handleVisibilityChange = () => {
      if (
        typeof document !== 'undefined' &&
        document.visibilityState === 'visible'
      ) {
        sendHeartbeat();
      }
    };
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    return () => {
      clearInterval(timer);
      if (typeof document !== 'undefined') {
        document.removeEventListener(
          'visibilitychange',
          handleVisibilityChange,
        );
      }
    };
  }, [projectID, enabled, intervalMs]);

  const presence = useMemo(() => {
    if (!projectID || !enabled) {
      return { projectId: projectID || '', userCount: 0, users: [] };
    }
    return mergeProjectPresence(
      {
        projectId: projectID,
        userCount: serverUsers.length,
        users: serverUsers,
      },
      projectID,
      action,
      currentUser,
    );
  }, [projectID, enabled, serverUsers, action, currentUser]);

  return { activeUsers: presence.users, presence };
}
