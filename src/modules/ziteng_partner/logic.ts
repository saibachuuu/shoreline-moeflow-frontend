import type { ZitengCheck } from './api';

/**
 * 本模块的**纯逻辑**，刻意与 React、import.meta 无关，便于直接单测。
 *
 * 这里承载本模块最要紧的语义：三态区分。
 *
 * 注意 `import type`：`./api` 会连带引入整个组件树（axios/图片等），
 * 而本文件只需要类型。用 type-only 导入后，本文件的测试无需渲染环境。
 */

/** 任务状态：与后端 CheckStatus 一致（0=排队 1=执行中 2=成功 3=失败） */
export const STATUS_QUEUED = 0;
export const STATUS_RUNNING = 1;
export const STATUS_SUCCEEDED = 2;
export const STATUS_FAILED = 3;

/** 仍在进行中（需要继续轮询）的状态 */
export const PENDING_STATUSES: readonly number[] = [STATUS_QUEUED, STATUS_RUNNING];

/** 提示条要呈现的形态 */
export type ZitengAlertKind = 'none' | 'pending' | 'suspected' | 'failed';

export interface ZitengAlertState {
  kind: ZitengAlertKind;
  /** 拟展示的疑似项目名（已按对方状态排序） */
  titles: string[];
  /** 失败原因（仅 kind === 'failed'） */
  error: string;
}

/** 等待中的空态，也是初始态（不渲染任何东西） */
export const ZITENG_ALERT_NONE: ZitengAlertState = {
  kind: 'none',
  titles: [],
  error: '',
};

/**
 * 由查重结果推出提示形态。
 *
 * 三条不可动摇的规则：
 * 1. **查询失败绝不显示成「未查到」**——那会让用户以为没有撞车。
 * 2. 没有疑似（clear）时**不显示任何提示**（需求：无重复时不弹顶部提示）。
 * 3. 尚有结果未出时显示等待，不提前下结论。
 */
export const deriveAlertState = (
  check: ZitengCheck | null | undefined,
  formatTitle: (suspect: ZitengCheck['suspects'][number], index: number) => string,
): ZitengAlertState => {
  if (!check) return ZITENG_ALERT_NONE;

  // 任务还没跑完：显示等待，不预判
  if (PENDING_STATUSES.includes(check.status)) {
    return { kind: 'pending', titles: [], error: '' };
  }

  // 失败优先于一切：即便上一次结果残留了 suspects 也不能当成功展示
  if (check.status === STATUS_FAILED || check.verdict === 'failed') {
    return { kind: 'failed', titles: [], error: check.error || '' };
  }

  if (check.verdict === 'suspected' && check.suspects.length > 0) {
    return {
      kind: 'suspected',
      titles: check.suspects.map((suspect, index) =>
        formatTitle(suspect, index),
      ),
      error: '',
    };
  }

  // clear：无重复就不打扰用户
  return ZITENG_ALERT_NONE;
};

/**
 * 疑似条目的展示名。
 *
 * 优先原始标题（不含编号/版本标签），退回展示标题。
 */
export const suspectTitle = (
  suspect: ZitengCheck['suspects'][number],
): string =>
  suspect.original_title || suspect.display_title || suspect.id || '';

/** 对方条目状态的中文/告警型映射，用于提示里区分在制与已发布 */
export const suspicionLevelOf = (
  suspect: ZitengCheck['suspects'][number],
): 'inProgress' | 'published' | 'withdrawn' | 'other' => {
  if (suspect.state === 'in_progress') return 'inProgress';
  if (suspect.state === 'published') return 'published';
  if (suspect.state === 'withdrawn') return 'withdrawn';
  return 'other';
};

/** 是否还需要继续轮询 */
export const shouldKeepPolling = (
  check: ZitengCheck | null | undefined,
): boolean => !!check && PENDING_STATUSES.includes(check.status);