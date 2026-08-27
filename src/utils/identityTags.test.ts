jest.mock('@/apis/project', () => ({
  PROJECT_WORKER_ROLES: [
    { key: 'raw_provider', label: '图源' },
    { key: 'translator', label: '翻译' },
    { key: 'proofreader', label: '校对' },
    { key: 'typesetter', label: '嵌字' },
  ],
}));

import { buildFallbackIdentityTagOptions, filterIdentityTagPermissions, mergeIdentityTagOptions } from './identityTags';

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
});
