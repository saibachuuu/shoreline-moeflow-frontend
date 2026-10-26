import { request } from '@/apis';
import { toUnderScoreCase } from '@/utils';

/** 存储来源（后端已脱敏，不含 secret_access_key）。 */
export interface StorageSource {
  id: string;
  name: string;
  enabled: boolean;
  endpoint: string;
  bucket: string;
  /** 该来源的 key 总前缀，默认 storage/ */
  subPath: string;
  region: string;
  addressingStyle: 'path' | 'virtual';
  verifySsl: boolean;
  /** 形如 AKIA...1234 */
  accessKeyId: string;
  publicDomain: string;
  remark: string;
  inactiveDays: number;
  maxObjectsPerRun: number;
  /** 已有项目迁入；为真时禁止改 subPath */
  hasData: boolean;
  createTime: string;
  updateTime: string;
}

export interface StorageSourceInput {
  name: string;
  endpoint: string;
  bucket: string;
  subPath: string;
  region?: string;
  addressingStyle?: 'path' | 'virtual';
  verifySsl?: boolean;
  accessKeyId?: string;
  secretAccessKey?: string;
  publicDomain?: string;
  remark?: string;
  inactiveDays?: number;
  maxObjectsPerRun?: number;
  enabled?: boolean;
}

export interface TransferBreakdown {
  originBytes: number;
  outputBytes: number;
  objectCount: number;
}

export interface TransferRecord {
  id: string;
  project: { id: string | null; name: string };
  source: { id: string | null; name: string };
  status: number;
  statusName: string;
  direction: number;
  directionName: string;
  totalObjects: number;
  copiedObjects: number;
  totalBytes: number;
  copiedBytes: number;
  /** 本次实际搬运的分类字节数（原图 / 导出产物） */
  breakdown: TransferBreakdown;
  progressPercent: number;
  lastError: string;
  startTime: string | null;
  finishTime: string | null;
  createTime: string | null;
}

export interface StoragePoolStats {
  sources: number;
  enabledSources: number;
  migratedProjects: number;
  activeTransfers: number;
}

/** 运行开关。`scanEnabled` 默认关闭；`runEnabled` 是紧急停止。 */
export interface StoragePoolSetting {
  scanEnabled: boolean;
  runEnabled: boolean;
  /** 单轮字节预算：只决定这一轮开工哪几个项目，不切分单个项目 */
  runMaxBytes: number;
  /** 单次任务调用的对象数安全阀 */
  runMaxObjects: number;
  /** 单轮最多启动几个项目的迁移 */
  runMaxProjects: number;
  updatedBy: string | null;
  updateTime: string | null;
  /** 只在真的执行过巡查时更新，被开关跳过时不覆盖 */
  lastScanTime: string | null;
  lastScanResult: string;
  lastScanQueued: number;
  /** 下一次 03:00（服务端时区）；算不出来为 null */
  nextRunAt: string | null;
}

/** 全站用量。纯数据库求和，不含桶里的未归属对象。 */
export interface StoragePoolUsage {
  total: {
    projects: number;
    bytes: number;
    derivedBytes: number;
    outputBytes: number;
  };
  pending: { projects: number; bytes: number };
  migratedProjects: number;
  bySource: {
    sourceId: string | null;
    name: string;
    projects: number;
    bytes: number;
  }[];
  topProjects: { id: string; name: string; bytes: number }[];
}

const base = '/v1/admin/storage-pool';

export const listSources = () =>
  request<StorageSource[]>({ method: 'GET', url: `${base}/sources` });

export const createSource = (data: StorageSourceInput) =>
  request<StorageSource>({
    method: 'POST',
    url: `${base}/sources`,
    data: toUnderScoreCase(data),
  });

export const updateSource = (id: string, data: Partial<StorageSourceInput>) =>
  request<StorageSource>({
    method: 'PUT',
    url: `${base}/sources/${id}`,
    data: toUnderScoreCase(data),
  });

export const deleteSource = (id: string) =>
  request({ method: 'DELETE', url: `${base}/sources/${id}` });

export const testSource = (id: string) =>
  request<{ ok: boolean; message: string }>({
    method: 'POST',
    url: `${base}/sources/${id}/test`,
  });

export const listTransfers = () =>
  request<TransferRecord[]>({ method: 'GET', url: `${base}/transfers` });

export const migrateProject = (projectId: string, sourceId: string) =>
  request<TransferRecord>({
    method: 'POST',
    url: `${base}/projects/${projectId}/migrate`,
    data: { source_id: sourceId },
  });

export const restoreProject = (projectId: string) =>
  request<TransferRecord>({
    method: 'POST',
    url: `${base}/projects/${projectId}/restore`,
  });

export const retryTransfer = (id: string) =>
  request<TransferRecord>({
    method: 'POST',
    url: `${base}/transfers/${id}/retry`,
  });

export const getStats = () =>
  request<StoragePoolStats>({ method: 'GET', url: `${base}/stats` });

export const getSettings = () =>
  request<StoragePoolSetting>({ method: 'GET', url: `${base}/settings` });

export const getUsage = () =>
  request<StoragePoolUsage>({ method: 'GET', url: `${base}/usage` });

export const updateSettings = (data: {
  scanEnabled?: boolean;
  runEnabled?: boolean;
  runMaxBytes?: number;
  runMaxObjects?: number;
  runMaxProjects?: number;
}) =>
  request<StoragePoolSetting>({
    method: 'PUT',
    url: `${base}/settings`,
    data: toUnderScoreCase(data),
  });

/** 手动巡查一次。**不受开关限制** —— 这是「关掉自动、偶尔手动」的用法。 */
export const runScanOnce = () =>
  request<{ message: string }>({ method: 'POST', url: `${base}/scan` });
