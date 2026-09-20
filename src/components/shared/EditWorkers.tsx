import { css } from '@emotion/core';
import { Input, Modal, Spin, message } from 'antd';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import { useHistory, useLocation } from 'react-router-dom';
import { Avatar, EditingStatusBadge, Icon, Tooltip } from '@/components';
import { useProjectHeartbeat } from '@/hooks';
import { api } from '@/apis';
import { APIProjectMember, PROJECT_WORKER_ROLES } from '@/apis/project';
import { APIUser } from '@/apis/user';
import { TeamMember } from '@/apis/member';
import {
  canAssignProjectWorkerTag,
  canEditProjectMemberInQuickMenu,
  canLeaveProjectFromQuickMenu,
  ProjectMemberDraft,
  diffProjectMembers,
  mergeExternalMemberTag,
  mergeExternalMemberWithoutTags,
  mergeMemberTag,
  mergeMemberWithoutTags,
  projectMemberDisplayLabel,
  projectMemberOperationId,
  teamSearchResultLabel,
} from '@/utils/projectMembers';
import style from '@/style';
import { clickEffect } from '@/utils/style';

// Device-level preference for which editing panel opens first (like the
// themeMode preference): 'full' (default) or 'simple'.
const EDIT_WORKERS_MODE_KEY = 'editWorkersMode';

interface EditWorkersProps {
  projectId: string;
  teamId: string;
  members: APIProjectMember[];
  canManageMembers: boolean;
  currentUserId: string;
  qualificationMode?: 'qualified' | 'open';
  onSave: (operations: ReturnType<typeof diffProjectMembers>) => Promise<void>;
  onRefresh?: () => Promise<void>;
  onCancel: () => void;
}

const toDraft = (member: APIProjectMember): ProjectMemberDraft => ({
  id: member.memberId || (member as APIProjectMember & { id?: string }).id,
  userId: member.userId,
  externalId: member.externalId,
  displayName: member.displayName,
  tags: member.tags,
  status: member.status,
  version: member.version,
  isOwner: member.isOwner,
});

const resultKey = (member: APIProjectMember | TeamMember | APIUser): string => {
  if ('memberId' in member) return `project-member:${member.memberId}`;
  if ('user' in member) return `team-member:${member.id}`;
  return `user:${member.id}`;
};

// Position accent colors for the left job rail (kept in the project palette).
const JOB_COLORS: Record<string, string> = {
  raw_provider: '#8b5cf6',
  scanner: '#f59e0b',
  cropper: '#10b981',
  cleaner: '#06b6d4',
  translator: '#3b82f6',
  proofreader: '#ef4444',
  typesetter: '#ec4899',
};

export const EditWorkers = ({
  projectId,
  teamId,
  members,
  canManageMembers,
  currentUserId,
  qualificationMode = 'qualified',
  onSave,
  onRefresh,
  onCancel,
}: EditWorkersProps) => {
  const { formatMessage } = useIntl();
  const { presence } = useProjectHeartbeat(projectId, { action: 'staff' });

  /** 将 PROJECT_WORKER_ROLES 的职位名本地化，未知职位保留原文 */
  const projectRoleLabel = (roleKey: string) => {
    const found = PROJECT_WORKER_ROLES.find((item) => item.key === roleKey);
    return found
      ? formatMessage({ id: `project.workerRole.${found.key}` })
      : roleKey;
  };
  const history = useHistory();
  const location = useLocation();
  const [original] = useState(() => members.map(toDraft));
  const [draft, setDraft] = useState(() => members.map(toDraft));
  const [role, setRole] = useState(PROJECT_WORKER_ROLES[0].key);
  const [word, setWord] = useState('');
  const [results, setResults] = useState<
    Array<APIProjectMember | TeamMember | APIUser>
  >([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [teamMembersLoaded, setTeamMembersLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  // Remember the panel mode on this device (like themeMode): open the editor
  // in the mode the user used last time instead of always defaulting to full.
  const [simpleMode, setSimpleMode] = useState(() => {
    try {
      return window.localStorage.getItem(EDIT_WORKERS_MODE_KEY) === 'simple';
    } catch {
      return false;
    }
  });
  // The simplified panel has one input per role; at most one dropdown is open.
  const [simpleFocusRole, setSimpleFocusRole] = useState<string | null>(null);
  // Per-role query text: typing in one simplified row must never leak into
  // another row, so every row keeps its own independent search word.
  const [simpleWords, setSimpleWords] = useState<Record<string, string>>({});
  const [editingMemberKey, setEditingMemberKey] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const openPanel = () => {
    setWord('');
    setResults([]);
    setPanelOpen(true);
  };

  const closePanel = () => {
    setWord('');
    setResults([]);
    setPanelOpen(false);
  };

  const selectRole = (nextRole: Parameters<typeof setRole>[0]) => {
    setRole(nextRole);
    closePanel();
  };

  const toggleMode = () => {
    const next = !simpleMode;
    try {
      window.localStorage.setItem(
        EDIT_WORKERS_MODE_KEY,
        next ? 'simple' : 'full',
      );
    } catch {
      // Storage may be unavailable (e.g. private mode); the preference
      // simply won't persist for the next visit.
    }
    setSimpleFocusRole(null);
    setWord('');
    setSimpleWords({});
    setResults([]);
    setSimpleMode(next);
  };

  // Candidates shown by an empty add-input: every joined (non-removed) draft
  // member, marked whether they already hold the given role.
  const joinedCandidatesFor = (roleKey: string) =>
    draft
      .filter((member) => member.status !== 'removed')
      .map((member) => ({ member, holdsRole: member.tags.includes(roleKey) }));

  // Load the full active team once: qualification checks (canAssignRole) look
  // up workerQualifications/baseTag from this list.
  useEffect(() => {
    if (teamMembersLoaded) return;
    api.member
      .getTeamMembers({
        teamID: teamId,
        params: { status: 'active', limit: 1000 },
      })
      .then((result) => {
        setTeamMembers(result.data);
        setTeamMembersLoaded(true);
      })
      .catch((error) => error.default());
  }, [teamId, teamMembersLoaded]);

  // Registered user identity (site name + avatar) for every member that can
  // appear in the editor: pre-existing project members carry it on the
  // ``user`` object, and search results carry it on the team-member ``user``.
  // External members have no registered identity and keep the default avatar.
  const userInfoByUserId = useMemo(() => {
    const map = new Map<
      string,
      { name: string; avatar?: string; hasAvatar?: boolean; aliases: string[] }
    >();
    const mergeUser = (
      userId: string,
      info: {
        name: string;
        avatar?: string;
        hasAvatar?: boolean;
        aliases?: string[];
      },
    ) => {
      const existing = map.get(userId);
      if (!existing) {
        map.set(userId, {
          name: info.name,
          avatar: info.avatar,
          hasAvatar: info.hasAvatar,
          aliases: info.aliases || [],
        });
      } else {
        if (!existing.name && info.name) existing.name = info.name;
        if (!existing.avatar && info.avatar) existing.avatar = info.avatar;
        if (existing.hasAvatar === undefined && info.hasAvatar !== undefined) {
          existing.hasAvatar = info.hasAvatar;
        }
        if (
          (!existing.aliases || existing.aliases.length === 0) &&
          info.aliases?.length
        ) {
          existing.aliases = info.aliases;
        }
      }
    };

    members.forEach((member) => {
      const uid = member.userId || member.user?.id;
      if (uid) {
        mergeUser(uid, {
          name: member.user?.name || '',
          avatar: member.user?.avatar,
          hasAvatar: member.user?.hasAvatar,
          aliases: member.user?.aliases,
        });
      }
    });
    teamMembers.forEach((teamMember) => {
      const uid = teamMember.userId || teamMember.user?.id;
      if (uid) {
        mergeUser(uid, {
          name: teamMember.user?.name || '',
          avatar: teamMember.user?.avatar,
          hasAvatar: teamMember.user?.hasAvatar,
          aliases: teamMember.user?.aliases,
        });
      }
    });
    results.forEach((result) => {
      if ('user' in result && result.user) {
        const uid = result.user.id || result.userId;
        if (uid) {
          mergeUser(uid, {
            name: result.user.name,
            avatar: result.user.avatar,
            hasAvatar: result.user.hasAvatar,
            aliases: result.user.aliases,
          });
        }
      } else if (!('user' in result) && !('memberId' in result) && result.id) {
        mergeUser(result.id, {
          name: result.name,
          avatar: result.avatar,
          hasAvatar: result.hasAvatar,
          aliases: result.aliases,
        });
      } else if ('memberId' in result) {
        const uid = result.userId || result.user?.id;
        if (uid) {
          mergeUser(uid, {
            name: result.user?.name || '',
            avatar: result.user?.avatar,
            hasAvatar: result.user?.hasAvatar,
            aliases: result.user?.aliases,
          });
        }
      }
    });
    return map;
  }, [members, teamMembers, results]);

  // Search is role-scoped: typing queries the team, clicking a result adds that
  // registered member with the current role tag.  Empty input shows the joined
  // members as candidates instead of querying.
  //
  // The effective query is the full panel's shared ``word``, or the focused
  // simplified row's own word (each row keeps an independent query).
  const activeQuery = simpleMode
    ? simpleFocusRole
      ? simpleWords[simpleFocusRole] || ''
      : ''
    : word;

  useEffect(() => {
    if (!activeQuery.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }
    const timer = window.setTimeout(() => {
      setLoading(true);
      api.member
        .getTeamMembers({
          teamID: teamId,
          params: { status: 'active', word: activeQuery.trim(), limit: 50 },
        })
        .then((result) => setResults(result.data))
        .catch((error) => error.default())
        .finally(() => setLoading(false));
    }, 300);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId, activeQuery]);

  // Editable draft members holding a role, for the full panel's member list.
  const draftForRole = (roleKey: string) =>
    draft.filter(
      (member) =>
        member.status !== 'removed' &&
        member.tags.includes(roleKey) &&
        canEditProjectMemberInQuickMenu(
          member,
          currentUserId,
          canManageMembers,
        ),
    );

  const selfMember = draft.find((member) => member.userId === currentUserId);
  const canLeave = canLeaveProjectFromQuickMenu(selfMember, currentUserId);
  const roleLabel = projectRoleLabel(role);

  const canAssignRole = (
    member: Pick<ProjectMemberDraft, 'userId'> & {
      tags?: string[];
      workerQualifications?: string[];
      baseTag?: string;
    },
    roleKey: string,
  ) => {
    const teamMember = member.userId
      ? teamMembers.find((item) => item.userId === member.userId)
      : undefined;
    const privilegedSelf =
      canManageMembers ||
      qualificationMode === 'open' ||
      (member.userId === currentUserId &&
        (member.baseTag === 'creator' ||
          member.baseTag === 'admin' ||
          member.tags?.includes('creator') ||
          member.tags?.includes('admin') ||
          teamMember?.baseTag === 'creator' ||
          teamMember?.baseTag === 'admin'));
    const qualifications =
      member.workerQualifications ??
      (member.userId ? teamMember?.workerQualifications : undefined);
    return canAssignProjectWorkerTag(
      {
        userId: member.userId,
        workerQualifications: qualifications,
        privilegedSelf,
      },
      roleKey,
      qualificationMode,
    );
  };

  const draftKey = (
    member: Pick<
      ProjectMemberDraft,
      'id' | 'userId' | 'externalId' | 'displayName'
    >,
  ) =>
    member.id ||
    (member.userId
      ? `user:${member.userId}`
      : `external:${member.externalId || member.displayName}`);

  const addMember = (
    member: APIProjectMember | ProjectMemberDraft,
    roleKey: string,
  ) => {
    const editable =
      canManageMembers ||
      qualificationMode === 'open' ||
      member.userId === currentUserId;
    if (!editable) return;
    if (
      !canManageMembers &&
      qualificationMode !== 'open' &&
      (member.userId !== currentUserId || member.status !== 'active')
    )
      return;
    if (member.status === 'invited') {
      // An invited member is not a worker yet: assigning a role here would
      // only flip the draft to active while the backend keeps them invited
      // until the invitation is accepted.
      message.info(formatMessage({ id: 'site.editWorkers.invitedNotice' }));
      return;
    }
    if (!canAssignRole(member, roleKey)) {
      message.warning(
        formatMessage(
          { id: 'site.editWorkers.noQualification' },
          {
            role: projectRoleLabel(roleKey),
          },
        ),
      );
      return;
    }
    const memberId = 'memberId' in member ? member.memberId : member.id;
    setDraft((current) =>
      mergeMemberTag(
        current,
        {
          id: memberId?.startsWith('draft:') ? undefined : memberId,
          userId: member.userId,
          externalId: member.externalId,
          displayName: member.displayName,
        },
        roleKey,
      ),
    );
    setWord('');
    closePanel();
  };

  const addSearchResult = (
    result: APIProjectMember | TeamMember | APIUser,
    roleKey: string,
  ) => {
    if ('memberId' in result) {
      addMember(result, roleKey);
      return;
    }
    if ('user' in result) {
      const existing = draft.find((member) => member.userId === result.userId);
      if (existing && existing.status !== 'removed') {
        const editable =
          canManageMembers ||
          qualificationMode === 'open' ||
          result.userId === currentUserId;
        if (editable) addMember(existing, roleKey);
      } else {
        addRegisteredUser(
          { id: result.user.id, name: result.user.name },
          roleKey,
          result.workerQualifications,
        );
      }
      return;
    }
    const existing = draft.find((member) => member.userId === result.id);
    if (existing && existing.status !== 'removed') {
      const editable =
        canManageMembers ||
        qualificationMode === 'open' ||
        result.id === currentUserId;
      if (editable) addMember(existing, roleKey);
      return;
    }
    addRegisteredUser({ id: result.id, name: result.name }, roleKey);
  };

  const addRegisteredUser = (
    user: { id: string; name: string },
    roleKey: string,
    workerQualifications?: string[],
  ) => {
    const existing = draft.find((member) => member.userId === user.id);
    const mayEditTags =
      canManageMembers ||
      qualificationMode === 'open' ||
      user.id === currentUserId;
    const candidate = existing || {
      userId: user.id,
      displayName: user.name,
      workerQualifications,
    };
    if (!canAssignRole(candidate, roleKey)) {
      message.warning(
        formatMessage(
          { id: 'site.editWorkers.noQualification' },
          {
            role: projectRoleLabel(roleKey),
          },
        ),
      );
      return;
    }
    setDraft((current) => {
      if (mayEditTags) {
        return mergeMemberTag(
          current,
          { userId: user.id, displayName: user.name },
          roleKey,
        );
      }
      return mergeMemberWithoutTags(current, {
        userId: user.id,
        displayName: user.name,
      });
    });
    setWord('');
    closePanel();
  };

  const addExternalMember = (displayName: string, roleKey: string) => {
    const value = displayName.trim();
    if (!value) return;
    // Mechanism 1: typing a name and pressing Enter defaults to adding an
    // external alias, but if a member with the same project display name is
    // already joined, assign the role to the first matching registered user
    // instead of creating a duplicate external alias.  If no registered user
    // matches but an external alias with that name is already joined, add the
    // role to it (never stack a second same-name external record).
    const sameNameUser = draft.find(
      (member) =>
        member.status !== 'removed' &&
        member.displayName === value &&
        member.userId,
    );
    if (sameNameUser) {
      addMember(sameNameUser, roleKey);
      setWord('');
      closePanel();
      return;
    }
    const sameNameExternal = draft.find(
      (member) =>
        member.status !== 'removed' &&
        member.displayName === value &&
        !member.userId,
    );
    if (sameNameExternal) {
      addMember(sameNameExternal, roleKey);
      setWord('');
      closePanel();
      return;
    }
    setDraft((current) =>
      canManageMembers
        ? mergeExternalMemberTag(current, value, roleKey)
        : mergeExternalMemberWithoutTags(current, value),
    );
    setWord('');
    closePanel();
  };

  const isResultActionable = (
    result: APIProjectMember | TeamMember | APIUser,
    roleKey: string,
  ) => {
    if ('memberId' in result) {
      const editable =
        canManageMembers ||
        qualificationMode === 'open' ||
        result.userId === currentUserId;
      return editable && canAssignRole(result, roleKey);
    }
    const resultUserId = 'user' in result ? result.userId : result.id;
    const existing = draft.find((member) => member.userId === resultUserId);
    const editable =
      !existing ||
      existing.status === 'removed' ||
      canManageMembers ||
      qualificationMode === 'open' ||
      resultUserId === currentUserId;
    const candidate =
      'user' in result
        ? {
            userId: result.userId,
            displayName: result.user.name,
            baseTag: result.baseTag,
            tags: [],
            workerQualifications: result.workerQualifications,
          }
        : { userId: result.id, displayName: result.name };
    return editable && canAssignRole(existing || candidate, roleKey);
  };

  const removeRole = (member: ProjectMemberDraft, roleKey: string) => {
    if (
      !canEditProjectMemberInQuickMenu(member, currentUserId, canManageMembers)
    )
      return;
    setDraft((current) =>
      current.map((item) => {
        if (draftKey(item) !== draftKey(member)) {
          return item;
        }
        const tags = item.tags.filter((tag) => tag !== roleKey);
        return { ...item, tags, status: tags.length ? 'active' : 'removed' };
      }),
    );
  };

  const canEditName = (member: ProjectMemberDraft) =>
    canEditProjectMemberInQuickMenu(member, currentUserId, canManageMembers) &&
    member.status === 'active';

  const startEditName = (member: ProjectMemberDraft) => {
    if (!canEditName(member)) return;
    setEditingName(member.displayName);
    setEditingMemberKey(draftKey(member));
  };

  const commitEditName = () => {
    const key = editingMemberKey;
    if (key === null) return;
    setEditingMemberKey(null);
    const value = editingName.trim();
    if (!value) return;
    setDraft((current) =>
      current.map((item) =>
        draftKey(item) === key && item.displayName !== value
          ? {
              ...item,
              displayName: value,
              // Unsaved external members key their subject by external_id
              // (which doubles as the display alias); keep the key stable
              // while renaming.  Saved members key by id, so this is a no-op
              // for them and never reaches the diff as an external_id change.
              externalId: !item.userId ? value : item.externalId,
            }
          : item,
      ),
    );
  };

  // Registered users display their primary name along with all of their site aliases.
  // External members (no registered user) show only their display name.
  const searchResultDisplay = (
    member: APIProjectMember | TeamMember | APIUser,
    _query: string,
  ): { main: string; aliases: string[] } => {
    if ('memberId' in member) {
      const isSiteUser = Boolean(member.userId || member.user);
      const siteAliases = isSiteUser
        ? member.user?.aliases ||
          (member.userId ? userInfoByUserId.get(member.userId)?.aliases : []) ||
          []
        : [];
      return {
        main: member.displayName,
        aliases: siteAliases.filter((a) => a && a !== member.displayName),
      };
    }
    if ('user' in member) {
      const main = member.user?.name || '';
      const siteAliases =
        member.user?.aliases ||
        (member.userId ? userInfoByUserId.get(member.userId)?.aliases : []) ||
        [];
      return {
        main,
        aliases: siteAliases.filter((a) => a && a !== main),
      };
    }
    const main = member.name || '';
    const siteAliases =
      member.aliases ||
      (member.id ? userInfoByUserId.get(member.id)?.aliases : []) ||
      [];
    return {
      main,
      aliases: siteAliases.filter((a) => a && a !== main),
    };
  };

  // Add the current role to an already-joined member (empty-input candidate).
  const addRoleToJoined = (member: ProjectMemberDraft, roleKey: string) => {
    const editable =
      canManageMembers ||
      qualificationMode === 'open' ||
      member.userId === currentUserId;
    if (!editable) return;
    if (member.status === 'invited') {
      message.info(formatMessage({ id: 'site.editWorkers.invitedNotice' }));
      return;
    }
    if (member.tags.includes(roleKey)) return;
    if (!canAssignRole(member, roleKey)) {
      message.warning(
        formatMessage(
          { id: 'site.editWorkers.noQualification' },
          {
            role: projectRoleLabel(roleKey),
          },
        ),
      );
      return;
    }
    setDraft((current) =>
      mergeMemberTag(
        current,
        {
          id: member.id,
          userId: member.userId,
          externalId: member.externalId,
          displayName: member.displayName,
        },
        roleKey,
      ),
    );
    closePanel();
  };

  const saveDraft = async (nextDraft: ProjectMemberDraft[] = draft) => {
    if (saving) return;
    const operations = diffProjectMembers(
      original,
      nextDraft,
      (member, action, content) =>
        projectMemberOperationId(projectId, member, action, content),
    );
    if (!operations.length) {
      message.info(formatMessage({ id: 'site.editWorkers.noChanges' }));
      return;
    }
    setSaving(true);
    try {
      await onSave(operations);
    } catch (error: any) {
      error?.default?.();
      if (!error?.default)
        message.error(
          error?.message ||
            formatMessage({ id: 'site.editWorkers.saveFailed' }),
        );
    } finally {
      setSaving(false);
    }
  };

  const leaveProject = () => {
    if (!canLeave) return;
    Modal.confirm({
      title: formatMessage({ id: 'site.editWorkers.leaveProject' }),
      content: formatMessage({ id: 'site.editWorkers.leaveConfirm' }),
      okType: 'danger',
      okText: formatMessage({ id: 'site.editWorkers.leaveConfirmOk' }),
      cancelText: formatMessage({ id: 'site.editWorkers.cancel' }),
      onOk: () =>
        saveDraft(
          draft.map((member) =>
            member.userId === currentUserId
              ? { ...member, status: 'removed' }
              : member,
          ),
        ),
    });
  };

  const joinProject = async () => {
    if (saving || (selfMember && selfMember.status !== 'removed')) return;
    setSaving(true);
    try {
      const result = await api.application.createApplication({
        groupType: 'project',
        groupID: projectId,
        data: { message: '' },
      });
      const response = result.data as { message?: string };
      message.success(
        response?.message ||
          formatMessage({ id: 'site.editWorkers.applicationSubmitted' }),
      );
      await onRefresh?.();
      onCancel();
    } catch (error: any) {
      error?.default?.();
    } finally {
      setSaving(false);
    }
  };

  const saveButtonRef = useRef<HTMLSpanElement>(null);
  // React 17 delegates all DOM events to the root container, so individual
  // elements carry no native listeners (DevTools shows none for any React
  // button -- that is expected).  Bind the confirm button natively as well so
  // it keeps working even if the delegated path is disturbed (e.g. a
  // duplicated React instance) and the listener is visible in the inspector.
  useEffect(() => {
    const button = saveButtonRef.current;
    if (!button) return undefined;
    const handler = () => {
      void saveDraft();
    };
    button.addEventListener('click', handler);
    return () => button.removeEventListener('click', handler);
  }, [saveDraft]);

  const openMemberSettings = () => {
    const marker = `/projects/${projectId}`;
    const markerIndex = location.pathname.indexOf(marker);
    const path =
      markerIndex >= 0
        ? `${location.pathname.slice(0, markerIndex)}${marker}/setting/member`
        : `/dashboard/projects/${projectId}/setting/member`;
    onCancel();
    history.push(path);
  };

  // Dropdown content shared by the full-mode add panel and every simplified
  // row: typed queries show team search results, empty input recommends the
  // already-joined members of the project, and unmatched text offers the
  // external-alias row.  The simplified rows keep the dropdown open after a
  // pick (the input stays focused and the emptied query re-recommends joined
  // members); blur or switching rows closes it.
  const renderSearchResults = (roleKey: string) => {
    const query = simpleMode ? simpleWords[roleKey] || '' : word;
    // Simple-mode picks clear the row's own query (back to recommendations),
    // like the full panel clears its shared word after a selection.
    const pickInSimple = (action: () => void) => {
      action();
      if (simpleMode) {
        setSimpleWords((current) => ({ ...current, [roleKey]: '' }));
      }
    };
    const rowRoleLabel = projectRoleLabel(roleKey);
    const candidates = joinedCandidatesFor(roleKey);
    return (
      <div className="EditWorkers__Results">
        {loading && <Spin size="small" />}
        {!loading &&
          query.trim() &&
          results.map((member) => {
            const actionable = isResultActionable(member, roleKey);
            const label = searchResultDisplay(member, query);
            return (
              <Tooltip
                key={resultKey(member)}
                overlay={
                  actionable
                    ? formatMessage(
                        { id: 'site.editWorkers.addAsRole' },
                        { role: rowRoleLabel },
                      )
                    : formatMessage(
                        { id: 'site.editWorkers.noQualification' },
                        { role: rowRoleLabel },
                      )
                }
              >
                <div
                  className={`EditWorkers__Result ${actionable ? '' : 'EditWorkers__Result--disabled'}`}
                  onClick={() =>
                    actionable &&
                    pickInSimple(() => addSearchResult(member, roleKey))
                  }
                >
                  <span>
                    {label.main}
                    {label.aliases.length > 0 && (
                      <span className="EditWorkers__ResultAlias">
                        {formatMessage(
                          { id: 'site.editWorkers.aliasGroup' },
                          {
                            aliases: label.aliases.join(
                              formatMessage({
                                id: 'site.editWorkers.aliasSeparator',
                              }),
                            ),
                          },
                        )}
                      </span>
                    )}
                  </span>
                  <Icon icon={actionable ? 'plus' : 'ban'} />
                </div>
              </Tooltip>
            );
          })}
        {!loading && !query.trim() && candidates.length === 0 && (
          <div className="EditWorkers__Result EditWorkers__Result--empty">
            <span>
              {formatMessage({ id: 'site.editWorkers.emptyResultsHint' })}
            </span>
          </div>
        )}
        {!loading &&
          !query.trim() &&
          candidates.map(({ member, holdsRole }) => {
            const editable =
              canManageMembers ||
              qualificationMode === 'open' ||
              member.userId === currentUserId;
            const userInfo = member.userId
              ? userInfoByUserId.get(member.userId)
              : undefined;
            const isSiteUser = Boolean(member.userId);
            const userAliases =
              isSiteUser && userInfo ? userInfo.aliases || [] : [];
            const displayAliases = userAliases.filter(
              (a) => a && a !== member.displayName,
            );
            if (holdsRole) {
              return (
                <div
                  key={draftKey(member)}
                  className="EditWorkers__Result EditWorkers__Result--held"
                >
                  <span>
                    {member.displayName}
                    {displayAliases.length > 0 && (
                      <span className="EditWorkers__ResultAlias">
                        {formatMessage(
                          { id: 'site.editWorkers.aliasGroup' },
                          {
                            aliases: displayAliases.join(
                              formatMessage({
                                id: 'site.editWorkers.aliasSeparator',
                              }),
                            ),
                          },
                        )}
                      </span>
                    )}
                    <span className="EditWorkers__CandidateBadge EditWorkers__CandidateBadge--held">
                      {formatMessage({ id: 'site.editWorkers.holdsRole' })}
                    </span>
                  </span>
                  <Icon icon="check" />
                </div>
              );
            }
            const invited = member.status === 'invited';
            return (
              <Tooltip
                key={draftKey(member)}
                overlay={
                  invited
                    ? formatMessage({ id: 'site.editWorkers.invitedNotice' })
                    : editable && canAssignRole(member, roleKey)
                      ? formatMessage(
                          { id: 'site.editWorkers.addAsRole' },
                          { role: rowRoleLabel },
                        )
                      : formatMessage(
                          { id: 'site.editWorkers.noQualification' },
                          { role: rowRoleLabel },
                        )
                }
              >
                <div
                  className={`EditWorkers__Result ${editable && !invited && canAssignRole(member, roleKey) ? '' : 'EditWorkers__Result--disabled'}`}
                  onClick={() =>
                    editable &&
                    pickInSimple(() => addRoleToJoined(member, roleKey))
                  }
                >
                  <span>
                    {member.displayName}
                    {displayAliases.length > 0 && (
                      <span className="EditWorkers__ResultAlias">
                        {formatMessage(
                          { id: 'site.editWorkers.aliasGroup' },
                          {
                            aliases: displayAliases.join(
                              formatMessage({
                                id: 'site.editWorkers.aliasSeparator',
                              }),
                            ),
                          },
                        )}
                      </span>
                    )}
                    {invited && (
                      <span className="EditWorkers__CandidateBadge">
                        {formatMessage({ id: 'site.editWorkers.invited' })}
                      </span>
                    )}
                  </span>
                  <Icon
                    icon={
                      invited
                        ? 'clock'
                        : editable && canAssignRole(member, roleKey)
                          ? 'plus'
                          : 'ban'
                    }
                  />
                </div>
              </Tooltip>
            );
          })}
        {!loading && query.trim() && results.length === 0 && (
          <div
            className="EditWorkers__Result"
            onClick={() =>
              pickInSimple(() => addExternalMember(query, roleKey))
            }
          >
            <span>
              {formatMessage(
                { id: 'site.editWorkers.addExternalAlias' },
                { name: query.trim() },
              )}
            </span>
            <Icon icon="plus" />
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      css={css`
        width: min(620px, calc(100vw - 20px));
        padding: 12px;
        background: ${style.backgroundColorLight};
        color: ${style.textColor};
        border-radius: ${style.borderRadiusBase};
        box-shadow: ${style.boxShadowBase};
        box-sizing: border-box;
        @media (max-width: 600px) {
          width: 100%;
          max-width: 100%;
          padding: 10px;
          display: flex;
          flex-direction: column;
        }
        .EditWorkers__Header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 8px;
        }
        .EditWorkers__HeaderTitle {
          color: ${style.textColorSecondary};
          font-size: 12px;
        }
        .EditWorkers__HeaderActions {
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        @media (max-width: 360px) {
          .EditWorkers__Header {
            gap: 4px;
          }
          .EditWorkers__HeaderTitle {
            min-width: 0;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          .EditWorkers__ModeBtn {
            padding: 3px 6px;
            font-size: 11px;
          }
        }
        .EditWorkers__Presence {
          display: flex;
          align-items: center;
          margin: -2px 0 8px;
          min-height: 18px;
        }
        .EditWorkers__ModeBtn {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 3px 8px;
          border: 1px solid ${style.borderColorLight};
          color: ${style.textColorSecondary};
          border-radius: ${style.borderRadiusBase};
          ${clickEffect()};
          font-size: 12px;
          white-space: nowrap;
        }
        .EditWorkers__ModeBtn--active {
          border-color: ${style.primaryColor};
          color: ${style.primaryColor};
        }
        .EditWorkers__Settings {
          padding: 4px;
          ${clickEffect()};
          @media (max-width: 600px) {
            padding: 6px;
            margin: -2px 0;
          }
        }
        .EditWorkers__Body {
          display: flex;
          gap: 10px;
          align-items: stretch;
          @media (max-width: 600px) {
            flex-direction: column;
            gap: 8px;
            overflow-y: auto;
            -webkit-overflow-scrolling: touch;
          }
        }
        .EditWorkersSimple {
          flex: 1 1 auto;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .EditWorkersSimple__Row {
          display: grid;
          grid-template-columns: 84px minmax(0, 1fr);
          gap: 10px;
          align-items: start;
          @media (min-width: 481px) and (max-width: 600px) {
            grid-template-columns: 76px minmax(0, 1fr);
            gap: 6px;
          }
          @media (max-width: 480px) {
            grid-template-columns: 1fr;
            gap: 4px;
            margin-bottom: 4px;
          }
        }
        .EditWorkersSimple__Role {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          padding-top: 5px;
          min-width: 0;
          @media (max-width: 480px) {
            padding-top: 0;
          }
        }
        .EditWorkersSimple__RoleName {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .EditWorkersSimple__Field {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .EditWorkersSimple__Chips {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
        }
        .EditWorkersSimple__Chip {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 2px 6px;
          border: 1px solid ${style.borderColorLight};
          border-radius: ${style.borderRadiusBase};
          font-size: 12px;
          max-width: 100%;
        }
        .EditWorkersSimple__ChipName {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .EditWorkersSimple__ChipAlias {
          color: ${style.textColorSecondary};
          font-size: 11px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .EditWorkersSimple__ChipRemove {
          color: ${style.textColorSecondary};
          ${clickEffect()};
          display: inline-flex;
          align-items: center;
          @media (max-width: 600px) {
            padding: 2px 4px;
            margin: -2px 0;
          }
        }
        .EditWorkersSimple__InputWrap {
          position: relative;
          min-width: 0;
        }
        .EditWorkersSimple__Dropdown {
          position: absolute;
          top: calc(100% + 2px);
          left: 0;
          right: 0;
          z-index: 20;
          background: ${style.backgroundColorLight};
          box-shadow: ${style.boxShadowBase};
        }
        .EditWorkersSimple__Dropdown .EditWorkers__Results {
          max-height: 200px;
          @media (max-width: 600px) {
            max-height: 160px;
          }
        }
        .EditWorkers__JobList {
          flex: none;
          width: 128px;
          display: flex;
          flex-direction: column;
          gap: 2px;
          max-height: 380px;
          overflow-y: auto;
          padding-right: 6px;
          border-right: 1px solid ${style.borderColorLight};
          @media (max-width: 600px) {
            width: 100%;
            flex-direction: row;
            border-right: none;
            border-bottom: 1px solid ${style.borderColorLight};
            padding-right: 0;
            padding-bottom: 6px;
            max-height: none;
            overflow-x: auto;
            overflow-y: hidden;
            white-space: nowrap;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: none;
            &::-webkit-scrollbar {
              display: none;
            }
          }
        }
        .EditWorkers__Job {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 8px;
          border-radius: ${style.borderRadiusBase};
          cursor: pointer;
          ${clickEffect()};
          white-space: nowrap;
          font-size: 13px;
          @media (max-width: 600px) {
            flex: 0 0 auto;
            padding: 4px 8px;
            font-size: 12px;
            background: ${style.hoverColor};
          }
        }
        .EditWorkers__Job--active {
          background: ${style.backgroundColorLight};
          border-left: 3px solid ${style.primaryColor};
          padding-left: 5px;
          color: ${style.primaryColor};
          @media (max-width: 600px) {
            border-left: none;
            padding-left: 8px;
            border: 1px solid ${style.primaryColor};
            background: ${style.primaryColor}18;
          }
        }
        .EditWorkers__JobDot {
          flex: none;
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }
        .EditWorkers__JobName {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .EditWorkers__JobCount {
          margin-left: auto;
          font-size: 12px;
          color: ${style.textColorSecondary};
          @media (max-width: 600px) {
            margin-left: 4px;
          }
        }
        .EditWorkers__Stage {
          flex: 1 1 auto;
          min-width: 0;
          display: flex;
          flex-direction: column;
        }
        .EditWorkers__StageHeader {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 6px;
          @media (max-width: 360px) {
            flex-wrap: wrap;
            gap: 4px;
          }
        }
        .EditWorkers__StageTitle {
          font-size: 13px;
        }
        .EditWorkers__StageCount {
          margin-left: 6px;
          color: ${style.textColorSecondary};
          font-size: 12px;
        }
        .EditWorkers__AddBtn {
          padding: 3px 8px;
          border: 1px solid ${style.primaryColor};
          color: ${style.primaryColor};
          border-radius: ${style.borderRadiusBase};
          ${clickEffect()};
          font-size: 12px;
          white-space: nowrap;
        }
        .EditWorkers__Panel {
          border-left: 3px solid ${style.primaryColor};
          padding: 8px 10px;
          margin-bottom: 8px;
          background: ${style.backgroundColorLight};
          @media (max-width: 600px) {
            padding: 6px 8px;
            margin-bottom: 6px;
          }
        }
        .EditWorkers__PanelHint {
          margin: 6px 2px 0;
          font-size: 12px;
          color: ${style.textColorSecondary};
          @media (max-width: 600px) {
            font-size: 11px;
            line-height: 1.4;
          }
        }
        .EditWorkers__Results,
        .EditWorkers__Selected {
          max-height: 224px;
          overflow-y: auto;
          border: 1px solid ${style.borderColorLight};
          border-radius: ${style.borderRadiusBase};
          @media (max-width: 600px) {
            max-height: 170px;
            -webkit-overflow-scrolling: touch;
          }
        }
        .EditWorkers__Result,
        .EditWorkers__Member {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
          padding: 6px 8px;
        }
        .EditWorkers__Result {
          cursor: pointer;
          ${clickEffect()};
        }
        .EditWorkers__Result > span {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          flex: 1 1 auto;
        }
        .EditWorkers__Result > .Icon,
        .EditWorkers__Result > svg {
          flex: none;
          margin-left: 6px;
        }
        .EditWorkers__Result--disabled {
          cursor: default;
          opacity: 0.55;
        }
        .EditWorkers__Result--held {
          cursor: default;
          color: ${style.textColorSecondary};
        }
        .EditWorkers__Result--empty {
          cursor: default;
          color: ${style.textColorSecondary};
          font-size: 12px;
        }
        .EditWorkers__Result:hover {
          background: ${style.hoverColor};
        }
        .EditWorkers__ResultAlias {
          color: ${style.textColorSecondary};
          font-size: 12px;
          margin-left: 4px;
        }
        @media (max-width: 480px) {
          .EditWorkers__ResultAlias {
            max-width: 100px;
            display: inline-block;
            vertical-align: bottom;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
        }
        .EditWorkers__CandidateBadge {
          margin-left: 6px;
          font-size: 12px;
          color: ${style.warningColor};
          flex-shrink: 0;
        }
        .EditWorkers__CandidateBadge--held {
          color: ${style.successColor};
        }
        .EditWorkers__Member {
          border-bottom: 1px solid ${style.borderColorLighter};
        }
        .EditWorkers__Member:last-child {
          border-bottom: none;
        }
        .EditWorkers__Member:hover {
          background: ${style.hoverColor};
        }
        .EditWorkers__MemberAvatar {
          flex: none;
        }
        .EditWorkers__MemberName {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          flex: 1 1 auto;
        }
        .EditWorkers__MemberUsername {
          color: ${style.textColorSecondary};
          font-size: 12px;
        }
        .EditWorkers__MemberAlias {
          color: ${style.textColorSecondary};
          font-size: 12px;
          margin-left: 2px;
        }
        .EditWorkers__MemberActions {
          flex: none;
          display: inline-flex;
          align-items: center;
          gap: 2px;
          @media (max-width: 600px) {
            gap: 4px;
          }
        }
        .EditWorkers__MemberEdit {
          padding: 2px 4px;
          color: ${style.textColorSecondary};
          ${clickEffect()};
          @media (max-width: 600px) {
            padding: 4px 6px;
          }
        }
        .EditWorkers__Remove {
          padding: 2px 4px;
          color: ${style.textColorSecondary};
          ${clickEffect()};
          @media (max-width: 600px) {
            padding: 4px 6px;
          }
        }
        .EditWorkers__MemberNameInput {
          flex: 1 1 auto;
          min-width: 0;
        }
        .EditWorkers__SelfActions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 10px;
          @media (max-width: 600px) {
            gap: 6px;
            margin-top: 8px;
          }
        }
        .EditWorkers__SelfAction {
          padding: 5px 10px;
          border: 1px solid ${style.borderColorLight};
          border-radius: ${style.borderRadiusBase};
          ${clickEffect()};
          @media (max-width: 600px) {
            padding: 5px 8px;
            font-size: 12px;
          }
        }
        .EditWorkers__SelfAction--danger {
          color: ${style.errorColor};
        }
        .EditWorkers__Buttons {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          margin-top: 10px;
          @media (max-width: 600px) {
            gap: 6px;
            margin-top: 8px;
          }
          @media (max-width: 360px) {
            justify-content: stretch;
          }
        }
        .EditWorkers__Button {
          padding: 5px 10px;
          border-radius: ${style.borderRadiusBase};
          ${clickEffect()};
          @media (max-width: 600px) {
            padding: 6px 14px;
            font-size: 13px;
          }
          @media (max-width: 360px) {
            flex: 1 1 0;
            text-align: center;
            justify-content: center;
            display: inline-flex;
          }
        }
        .EditWorkers__Button--save {
          background: ${style.primaryColor};
          color: ${style.textColorInverse};
        }
      `}
    >
      <div className="EditWorkers__Header">
        <span className="EditWorkers__HeaderTitle">
          {formatMessage({ id: 'site.editWorkers.title' })}
        </span>
        <span className="EditWorkers__HeaderActions">
          <Tooltip
            overlay={
              simpleMode
                ? formatMessage({ id: 'site.editWorkers.switchToFull' })
                : formatMessage({ id: 'site.editWorkers.switchToSimple' })
            }
          >
            <span
              className={`EditWorkers__ModeBtn ${simpleMode ? 'EditWorkers__ModeBtn--active' : ''}`}
              onClick={toggleMode}
              role="button"
              tabIndex={0}
            >
              <Icon icon={simpleMode ? 'layer-group' : 'th-list'} />{' '}
              {simpleMode
                ? formatMessage({ id: 'site.editWorkers.simpleMode' })
                : formatMessage({ id: 'site.editWorkers.fullMode' })}
            </span>
          </Tooltip>
          <Tooltip
            overlay={formatMessage({
              id: 'site.editWorkers.openMemberSettings',
            })}
          >
            <span
              className="EditWorkers__Settings"
              onClick={openMemberSettings}
              role="button"
              tabIndex={0}
            >
              <Icon icon="cog" />
            </span>
          </Tooltip>
        </span>
      </div>
      {presence.userCount > 0 && (
        <div className="EditWorkers__Presence">
          <EditingStatusBadge presence={presence} />
        </div>
      )}
      <div className="EditWorkers__Body">
        {simpleMode ? (
          <div className="EditWorkersSimple">
            {PROJECT_WORKER_ROLES.map((item) => {
              const roleKey = item.key;
              const assignees = draftForRole(roleKey);
              const focused = simpleFocusRole === roleKey;
              return (
                <div key={roleKey} className="EditWorkersSimple__Row">
                  <div className="EditWorkersSimple__Role">
                    <span
                      className="EditWorkers__JobDot"
                      style={{
                        background:
                          JOB_COLORS[roleKey] || style.textColorSecondary,
                      }}
                    />
                    <span className="EditWorkersSimple__RoleName">
                      {projectRoleLabel(item.key)}
                    </span>
                    <span className="EditWorkers__JobCount">
                      {
                        draft.filter(
                          (member) =>
                            member.status !== 'removed' &&
                            member.tags.includes(roleKey),
                        ).length
                      }
                    </span>
                  </div>
                  <div className="EditWorkersSimple__Field">
                    {assignees.length > 0 && (
                      <div className="EditWorkersSimple__Chips">
                        {assignees.map((member) => {
                          const key =
                            member.id ||
                            member.userId ||
                            member.externalId ||
                            draftKey(member);
                          const userInfo = member.userId
                            ? userInfoByUserId.get(member.userId)
                            : undefined;
                          const { main, note } = projectMemberDisplayLabel({
                            displayName: member.displayName,
                            user: userInfo ? { name: userInfo.name } : null,
                          });
                          const isSiteUser = Boolean(member.userId);
                          const userAliases =
                            isSiteUser && userInfo
                              ? userInfo.aliases || []
                              : [];
                          const displayAliases = userAliases.filter(
                            (a) => a && a !== main && a !== note,
                          );
                          const titleParts = [main];
                          if (note) {
                            titleParts.push(
                              formatMessage(
                                { id: 'site.editWorkers.noteEnclosed' },
                                { note },
                              ),
                            );
                          }
                          if (displayAliases.length > 0) {
                            titleParts.push(
                              formatMessage(
                                { id: 'site.editWorkers.aliasGroup' },
                                {
                                  aliases: displayAliases.join(
                                    formatMessage({
                                      id: 'site.editWorkers.aliasSeparator',
                                    }),
                                  ),
                                },
                              ),
                            );
                          }
                          const chipTitle = titleParts.join('');
                          return (
                            <span
                              key={key}
                              className="EditWorkersSimple__Chip"
                              title={chipTitle}
                            >
                              <Avatar
                                type="user"
                                size={16}
                                url={
                                  userInfo?.hasAvatar
                                    ? userInfo.avatar
                                    : undefined
                                }
                              />
                              <span className="EditWorkersSimple__ChipName">
                                {main}
                              </span>
                              {displayAliases.length > 0 && (
                                <span className="EditWorkersSimple__ChipAlias">
                                  {formatMessage(
                                    { id: 'site.editWorkers.aliasGroup' },
                                    {
                                      aliases: displayAliases.join(
                                        formatMessage({
                                          id: 'site.editWorkers.aliasSeparator',
                                        }),
                                      ),
                                    },
                                  )}
                                </span>
                              )}
                              {member.status === 'invited' && (
                                <span className="EditWorkers__CandidateBadge">
                                  {formatMessage({
                                    id: 'site.editWorkers.invited',
                                  })}
                                </span>
                              )}
                              <span
                                className="EditWorkersSimple__ChipRemove"
                                onClick={() => removeRole(member, roleKey)}
                                role="button"
                                tabIndex={0}
                              >
                                <Icon icon="times" />
                              </span>
                            </span>
                          );
                        })}
                      </div>
                    )}
                    <div className="EditWorkersSimple__InputWrap">
                      <Input
                        size="small"
                        value={simpleWords[roleKey] || ''}
                        onChange={(event) =>
                          setSimpleWords((current) => ({
                            ...current,
                            [roleKey]: event.target.value,
                          }))
                        }
                        onFocus={() => setSimpleFocusRole(roleKey)}
                        onBlur={() => {
                          window.setTimeout(
                            () =>
                              setSimpleFocusRole((current) =>
                                current === roleKey ? null : current,
                              ),
                            120,
                          );
                        }}
                        onPressEnter={() => {
                          if (loading || !(simpleWords[roleKey] || '').trim())
                            return;
                          addExternalMember(
                            simpleWords[roleKey] || '',
                            roleKey,
                          );
                          setSimpleWords((current) => ({
                            ...current,
                            [roleKey]: '',
                          }));
                        }}
                        placeholder={formatMessage({
                          id: 'site.editWorkers.simpleSearchPlaceholder',
                        })}
                      />
                      {focused && (
                        <div
                          className="EditWorkersSimple__Dropdown"
                          onMouseDown={(event) => event.preventDefault()}
                        >
                          {renderSearchResults(roleKey)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <>
            <div className="EditWorkers__JobList">
              {PROJECT_WORKER_ROLES.map((item) => (
                <span
                  key={item.key}
                  className={`EditWorkers__Job ${role === item.key ? 'EditWorkers__Job--active' : ''}`}
                  onClick={() => selectRole(item.key)}
                >
                  <span
                    className="EditWorkers__JobDot"
                    style={{
                      background:
                        JOB_COLORS[item.key] || style.textColorSecondary,
                    }}
                  />
                  <span className="EditWorkers__JobName">
                    {projectRoleLabel(item.key)}
                  </span>
                  <span className="EditWorkers__JobCount">
                    {
                      draft.filter(
                        (member) =>
                          member.status !== 'removed' &&
                          member.tags.includes(item.key),
                      ).length
                    }
                  </span>
                </span>
              ))}
            </div>
            <div className="EditWorkers__Stage">
              <div className="EditWorkers__StageHeader">
                <span className="EditWorkers__StageTitle">
                  {roleLabel}
                  <span className="EditWorkers__StageCount">
                    {formatMessage(
                      { id: 'site.editWorkers.personCount' },
                      { count: draftForRole(role).length },
                    )}
                  </span>
                </span>
                <span
                  className="EditWorkers__AddBtn"
                  onClick={() => (panelOpen ? closePanel() : openPanel())}
                  role="button"
                  tabIndex={0}
                >
                  <Icon icon={panelOpen ? 'times' : 'plus'} />{' '}
                  {panelOpen
                    ? formatMessage({ id: 'site.editWorkers.collapse' })
                    : formatMessage({ id: 'site.editWorkers.addMember' })}
                </span>
              </div>
              {panelOpen && (
                <div className="EditWorkers__Panel">
                  <Input
                    value={word}
                    onChange={(event) => setWord(event.target.value)}
                    onPressEnter={() => {
                      if (loading || !word.trim()) return;
                      // Enter always adds an external member under the typed name;
                      // team members are added by clicking a search result.
                      addExternalMember(word, role);
                    }}
                    placeholder={formatMessage({
                      id: 'site.editWorkers.searchPlaceholder',
                    })}
                    autoFocus
                  />
                  {renderSearchResults(role)}
                  <div className="EditWorkers__PanelHint">
                    {formatMessage({ id: 'site.editWorkers.panelHint' })}
                  </div>
                </div>
              )}
              <div className="EditWorkers__Selected">
                {draftForRole(role).map((member) => {
                  const key =
                    member.id ||
                    member.userId ||
                    member.externalId ||
                    draftKey(member);
                  const userInfo = member.userId
                    ? userInfoByUserId.get(member.userId)
                    : undefined;
                  const { main, note } = projectMemberDisplayLabel({
                    displayName: member.displayName,
                    user: userInfo ? { name: userInfo.name } : null,
                  });
                  const isSiteUser = Boolean(member.userId);
                  const userAliases =
                    isSiteUser && userInfo ? userInfo.aliases || [] : [];
                  const displayAliases = userAliases.filter(
                    (a) => a && a !== main && a !== note,
                  );
                  const nameEditable = canEditName(member);
                  const isEditingName = editingMemberKey === draftKey(member);
                  const titleParts = [main];
                  if (note) {
                    titleParts.push(
                      formatMessage(
                        { id: 'site.editWorkers.noteEnclosed' },
                        { note },
                      ),
                    );
                  }
                  if (displayAliases.length > 0) {
                    titleParts.push(
                      formatMessage(
                        { id: 'site.editWorkers.aliasGroup' },
                        {
                          aliases: displayAliases.join(
                            formatMessage({
                              id: 'site.editWorkers.aliasSeparator',
                            }),
                          ),
                        },
                      ),
                    );
                  }
                  const memberTitle = titleParts.join('');
                  return (
                    <div
                      key={key}
                      className="EditWorkers__Member"
                      onDoubleClick={() => {
                        if (nameEditable && !isEditingName)
                          startEditName(member);
                      }}
                    >
                      <Avatar
                        type="user"
                        size={24}
                        url={userInfo?.hasAvatar ? userInfo.avatar : undefined}
                        className="EditWorkers__MemberAvatar"
                      />
                      {isEditingName ? (
                        <Input
                          className="EditWorkers__MemberNameInput"
                          size="small"
                          value={editingName}
                          autoFocus
                          onChange={(event) =>
                            setEditingName(event.target.value)
                          }
                          onPressEnter={commitEditName}
                          onBlur={commitEditName}
                          onKeyDown={(event) => {
                            if (event.key === 'Escape')
                              setEditingMemberKey(null);
                          }}
                        />
                      ) : (
                        <span
                          className="EditWorkers__MemberName"
                          title={memberTitle}
                        >
                          {main}
                          {note && (
                            <span className="EditWorkers__MemberUsername">
                              {formatMessage(
                                { id: 'site.editWorkers.noteEnclosed' },
                                { note },
                              )}
                            </span>
                          )}
                          {displayAliases.length > 0 && (
                            <span className="EditWorkers__MemberAlias">
                              {formatMessage(
                                { id: 'site.editWorkers.aliasGroup' },
                                {
                                  aliases: displayAliases.join(
                                    formatMessage({
                                      id: 'site.editWorkers.aliasSeparator',
                                    }),
                                  ),
                                },
                              )}
                            </span>
                          )}
                          {member.status === 'invited' && (
                            <span className="EditWorkers__CandidateBadge">
                              {formatMessage({
                                id: 'site.editWorkers.invited',
                              })}
                            </span>
                          )}
                        </span>
                      )}
                      <span className="EditWorkers__MemberActions">
                        {nameEditable && (
                          <Tooltip
                            overlay={formatMessage({
                              id: 'site.editWorkers.editNameTooltip',
                            })}
                          >
                            <span
                              className="EditWorkers__MemberEdit"
                              onClick={() => startEditName(member)}
                              role="button"
                              tabIndex={0}
                            >
                              <Icon icon="pencil-alt" />
                            </span>
                          </Tooltip>
                        )}
                        <span
                          className="EditWorkers__Remove"
                          onClick={() => removeRole(member, role)}
                        >
                          <Icon icon="times" />
                        </span>
                      </span>
                    </div>
                  );
                })}
                {draftForRole(role).length === 0 && (
                  <div className="EditWorkers__Result EditWorkers__Result--empty">
                    <span>
                      {formatMessage(
                        { id: 'site.editWorkers.noRoleMembers' },
                        { role: roleLabel },
                      )}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
      <div className="EditWorkers__SelfActions">
        {(!selfMember || selfMember.status === 'removed') && (
          <span className="EditWorkers__SelfAction" onClick={joinProject}>
            <Icon icon="sign-in-alt" />{' '}
            {formatMessage({ id: 'site.editWorkers.joinProject' })}
          </span>
        )}
        {selfMember?.status === 'invited' && (
          <span className="EditWorkers__SelfAction">
            <Icon icon="clock" />{' '}
            {formatMessage({ id: 'site.editWorkers.joinPending' })}
          </span>
        )}
        {canLeave && (
          <span
            className="EditWorkers__SelfAction EditWorkers__SelfAction--danger"
            onClick={leaveProject}
          >
            <Icon icon="sign-out-alt" />{' '}
            {formatMessage({ id: 'site.editWorkers.leaveProject' })}
          </span>
        )}
      </div>
      <div className="EditWorkers__Buttons">
        <span className="EditWorkers__Button" onClick={onCancel}>
          <Icon icon="times" />{' '}
          {formatMessage({ id: 'site.editWorkers.cancel' })}
        </span>
        <span
          ref={saveButtonRef}
          className="EditWorkers__Button EditWorkers__Button--save"
        >
          <Icon icon="check" />{' '}
          {saving
            ? formatMessage({ id: 'site.editWorkers.saving' })
            : formatMessage({ id: 'site.editWorkers.confirm' })}
        </span>
      </div>
    </div>
  );
};
