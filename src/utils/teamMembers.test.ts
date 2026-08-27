import {
  canEditTeamMember,
  canEditTeamMemberBaseTag,
  canRestoreTeamMember,
} from './teamMembers';

const removed = (baseTag: 'creator' | 'admin' | 'member') => ({
  status: 'removed' as const,
  baseTag,
  userId: 'user-1',
});

describe('team member restore permissions', () => {
  test('creator can restore removed admins and members', () => {
    expect(canRestoreTeamMember('creator', removed('admin'))).toBe(true);
    expect(canRestoreTeamMember('creator', removed('member'))).toBe(true);
  });

  test('admin can restore only removed regular members', () => {
    expect(canRestoreTeamMember('admin', removed('member'))).toBe(true);
    expect(canRestoreTeamMember('admin', removed('admin'))).toBe(false);
    expect(canRestoreTeamMember('admin', removed('creator'))).toBe(false);
  });

  test('non-managers and active or unbound members cannot be restored', () => {
    expect(canRestoreTeamMember('member', removed('member'))).toBe(false);
    expect(canRestoreTeamMember('creator', { ...removed('member'), status: 'active' })).toBe(false);
    expect(canRestoreTeamMember('creator', { ...removed('member'), userId: undefined })).toBe(false);
  });
});

describe('team member edit permissions', () => {
  test('managers can edit their own tags and qualifications, plain members cannot', () => {
    const creator = { status: 'active' as const, baseTag: 'creator' as const, userId: 'creator' };
    const admin = { status: 'active' as const, baseTag: 'admin' as const, userId: 'admin' };
    const member = { status: 'active' as const, baseTag: 'member' as const, userId: 'member' };

    expect(canEditTeamMember('creator', creator, 'creator')).toBe(true);
    expect(canEditTeamMember('admin', admin, 'admin')).toBe(true);
    expect(canEditTeamMember('member', member, 'member')).toBe(false);
    // Own base identity is never editable, even for managers.
    expect(canEditTeamMemberBaseTag('creator', creator, 'creator')).toBe(false);
    expect(canEditTeamMemberBaseTag('admin', admin, 'admin')).toBe(false);
  });

  test('creator can edit admins and members; base identity is creator-only', () => {
    expect(canEditTeamMember('creator', { status: 'active', baseTag: 'admin', userId: 'a' }, 'creator')).toBe(true);
    expect(canEditTeamMember('creator', { status: 'active', baseTag: 'member', userId: 'm' }, 'creator')).toBe(true);
    expect(canEditTeamMember('admin', { status: 'active', baseTag: 'member', userId: 'm' }, 'admin')).toBe(true);
    expect(canEditTeamMember('admin', { status: 'active', baseTag: 'admin', userId: 'a' }, 'admin')).toBe(false);
    expect(canEditTeamMember('admin', { status: 'active', baseTag: 'creator', userId: 'c' }, 'admin')).toBe(false);
    // Base identity edits are reserved for the team creator: OK for other
    // members, never for self, another creator, an admin operator, or a
    // removed member.
    expect(canEditTeamMemberBaseTag('creator', { status: 'active', baseTag: 'member', userId: 'm' }, 'creator')).toBe(true);
    expect(canEditTeamMemberBaseTag('creator', { status: 'active', baseTag: 'admin', userId: 'a' }, 'creator')).toBe(true);
    expect(canEditTeamMemberBaseTag('admin', { status: 'active', baseTag: 'member', userId: 'm' }, 'admin')).toBe(false);
    expect(canEditTeamMemberBaseTag('creator', { status: 'active', baseTag: 'creator', userId: 'c2' }, 'creator')).toBe(false);
    expect(canEditTeamMemberBaseTag('creator', { status: 'removed', baseTag: 'member', userId: 'm' }, 'creator')).toBe(false);
  });
});
