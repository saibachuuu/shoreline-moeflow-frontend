import { APIProjectMember } from '@/apis/project';
import { PROJECT_PERMISSION, PROJECT_STATUS, normalizeProjectStatus } from '@/constants';
import { Project } from '@/interfaces';
import { can } from '@/utils/user';

export const hasCompleteMemberVersions = (members: APIProjectMember[]): boolean =>
  members.length > 0 && members.every((member) => Number.isInteger(member.version) && member.version >= 0);

/**
 * Stable identity for a member-summary array.  Identical content — including
 * repeated empty arrays created by default prop values — yields the same
 * signature, so effects keyed on it never re-run just because a caller passed
 * a fresh array instance.  Keying an effect on the raw array reference would
 * loop the render whenever the prop is undefined (default ``[]``) or rebuilt.
 */
export const memberSummarySignature = (
  members: Array<{
    memberId?: string;
    id?: string;
    userId?: string | null;
    displayName?: string;
  }>,
): string =>
  members
    .map((member) => member.memberId || member.id || member.userId || member.displayName || '')
    .join(',');

export const getMemberStatsPermissions = (project: Project, status: unknown) => {
  const isNormal = normalizeProjectStatus(status) === PROJECT_STATUS.NORMAL;
  return {
    canOpen: isNormal && can(project, PROJECT_PERMISSION.ACCESS),
    canManage: isNormal && can(project, PROJECT_PERMISSION.MANAGE_MEMBERS),
  };
};
