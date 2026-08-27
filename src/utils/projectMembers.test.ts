import {
  canAssignProjectWorkerTag,
  canEditProjectMemberInQuickMenu,
  canLeaveProjectFromQuickMenu,
  diffProjectMembers,
  mergeExternalMemberTag,
  mergeExternalMemberWithoutTags,
  mergeMemberTag,
  mergeMemberWithoutTags,
  normalizeSearchText,
  projectMemberDisplayLabel,
  projectMemberIdempotencyHeader,
  projectMemberOperationId,
  projectMemberPrimaryName,
  teamSearchResultLabel,
} from './projectMembers';

describe('projectMemberPrimaryName', () => {
  test('registered member shows the site user name over the display alias', () => {
    expect(projectMemberPrimaryName({ user: { name: '站点名' }, displayName: '同一署名' }))
      .toBe('站点名');
  });

  test('external member falls back to the display alias', () => {
    expect(projectMemberPrimaryName({ user: null, displayName: '外部署名' }))
      .toBe('外部署名');
    expect(projectMemberPrimaryName({ displayName: '无 user 字段' }))
      .toBe('无 user 字段');
  });

  test('empty member yields an empty string', () => {
    expect(projectMemberPrimaryName({})).toBe('');
  });
});

describe('project member draft operations', () => {
  test('merges repeated position assignments into one member tag set', () => {
    const result = mergeMemberTag(
      mergeMemberTag([], { userId: 'u1', displayName: 'Alice' }, 'translator'),
      { userId: 'u1', displayName: 'Alice' },
      'proofreader',
    );
    expect(result).toHaveLength(1);
    expect(result[0].tags).toEqual(['proofreader', 'translator']);
  });

  test('diffs tag changes and removals without using display names as keys', () => {
    const operations = diffProjectMembers(
      [
        {
          id: 'm1',
          userId: 'u1',
          displayName: 'Alice',
          tags: ['translator'],
          status: 'active',
          version: 4,
        },
        {
          id: 'm2',
          externalId: 'e1',
          displayName: 'Alice',
          tags: ['proofreader'],
          status: 'active',
          version: 2,
        },
      ],
      [
        {
          id: 'm1',
          userId: 'u1',
          displayName: 'Alice 2',
          tags: ['translator', 'typesetter'],
          status: 'active',
          version: 4,
        },
      ],
      () => 'op',
    );
    expect(operations).toEqual([
      expect.objectContaining({
        action: 'update',
        memberId: 'm1',
        expectedMemberVersion: 4,
        changes: {
          displayName: 'Alice 2',
          tags: ['translator', 'typesetter'],
        },
      }),
      expect.objectContaining({
        action: 'update',
        memberId: 'm2',
        expectedMemberVersion: 2,
        changes: { status: 'removed' },
      }),
    ]);
  });

  test('puts tags on add operations for the project member API', () => {
    const operations = diffProjectMembers(
      [],
      [{ userId: 'u1', displayName: 'Alice', tags: ['typesetter', 'translator', 'translator'], status: 'active' }],
      () => 'add-u1',
    );

    expect(operations).toEqual([
      expect.objectContaining({
        action: 'add',
        userId: 'u1',
        tags: ['translator', 'typesetter'],
      }),
    ]);
    expect(operations[0].changes).toBeUndefined();
  });

  test('restores a removed member with its existing identity and version', () => {
    const operations = diffProjectMembers(
      [{
        id: 'm1',
        externalId: 'external-1',
        displayName: '外部署名',
        tags: ['translator'],
        status: 'removed',
        version: 7,
      }],
      [{
        id: 'm1',
        externalId: 'external-1',
        displayName: '恢复后的外部署名',
        tags: ['proofreader'],
        status: 'active',
        version: 7,
      }],
      () => 'restore-m1',
    );

    expect(operations).toEqual([
      {
        operationId: 'restore-m1',
        action: 'add',
        memberId: 'm1',
        userId: undefined,
        displayName: '恢复后的外部署名',
        tags: ['proofreader'],
        expectedMemberVersion: 7,
      },
    ]);
  });

  test('adds a manually entered external identity to the draft', () => {
    const result = mergeExternalMemberTag([], '  Alice (外部署名)  ', 'translator');

    expect(result).toEqual([expect.objectContaining({
      externalId: 'Alice (外部署名)',
      displayName: 'Alice (外部署名)',
      tags: ['translator'],
      status: 'active',
    })]);
  });

  test('does not create a draft member for an empty external identity', () => {
    expect(mergeExternalMemberTag([], '   ', 'translator')).toEqual([]);
  });

  test('creates no-tag drafts for regular-user invitations', () => {
    expect(mergeMemberWithoutTags([], { userId: 'u2', displayName: 'Bob' })).toEqual([{
      userId: 'u2',
      displayName: 'Bob',
      tags: [],
      status: 'active',
    }]);
    expect(mergeExternalMemberWithoutTags([], '  External  ')).toEqual([{
      externalId: 'External',
      displayName: 'External',
      tags: [],
      status: 'active',
    }]);
  });

  test('clears tags when reusing a removed identity for a no-tag invitation', () => {
    expect(mergeMemberWithoutTags([{
      id: 'm1',
      userId: 'u2',
      displayName: 'Bob',
      tags: ['translator'],
      status: 'removed',
      version: 3,
    }], { id: 'm1', userId: 'u2', displayName: 'Bob' })).toEqual([{
      id: 'm1',
      userId: 'u2',
      displayName: 'Bob',
      tags: [],
      status: 'active',
      version: 3,
    }]);
  });

  test('lets managers edit any member but limits regular users to themselves', () => {
    expect(canEditProjectMemberInQuickMenu({ userId: 'other' }, 'me', true)).toBe(true);
    expect(canEditProjectMemberInQuickMenu({ userId: 'me' }, 'me', false)).toBe(true);
    expect(canEditProjectMemberInQuickMenu({ userId: 'other' }, 'me', false)).toBe(false);
  });

  test('requires a registered user to have the selected worker qualification', () => {
    expect(canAssignProjectWorkerTag({ userId: 'u1', workerQualifications: ['translator'] }, 'translator')).toBe(true);
    expect(canAssignProjectWorkerTag({ userId: 'u1', workerQualifications: ['translator'] }, 'proofreader')).toBe(false);
    expect(canAssignProjectWorkerTag({ userId: 'u1', workerQualifications: [] }, 'proofreader', 'open')).toBe(true);
    expect(canAssignProjectWorkerTag({ userId: 'u1', workerQualifications: [], privilegedSelf: true }, 'proofreader')).toBe(true);
    expect(canAssignProjectWorkerTag({ userId: undefined }, 'proofreader')).toBe(true);
  });

  test('allows only a non-owner regular member to leave from the quick menu', () => {
    expect(canLeaveProjectFromQuickMenu({ status: 'active', userId: 'me' }, 'me')).toBe(true);
    expect(canLeaveProjectFromQuickMenu({ status: 'active', userId: 'me', isOwner: true }, 'me')).toBe(false);
    expect(canLeaveProjectFromQuickMenu({ status: 'active', userId: 'other' }, 'me')).toBe(false);
  });

  test('operation ids are stable across retries of the same operation', () => {
    const member = {
      id: 'm1',
      userId: 'u1',
      displayName: 'Alice',
      tags: ['translator'],
      status: 'active' as const,
      version: 4,
    };
    const first = projectMemberOperationId('p1', member, 'update');
    const second = projectMemberOperationId('p1', member, 'update');
    expect(first).toBe(second);
    expect(projectMemberOperationId('p2', member, 'update')).not.toBe(first);
    expect(projectMemberOperationId('p1', member, 'add')).not.toBe(first);
    // Without a payload fingerprint the id stays a pure subject function:
    // a display-name edit alone must not change the id of an existing member.
    expect(projectMemberOperationId('p1', { ...member, displayName: 'Alice 2' }, 'update')).toBe(first);
  });

  test('two different payloads for the same member get different operation ids', () => {
    const member = {
      id: 'm1',
      userId: 'u1',
      displayName: 'Alice',
      tags: [] as string[],
      status: 'active' as const,
      version: 4,
    };
    const opId = (tags: string[]) => {
      const operations = diffProjectMembers(
        [member],
        [{ ...member, tags }],
        (m, action, content) => projectMemberOperationId('p1', m, action, content),
      );
      return operations[0].operationId;
    };
    // Adding a second worker tag must NOT reuse the id of the first save:
    // the backend idempotency layer would replay the old result and keep the
    // member on a single tag (the reported "multiple positions" bug).
    expect(opId(['translator'])).not.toBe(opId(['translator', 'proofreader']));
    // A retry of the identical payload still replays safely.
    expect(opId(['translator'])).toBe(opId(['translator']));
  });

  test('payload fingerprints distinguish update kinds for the same member', () => {
    const member = {
      id: 'm1',
      userId: 'u1',
      displayName: 'Alice',
      tags: ['translator'],
      status: 'active' as const,
      version: 4,
    };
    const idFor = (content: { tags?: string[]; displayName?: string; status?: string }) =>
      projectMemberOperationId('p1', member, 'update', content);
    expect(idFor({ status: 'removed' })).not.toBe(idFor({ tags: ['translator', 'proofreader'] }));
    expect(idFor({ displayName: 'Alice 2' })).not.toBe(idFor({ displayName: 'Alice' }));
    expect(idFor({ tags: ['translator'] })).toBe(idFor({ tags: ['translator'] }));
  });

  test('new external members get a stable add id derived from the subject', () => {
    const external = {
      displayName: '外包画手',
      tags: ['translator'],
      status: 'active' as const,
    };
    const once = projectMemberOperationId('p1', external, 'add');
    expect(once).toBe(projectMemberOperationId('p1', { ...external, displayName: '外包画手' }, 'add'));
    // Different subjects must not collide.
    expect(projectMemberOperationId('p1', { ...external, displayName: '外包校队' }, 'add')).not.toBe(once);
  });

  test('idempotency header stays ASCII for Chinese external names', () => {
    const external = {
      displayName: '外包画手',
      tags: ['translator'],
      status: 'active' as const,
    };
    const operationId = projectMemberOperationId('p1', external, 'add');
    // The stored id keeps the unencoded Chinese subject (backend replays it
    // verbatim), but HTTP headers cannot carry it.
    expect(operationId).toContain('外包画手');
    const header = projectMemberIdempotencyHeader(operationId);
    expect(header).toMatch(/^[\x00-\x7F]*$/);
    expect(header).not.toContain('外包画手');
    // Percent-encoding round-trips back to the identical stored id.
    expect(decodeURIComponent(header)).toBe(operationId);
  });

  test('diff operations carry the payload-fingerprinted operation ids', () => {
    const operations = diffProjectMembers(
      [{ id: 'm1', userId: 'u1', displayName: 'Alice', tags: ['translator'], status: 'active', version: 4 }],
      [{ id: 'm1', userId: 'u1', displayName: 'Alice', tags: ['translator', 'typesetter'], status: 'active', version: 4 }],
      (member, action, content) => projectMemberOperationId('p1', member, action, content),
    );
    expect(operations).toEqual([
      expect.objectContaining({
        operationId: expect.stringMatching(/^p1-update-m1-/),
        action: 'update',
        memberId: 'm1',
      }),
    ]);
  });

  test('keeps invited members invited when assigning a tag', () => {
    const invited = [{
      id: 'm3',
      userId: 'u3',
      displayName: 'Invited',
      tags: [] as string[],
      status: 'invited' as const,
      version: 1,
    }];
    const result = mergeMemberTag(invited, { id: 'm3', userId: 'u3', displayName: 'Invited' }, 'translator');
    expect(result[0].status).toBe('invited');
    expect(result[0].tags).toEqual(['translator']);
    // Active members keep being promoted only to active, not cleared.
    const active = mergeMemberTag(
      [{ id: 'm4', userId: 'u4', displayName: 'Active', tags: [], status: 'active', version: 1 }],
      { id: 'm4', userId: 'u4', displayName: 'Active' },
      'proofreader',
    );
    expect(active[0].status).toBe('active');
  });
});

describe('normalizeSearchText', () => {
  test('trims and case-folds', () => {
    expect(normalizeSearchText('  BenYang ')).toBe('benyang');
  });
});

describe('projectMemberDisplayLabel', () => {
  test('shows only the display name when it equals the username', () => {
    expect(
      projectMemberDisplayLabel({ displayName: '笨羊', user: { name: '笨羊' } }),
    ).toEqual({ main: '笨羊', note: '' });
  });

  test('leads with the display name and appends a different username', () => {
    expect(
      projectMemberDisplayLabel({ displayName: '组长', user: { name: '笨羊' } }),
    ).toEqual({ main: '组长', note: '笨羊' });
  });

  test('external members show only the display name', () => {
    expect(projectMemberDisplayLabel({ displayName: '外部大佬' })).toEqual({
      main: '外部大佬',
      note: '',
    });
  });
});

describe('teamSearchResultLabel', () => {
  test('name match shows only the username even when an alias also matches', () => {
    expect(teamSearchResultLabel('笨羊', ['大笨羊'], '笨羊')).toEqual({
      main: '笨羊',
      aliases: [],
    });
  });

  test('alias match appends the matched alias after the username', () => {
    expect(teamSearchResultLabel('笨羊', ['大笨羊', '小笨羊'], '大笨羊')).toEqual({
      main: '笨羊',
      aliases: ['大笨羊'],
    });
  });

  test('matches case-insensitively', () => {
    expect(teamSearchResultLabel('BenYang', ['BEN'], 'ben')).toEqual({
      main: 'BenYang',
      aliases: [],
    });
  });

  test('empty query shows the plain username', () => {
    expect(teamSearchResultLabel('笨羊', ['大笨羊'], '')).toEqual({
      main: '笨羊',
      aliases: [],
    });
  });
});
