import { ProjectMemberChange } from '@/apis/member';

export interface ProjectMemberDraft {
  id?: string;
  userId?: string | null;
  externalId?: string | null;
  displayName: string;
  tags: string[];
  status: 'active' | 'invited' | 'removed';
  version?: number;
  isOwner?: boolean;
}

/**
 * Project worker tags are backed by the target user's team qualifications.
 * External identities do not have a team qualification requirement.
 */
export const canAssignProjectWorkerTag = (
  member: Pick<ProjectMemberDraft, 'userId'> & { workerQualifications?: string[]; privilegedSelf?: boolean },
  tag: string,
  qualificationMode: 'qualified' | 'open' = 'qualified',
): boolean => (
  !member.userId ||
  member.privilegedSelf === true ||
  qualificationMode === 'open' ||
  Boolean(member.workerQualifications?.includes(tag))
);

const subjectKey = (member: ProjectMemberDraft): string =>
  member.id ||
  (member.userId ? `user:${member.userId}` : `external:${member.externalId || member.displayName}`);

/**
 * Primary name shown on a project-member card: the registered user's site
 * name wins over the per-project display alias, so members who share a
 * ``displayName`` can still be told apart.  External members (no user)
 * fall back to their display alias.
 */
export const projectMemberPrimaryName = (
  member: { user?: { name?: string } | null; displayName?: string },
): string => member.user?.name || member.displayName || '';

/**
 * Stable idempotency key for a project-member operation.
 *
 * The backend deduplicates and replays operations by (project, operation_id),
 * and derives a new external member's stable external_id from it.  A key that
 * embeds Date.now()/uuid changes on retry, so a network retry of the same
 * save would create a duplicate external member -- keep the key a pure
 * function of (project, subject, action) instead.
 *
 * The key also fingerprints the operation payload (``content``): two different
 * updates to the same member (e.g. adding a second worker tag) are distinct
 * operations and must NOT share an id, or the backend idempotency layer would
 * treat the second save as a replay and silently keep the first result.
 * A retry of the identical payload still produces the identical id and is
 * replayed safely.
 */
export const projectMemberOperationId = (
  projectId: string,
  member: ProjectMemberDraft,
  action: 'add' | 'update',
  content?: { tags?: string[]; displayName?: string; status?: string },
): string => {
  const base = `${projectId}-${action}-${subjectKey(member)}`;
  if (!content) return base;
  const fingerprint = [
    content.tags ? normalizeTags(content.tags).join(',') : '',
    content.displayName || '',
    content.status || '',
  ]
    .map((part) => encodeURIComponent(part))
    .join('|');
  return `${base}-${fingerprint}`;
};

const normalizeTags = (tags: string[]) => [...new Set(tags)].sort();

/**
 * ASCII-safe form of an operation id for use as an HTTP header value.
 *
 * ``operation_id`` may carry non-ASCII characters (an external member's
 * subject key is ``external:<display name>``, e.g. a Chinese alias), but HTTP
 * headers only allow ISO-8859-1 data, so browsers throw when a request
 * header value contains Chinese characters and the request never leaves the
 * page.  The unstable symbol stays unchanged inside the JSON body (the
 * backend stores and replays it verbatim); only the header copy is
 * percent-encoded.  The backend uses this header merely as a request id.
 */
export const projectMemberIdempotencyHeader = (operationId: string): string => encodeURIComponent(operationId);

export const diffProjectMembers = (
  original: ProjectMemberDraft[],
  draft: ProjectMemberDraft[],
  operationId: (
    member: ProjectMemberDraft,
    action: 'add' | 'update',
    content?: { tags?: string[]; displayName?: string; status?: string },
  ) => string,
): ProjectMemberChange[] => {
  const before = new Map(original.map((member) => [subjectKey(member), member]));
  const after = new Map(draft.map((member) => [subjectKey(member), member]));
  const operations: ProjectMemberChange[] = [];

  after.forEach((member, key) => {
    const previous = before.get(key);
    if (!previous || !previous.id) {
      if (member.status !== 'removed') {
        operations.push({
          operationId: operationId(member, 'add', {
            tags: member.tags,
            displayName: member.displayName,
            status: member.status,
          }),
          action: 'add',
          userId: member.userId || undefined,
          displayName: member.displayName,
          tags: normalizeTags(member.tags),
        });
      }
      return;
    }
    if (previous.status === 'removed' && member.status !== 'removed') {
      operations.push({
        operationId: operationId(member, 'add', {
          tags: member.tags,
          displayName: member.displayName,
          status: member.status,
        }),
        action: 'add',
        memberId: member.id,
        userId: member.userId || undefined,
        displayName: member.displayName,
        tags: normalizeTags(member.tags),
        expectedMemberVersion: member.version ?? previous.version,
      });
      return;
    }
    const tagsChanged =
      JSON.stringify(normalizeTags(previous.tags)) !==
      JSON.stringify(normalizeTags(member.tags));
    const displayNameChanged = previous.displayName !== member.displayName;
    const removed = member.status === 'removed' && previous.status !== 'removed';
    if (tagsChanged || displayNameChanged || removed) {
      const changes = {
        ...(tagsChanged ? { tags: normalizeTags(member.tags) } : {}),
        ...(displayNameChanged ? { displayName: member.displayName } : {}),
        ...(removed ? { status: 'removed' as const } : {}),
      };
      operations.push({
        operationId: operationId(member, 'update', changes),
        action: 'update',
        memberId: member.id,
        expectedMemberVersion: member.version ?? previous.version,
        changes,
      });
    }
  });

  before.forEach((member, key) => {
    if (!after.has(key) && member.id && member.status !== 'removed') {
      operations.push({
        operationId: operationId(member, 'update', { status: 'removed' }),
        action: 'update',
        memberId: member.id,
        expectedMemberVersion: member.version,
        changes: { status: 'removed' },
      });
    }
  });

  return operations;
};

export const mergeMemberTag = (
  members: ProjectMemberDraft[],
  identity: Pick<ProjectMemberDraft, 'id' | 'userId' | 'externalId' | 'displayName'>,
  tag: string,
): ProjectMemberDraft[] => {
  const key = subjectKey(identity as ProjectMemberDraft);
  const index = members.findIndex((member) => subjectKey(member) === key);
  if (index < 0) {
    return [
      ...members,
      {
        ...identity,
        displayName: identity.displayName,
        tags: [tag],
        status: 'active',
      },
    ];
  }
  return members.map((member, memberIndex) =>
    memberIndex === index
      ? {
          ...member,
          // Never promote an invited member to active here: assignment is a
          // tag change, not an invitation acceptance.  The backend keeps the
          // member invited until the invitation is accepted; the draft must
          // match that instead of silently flipping state.
          status: member.status === 'invited' ? 'invited' : 'active',
          tags: normalizeTags([...member.tags, tag]),
        }
      : member,
  );
};

export const mergeMemberWithoutTags = (
  members: ProjectMemberDraft[],
  identity: Pick<ProjectMemberDraft, 'id' | 'userId' | 'externalId' | 'displayName'>,
): ProjectMemberDraft[] => {
  const key = subjectKey(identity as ProjectMemberDraft);
  const index = members.findIndex((member) => subjectKey(member) === key);
  if (index < 0) {
    return [...members, { ...identity, tags: [], status: 'active' }];
  }
  return members.map((member, memberIndex) =>
    memberIndex === index ? { ...member, status: 'active', tags: [] } : member,
  );
};

export const mergeExternalMemberTag = (
  members: ProjectMemberDraft[],
  displayName: string,
  tag: string,
): ProjectMemberDraft[] => {
  const value = displayName.trim();
  return value
    ? mergeMemberTag(members, { externalId: value, displayName: value }, tag)
    : members;
};

export const mergeExternalMemberWithoutTags = (
  members: ProjectMemberDraft[],
  displayName: string,
): ProjectMemberDraft[] => {
  const value = displayName.trim();
  return value
    ? mergeMemberWithoutTags(members, { externalId: value, displayName: value })
    : members;
};

export const canEditProjectMemberInQuickMenu = (
  member: Pick<ProjectMemberDraft, 'userId'>,
  currentUserId: string,
  canManageMembers: boolean,
): boolean => canManageMembers || member.userId === currentUserId;

export const canLeaveProjectFromQuickMenu = (
  member: Pick<ProjectMemberDraft, 'status' | 'userId' | 'isOwner'> | undefined,
  currentUserId: string,
): boolean => Boolean(
  member &&
  member.status === 'active' &&
  member.userId === currentUserId &&
  !member.isOwner,
);

/**
 * Display label for an existing project member in member-management UIs:
 * the per-project display name leads, and when it differs from the
 * registered site username the username follows in parentheses so members
 * who share a display alias can still be told apart.  External members
 * (no registered ``user``) show only their display name.
 */
export const projectMemberDisplayLabel = (
  member: { displayName?: string; user?: { name?: string } | null },
): { main: string; note: string } => {
  const main = member.displayName || member.user?.name || '';
  const note = member.user?.name && member.user.name !== main ? member.user.name : '';
  return { main, note };
};

/**
 * Text normalization matching the backend member search
 * (``normalize_search_text``: NFC + trim + casefold).
 */
export const normalizeSearchText = (value: string): string =>
  value.normalize('NFC').trim().toLowerCase();

/**
 * Label for an add-member search result: a query that matched the
 * registered username shows only the username; a query that matched an
 * alias shows the username followed by the matching alias(es).
 */
export const teamSearchResultLabel = (
  name: string,
  aliases: string[],
  word: string,
): { main: string; aliases: string[] } => {
  const needle = word ? normalizeSearchText(word) : '';
  if (!needle) return { main: name, aliases: [] };
  if (normalizeSearchText(name).includes(needle)) {
    return { main: name, aliases: [] };
  }
  const matched = (aliases || []).filter(
    (alias) => normalizeSearchText(alias).includes(needle),
  );
  return { main: name, aliases: matched };
};
