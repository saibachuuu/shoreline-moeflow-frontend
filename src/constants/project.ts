import { GROUP_PERMISSION, GROUP_ALLOW_APPLY_TYPE } from './group';

// 项目允许加入的类型
export const PROJECT_ALLOW_APPLY_TYPE = {
  ...GROUP_ALLOW_APPLY_TYPE,
  TEAM_USER: 3,
};

// 项目权限
export const PROJECT_PERMISSION = {
  ...GROUP_PERMISSION,
  COMPLETE_PROJECT: 'COMPLETE_PROJECT',
  MANAGE_MEMBERS: 'MANAGE_MEMBERS',
  ADD_FILE: 'ADD_FILE',
  MOVE_FILE: 'MOVE_FILE',
  RENAME_FILE: 'RENAME_FILE',
  DELETE_FILE: 'DELETE_FILE',
  OUTPUT_TRA: 'OUTPUT_TRA',
  ADD_LABEL: 'ADD_LABEL',
  MOVE_LABEL: 'MOVE_LABEL',
  DELETE_LABEL: 'DELETE_LABEL',
  ADD_TRA: 'ADD_TRA',
  DELETE_TRA: 'DELETE_TRA',
  PROOFREAD_TRA: 'PROOFREAD_TRA',
  CHECK_TRA: 'CHECK_TRA',
  ADD_TARGET: 'ADD_TARGET',
  CHANGE_TARGET: 'CHANGE_TARGET',
  DELETE_TARGET: 'DELETE_TARGET',
} as const;

// 项目状态
export enum PROJECT_STATUS {
  NORMAL = 'NORMAL',
  COMPLETED = 'COMPLETED',
  CLEARED = 'CLEARED',
}

export type ProjectStatus = PROJECT_STATUS | number;

export const normalizeProjectStatus = (status: unknown): PROJECT_STATUS => {
  if (status === PROJECT_STATUS.COMPLETED || status === 'COMPLETED' || status === 5) {
    return PROJECT_STATUS.COMPLETED;
  }
  if (status === PROJECT_STATUS.CLEARED || status === 'CLEARED' || status === 1) {
    return PROJECT_STATUS.CLEARED;
  }
  return PROJECT_STATUS.NORMAL;
};

export const isProjectEditable = (status: unknown): boolean =>
  normalizeProjectStatus(status) === PROJECT_STATUS.NORMAL;

// 从 LP 导入状态
export enum IMPORT_FROM_LABELPLUS_STATUS {
  PENDING = 0, // 排队中
  RUNNING = 1, // 进行中
  SUCCEEDED = 2, // 成功
  ERROR = 3, // 错误
}

// 从 LP 导入错误
export enum IMPORT_FROM_LABELPLUS_ERROR_TYPE {
  UNKNOWN = 0, // 未知
  NO_TARGET = 1, // 运行时，没有的翻译目标
  NO_CREATOR = 2, // 项目没有创建人
  PARSE_FAILED = 3, // 解析失败
}
