import { Role } from '@/interfaces';
import {
  projectInvitationPositionOptions,
  teamInvitationRoleOptions,
  isProjectWorkerTag,
} from './invitationOptions';

describe('invitation options for the current identity system', () => {
  const role = (
    id: string,
    name: string,
    systemCode: string,
    level: number,
  ): Role =>
    ({
      id,
      name,
      level,
      create_time: '',
      permissions: [],
      // /v1/types/system-role 返回原始 snake_case 字段
      system_code: systemCode,
    }) as Role;

  test('team options keep only the current base identities', () => {
    const options = teamInvitationRoleOptions([
      role('r1', '创建人', 'creator', 500),
      role('r2', '管理员', 'admin', 400),
      role('r3', '资深成员', 'senior', 300),
      role('r4', '成员', 'member', 200),
      role('r5', '见习成员', 'beginner', 100),
    ]);
    expect(options.map((item) => item.name)).toEqual([
      '创建人',
      '管理员',
      '成员',
    ]);
  });

  test('team options tolerate camelCase systemCode and unknown roles', () => {
    const options = teamInvitationRoleOptions([
      {
        id: 'a',
        name: '管理员',
        level: 400,
        create_time: '',
        permissions: [],
        systemCode: 'admin',
      },
      {
        id: 'b',
        name: '未知',
        level: 300,
        create_time: '',
        permissions: [],
        system_code: 'archived_role',
      } as Role,
    ]);
    expect(options.map((item) => item.id)).toEqual(['a']);
  });

  test('project position options match the worker tags of the identity system', () => {
    const codes = projectInvitationPositionOptions.map((item) => item.code);
    expect(codes).toEqual([
      'raw_provider',
      'scanner',
      'cropper',
      'cleaner',
      'translator',
      'proofreader',
      'typesetter',
    ]);
    expect(projectInvitationPositionOptions.every((item) => item.labelId)).toBe(
      true,
    );
    expect(isProjectWorkerTag('translator')).toBe(true);
    expect(isProjectWorkerTag('proofreader')).toBe(true);
    expect(isProjectWorkerTag('creator')).toBe(false);
    expect(isProjectWorkerTag('supporter')).toBe(false);
  });
});
