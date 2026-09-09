/**
 * 项目相关 API
 */
import { AxiosRequestConfig } from 'axios';
import { PaginationParams, request } from '.';
import {
  IMPORT_FROM_LABELPLUS_ERROR_TYPE,
  IMPORT_FROM_LABELPLUS_STATUS,
  PROJECT_STATUS,
} from '../constants';
import { Language, Project, ProjectSet, Role, Team } from '../interfaces';
import { toUnderScoreCase } from '../utils';

export interface APIProject {
  groupType: 'project';
  id: string;
  name: string;
  intro: string;
  hasAvatar: boolean;
  avatar: string;
  allowApplyType: number;
  isNeedCheckApplication: boolean;
  maxUser: number;
  userCount: number;
  status: PROJECT_STATUS | number;
  createTime: string;
  editTime: string;
  role?: Role;
  autoBecomeProjectAdmin?: boolean;
  sourceLanguage: Language;
  targetCount: number;
  sourceCount: number;
  translatedSourceCount: number;
  checkedSourceCount: number;
  team: Team;
  projectSet: ProjectSet;
  importFromLabelplusStatus: IMPORT_FROM_LABELPLUS_STATUS;
  importFromLabelplusPercent: number;
  importFromLabelplusErrorType: IMPORT_FROM_LABELPLUS_ERROR_TYPE;
  importFromLabelplusErrorTypeName: string;
  ownerUserId?: string | null;
  ownerVersion?: number;
  statusVersion?: number;
  effectivePermissions?: string[];
  memberSummary?: APIProjectMemberSummary[];
  staffListPage?: number | null;
  activePresence?: ProjectActivePresence | null;
}

export interface ActivePresenceUser {
  id: string;
  name: string;
  avatar?: string;
  action?: string;
  lastHeartbeat?: string;
}

export interface ProjectActivePresence {
  projectId: string;
  userCount: number;
  users: ActivePresenceUser[];
}

export type ProjectTag =
  | 'creator'
  | 'admin'
  | 'raw_provider'
  | 'scanner'
  | 'cropper'
  | 'cleaner'
  | 'translator'
  | 'proofreader'
  | 'typesetter'
  | string;

export type ProjectWorkerRole =
  | 'raw_provider'
  | 'scanner'
  | 'cropper'
  | 'cleaner'
  | 'translator'
  | 'proofreader'
  | 'typesetter';

export const PROJECT_WORKER_ROLES: ReadonlyArray<{
  key: ProjectWorkerRole;
  label: string;
}> = [
  { key: 'raw_provider', label: '图源' },
  { key: 'scanner', label: '扫图' },
  { key: 'cropper', label: '裁切' },
  { key: 'cleaner', label: '修图' },
  { key: 'translator', label: '翻译' },
  { key: 'proofreader', label: '校对' },
  { key: 'typesetter', label: '嵌字' },
];

export const PROJECT_WORKER_DISPLAY_ROLES = PROJECT_WORKER_ROLES.filter(
  (r) =>
    r.key === 'translator' ||
    r.key === 'proofreader' ||
    r.key === 'typesetter',
);

export interface APIProjectMemberUser {
  id: string;
  name: string;
  avatar?: string;
  hasAvatar?: boolean;
  aliases?: string[];
}

export interface APIProjectMemberSummary {
  /** Full member responses expose memberId; compact list responses use id and
   * are normalized before entering the editor. */
  memberId: string;
  id?: string;
  userId?: string | null;
  externalId?: string | null;
  displayName: string;
  tags: string[];
  status: 'active' | 'invited' | 'removed';
  isOwner?: boolean;
  /** Site identity of a registered member; null for external members. */
  user?: APIProjectMemberUser | null;
}

export interface APIProjectMember extends APIProjectMemberSummary {
  projectId: string;
  effectivePermissions?: string[];
  version: number;
}

/** 获取团队的项目列表的请求数据 */
interface GetTeamProjectsParams {
  word?: string;
  status?: PROJECT_STATUS;
  mode?: string;
  projectSets?: string[];
  tag?: string;
  workerName?: string;
}
/** 获取团队的项目列表 */
const getTeamProjects = ({
  teamID,
  params,
  configs,
}: {
  teamID: string;
  params?: GetTeamProjectsParams & PaginationParams;
  configs?: AxiosRequestConfig;
}) => {
  return request<Project[]>({
    method: 'GET',
    url: `/v1/teams/${teamID}/projects`,
    params: {
      ...toUnderScoreCase(params),
    },
    ...configs,
  });
};

/** 获取用户的项目列表的请求数据 */
interface GetUserProjectsParams {
  word?: string;
  status?: PROJECT_STATUS;
}
/** 获取用户的项目列表 */
const getUserProjects = ({
  params,
  configs,
}: {
  params?: GetUserProjectsParams & PaginationParams;
  configs?: AxiosRequestConfig;
}) => {
  return request<Project[]>({
    method: 'GET',
    url: `/v1/user/projects`,
    params: { ...toUnderScoreCase(params) },
    ...configs,
  });
};

/** 获取项目 */
const getProject = ({
  id,
  configs,
}: {
  id: string;
  configs?: AxiosRequestConfig;
}) => {
  return request<Project>({
    method: 'GET',
    url: `/v1/projects/${id}`,
    ...configs,
  });
};

/** 新建项目的请求数据 */
interface CreateProjectData {
  name: string;
  intro: string;
  allowApplyType: number;
  applicationCheckType: number;
  defaultRole: string;
  labelplusTxt?: string;
}
/** 新建项目 */
const createProject = ({
  teamID,
  data,
  configs,
}: {
  teamID: string;
  data: CreateProjectData;
  configs?: AxiosRequestConfig;
}) => {
  return request({
    method: 'POST',
    url: `/v1/teams/${teamID}/projects`,
    data: toUnderScoreCase(data),
    ...configs,
  });
};

/** 导入项目的请求数据 */
interface ImportProjectData {
  project: Blob;
  labelplus: Blob;
}
/** 导入项目 */
const importProject = ({
  teamID,
  projectSetID,
  data,
  configs,
}: {
  teamID: string;
  projectSetID: string;
  data: ImportProjectData;
  configs?: AxiosRequestConfig;
}) => {
  const formData = new FormData();
  formData.append('project', new File([data.project], 'project'));
  formData.append('labelplus', new File([data.labelplus], 'labelplus'));

  return request({
    method: 'POST',
    url: `/v1/teams/${teamID}/project-sets/${projectSetID}/project-zips`,
    data: formData,
    ...{
      ...configs,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    },
  });
};

/** 上传文件 */
const uploadFile = ({
  projectID,
  filename,
  file,
  configs,
}: {
  projectID: string;
  filename: string;
  file: Blob;
  configs?: AxiosRequestConfig;
}) => {
  const formData = new FormData();
  formData.append('file', new File([file], filename));

  return request({
    method: 'POST',
    url: `/v1/projects/${projectID}/files`,
    data: formData,
    ...{
      ...configs,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    },
    ...configs,
  });
};

/** 修改项目的请求数据 */
interface EditProjectData {
  name: string;
  intro: string;
  allowApplyType: number;
  applicationCheckType: number;
  /** 导出人员名单的植入页序号：非零整数；null 表示未设置（跟随团队/默认）。 */
  staffListPage?: number | null;
  defaultRole: string;
}
/** 修改项目 */
const editProject = ({
  id,
  data,
  configs,
}: {
  id: string;
  data: EditProjectData;
  configs?: AxiosRequestConfig;
}) => {
  return request({
    method: 'PUT',
    url: `/v1/projects/${id}`,
    data: toUnderScoreCase(data),
    ...configs,
  });
};

/** 完结项目 */
const completeProject = ({
  id,
  expectedVersion,
  configs,
}: {
  id: string;
  expectedVersion?: number;
  configs?: AxiosRequestConfig;
}) => {
  return request({
    method: 'POST',
    url: `/v1/projects/${id}/complete`,
    data: expectedVersion === undefined ? undefined : { expected_version: expectedVersion },
    ...configs,
  });
};

const reopenProject = ({
  id,
  expectedVersion,
  configs,
}: {
  id: string;
  expectedVersion?: number;
  configs?: AxiosRequestConfig;
}) => request({
  method: 'POST',
  url: `/v1/projects/${id}/reopen`,
  data: expectedVersion === undefined ? undefined : { expected_version: expectedVersion },
  ...configs,
});

const clearProject = ({
  id,
  expectedVersion,
  configs,
}: {
  id: string;
  expectedVersion?: number;
  configs?: AxiosRequestConfig;
}) => request({
  method: 'POST',
  url: `/v1/projects/${id}/clear`,
  data: expectedVersion === undefined ? undefined : { expected_version: expectedVersion },
  ...configs,
});

/**
 * @deprecated being retired
 */
const startProjectOCR = ({
  id,
  configs,
}: {
  id: string;
  configs?: AxiosRequestConfig;
}) => {
  return request({
    method: 'POST',
    url: `/v1/projects/${id}/ocr`,
    ...configs,
  });
};

/** 触发画廊归档导入（gid/token 由画廊 URL 解析，可空 galleryUrl 仅供展示） */
const importFromArchive = ({
  projectID,
  gid,
  token,
  galleryUrl,
  configs,
}: {
  projectID: string;
  gid: string;
  token: string;
  galleryUrl?: string;
  configs?: AxiosRequestConfig;
}) =>
  request({
    method: 'POST',
    url: `/v1/projects/${projectID}/import-from-archive`,
    data: toUnderScoreCase({ gid, token, galleryUrl }),
    ...configs,
  });

/** 获取画廊归档导入任务状态（前端轮询） */
const getArchiveImportTask = ({
  projectID,
  configs,
}: {
  projectID: string;
  configs?: AxiosRequestConfig;
}) =>
  request({
    method: 'GET',
    url: `/v1/projects/${projectID}/import-task`,
    ...configs,
  });

/** 关闭项目的归档导入提示（永久存库，前端不再展示） */
const dismissArchiveImportTask = ({
  projectID,
  configs,
}: {
  projectID: string;
  configs?: AxiosRequestConfig;
}) =>
  request({
    method: 'POST',
    url: `/v1/projects/${projectID}/import-task/dismiss`,
    ...configs,
  });

/** 上报项目工作心跳 */
export const postProjectHeartbeat = ({
  projectID,
  action = 'working',
  configs,
}: {
  projectID: string;
  action?: string;
  configs?: AxiosRequestConfig;
}) =>
  request<{
    message: string;
    projectId: string;
    activeUsers: ActivePresenceUser[];
  }>({
    method: 'POST',
    url: `/v1/projects/${projectID}/presence/heartbeat`,
    data: { action },
    ...configs,
  });

/** 离开项目工作状态 */
export const postProjectLeave = ({
  projectID,
  configs,
}: {
  projectID: string;
  configs?: AxiosRequestConfig;
}) =>
  request<{
    message: string;
    projectId: string;
  }>({
    method: 'POST',
    url: `/v1/projects/${projectID}/presence/leave`,
    ...configs,
  });

/** 获取项目当前活跃人员 */
export const getProjectPresence = ({
  projectID,
  configs,
}: {
  projectID: string;
  configs?: AxiosRequestConfig;
}) =>
  request<{
    projectId: string;
    activeUsers: ActivePresenceUser[];
  }>({
    method: 'GET',
    url: `/v1/projects/${projectID}/presence`,
    ...configs,
  });

/** 获取团队下所有正在工作的项目及成员 */
export const getTeamActivePresence = ({
  teamID,
  configs,
}: {
  teamID: string;
  configs?: AxiosRequestConfig;
}) =>
  request<{
    activeProjects: Record<string, ProjectActivePresence>;
  }>({
    method: 'GET',
    url: `/v1/teams/${teamID}/projects/active-presence`,
    ...configs,
  });

/** 向翻译寄送校对稿 */
export const sendProofreadDraft = ({
  projectID,
  targetID,
  ccMyself = true,
  fileID,
  configs,
}: {
  projectID: string;
  targetID: string;
  ccMyself?: boolean;
  fileID?: string;
  configs?: AxiosRequestConfig;
}) =>
  request<{
    message: string;
    recipients: string[];
    changedPagesCount: number;
    changedLabelsCount: number;
  }>({
    method: 'POST',
    url: `/v1/projects/${projectID}/targets/${targetID}/send-proofread-draft`,
    data: toUnderScoreCase({ ccMyself, fileID }),
    ...configs,
  });

export default {
  getUserProjects,
  getTeamProjects,
  getProject,
  createProject,
  editProject,
  completeProject,
  reopenProject,
  clearProject,
  startProjectOCR,
  importProject,
  uploadFile,
  importFromArchive,
  getArchiveImportTask,
  dismissArchiveImportTask,
  postProjectHeartbeat,
  postProjectLeave,
  getProjectPresence,
  getTeamActivePresence,
  sendProofreadDraft,
};
