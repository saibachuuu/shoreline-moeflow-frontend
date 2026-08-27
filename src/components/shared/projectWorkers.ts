import style from '@/style';

// Same palette as the member-status Tag in MemberList (active green / invited orange).
export const PROJECT_WORKER_ACTIVE_COLOR = '#52c41a';
export const PROJECT_WORKER_INVITED_COLOR = '#fa8c16';

export const getProjectWorkerIconColor = (
  members: Array<{ tags: string[]; status: string }> = [],
  role: string,
) => {
  if (
    members.some(
      (member) => member.status === 'active' && member.tags.includes(role),
    )
  ) {
    return PROJECT_WORKER_ACTIVE_COLOR;
  }
  if (
    members.some(
      (member) => member.status === 'invited' && member.tags.includes(role),
    )
  ) {
    return PROJECT_WORKER_INVITED_COLOR;
  }
  return style.textColorSecondaryLighter;
};
