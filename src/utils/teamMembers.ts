export type TeamBaseTag = 'creator' | 'admin' | 'member';

interface TeamMemberRestoreCandidate {
  status?: 'active' | 'removed';
  baseTag?: TeamBaseTag;
  userId?: string;
}

interface TeamMemberEditCandidate {
  status?: 'active' | 'removed';
  baseTag?: TeamBaseTag;
  userId?: string;
}

/** Match team-member write permissions used by TeamMemberService.update. */
export const canEditTeamMember = (
  operatorBaseTag: TeamBaseTag | undefined,
  member: TeamMemberEditCandidate | undefined,
  currentUserId?: string,
): boolean => {
  if (
    !member ||
    member.status !== 'active' ||
    (operatorBaseTag !== 'creator' && operatorBaseTag !== 'admin')
  ) {
    return false;
  }
  // Managers may update their own tags/qualifications; a plain member never
  // manages anyone, including themselves (own aliases go to the dedicated
  // aliases endpoint, self-removal to DELETE self).  Backend: a manager
  // passes _can_manage_target for self; a member fails the manager gate.
  if (member.userId === currentUserId) {
    return operatorBaseTag === 'creator' || operatorBaseTag === 'admin';
  }
  return operatorBaseTag === 'creator'
    ? member.baseTag !== 'creator'
    : member.baseTag === 'member';
};

/**
 * Frontend policy for base identity: only the team creator may change a
 * member's base identity, and never their own (the backend also rejects
 * operator == member.user for base_tag) nor another creator's.  Administrators
 * still edit tags/qualifications, but the base-identity selector is
 * creator-only so the UI never offers an edit the hierarchy blocks.
 */
export const canEditTeamMemberBaseTag = (
  operatorBaseTag: TeamBaseTag | undefined,
  member: TeamMemberEditCandidate | undefined,
  currentUserId?: string,
): boolean => Boolean(
  member?.status === 'active' &&
  operatorBaseTag === 'creator' &&
  member.baseTag !== 'creator' &&
  member.userId !== currentUserId,
);

/** Match the backend's rules for restoring a removed team member. */
export const canRestoreTeamMember = (
  operatorBaseTag: TeamBaseTag | undefined,
  member: TeamMemberRestoreCandidate | undefined,
): boolean => Boolean(
  member?.status === 'removed' &&
  member.userId &&
  (operatorBaseTag === 'creator'
    ? member.baseTag !== 'creator'
    : operatorBaseTag === 'admin' && member.baseTag === 'member'),
);
