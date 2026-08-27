import { Role } from '@/interfaces';

/**
 * Current identity options for the invitation screens.
 *
 * The legacy invitation workflow still stores an Invitation.role document
 * (TeamRole/ProjectRole), but the current identity system only knows team
 * base tags (creator/admin/member) and project worker positions.  These
 * helpers keep the UI options aligned with the current identities: legacy
 * roles that no longer exist (资深成员/见习成员, 监理/见习翻译, ...) are
 * filtered out so users never pick an identity that gets silently downgraded.
 */

/** Base identity tags a team invitation may carry (creator stays level-gated). */
export const TEAM_INVITATION_BASE_TAGS = [
  'creator',
  'admin',
  'member',
] as const;

/** Keep only the legacy team roles that map to the current base identities. */
export const teamInvitationRoleOptions = (roles: Role[]): Role[] =>
  roles.filter((role) => {
    // /v1/types/system-role returns the raw snake_case field.
    const code =
      (role as { system_code?: string }).system_code || role.systemCode;
    return Boolean(
      code && (TEAM_INVITATION_BASE_TAGS as readonly string[]).includes(code),
    );
  });

/**
 * Project worker positions selectable on a project invitation.
 *
 * Mirrors PROJECT_WORKER_ROLES in @/apis/project, but lives here so utility
 * tests run in the node jest environment without pulling the apis/components
 * chain (which imports static assets jest cannot parse).
 */
export const projectInvitationPositionOptions: ReadonlyArray<{
  code: string;
  labelId: string;
}> = [
  { code: 'raw_provider', labelId: 'site.invitationOptions.rawProvider' },
  { code: 'scanner', labelId: 'site.invitationOptions.scanner' },
  { code: 'cropper', labelId: 'site.invitationOptions.cropper' },
  { code: 'cleaner', labelId: 'site.invitationOptions.cleaner' },
  { code: 'translator', labelId: 'site.invitationOptions.translator' },
  { code: 'proofreader', labelId: 'site.invitationOptions.proofreader' },
  { code: 'typesetter', labelId: 'site.invitationOptions.typesetter' },
];

/** Whether the given tags are the current project worker position tags. */
export const isProjectWorkerTag = (code: string): boolean =>
  projectInvitationPositionOptions.some((option) => option.code === code);
