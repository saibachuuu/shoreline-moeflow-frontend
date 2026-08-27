/**
 * 角色相关 API
 */
import { request } from '.';
import { AxiosRequestConfig } from 'axios';
import { toUnderScoreCase } from '../utils';
import { PaginationParams } from '.';

/** 获取个人团队列表的请求数据 */
interface GetUserTeamsParams {
  word?: string;
}
/** 获取个人团队列表 */
const getUserTeams = ({
  params,
  configs,
}: {
  params?: GetUserTeamsParams & PaginationParams;
  configs?: AxiosRequestConfig;
} = {}) => {
  return request({
    method: 'GET',
    url: `/v1/user/teams`,
    params: toUnderScoreCase(params),
    ...configs,
  });
};

/** 获取团队列表的请求数据 */
interface GetTeamsParams {
  word: string;
}
/** 获取团队列表 */
const getTeams = ({
  params,
  configs,
}: {
  params: GetTeamsParams & PaginationParams;
  configs?: AxiosRequestConfig;
}) => {
  return request({
    method: 'GET',
    url: `/v1/teams`,
    params: toUnderScoreCase(params),
    ...configs,
  });
};

/** 获取团队 */
const getTeam = ({
  id,
  configs,
}: {
  id: string;
  configs?: AxiosRequestConfig;
}) => {
  return request({
    method: 'GET',
    url: `/v1/teams/${id}`,
    ...configs,
  });
};

/** 新建团队的请求数据 */
interface CreateTeamData {
  name: string;
  intro: string;
  allowApplyType: number;
  applicationCheckType: number;
  defaultRole: string;
}
/** 新建团队 */
const createTeam = ({
  data,
  configs,
}: {
  data: CreateTeamData;
  configs?: AxiosRequestConfig;
}) => {
  return request({
    method: 'POST',
    url: `/v1/teams`,
    data: toUnderScoreCase(data),
    ...configs,
  });
};

/** 修改团队的请求数据（字段均可选，只发送本次要改的字段） */
interface EditTeamData {
  name?: string;
  intro?: string;
  allowApplyType?: number;
  applicationCheckType?: number;
  defaultRole?: string;
  /** 工作人员资格校验模式：qualified 校验 / open 全员可加入任意职位（仅团队创建者可改）。 */
  workerQualificationMode?: 'qualified' | 'open';
  /** 团队内项目默认的导出人员名单植入页序号（非零整数；null 表示未设置）。 */
  staffListPage?: number | null;
  /** 画廊归档导入的第三方档案 API key 列表：含 id 的项保留/更新，含 key 的项新增，未引用的旧 id 被删除。 */
  archiveApiKeys?: { id?: string; key?: string; remark?: string; enabled?: boolean }[];
  /** 画廊归档导入的第三方档案 API 基址（空字符串 = 使用系统默认）。 */
  archiveApiUrl?: string;
}
/** 修改团队 */
const editTeam = ({
  id,
  data,
  configs,
}: {
  id: string;
  data: EditTeamData;
  configs?: AxiosRequestConfig;
}) => {
  return request({
    method: 'PUT',
    url: `/v1/teams/${id}`,
    data: toUnderScoreCase(data),
    ...configs,
  });
};

/** 解散团队 */
const deleteTeam = ({
  id,
  configs,
}: {
  id: string;
  configs?: AxiosRequestConfig;
}) => {
  return request({
    method: 'DELETE',
    url: `/v1/teams/${id}`,
    ...configs,
  });
};

export default {
  getUserTeams,
  getTeams,
  getTeam,
  createTeam,
  editTeam,
  deleteTeam,
};
