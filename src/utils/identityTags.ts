import { PROJECT_WORKER_ROLES } from '@/apis/project';

export interface IdentityTagOption {
  code: string;
  name?: string;
  source?: string;
  assignable?: boolean;
}

interface TaggedMember {
  tags?: string[];
}

const PROTECTED_PROJECT_PERMISSIONS = new Set([
  'project:COMPLETE_PROJECT',
  'project:MANAGE_MEMBERS',
]);

export const filterIdentityTagPermissions = (
  permissions: string[],
  scope: 'team' | 'project',
  source?: string,
): string[] => {
  if (scope !== 'project' || source === 'site' || source === 'team_override') {
    return permissions;
  }
  return permissions.filter((permission) => !PROTECTED_PROJECT_PERMISSIONS.has(permission));
};

/** Keep project member editing usable when the team policy endpoint is restricted. */
export const buildFallbackIdentityTagOptions = (
  scope: 'team' | 'project',
  members: TaggedMember[] = [],
): IdentityTagOption[] => {
  const baseOptions = scope === 'project'
    ? PROJECT_WORKER_ROLES.map((role) => ({
      code: role.key,
      name: role.label,
      source: 'site',
      assignable: true,
    }))
    : [];
  const knownCodes = new Set<string>(baseOptions.map((option) => option.code));
  const memberCodes = members
    .flatMap((member) => member.tags || [])
    .filter((code) => code && !knownCodes.has(code));
  const extraOptions = [...new Set(memberCodes)].map((code) => ({
    code,
    name: code,
    source: 'member',
    assignable: true,
  }));
  return [...baseOptions, ...extraOptions];
};

export const mergeIdentityTagOptions = (
  options: IdentityTagOption[],
  members: TaggedMember[],
  scope: 'team' | 'project',
): IdentityTagOption[] => {
  const knownCodes = new Set(options.map((option) => option.code));
  const missing = buildFallbackIdentityTagOptions(scope, members)
    .filter((option) => !knownCodes.has(option.code));
  return [...options, ...missing];
};
