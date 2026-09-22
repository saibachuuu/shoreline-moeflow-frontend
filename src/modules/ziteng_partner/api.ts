import { AxiosRequestConfig } from 'axios';
import { BasicSuccessResult, request } from '@/apis';

/**
 * 模块自己的 API 封装。
 *
 * 刻意**不**往 `src/apis/project.ts` 里加方法——那会让核心认识本模块（违反 C1）。
 * 这里直接用核心导出的通用 `request`。
 *
 * 后端返回 **snake_case**，此处不做转换，类型也照 snake_case 写。
 * （归档导入的进度组件就是因为假设了 camelCase 而拿不到值，见文档 §6.3。）
 */

/** 三态之一：未查到 / 有疑似 / 查询失败。空串表示尚未查询。 */
export type ZitengVerdict = 'clear' | 'suspected' | 'failed' | '';

/** 对方条目的状态 */
export type ZitengWorkState = 'published' | 'in_progress' | 'withdrawn' | string;

export interface ZitengSuspect {
  id: string;
  reference?: string;
  display_title?: string;
  original_title?: string;
  author?: string;
  circle?: string;
  state?: ZitengWorkState;
  stage?: string;
  level?: string;
  score?: number;
}

export interface ZitengCheck {
  project_id: string;
  keyword: string;
  /** 0=排队 1=执行中 2=成功 3=失败 */
  status: number;
  verdict: ZitengVerdict;
  suspects: ZitengSuspect[];
  suspect_count: number;
  error: string;
}

export interface ZitengConfig {
  enabled: boolean;
  max_results: number;
}

/**
 * 任务状态常量定义在 `./logic`（纯逻辑，可脱离组件树测试），
 * 这里重导出，方便组件从一处引用。
 */
export {
  PENDING_STATUSES as ZITENG_PENDING_STATUSES,
  STATUS_FAILED as ZITENG_STATUS_FAILED,
  STATUS_QUEUED as ZITENG_STATUS_QUEUED,
  STATUS_RUNNING as ZITENG_STATUS_RUNNING,
  STATUS_SUCCEEDED as ZITENG_STATUS_SUCCEEDED,
} from './logic';

export const getZitengCheck = ({
  projectID,
  configs,
}: {
  projectID: string;
  configs?: AxiosRequestConfig;
}): Promise<BasicSuccessResult<{ check: ZitengCheck | null }>> =>
  request({
    method: 'GET',
    url: `/v1/projects/${projectID}/ziteng-check`,
    ...configs,
  });

export const triggerZitengCheck = ({
  projectID,
  configs,
}: {
  projectID: string;
  configs?: AxiosRequestConfig;
}): Promise<BasicSuccessResult<{ check: ZitengCheck | null }>> =>
  request({
    method: 'POST',
    url: `/v1/projects/${projectID}/ziteng-check`,
    ...configs,
  });

export const getZitengConfig = ({
  configs,
}: {
  configs?: AxiosRequestConfig;
} = {}): Promise<BasicSuccessResult<ZitengConfig>> =>
  request({
    method: 'GET',
    url: '/v1/ziteng-partner/config',
    ...configs,
  });