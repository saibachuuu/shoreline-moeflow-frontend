/**
 * Member-management display ordering and self-identity guards.
 *
 * The member management page lists members as creator > admin > member and,
 * within the same base identity, by site user name (or display alias for
 * external members).
 */

export interface MemberIdentitySubject {
  tags?: string[];
  baseTag?: string;
  userId?: string | null;
  user?: { name?: string } | null;
  displayName?: string;
  isOwner?: boolean;
}

const IDENTITY_RANK: Record<string, number> = { creator: 0, admin: 1 };

/** System identity tags carried inside the project member ``tags`` array. */
export const PROJECT_IDENTITY_TAGS = ['creator', 'admin'] as const;

/** The base identity of a project member as derived from its tags. */
export const projectIdentityOf = (tags: string[] = []): string => {
  if (!Array.isArray(tags)) return 'member';
  if (tags.includes('creator')) return 'creator';
  if (tags.includes('admin')) return 'admin';
  return 'member';
};

/** Worker/job tags only — identity tags are excluded from the job select. */
export const projectJobTagsOf = (tags: string[] = []): string[] =>
  (tags || []).filter((tag) => !PROJECT_IDENTITY_TAGS.includes(tag as any));

/** Recombine an identity + job tags into the flat tags array sent to the API. */
export const mergeProjectIdentityTags = (identity: string, jobTags: string[]): string[] =>
  Array.from(
    new Set([
      ...(identity && identity !== 'member' ? [identity] : []),
      ...(jobTags || []),
    ]),
  );

/**
 * Preferred member when the member-management page first opens: the current
 * user themselves if listed, otherwise the project/team creator, otherwise the
 * first item.  Keeps the selection stable while the member data is unchanged.
 */
export const preferredDefaultMember = <T extends MemberIdentitySubject>(
  members: T[],
  currentUserId?: string,
  groupType?: 'project' | 'team',
): T | undefined => {
  if (!members.length) return undefined;
  if (currentUserId) {
    const self = members.find((member) => member.userId === currentUserId);
    if (self) return self;
  }
  const creator = members.find((member) =>
    groupType === 'team'
      ? member.baseTag === 'creator'
      : (member.tags || []).includes('creator') || member.isOwner,
  );
  return creator || members[0];
};

/** 0 = creator, 1 = admin, 2 = member (no base identity tag). */
export const memberIdentityRank = (member: MemberIdentitySubject): number => {
  if (member.tags && member.tags.some((tag) => tag === 'creator' || tag === 'admin')) {
    return IDENTITY_RANK[member.tags.find((tag) => tag === 'creator' || tag === 'admin')!] ?? 2;
  }
  if (member.baseTag) {
    return IDENTITY_RANK[member.baseTag] ?? 2;
  }
  return 2;
};

/** Sort name: registered members use their site user name, external ones the display alias. */
export const memberSortName = (member: MemberIdentitySubject): string =>
  member.user?.name || member.displayName || '';

/** Stable display sort: identity rank, then name, then subject id. */
export const sortMembersForDisplay = <T extends MemberIdentitySubject>(members: T[]): T[] =>
  [...members].sort((a, b) => {
    const rankDiff = memberIdentityRank(a) - memberIdentityRank(b);
    if (rankDiff !== 0) return rankDiff;
    const nameDiff = memberSortName(a).localeCompare(memberSortName(b));
    if (nameDiff !== 0) return nameDiff;
    return (a.userId || a.displayName || '').localeCompare(b.userId || b.displayName || '');
  });

/**
 * Identity tags (creator/admin) the current user holds on this member record.
 *
 * These are protected from self-demotion: the member-management editor must
 * not let the operator silently drop their own identity tag, neither via the
 * selected-tag close button (tagRender) nor by clicking the option inside the
 * dropdown panel (disabled option) — and the backend rejects the change too.
 */
export const ownIdentityTags = (
  member: MemberIdentitySubject,
  currentUserId?: string,
): string[] => {
  if (!currentUserId || !member.userId || member.userId !== currentUserId) return [];
  return (member.tags || []).filter((tag) =>
    PROJECT_IDENTITY_TAGS.includes(tag as any),
  );
};

/**
 * Identity tags a member would lose by saving ``draftTags``.
 *
 * A creator/admin must not silently demote themselves by removing their own
 * identity tag from the member-management editor; returns the identity tags
 * that would be dropped (empty for other members or non-identity tags).
 */
export const removedSelfIdentityTags = (
  member: MemberIdentitySubject,
  draftTags: string[],
  currentUserId?: string,
): string[] =>
  ownIdentityTags(member, currentUserId).filter((tag) => !draftTags.includes(tag));