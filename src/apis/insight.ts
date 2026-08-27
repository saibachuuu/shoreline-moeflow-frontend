/**
 * 角色相关 API
 */
import { AxiosRequestConfig } from 'axios';
import { PaginationParams, request } from '.';
import { toUnderScoreCase } from '../utils';
import { APIProjectMemberSummary } from './project';
import { APIUser } from './user';
import { APIOutput } from './output';
import { ProjectSet } from '../interfaces';

/** Project fields used by user insight; permissions and legacy roles are excluded. */
export interface APIInsightUserProject {
  groupType: 'project';
  id: string;
  name: string;
  projectSet: ProjectSet;
  memberSummary?: APIProjectMemberSummary[];
}
export interface APIInsightUser {
  user: APIUser;
  projects: APIInsightUserProject[];
  count: number;
}

export interface APIInsightProjectUser {
  id: string;
  userId?: string | null;
  name?: string;
  displayName: string;
  tags: string[];
  status: 'active' | 'invited' | 'removed';
  externalId?: string | null;
}
export interface APIInsightProject {
  project: APIInsightUserProject;
  users: APIInsightProjectUser[];
  outputs?: APIOutput[];
  count: number;
}

/** 获取团队人员洞悉的请求数据 */
interface GetTeamInsightUsersParams {
  word?: string;
}
/** 获取团队人员洞悉 */
const getTeamInsightUsers = ({
  teamID,
  params,
  configs,
}: {
  teamID: string;
  params?: GetTeamInsightUsersParams & PaginationParams;
  configs?: AxiosRequestConfig;
}) => {
  return request<APIInsightUser[]>({
    method: 'GET',
    url: `/v1/teams/${teamID}/insight/users`,
    params: toUnderScoreCase(params),
    ...configs,
  });
};

/** 获取团队人员洞悉的项目列表 */
const getTeamInsightUserProjects = ({
  teamID,
  userID,
  params,
  configs,
}: {
  teamID: string;
  userID: string;
  params?: PaginationParams;
  configs?: AxiosRequestConfig;
}) => {
  return request<APIInsightUserProject[]>({
    method: 'GET',
    url: `/v1/teams/${teamID}/insight/users/${userID}/projects`,
    params: toUnderScoreCase(params),
    ...configs,
  });
};

/** 获取团队项目洞悉的请求数据 */
interface GetTeamInsightProjectsParams {
  word?: string;
}
/** 获取团队项目洞悉 */
const getTeamInsightProjects = ({
  teamID,
  params,
  configs,
}: {
  teamID: string;
  params?: GetTeamInsightProjectsParams & PaginationParams;
  configs?: AxiosRequestConfig;
}) => {
  return request<APIInsightProject[]>({
    method: 'GET',
    url: `/v1/teams/${teamID}/insight/projects`,
    params: toUnderScoreCase(params),
    ...configs,
  });
};

/** 获取团队项目洞悉人员列表 */
const getTeamInsightProjectUsers = ({
  teamID,
  projectID,
  params,
  configs,
}: {
  teamID: string;
  projectID: string;
  params?: PaginationParams;
  configs?: AxiosRequestConfig;
}) => {
  return request<APIInsightProjectUser[]>({
    method: 'GET',
    url: `/v1/teams/${teamID}/insight/projects/${projectID}/users`,
    params: toUnderScoreCase(params),
    ...configs,
  });
};

export default {
  getTeamInsightUsers,
  getTeamInsightUserProjects,
  getTeamInsightProjects,
  getTeamInsightProjectUsers,
};
