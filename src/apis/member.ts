import { AxiosRequestConfig } from 'axios';
import { request, PaginationParams } from '.';
import { toUnderScoreCase } from '../utils';
import { toLowerCamelCase } from '../utils';
import { APIProjectMember } from './project';

export interface ProjectMemberChange {
  operationId: string;
  action: 'add' | 'update';
  memberId?: string;
  userId?: string;
  externalId?: string;
  displayName?: string;
  tags?: string[];
  expectedMemberVersion?: number;
  changes?: {
    displayName?: string;
    tags?: string[];
    status?: 'removed';
  };
}

export interface ProjectMemberChangesData {
  operations: ProjectMemberChange[];
}

export interface ProjectMemberMergeData {
  targetMemberId: string;
  expectedSourceVersion: number;
  expectedTargetVersion: number;
  displayName: string;
  tags: string[];
}

export interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  user: {
    id: string;
    name: string;
    aliases?: string[];
    avatar?: string;
    hasAvatar?: boolean;
  };
  baseTag: 'creator' | 'admin' | 'member';
  tags: string[];
  workerQualifications: string[];
  aliases: string[];
  /** 加入项目时默认使用的展示名（空 = 未设置，回退到注册用户名） */
  defaultDisplayName: string;
  version: number;
  status: 'active' | 'removed';
}

export interface IdentityTagDefinition {
  code: string;
  name: string;
  permissions: string[];
  assignable: boolean;
  source: 'site' | 'team' | 'team_override';
  initialPermissions?: string[];
  initialAssignable?: boolean;
}

export interface IdentityTagPolicy {
  version: number;
  teamTags: Record<string, IdentityTagDefinition>;
  projectTags: Record<string, IdentityTagDefinition>;
}

const getProjectMembers = ({
  projectID,
  params,
  configs,
}: {
  projectID: string;
  params?: {
    // The backend accepts a comma-separated status list
    // (``active,invited,removed``) so the member screen loads all states in
    // one request instead of fanning out per status.
    status?: string;
    tag?: string;
    word?: string;
  } & PaginationParams;
  configs?: AxiosRequestConfig;
}) => request<any[]>({
  method: 'GET',
  url: `/v1/projects/${projectID}/members`,
  params: toUnderScoreCase(params),
  ...configs,
}).then((result) => ({ ...result, data: result.data.map((item: any) => ({ ...toLowerCamelCase(item), memberId: item.id })) }));

const applyProjectMemberChanges = ({
  projectID,
  data,
  configs,
}: {
  projectID: string;
  data: ProjectMemberChangesData;
  configs?: AxiosRequestConfig;
}) => request({
  method: 'POST',
  url: `/v1/projects/${projectID}/members/changes`,
  data: toUnderScoreCase(data),
  ...configs,
});

const bindProjectMember = ({
  projectID,
  memberID,
  userID,
  expectedVersion,
  configs,
}: {
  projectID: string;
  memberID: string;
  userID: string;
  expectedVersion: number;
  configs?: AxiosRequestConfig;
}) => request({
  method: 'POST',
  url: `/v1/projects/${projectID}/members/${memberID}/bind`,
  data: { user_id: userID, expected_version: expectedVersion },
  ...configs,
});

const mergeProjectMember = ({
  projectID,
  memberID,
  data,
  configs,
}: {
  projectID: string;
  memberID: string;
  data: ProjectMemberMergeData;
  configs?: AxiosRequestConfig;
}) => request({
  method: 'POST',
  url: `/v1/projects/${projectID}/members/${memberID}/merge`,
  data: toUnderScoreCase(data),
  ...configs,
});

const transferProjectOwner = ({
  projectID,
  newOwnerUserID,
  expectedOwnerUserID,
  expectedVersion,
  configs,
}: {
  projectID: string;
  newOwnerUserID: string;
  expectedOwnerUserID?: string;
  expectedVersion?: number;
  configs?: AxiosRequestConfig;
}) => request({
  method: 'POST',
  url: `/v1/projects/${projectID}/owner/transfer`,
  data: toUnderScoreCase({
    newOwnerUserId: newOwnerUserID,
    expectedOwnerUserId: expectedOwnerUserID,
    expectedVersion,
  }),
  ...configs,
});

const getTeamMembers = ({
  teamID,
  params,
  configs,
}: {
  teamID: string;
  params?: {
    // Comma-separated status list (``active,removed``) so both states load
    // in one request.
    status?: string;
    word?: string;
  } & PaginationParams;
  configs?: AxiosRequestConfig;
}) => request<any[]>({
  method: 'GET',
  url: `/v1/teams/${teamID}/members`,
  params: toUnderScoreCase(params),
  ...configs,
}).then((result) => ({ ...result, data: result.data.map((item: any) => toLowerCamelCase(item)) }));

const addTeamMember = ({
  teamID,
  data,
  configs,
}: {
  teamID: string;
  data: {
    userId: string;
    baseTag?: string;
    tags?: string[];
    workerQualifications?: string[];
  };
  configs?: AxiosRequestConfig;
}) => request<{ member: TeamMember }>({
  method: 'POST',
  url: `/v1/teams/${teamID}/members`,
  data: toUnderScoreCase(data),
  ...configs,
});

const updateTeamMember = ({
  teamID,
  memberID,
  data,
  configs,
}: {
  teamID: string;
  memberID: string;
  data: {
    expectedVersion: number;
    baseTag?: string;
    tags?: string[];
    workerQualifications?: string[];
  };
  configs?: AxiosRequestConfig;
}) => request<{ member: TeamMember }>({
  method: 'PATCH',
  url: `/v1/teams/${teamID}/members/${memberID}`,
  data: toUnderScoreCase(data),
  ...configs,
});

const removeTeamMember = ({
  teamID,
  memberID,
  expectedVersion,
  configs,
}: {
  teamID: string;
  memberID: string;
  expectedVersion?: number;
  configs?: AxiosRequestConfig;
}) => request<{ member: TeamMember }>({
  method: 'DELETE',
  url: `/v1/teams/${teamID}/members/${memberID}`,
  data: toUnderScoreCase({ expectedVersion }),
  ...configs,
});

const updateTeamMemberAliases = ({
  teamID,
  memberID,
  aliases,
  expectedVersion,
  configs,
}: {
  teamID: string;
  memberID: string;
  aliases: string[];
  expectedVersion: number;
  configs?: AxiosRequestConfig;
}) => request<{ member: TeamMember }>({
  method: 'PATCH',
  url: `/v1/teams/${teamID}/members/${memberID}/aliases`,
  data: toUnderScoreCase({ aliases, expectedVersion }),
  ...configs,
});

const updateTeamMemberDefaultDisplayName = ({
  teamID,
  memberID,
  defaultDisplayName,
  expectedVersion,
  syncToProjects,
  configs,
}: {
  teamID: string;
  memberID: string;
  defaultDisplayName: string;
  expectedVersion: number;
  syncToProjects?: boolean;
  configs?: AxiosRequestConfig;
}) => request<{ member: TeamMember }>({
  method: 'PATCH',
  url: `/v1/teams/${teamID}/members/${memberID}/default-display-name`,
  data: toUnderScoreCase({ defaultDisplayName, expectedVersion, syncToProjects }),
  ...configs,
});

const getIdentityTagPolicy = ({
  teamID,
  configs,
}: { teamID: string; configs?: AxiosRequestConfig }) =>
  request<IdentityTagPolicy>({
    method: 'GET',
    url: `/v1/teams/${teamID}/identity-tag-policy`,
    ...configs,
  });

const updateIdentityTagPolicy = ({
  teamID,
  data,
  configs,
}: {
  teamID: string;
  data: {
    expectedVersion: number;
    upserts: Array<IdentityTagDefinition & { scope: 'team' | 'project' }>;
    removes: Array<{ scope: 'team' | 'project'; code: string }>;
  };
  configs?: AxiosRequestConfig;
}) => request<IdentityTagPolicy>({
  method: 'PATCH',
  url: `/v1/teams/${teamID}/identity-tag-policy`,
  data: toUnderScoreCase(data),
  ...configs,
});

export default {
  getProjectMembers,
  applyProjectMemberChanges,
  bindProjectMember,
  mergeProjectMember,
  transferProjectOwner,
  getTeamMembers,
  addTeamMember,
  updateTeamMember,
  removeTeamMember,
  updateTeamMemberAliases,
  updateTeamMemberDefaultDisplayName,
  getIdentityTagPolicy,
  updateIdentityTagPolicy,
};
