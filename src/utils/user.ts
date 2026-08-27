import { Project, Team } from '@/interfaces';

/** 团队基础标签对应的基础权限（与后端 TEAM_BASE_PERMISSIONS 保持一致）。 */
const TEAM_BASE_PERMISSIONS: Record<'creator' | 'admin' | 'member', string[]> = {
  creator: [
    'team:ACCESS', 'team:DELETE', 'team:CHANGE', 'team:CREATE_ROLE',
    'team:DELETE_ROLE', 'team:CHECK_USER', 'team:INVITE_USER',
    'team:DELETE_USER', 'team:CHANGE_USER_ROLE', 'team:CHANGE_USER_REMARK',
    'team:CREATE_TERM_BANK', 'team:ACCESS_TERM_BANK', 'team:CHANGE_TERM_BANK',
    'team:DELETE_TERM_BANK', 'team:CREATE_TERM', 'team:CHANGE_TERM',
    'team:DELETE_TERM', 'team:CREATE_PROJECT', 'team:CREATE_PROJECT_SET',
    'team:CHANGE_PROJECT_SET', 'team:DELETE_PROJECT_SET', 'team:USE_OCR_QUOTA',
    'team:USE_MT_QUOTA', 'team:INSIGHT',
  ],
  admin: [
    'team:ACCESS', 'team:CHANGE', 'team:CREATE_ROLE', 'team:DELETE_ROLE',
    'team:CHECK_USER', 'team:INVITE_USER', 'team:DELETE_USER',
    'team:CHANGE_USER_ROLE', 'team:CHANGE_USER_REMARK', 'team:CREATE_TERM_BANK',
    'team:ACCESS_TERM_BANK', 'team:CHANGE_TERM_BANK', 'team:DELETE_TERM_BANK',
    'team:CREATE_TERM', 'team:CHANGE_TERM', 'team:DELETE_TERM',
    'team:CREATE_PROJECT', 'team:CREATE_PROJECT_SET', 'team:CHANGE_PROJECT_SET',
    'team:DELETE_PROJECT_SET', 'team:USE_OCR_QUOTA', 'team:USE_MT_QUOTA',
    'team:INSIGHT',
  ],
  member: ['team:ACCESS'],
};

/**
 * 测试用户是否有某些权限
 * @param group
 * @param permission
 */
export const can = (
  group: Team | Project | undefined,
  permission: string,
): boolean => {
  if (!group) return false;
  const code = permission.includes(':')
    ? permission
    : `${group.groupType}:${permission}`;
  if (Array.isArray(group.effectivePermissions) && group.effectivePermissions.length) {
    return group.effectivePermissions.includes(code);
  }
  // 团队列表/缓存可能不含 effectivePermissions；按身份基础标签回退到后端基础权限，
  // 避免 creator/admin 因权限字段未填充而丢失团队基础权限（如创建项目）。
  if (group.groupType === 'team' && group.baseTag && code.startsWith('team:')) {
    return TEAM_BASE_PERMISSIONS[group.baseTag]?.includes(code) ?? false;
  }
  return false;
};

/** New identity responses expose membership through baseTag or permissions. */
export const hasIdentityMembership = (group: any): boolean => Boolean(
  group && (
    group.joined === true ||
    Boolean(group.baseTag) ||
    (Array.isArray(group.effectivePermissions) && group.effectivePermissions.length > 0)
  ),
);
