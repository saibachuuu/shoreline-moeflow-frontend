import { can, hasIdentityMembership } from './user';

const group = (groupType: 'team' | 'project', effectivePermissions: string[]) => ({
  groupType,
  effectivePermissions,
} as any);

describe('identity permission checks', () => {
  test('normalizes bare permission names to the group namespace', () => {
    expect(can(group('team', ['team:CHANGE']), 'CHANGE')).toBe(true);
    expect(can(group('project', ['project:CHANGE']), 'CHANGE')).toBe(true);
  });

  test('accepts explicit namespace codes', () => {
    expect(can(group('project', ['project:ACCESS']), 'project:ACCESS')).toBe(true);
    expect(can(group('project', ['project:ACCESS']), 'team:ACCESS')).toBe(false);
  });

  test('does not fall back to legacy role permissions', () => {
    expect(can({ groupType: 'team', role: { permissions: [{ id: 10 }] } } as any, 'CHANGE')).toBe(false);
  });

  test('falls back to baseTag for team base permissions when effectivePermissions is missing', () => {
    expect(can({ groupType: 'team', baseTag: 'creator' } as any, 'CREATE_PROJECT')).toBe(true);
    expect(can({ groupType: 'team', baseTag: 'admin' } as any, 'CREATE_PROJECT')).toBe(true);
    expect(can({ groupType: 'team', baseTag: 'member', effectivePermissions: [] } as any, 'CREATE_PROJECT')).toBe(false);
    expect(can({ groupType: 'team', baseTag: 'member' } as any, 'ACCESS')).toBe(true);
    // 项目没有 baseTag 后备
    expect(can({ groupType: 'project', baseTag: 'creator' } as any, 'MANAGE_MEMBERS')).toBe(false);
  });

  test('detects membership from identity fields instead of legacy role data', () => {
    expect(hasIdentityMembership({ role: { id: 'legacy-role' } })).toBe(false);
    expect(hasIdentityMembership({ baseTag: 'member', effectivePermissions: [] })).toBe(true);
    expect(hasIdentityMembership({ effectivePermissions: ['project:ACCESS'] })).toBe(true);
  });
});
