import { ZitengCheck } from './api';
import {
  deriveAlertState,
  shouldKeepPolling,
  suspicionLevelOf,
  suspectTitle,
} from './logic';

/**
 * 本模块最要紧的语义测试：三态区分。
 *
 * 特别地：**查询失败绝不能显示成「未查到」**——
 * 那会让用户以为没有撞车，是本模块最危险的失败模式。
 */

const makeCheck = (overrides: Partial<ZitengCheck> = {}): ZitengCheck => ({
  project_id: 'p1',
  keyword: '作品',
  status: 2,
  verdict: 'clear',
  suspects: [],
  suspect_count: 0,
  error: '',
  ...overrides,
});

const nameOf = (suspect: ZitengCheck['suspects'][number]) =>
  suspect.original_title ?? suspect.id;

describe('deriveAlertState', () => {
  it('无任务时不显示任何东西', () => {
    expect(deriveAlertState(null, nameOf).kind).toBe('none');
    expect(deriveAlertState(undefined, nameOf).kind).toBe('none');
  });

  it('未查到（clear）时不显示提示', () => {
    // 需求：没有疑似重复就不弹顶部提示
    const state = deriveAlertState(makeCheck({ verdict: 'clear' }), nameOf);
    expect(state.kind).toBe('none');
    expect(state.titles).toEqual([]);
  });

  it('排队/执行中显示等待', () => {
    expect(deriveAlertState(makeCheck({ status: 0 }), nameOf).kind).toBe(
      'pending',
    );
    expect(deriveAlertState(makeCheck({ status: 1 }), nameOf).kind).toBe(
      'pending',
    );
  });

  it('有疑似时列出项目名', () => {
    const state = deriveAlertState(
      makeCheck({
        verdict: 'suspected',
        suspect_count: 2,
        suspects: [
          { id: 'a', original_title: '作品名 A' },
          { id: 'b', original_title: '作品名 B' },
        ],
      }),
      nameOf,
    );
    expect(state.kind).toBe('suspected');
    expect(state.titles).toEqual(['作品名 A', '作品名 B']);
  });

  it('查询失败显示失败态，且绝不显示成未查到', () => {
    const state = deriveAlertState(
      makeCheck({ status: 3, verdict: 'failed', error: '对方服务不可用' }),
      nameOf,
    );
    expect(state.kind).toBe('failed');
    expect(state.kind).not.toBe('none');
    expect(state.error).toBe('对方服务不可用');
  });

  it('status=FAILED 优先于残留的 suspects', () => {
    // 后端理论上不会这样返回，但即便出现了也不能当成功展示
    const state = deriveAlertState(
      makeCheck({
        status: 3,
        verdict: 'failed',
        suspects: [{ id: 'a', original_title: 'X' }],
      }),
      nameOf,
    );
    expect(state.kind).toBe('failed');
    expect(state.titles).toEqual([]);
  });

  it('status=FAILED 优先于 verdict=clear', () => {
    const state = deriveAlertState(
      makeCheck({ status: 3, verdict: 'clear' }),
      nameOf,
    );
    expect(state.kind).toBe('failed');
  });

  it('verdict=suspected 但没有条目时按未查到处理', () => {
    const state = deriveAlertState(
      makeCheck({ verdict: 'suspected', suspects: [] }),
      nameOf,
    );
    expect(state.kind).toBe('none');
  });

  it('空 verdict（尚未查询）不显示提示', () => {
    const state = deriveAlertState(makeCheck({ verdict: '' }), nameOf);
    expect(state.kind).toBe('none');
  });
});

describe('suspectTitle', () => {
  it('优先 original_title', () => {
    expect(
      suspectTitle({
        id: 'x',
        original_title: '原名',
        display_title: '展示名',
      }),
    ).toBe('原名');
  });

  it('退回 display_title', () => {
    expect(suspectTitle({ id: 'x', display_title: '展示名' })).toBe('展示名');
  });

  it('再退回 id', () => {
    expect(suspectTitle({ id: 'x' })).toBe('x');
  });
});

describe('suspicionLevelOf', () => {
  it('区分三种状态', () => {
    expect(suspicionLevelOf({ id: '1', state: 'in_progress' })).toBe(
      'inProgress',
    );
    expect(suspicionLevelOf({ id: '1', state: 'published' })).toBe('published');
    expect(suspicionLevelOf({ id: '1', state: 'withdrawn' })).toBe('withdrawn');
    expect(suspicionLevelOf({ id: '1' })).toBe('other');
    expect(suspicionLevelOf({ id: '1', state: 'unknown_state' })).toBe('other');
  });
});

describe('shouldKeepPolling', () => {
  it('仅在排队/执行中时继续轮询', () => {
    expect(shouldKeepPolling(makeCheck({ status: 0 }))).toBe(true);
    expect(shouldKeepPolling(makeCheck({ status: 1 }))).toBe(true);
    expect(shouldKeepPolling(makeCheck({ status: 2 }))).toBe(false);
    expect(shouldKeepPolling(makeCheck({ status: 3 }))).toBe(false);
    expect(shouldKeepPolling(null)).toBe(false);
    expect(shouldKeepPolling(undefined)).toBe(false);
  });
});