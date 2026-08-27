import { APIProjectMember } from '@/apis/project';
import { getMemberStatsPermissions, hasCompleteMemberVersions, memberSummarySignature } from '@/utils/memberStats';

const member = (version?: number): APIProjectMember => ({
  memberId: 'm1',
  projectId: 'p1',
  displayName: 'Alice',
  tags: ['translator'],
  status: 'active',
  version: version as number,
});

describe('MemberStats member version guard', () => {
  test('requires a non-empty complete member list before editing', () => {
    expect(hasCompleteMemberVersions([])).toBe(false);
    expect(hasCompleteMemberVersions([member()])).toBe(false);
    expect(hasCompleteMemberVersions([member(0), member(3)])).toBe(true);
  });

  test('rejects invalid runtime versions from compact card summaries', () => {
    expect(hasCompleteMemberVersions([member(-1)])).toBe(false);
    expect(hasCompleteMemberVersions([member(Number.NaN)])).toBe(false);
  });
});

describe('MemberStats permissions', () => {
  const project = (permissions: string[]) => ({
    groupType: 'project',
    effectivePermissions: permissions,
  } as any);

  test('opens for project members without granting management controls', () => {
    expect(getMemberStatsPermissions(project(['project:ACCESS']), 'NORMAL')).toEqual({
      canOpen: true,
      canManage: false,
    });
  });

  test('keeps management controls for managers', () => {
    expect(getMemberStatsPermissions(project(['project:ACCESS', 'project:MANAGE_MEMBERS']), 'NORMAL')).toEqual({
      canOpen: true,
      canManage: true,
    });
  });

  test('does not expose write actions for finished projects', () => {
    expect(getMemberStatsPermissions(project(['project:ACCESS', 'project:MANAGE_MEMBERS']), 'COMPLETED')).toEqual({
      canOpen: false,
      canManage: false,
    });
  });
});

describe('MemberStats member summary sync signature', () => {
  // Regression: the summary sync effect is keyed on this signature instead of
  // the raw array reference.  A caller passing a fresh array every render (an
  // undefined memberSummary falls back to the `members = []` default, a new
  // instance per render) would otherwise retrigger the effect forever and
  // freeze the page.
  test('identical summaries share one signature, including repeated empty arrays', () => {
    expect(memberSummarySignature([])).toBe('');
    expect(memberSummarySignature([])).toBe(memberSummarySignature([]));
    expect(memberSummarySignature([member(0)])).toBe(memberSummarySignature([member(0)]));
  });

  test('content changes produce a different signature', () => {
    expect(memberSummarySignature([member(0)])).not.toBe(memberSummarySignature([]));
    const other = { ...member(0), memberId: 'm2', displayName: 'Bob' };
    expect(memberSummarySignature([member(0)])).not.toBe(memberSummarySignature([other]));
  });
});
