import { mergeProjectPresence, resolveLocalAction } from './projectPresence';
import { ProjectActivePresence } from '@/apis/project';

const currentUser = { id: 'u-self', name: '自己', avatar: 'self.png' };

const serverPresence = (
  users: Array<{ id: string; name: string; action?: string }>,
): ProjectActivePresence => ({
  projectId: 'p1',
  userCount: users.length,
  users,
});

describe('mergeProjectPresence', () => {
  test('正在编辑时用本地 action 覆盖自己并置于首位', () => {
    const result = mergeProjectPresence(
      serverPresence([
        { id: 'u-self', name: '自己', action: 'working' },
        { id: 'u-other', name: '他人', action: 'translation' },
      ]),
      'p1',
      'staff',
      currentUser,
    );
    expect(result.userCount).toBe(2);
    expect(result.users[0]).toMatchObject({ id: 'u-self', action: 'staff' });
    expect(result.users[1]).toMatchObject({ id: 'u-other' });
  });

  test('刚离开窗口时屏蔽自己，但保留他人（视觉样式不消失）', () => {
    const result = mergeProjectPresence(
      serverPresence([
        { id: 'u-self', name: '自己', action: 'staff' },
        { id: 'u-other', name: '他人', action: 'translation' },
      ]),
      'p1',
      null,
      currentUser,
    );
    expect(result.userCount).toBe(1);
    expect(result.users.map((u) => u.id)).toEqual(['u-other']);
  });

  test('刚离开窗口且无他人时列表为空', () => {
    const result = mergeProjectPresence(
      serverPresence([{ id: 'u-self', name: '自己', action: 'staff' }]),
      'p1',
      null,
      currentUser,
    );
    expect(result.userCount).toBe(0);
    expect(result.users).toEqual([]);
  });

  test('从未本地记录时原样保留服务器数据', () => {
    const result = mergeProjectPresence(
      serverPresence([
        { id: 'u-self', name: '自己', action: 'translation' },
        { id: 'u-other', name: '他人', action: 'translation' },
      ]),
      'p1',
      undefined,
      currentUser,
    );
    expect(result.userCount).toBe(2);
    expect(result.users.map((u) => u.id)).toEqual(['u-self', 'u-other']);
  });

  test('服务器无数据时本地自己仍可见', () => {
    const result = mergeProjectPresence(
      undefined,
      'p1',
      'setting',
      currentUser,
    );
    expect(result.userCount).toBe(1);
    expect(result.users[0]).toMatchObject({ id: 'u-self', action: 'setting' });
  });
});

describe('resolveLocalAction', () => {
  test('未记录时返回 undefined', () => {
    expect(resolveLocalAction(undefined, 'p1')).toBeUndefined();
    expect(resolveLocalAction({}, 'p1')).toBeUndefined();
  });

  test('多个窗口同时编辑时取最近注册的 action', () => {
    const entries = { p1: { i1: 'setting', i2: 'staff' } };
    expect(resolveLocalAction(entries, 'p1')).toBe('staff');
  });

  test('关掉一个窗口后保留另一个窗口的编辑状态', () => {
    const entries = { p1: { i1: 'setting' } };
    expect(resolveLocalAction(entries, 'p1')).toBe('setting');
  });

  test('所有窗口都关闭后返回 null（屏蔽自己）', () => {
    expect(resolveLocalAction({ p1: {} }, 'p1')).toBeNull();
  });
});
