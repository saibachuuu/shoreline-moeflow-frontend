import {
  memberIdentityRank,
  mergeProjectIdentityTags,
  ownIdentityTags,
  preferredDefaultMember,
  projectIdentityOf,
  projectJobTagsOf,
  removedSelfIdentityTags,
  sortMembersForDisplay,
} from './memberSort';

describe('memberIdentityRank', () => {
  test('ranks project members by their creator/admin identity tags', () => {
    expect(memberIdentityRank({ tags: ['creator'] })).toBe(0);
    expect(memberIdentityRank({ tags: ['translator', 'admin'] })).toBe(1);
    expect(memberIdentityRank({ tags: ['proofreader'] })).toBe(2);
    expect(memberIdentityRank({ tags: [] })).toBe(2);
    expect(memberIdentityRank({})).toBe(2);
  });

  test('ranks team members by their base tag', () => {
    expect(memberIdentityRank({ baseTag: 'creator' })).toBe(0);
    expect(memberIdentityRank({ baseTag: 'admin' })).toBe(1);
    expect(memberIdentityRank({ baseTag: 'member' })).toBe(2);
  });
});

describe('sortMembersForDisplay', () => {
  const projectMember = (userId: string, name: string, tags: string[]) => ({
    userId,
    user: { name },
    displayName: name,
    tags,
  });

  test('orders creator > admin > member', () => {
    const sorted = sortMembersForDisplay([
      projectMember('u-member', '成员甲', []),
      projectMember('u-admin', '管理员甲', ['admin']),
      projectMember('u-creator', '创建者甲', ['creator']),
    ]);
    expect(sorted.map((m) => m.userId)).toEqual(['u-creator', 'u-admin', 'u-member']);
  });

  test('orders team members by base tag then site name', () => {
    const sorted = sortMembersForDisplay([
      { userId: 'u3', user: { name: '成员丙' }, baseTag: 'member' },
      { userId: 'u2', user: { name: '管理员乙' }, baseTag: 'admin' },
      { userId: 'u1', user: { name: '创建者甲' }, baseTag: 'creator' },
      { userId: 'u4', user: { name: '成员甲' }, baseTag: 'member' },
    ]);
    expect(sorted.map((m) => m.userId)).toEqual(['u1', 'u2', 'u3', 'u4']);
  });

  test('sorts same-rank members by site name, falling back to display alias', () => {
    const sorted = sortMembersForDisplay([
      { userId: 'u-a', user: { name: 'Alice' }, displayName: 'AAA', tags: [] },
      { userId: 'u-b', user: null, displayName: 'Bob', tags: [] },
      { userId: 'u-c', user: { name: 'Carol' }, displayName: 'CCC', tags: [] },
    ]);
    expect(sorted.map((m) => m.userId)).toEqual(['u-a', 'u-b', 'u-c']);
  });

  test('does not mutate the input array', () => {
    const members = [projectMember('u1', '甲', [])];
    const sorted = sortMembersForDisplay(members);
    expect(sorted).not.toBe(members);
    expect(members).toHaveLength(1);
  });
});

describe('ownIdentityTags', () => {
  test('exposes the identity tags the current user holds on the member', () => {
    expect(ownIdentityTags({ userId: 'me', tags: ['creator', 'translator'] }, 'me')).toEqual(['creator']);
    expect(ownIdentityTags({ userId: 'me', tags: ['admin', 'proofreader'] }, 'me')).toEqual(['admin']);
    expect(ownIdentityTags({ userId: 'me', tags: ['creator', 'admin'] }, 'me')).toEqual(['creator', 'admin']);
  });

  test('is empty for other members, unknown users and non-identity tags', () => {
    expect(ownIdentityTags({ userId: 'other', tags: ['admin'] }, 'me')).toEqual([]);
    expect(ownIdentityTags({ userId: 'me', tags: ['translator'] }, 'me')).toEqual([]);
    expect(ownIdentityTags({ userId: 'me', tags: ['admin'] }, undefined)).toEqual([]);
  });
});

describe('project identity / job tags split', () => {
  test('derives the base identity from the tags array', () => {
    expect(projectIdentityOf(['creator', 'translator'])).toBe('creator');
    expect(projectIdentityOf(['admin', 'proofreader'])).toBe('admin');
    expect(projectIdentityOf(['translator'])).toBe('member');
    expect(projectIdentityOf([])).toBe('member');
    expect(projectIdentityOf()).toBe('member');
  });

  test('keeps only job tags when splitting identity tags out', () => {
    expect(projectJobTagsOf(['creator', 'admin', 'translator', 'proofreader'])).toEqual(['translator', 'proofreader']);
    expect(projectJobTagsOf(['translator'])).toEqual(['translator']);
    expect(projectJobTagsOf([])).toEqual([]);
  });

  test('merges identity + job tags back into a flat, de-duplicated tags array', () => {
    expect(mergeProjectIdentityTags('admin', ['translator', 'proofreader'])).toEqual(['admin', 'translator', 'proofreader']);
    expect(mergeProjectIdentityTags('member', ['translator'])).toEqual(['translator']);
    expect(mergeProjectIdentityTags('creator', [])).toEqual(['creator']);
    expect(mergeProjectIdentityTags('admin', ['admin', 'translator'])).toEqual(['admin', 'translator']);
  });

  test('round-trips through the split/merge helpers without losing tags', () => {
    const tags = ['admin', 'translator', 'proofreader'];
    expect(mergeProjectIdentityTags(projectIdentityOf(tags), projectJobTagsOf(tags))).toEqual(tags);
  });
});

describe('preferredDefaultMember', () => {
  const projectMember = (userId: string | null, tags: string[], extra: any = {}) => ({
    userId,
    user: userId ? { name: userId } : null,
    displayName: userId || '外部成员',
    tags,
    ...extra,
  });

  test('prefers the current user themselves in a project list', () => {
    const members = [
      projectMember('u-creator', ['creator']),
      projectMember('u-me', []),
      projectMember(null, []),
    ];
    expect(preferredDefaultMember(members, 'u-me', 'project')?.userId).toBe('u-me');
  });

  test('falls back to the project creator, then the first member', () => {
    const members = [projectMember('u-a', []), projectMember('u-admin', ['admin']), projectMember('u-owner', ['creator'])];
    expect(preferredDefaultMember(members, 'u-absent', 'project')?.userId).toBe('u-owner');
    const withoutCreator = [projectMember('u-a', []), projectMember('u-b', [])];
    expect(preferredDefaultMember(withoutCreator, 'u-absent', 'project')?.userId).toBe('u-a');
    expect(preferredDefaultMember(withoutCreator, undefined, 'project')?.userId).toBe('u-a');
  });

  test('uses isOwner as a creator marker when tags are unavailable', () => {
    const members = [{ userId: 'u-owner', isOwner: true }, { userId: 'u-b' }];
    expect(preferredDefaultMember(members, 'u-absent', 'project')?.userId).toBe('u-owner');
  });

  test('prefers self and then the team creator for team lists', () => {
    const members = [
      { userId: 'u-admin', baseTag: 'admin' as const },
      { userId: 'u-creator', baseTag: 'creator' as const },
      { userId: 'u-me', baseTag: 'member' as const },
    ];
    expect(preferredDefaultMember(members, 'u-me', 'team')?.userId).toBe('u-me');
    expect(preferredDefaultMember(members, 'u-someone', 'team')?.userId).toBe('u-creator');
  });

  test('returns undefined for an empty list', () => {
    expect(preferredDefaultMember([], 'u-me', 'project')).toBeUndefined();
  });
});

describe('removedSelfIdentityTags', () => {
  test('flags a creator dropping their own creator tag', () => {
    expect(removedSelfIdentityTags(
      { userId: 'me', tags: ['creator', 'translator'] },
      ['translator'],
      'me',
    )).toEqual(['creator']);
  });

  test('flags an admin dropping their own admin tag', () => {
    expect(removedSelfIdentityTags(
      { userId: 'me', tags: ['admin', 'proofreader'] },
      ['proofreader'],
      'me',
    )).toEqual(['admin']);
  });

  test('allows editing another member or leaving the identity tag in place', () => {
    expect(removedSelfIdentityTags(
      { userId: 'other', tags: ['admin'] },
      [],
      'me',
    )).toEqual([]);
    expect(removedSelfIdentityTags(
      { userId: 'me', tags: ['creator'] },
      ['creator', 'translator'],
      'me',
    )).toEqual([]);
    expect(removedSelfIdentityTags(
      { userId: 'me', tags: ['translator'] },
      [],
      'me',
    )).toEqual([]);
  });
});