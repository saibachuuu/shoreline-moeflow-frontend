jest.mock('@/apis/project', () => ({
  PROJECT_WORKER_ROLES: [
    { key: 'raw_provider', label: '图源' },
    { key: 'translator', label: '翻译' },
    { key: 'proofreader', label: '校对' },
    { key: 'typesetter', label: '嵌字' },
  ],
}));

import {
  buildFallbackIdentityTagOptions,
  filterIdentityTagPermissions,
  mergeIdentityTagOptions,
  normalizeIdentityTagPolicy,
} from './identityTags';

describe('identity tag option fallbacks', () => {
  test('provides fixed project worker tags and keeps tags already used by members', () => {
    const options = buildFallbackIdentityTagOptions('project', [
      { tags: ['translator', 'reviewer'] },
      { tags: ['reviewer', 'custom_tag'] },
    ]);

    expect(options.map((option) => option.code)).toEqual(expect.arrayContaining([
      'translator',
      'proofreader',
      'typesetter',
      'reviewer',
      'custom_tag',
    ]));
    expect(options.filter((option) => option.code === 'reviewer')).toHaveLength(1);
  });

  test('adds member tags without replacing a loaded team policy', () => {
    const policy = [{ code: 'quality', name: '质量', assignable: true }];
    const options = mergeIdentityTagOptions(policy, [{ tags: ['quality', 'legacy'] }], 'team');

    expect(options).toEqual([
      policy[0],
      expect.objectContaining({ code: 'legacy', name: 'legacy' }),
    ]);
  });

  test('keeps protected project permissions out of new and custom tags', () => {
    const permissions = ['project:ACCESS', 'project:COMPLETE_PROJECT', 'project:MANAGE_MEMBERS'];

    expect(filterIdentityTagPermissions(permissions, 'project')).toEqual(['project:ACCESS']);
    expect(filterIdentityTagPermissions(permissions, 'project', 'team')).toEqual(['project:ACCESS']);
  });

  test('allows protected project permissions when overriding a system tag', () => {
    const permissions = ['project:ACCESS', 'project:COMPLETE_PROJECT', 'project:MANAGE_MEMBERS'];

    expect(filterIdentityTagPermissions(permissions, 'project', 'site')).toEqual(permissions);
    expect(filterIdentityTagPermissions(permissions, 'project', 'team_override')).toEqual(permissions);
  });

  test('normalizeIdentityTagPolicy preserves snake_case tag keys and maps fields properly', () => {
    const backendResponse = {
      version: 2,
      team_tags: {
        admin: {
          code: 'admin',
          name: 'admin',
          permissions: ['team:ACCESS'],
          assignable: false,
          source: 'site',
        },
      },
      project_tags: {
        raw_provider: {
          code: 'raw_provider',
          name: 'raw_provider',
          permissions: ['project:ACCESS', 'project:ADD_FILE'],
          assignable: true,
          source: 'team_override',
          initial_permissions: ['project:ACCESS'],
          initial_assignable: true,
        },
      },
    };

    const policy = normalizeIdentityTagPolicy(backendResponse);
    expect(policy.version).toBe(2);
    expect(policy.projectTags['raw_provider']).toBeDefined();
    expect(policy.projectTags['raw_provider'].code).toBe('raw_provider');
    expect(policy.projectTags['raw_provider'].source).toBe('team_override');
    expect(policy.projectTags['raw_provider'].initialPermissions).toEqual(['project:ACCESS']);
    expect(policy.projectTags['raw_provider'].initialAssignable).toBe(true);
    // Ensure rawProvider was NOT created as a key
    expect((policy.projectTags as any)['rawProvider']).toBeUndefined();
  });
});
