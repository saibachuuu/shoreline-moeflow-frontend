import { useEffect, useRef } from 'react';
import { postProjectHeartbeat, postProjectLeave } from '@/apis/project';

interface UseProjectHeartbeatOptions {
  enabled?: boolean;
  action?: string;
  intervalMs?: number;
}

/**
 * 监听用户在项目内的活跃状态，定时发送工作心跳，并在离开时发送下线通知
 */
export function useProjectHeartbeat(
  projectID?: string | null,
  options: UseProjectHeartbeatOptions = {},
) {
  const {
    enabled = true,
    action = 'working',
    intervalMs = 15000,
  } = options;

  const actionRef = useRef(action);
  actionRef.current = action;

  useEffect(() => {
    if (!projectID || !enabled) {
      return;
    }

    const currentProjectID = projectID;

    // 发送单次心跳
    const sendHeartbeat = () => {
      // 只有当前页面可见时才上报心跳，避免切走页面长时间挂机误报为“正在工作”
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        return;
      }
      postProjectHeartbeat({
        projectID: currentProjectID,
        action: actionRef.current,
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
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        sendHeartbeat();
      }
    };
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    // 卸载或切换项目时发送离开通知
    return () => {
      clearInterval(timer);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
      postProjectLeave({
        projectID: currentProjectID,
      }).catch(() => {});
    };
  }, [projectID, enabled, intervalMs]);
}
