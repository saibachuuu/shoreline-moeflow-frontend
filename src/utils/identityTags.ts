import { PROJECT_WORKER_ROLES } from '@/apis/project';

export interface IdentityTagOption {
  code: string;
  name?: string;
  source?: string;
  assignable?: boolean;
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

export const normalizeIdentityTagPolicy = (raw: any): IdentityTagPolicy => {
  if (!raw) {
    return { version: 0, teamTags: {}, projectTags: {} };
  }
  const mapTags = (tagsRecord: any): Record<string, IdentityTagDefinition> => {
    if (!tagsRecord || typeof tagsRecord !== 'object') return {};
    const result: Record<string, IdentityTagDefinition> = {};
    for (const [tagCode, tagDef] of Object.entries(tagsRecord)) {
      if (!tagDef || typeof tagDef !== 'object') continue;
      const def = tagDef as any;
      result[tagCode] = {
        code: def.code || tagCode,
        name: def.name || tagCode,
        permissions: Array.isArray(def.permissions) ? def.permissions : [],
        assignable: typeof def.assignable === 'boolean' ? def.assignable : true,
        source: def.source,
        initialPermissions: def.initial_permissions || def.initialPermissions,
        initialAssignable:
          typeof def.initial_assignable === 'boolean'
            ? def.initial_assignable
            : def.initialAssignable,
      };
    }
    return result;
  };
  return {
    version: raw.version || 0,
    teamTags: mapTags(raw.team_tags || raw.teamTags),
    projectTags: mapTags(raw.project_tags || raw.projectTags),
  };
};

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
