import { GroupTypes } from './type';
import { request, PaginationParams } from '.';
import { toPlural, toUnderScoreCase } from '../utils';
import { AxiosRequestConfig } from 'axios';
import { Role, UserTeam } from '../interfaces';
import { APIProject } from './project';
import { InvitationStatuses } from '../constants';
import { APIUser } from './user';

export interface APIBaseInvitation {
  id: string;
  user: APIUser;
  role: Role;
  operator: APIUser | null;
  createTime: string;
  status: InvitationStatuses;
}
export interface APITeamInvitation extends APIBaseInvitation {
  group: UserTeam;
  groupType: 'team';
}
export interface APIProjectInvitation extends APIBaseInvitation {
  group: APIProject;
  groupType: 'project';
}
export type APIInvitation = APITeamInvitation | APIProjectInvitation;

/** 获取团体邀请列表的请求数据 */
interface GetInvitationsParams {}
/** 获取团体邀请列表 */
const getInvitations = ({
  groupType,
  groupID,
  params,
  configs,
}: {
  groupType: GroupTypes;
  groupID: string;
  params: GetInvitationsParams & PaginationParams;
  configs?: AxiosRequestConfig;
}) => {
  return request<APIInvitation[]>({
    method: 'GET',
    url: `/v1/${toPlural(groupType)}/${groupID}/invitations`,
    params: toUnderScoreCase(params),
    ...configs,
  });
};

/** 创建邀请的请求数据 */
interface CreateInvitationData {
  userID: string;
  /** 团队邀请使用旧角色 id；项目邀请使用当前身份职位标签。 */
  roleID?: string;
  /** 项目邀请的职位标签（当前身份系统）。 */
  tags?: string[];
  message: string;
}
/** 创建邀请 */
const createInvitation = ({
  groupType,
  groupID,
  data,
  configs,
}: {
  groupType: GroupTypes;
  groupID: string;
  data: CreateInvitationData;
  configs?: AxiosRequestConfig;
}) => {
  return request({
    method: 'POST',
    url: `/v1/${toPlural(groupType)}/${groupID}/invitations`,
    data: toUnderScoreCase(data),
    ...configs,
  });
};

/** 修改邀请的请求数据：团队邀请改角色 id；项目邀请改职位标签。 */
interface EditInvitationData {
  roleID?: string;
  tags?: string[];
}
/** 修改邀请（角色） */
const editInvitation = ({
  invitationID,
  data,
  configs,
}: {
  invitationID: string;
  data: EditInvitationData;
  configs?: AxiosRequestConfig;
}) => {
  return request({
    method: 'PUT',
    url: `/v1/invitations/${invitationID}`,
    data: toUnderScoreCase(data),
    ...configs,
  });
};

/** 处理邀请的请求数据 */
interface DealInvitationData {
  allow: boolean;
}
/** 处理邀请 */
const dealInvitation = ({
  invitationID,
  data,
  configs,
}: {
  invitationID: string;
  data: DealInvitationData;
  configs?: AxiosRequestConfig;
}) => {
  return request({
    method: 'PATCH',
    url: `/v1/invitations/${invitationID}`,
    data: toUnderScoreCase(data),
    ...configs,
  });
};

/** 删除邀请 */
const deleteInvitation = ({
  invitationID,
  configs,
}: {
  invitationID: string;
  configs?: AxiosRequestConfig;
}) => {
  return request({
    method: 'DELETE',
    url: `/v1/invitations/${invitationID}`,
    ...configs,
  });
};

export default {
  getInvitations,
  createInvitation,
  editInvitation,
  dealInvitation,
  deleteInvitation,
};
