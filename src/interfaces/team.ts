import { Role } from './role';

/** 画廊归档导入的第三方档案 API key（后端脱敏后返回：仅尾号与备注）。 */
export interface ArchiveApiKey {
  id: string;
  remark: string;
  enabled: boolean;
  keyTail: string;
}

// 团队
export interface Team {
  groupType: 'team';
  id: string;
  name: string;
  intro: string;
  hasAvatar: boolean;
  avatar: string | null;
  allowApplyType: number;
  isNeedCheckApplication: boolean;
  maxUser: number;
  userCount: number;
  workerQualificationMode?: 'qualified' | 'open';
  /** 团队内项目默认的导出人员名单植入页序号（null=未设置）。 */
  staffListPage?: number | null;
  createTime: string;
  editTime: string;
  joined?: boolean;
  /** Legacy invitation responses may still include this field; it is not a permission source. */
  role?: Role;
  effectivePermissions?: string[];
  baseTag?: 'creator' | 'admin' | 'member';
  ocrQuotaMonth: number;
  ocrQuotaUsed: number;
  /** 画廊归档导入的第三方档案 API key（脱敏列表）。 */
  archiveApiKeys?: ArchiveApiKey[];
  /** 画廊归档导入的第三方档案 API 基址（空 = 使用系统默认）。 */
  archiveApiUrl?: string;
}
// 用户的团队（包含角色）
export interface UserTeam extends Team {}
