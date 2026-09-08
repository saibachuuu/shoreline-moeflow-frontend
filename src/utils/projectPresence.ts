import { ActivePresenceUser, ProjectActivePresence } from '@/apis/project';

interface LocalPresenceUser {
  id: string;
  name: string;
  avatar?: string;
}

/**
 * 从本地注册表中解析某个项目当前应展示的 action。
 *
 * - 返回 string：至少一个窗口正在编辑，取最近注册的 action；
 * - 返回 null：曾经编辑过、现在全部窗口都离开，需屏蔽服务器返回的自己；
 * - 返回 undefined：从未手动记录，保留服务器数据。
 */
export const resolveLocalAction = (
  entries: Record<string, Record<string, string>> | undefined,
  projectId: string,
): string | null | undefined => {
  if (!entries || !Object.prototype.hasOwnProperty.call(entries, projectId)) {
    return undefined;
  }
  const actions = Object.values(entries[projectId]);
  return actions.length > 0 ? actions[actions.length - 1] : null;
};

/**
 * 把「本地手动编辑状态」与「服务器返回的活跃状态」合并成最终展示用的 presence。
 *
 * - `localAction` 为字符串：自己正在编辑，用本地 action 覆盖服务器里的自己并置顶；
 * - `localAction` 为 null：自己刚离开窗口，屏蔽服务器里的自己（可能有延迟），
 *   但保留其他人，因此若还有他人在编辑，徽章视觉样式不变、只改文字；
 * - `localAction` 为 undefined：从未手动记录，原样保留服务器数据。
 */
export const mergeProjectPresence = (
  serverPresence: ProjectActivePresence | null | undefined,
  projectId: string,
  localAction: string | null | undefined,
  currentUser: LocalPresenceUser | null | undefined,
): ProjectActivePresence => {
  const serverUsers = serverPresence?.users || [];
  const userId = currentUser?.id;

  let users: ActivePresenceUser[] = serverUsers;
  if (userId && localAction === null) {
    // 已手动离开：屏蔽服务器数据中的自己
    users = serverUsers.filter((user) => user.id !== userId);
  } else if (userId && typeof localAction === 'string') {
    // 正在编辑：本地 action 覆盖自己，并放到首位
    users = [
      {
        id: userId,
        name: currentUser?.name || '',
        avatar: currentUser?.avatar,
        action: localAction,
      },
      ...serverUsers.filter((user) => user.id !== userId),
    ];
  }

  return {
    projectId: serverPresence?.projectId || projectId,
    userCount: users.length,
    users,
  };
};
