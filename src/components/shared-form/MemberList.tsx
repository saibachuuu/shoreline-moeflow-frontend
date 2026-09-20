import { css } from '@emotion/core';
import { Button, Checkbox, Input, Modal, Radio, Select, Spin, Tag, Tooltip, message } from 'antd';
import { StarFilled, StarOutlined } from '@ant-design/icons';
import classNames from 'classnames';
import { useIntl } from 'react-intl';
import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { api } from '@/apis';
import { APIProjectMember } from '@/apis/project';
import { TeamMember } from '@/apis/member';
import { GroupTypes } from '@/apis/type';
import { Avatar, Icon } from '@/components';
import { PROJECT_STATUS, normalizeProjectStatus } from '@/constants';
import { FC, Project, UserTeam } from '@/interfaces';
import style from '@/style';
import { toLowerCamelCase } from '@/utils';
import { clickEffect } from '@/utils/style';
import {
  diffProjectMembers,
  projectMemberOperationId,
  projectMemberPrimaryName,
} from '@/utils/projectMembers';
import {
  mergeProjectIdentityTags,
  preferredDefaultMember,
  projectIdentityOf,
  projectJobTagsOf,
  removedSelfIdentityTags,
  sortMembersForDisplay,
} from '@/utils/memberSort';
import { PROJECT_WORKER_ROLES } from '@/apis/project';
import { can } from '@/utils/user';
import {
  buildFallbackIdentityTagOptions,
  IdentityTagOption,
  mergeIdentityTagOptions,
} from '@/utils/identityTags';
import { formatIdentityTagLabel } from '@/utils/identityLabels';
import {
  canEditTeamMember,
  canEditTeamMemberBaseTag,
  canRestoreTeamMember,
} from '@/utils/teamMembers';

type TagOption = IdentityTagOption;

const getMemberID = (member?: {
  id?: string;
  memberId?: string;
}): string | undefined => member?.id || member?.memberId;
const memberStatusMessageId: Record<string, string> = {
  active: 'site.memberList.memberStatusActive',
  invited: 'site.memberList.memberStatusInvited',
  removed: 'site.memberList.memberStatusRemoved',
};

interface MemberListProps {
  groupType: GroupTypes;
  currentGroup: UserTeam | Project;
  className?: string;
  onProjectUpdated?: (project: Project) => void;
}

const MemberCard = ({
  member,
  selected,
  onClick,
  name,
  secondaryName,
  avatarUrl,
  formatTag,
}: {
  member: any;
  selected: boolean;
  onClick: () => void;
  name: string;
  secondaryName?: string;
  avatarUrl?: string;
  formatTag: (code: string, fallback?: string) => string;
}) => {
  const { formatMessage } = useIntl();
  return (
    <div
      className={classNames('IdentityMemberList__Card', {
        'IdentityMemberList__Card--selected': selected,
      })}
      onClick={onClick}
    >
      <div className="IdentityMemberList__CardMain">
        {/* Registered members show their site avatar; external members get the default one. */}
        <Avatar
          type="user"
          size={26}
          className="IdentityMemberList__CardAvatar"
          url={avatarUrl}
        />
        <div className="IdentityMemberList__CardName">{name}</div>
      </div>
      <div className="IdentityMemberList__CardMeta">
        {secondaryName && (
          <span className="IdentityMemberList__CardSecondary">
            {secondaryName}
          </span>
        )}
        {member.status && (
          <Tag
            color={
              member.status === 'removed'
                ? 'default'
                : member.status === 'invited'
                  ? 'orange'
                  : 'green'
            }
          >
            {formatMessage({
              id: memberStatusMessageId[member.status] || member.status,
            })}
          </Tag>
        )}
        {member.baseTag && <Tag>{formatTag(member.baseTag)}</Tag>}
        {member.isOwner && <Tag color="gold">owner</Tag>}
      </div>
    </div>
  );
};

export const MemberList: FC<MemberListProps> = ({
  groupType,
  currentGroup,
  className,
  onProjectUpdated,
}) => {
  const { formatMessage } = useIntl();
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<Array<APIProjectMember | TeamMember>>(
    [],
  );
  const [selectedID, setSelectedID] = useState<string>();
  const [word, setWord] = useState('');
  const [tagOptions, setTagOptions] = useState<TagOption[]>([]);
  const currentUserID = useSelector((state: any) => state.user.id) as
    | string
    | undefined;
  const formatTag = (code: string, fallback?: string) =>
    formatIdentityTagLabel(formatMessage, code, fallback);

  useEffect(() => {
    const teamID =
      groupType === 'team'
        ? currentGroup.id
        : (currentGroup as Project).team.id;
    setTagOptions(buildFallbackIdentityTagOptions(groupType, []));
    api.member
      .getIdentityTagPolicy({ teamID })
      .then((result) => {
        const data = toLowerCamelCase(result.data) as any;
        const definitions =
          groupType === 'team' ? data.teamTags : data.projectTags;
        setTagOptions(
          mergeIdentityTagOptions(
            Object.values(definitions || {}) as TagOption[],
            members,
            groupType,
          ),
        );
      })
      .catch(() => {
        // The policy endpoint is restricted to team managers. Member editing
        // still works with the built-in and already-used tag fallbacks.
      });
  }, [currentGroup, groupType]);

  const currentTeamMember =
    groupType === 'team'
      ? (members.find((member: any) => member.userId === currentUserID) as
          | TeamMember
          | undefined)
      : undefined;
  const operatorBaseTag =
    groupType === 'team'
      ? currentTeamMember?.baseTag || (currentGroup as UserTeam).baseTag
      : undefined;
  const canManageMembers =
    groupType === 'project'
      ? can(currentGroup as Project, 'project:MANAGE_MEMBERS')
      : operatorBaseTag === 'creator' || operatorBaseTag === 'admin';

  useEffect(() => {
    setTagOptions((current) =>
      mergeIdentityTagOptions(current, members, groupType),
    );
  }, [members, groupType]);

  const load = async (): Promise<void> => {
    setLoading(true);
    try {
      const data =
        groupType === 'project'
          ? // One request for all member states (the backend accepts a
            // comma-separated status list) instead of one request per status.
            (
              await api.member.getProjectMembers({
                projectID: currentGroup.id,
                params: { status: 'active,invited,removed', limit: 3000 },
              })
            ).data
          : (
              await api.member.getTeamMembers({
                teamID: currentGroup.id,
                params: { status: 'active,removed', limit: 3000 },
              })
            ).data;
      setMembers(data as Array<APIProjectMember | TeamMember>);
      // Prefer selecting the current user themselves, then the creator, then
      // the first member; keep an existing selection while it is still listed.
      setSelectedID((current) => {
        if (data.some((item: any) => getMemberID(item) === current))
          return current;
        const preferred = preferredDefaultMember(
          data as any[],
          currentUserID,
          groupType,
        );
        return preferred ? getMemberID(preferred) : getMemberID(data[0] as any);
      });
    } catch (error: any) {
      error.default();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [currentGroup.id, groupType]);

  // Display order: creator > admin > member, then site name / display alias.
  const filteredMembers = useMemo(
    () =>
      sortMembersForDisplay(members).filter((member: any) => {
        const values =
          groupType === 'project'
            ? [
                member.displayName,
                member.user?.name,
                ...(member.user?.aliases || []),
                ...(member.aliases || []),
              ]
            : [
                member.user?.name,
                ...(member.user?.aliases || []),
                ...(member.aliases || []),
              ];
        const needle = word.toLocaleLowerCase();
        return (
          !word ||
          values.some((value) => value?.toLocaleLowerCase().includes(needle))
        );
      }),
    [groupType, members, word],
  );
  const selected = members.find(
    (member: any) => getMemberID(member) === selectedID,
  ) as any;

  return (
    <div
      className={classNames('IdentityMemberList', className)}
      css={css`
        width: 100%;
        max-width: 960px;
        height: 100%;
        max-height: 100%;
        box-sizing: border-box;
        min-width: 0;
        min-height: 0;
        display: grid;
        grid-template-columns: minmax(190px, 240px) minmax(0, 1fr);
        grid-template-rows: minmax(0, 1fr);
        overflow: hidden;
        border: 1px solid ${style.borderColorLight};
        .IdentityMemberList__Aside {
          display: flex;
          flex-direction: column;
          border-right: 1px solid ${style.borderColorLight};
          min-width: 0;
          min-height: 0;
          overflow: hidden;
        }
        .IdentityMemberList__Search {
          flex: none;
          width: 100%;
          box-sizing: border-box;
          padding: 10px;
          border-bottom: 1px solid ${style.borderColorLight};
        }
        .IdentityMemberList__Cards {
          flex: 1 1 auto;
          min-width: 0;
          min-height: 0;
          overflow: auto;
        }
        .IdentityMemberList__Card {
          padding: 10px;
          border-bottom: 1px solid ${style.borderColorLighter};
          ${clickEffect()};
          transition: background-color 150ms;
        }
        .IdentityMemberList__Card--selected {
          background: ${style.backgroundColorLight};
          border-left: 3px solid ${style.primaryColor};
          padding-left: 7px;
        }
        .IdentityMemberList__CardMain {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
        }
        .IdentityMemberList__CardAvatar {
          flex: none;
        }
        .IdentityMemberList__CardName {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .IdentityMemberList__CardMeta {
          margin-top: 5px;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 4px;
        }
        .IdentityMemberList__CardSecondary {
          color: ${style.textColorSecondary};
          font-size: 12px;
          margin-right: 4px;
        }
        .IdentityMemberList__Detail {
          min-width: 0;
          min-height: 0;
          padding: 18px;
          overflow: auto;
          overflow-wrap: anywhere;
        }
        .IdentityMemberList__Field {
          margin-bottom: 16px;
        }
        .IdentityMemberList__Label {
          display: block;
          margin-bottom: 6px;
          color: var(--text-color-secondary, rgba(0, 0, 0, 0.45));
          font-size: 12px;
        }
        .IdentityMemberList__Tags {
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
        }
        /* Same alias editor look as the site aliases in dashboard/user/setting
         (UserEditForm): a soft bordered field that highlights on focus. */
        .IdentityMemberList__AliasField {
          width: 100%;
          box-sizing: border-box;
          padding: 4px 11px;
          border: 1px solid ${style.borderColorBase};
          border-radius: ${style.borderRadiusBase};
          background: ${style.backgroundColorLight};
          transition: all 0.2s;
        }
        .IdentityMemberList__AliasField:focus-within {
          border-color: ${style.primaryColor};
          box-shadow: 0 0 0 2px ${style.primaryColor}20;
        }
        .IdentityMemberList__Hint {
          margin-top: 4px;
          font-size: 12px;
          color: var(--text-color-secondary, rgba(0, 0, 0, 0.45));
        }
        .IdentityMemberList__QuickSelectLabel {
          font-size: 12px;
          color: var(--text-color-secondary, rgba(0, 0, 0, 0.45));
        }
        .IdentityMemberList__SyncCheckbox {
          color: var(--text-color, rgba(0, 0, 0, 0.85)) !important;
          &.ant-checkbox-wrapper {
            color: var(--text-color, rgba(0, 0, 0, 0.85)) !important;
          }
          .ant-checkbox + span {
            color: var(--text-color, rgba(0, 0, 0, 0.85)) !important;
          }
        }
        .IdentityMemberList__SyncCheckboxLabel {
          font-size: 13px;
          font-weight: 500;
          color: var(--text-color, rgba(0, 0, 0, 0.85)) !important;
        }
        .IdentityMemberList__Aliases {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 4px;
        }
        .IdentityMemberList__AliasInput.ant-input {
          display: block;
          width: 100%;
          min-height: 48px;
          padding: 4px 0;
          resize: vertical;
        }
        .IdentityMemberList__Actions {
          display: flex;
          flex-wrap: wrap;
          justify-content: flex-end;
          gap: 8px;
          margin-top: 22px;
        }
        @media (max-width: 600px) {
          height: auto;
          max-height: none;
          grid-template-columns: 1fr;
          grid-template-rows: auto auto;
          overflow: visible;
          .IdentityMemberList__Aside {
            border-right: 0;
            border-bottom: 1px solid ${style.borderColorLight};
          }
          .IdentityMemberList__Cards {
            flex: none;
            max-height: 220px;
          }
          .IdentityMemberList__Detail {
            overflow: visible;
          }
        }
      `}
    >
      <aside className="IdentityMemberList__Aside">
        <Input
          className="IdentityMemberList__Search"
          value={word}
          onChange={(event) => setWord(event.target.value)}
          placeholder={formatMessage({
            id: 'site.memberList.searchPlaceholder',
          })}
        />
        <div className="IdentityMemberList__Cards">
          {loading ? (
            <Spin />
          ) : (
            filteredMembers.map((member: any) => {
              const isProject = groupType === 'project';
              const primary = isProject
                ? projectMemberPrimaryName(member)
                : member.user?.name;
              // Show the per-project alias underneath when a registered
              // member's site name differs from it (identical aliases must not
              // hide which site user a card belongs to).
              const secondary =
                isProject &&
                member.user?.name &&
                member.displayName !== member.user.name
                  ? member.displayName
                  : undefined;
              return (
                <MemberCard
                  key={getMemberID(member)}
                  member={member}
                  selected={getMemberID(member) === selectedID}
                  onClick={() => setSelectedID(getMemberID(member))}
                  name={primary}
                  secondaryName={secondary}
                  avatarUrl={member.user?.avatar}
                  formatTag={formatTag}
                />
              );
            })
          )}
        </div>
      </aside>
      <MemberDetail
        groupType={groupType}
        groupID={currentGroup.id}
        project={
          groupType === 'project' ? (currentGroup as Project) : undefined
        }
        members={members}
        member={selected}
        tagOptions={tagOptions}
        formatTag={formatTag}
        operatorBaseTag={operatorBaseTag}
        canManageMembers={canManageMembers}
        currentUserID={currentUserID}
        onProjectUpdated={onProjectUpdated}
        onSaved={(updated) => {
          setMembers((items) =>
            items.map((item: any) =>
              getMemberID(item) === getMemberID(updated) ? updated : item,
            ),
          );
        }}
        onReload={load}
      />
    </div>
  );
};

const MemberDetail = ({
  groupType,
  groupID,
  project,
  members,
  member,
  tagOptions,
  formatTag,
  operatorBaseTag,
  canManageMembers,
  currentUserID,
  onProjectUpdated,
  onSaved,
  onReload,
}: {
  groupType: GroupTypes;
  groupID: string;
  project?: Project;
  members: Array<APIProjectMember | TeamMember>;
  member: any;
  tagOptions: TagOption[];
  formatTag: (code: string, fallback?: string) => string;
  operatorBaseTag?: 'creator' | 'admin' | 'member';
  canManageMembers: boolean;
  currentUserID?: string;
  onProjectUpdated?: (project: Project) => void;
  onSaved: (member: any) => void;
  onReload: () => Promise<void>;
}) => {
  const { formatMessage } = useIntl();
  const [tags, setTags] = useState<string[]>(member?.tags || []);
  const [identity, setIdentity] = useState(projectIdentityOf(member?.tags));
  const [jobTags, setJobTags] = useState<string[]>(
    projectJobTagsOf(member?.tags),
  );
  const [baseTag, setBaseTag] = useState(member?.baseTag || 'member');
  const [qualifications, setQualifications] = useState<string[]>(
    member?.workerQualifications || [],
  );
  const [displayName, setDisplayName] = useState(member?.displayName || '');
  const [defaultDisplayName, setDefaultDisplayName] = useState(
    member?.defaultDisplayName || '',
  );
  const [aliases, setAliases] = useState<string[]>(member?.aliases || []);
  const [aliasInput, setAliasInput] = useState('');
  const [syncToProjects, setSyncToProjects] = useState(false);
  const [saving, setSaving] = useState(false);
  const [bindWord, setBindWord] = useState('');
  const [bindUsers, setBindUsers] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [bindLoading, setBindLoading] = useState(false);
  const [mergeTarget, setMergeTarget] = useState<any>();
  const [mergeNameSource, setMergeNameSource] = useState<'source' | 'target'>(
    'target',
  );
  const [mergeTags, setMergeTags] = useState<string[]>([]);
  const memberIsActive = member?.status === 'active';
  const canManageSelected =
    groupType === 'project'
      ? canManageMembers
      : canEditTeamMember(operatorBaseTag, member, currentUserID);
  const canEditBaseTag =
    groupType === 'team'
      ? canEditTeamMemberBaseTag(operatorBaseTag, member, currentUserID)
      : false;
  const canEditAlias =
    memberIsActive && (canManageSelected || member?.userId === currentUserID);
  const canEditSelected =
    memberIsActive && (canManageSelected || member?.userId === currentUserID);
  // Project member edits are split into a single-choice identity (creator /
  // admin / member) and a multi-choice job tags select.  Only the project
  // creator may change someone's identity, and nobody may change their own
  // identity (the backend rejects self-demotion as well).
  const canEditIdentity = Boolean(
    groupType === 'project' &&
      canEditSelected &&
      project?.ownerUserId === currentUserID &&
      member?.userId !== currentUserID,
  );
  // Identity choices: member/admin for everyone; "creator" only appears when
  // the member already holds it (only the project owner can hold it, and it is
  // always self-locked, so it can never be assigned to someone else).
  const identityOptions = useMemo(() => {
    const options = ['member', 'admin'];
    if (projectIdentityOf(member?.tags) === 'creator') options.push('creator');
    return options;
  }, [member]);
  const identityLabelId = (code: string): string =>
    ({
      member: 'site.memberList.identityMember',
      admin: 'site.memberList.identityAdmin',
      creator: 'site.memberList.identityCreator',
    })[code] || 'site.memberList.identityMember';
  const canRemoveProjectMember = Boolean(
    groupType === 'project' &&
      member &&
      member.status !== 'removed' &&
      !member.isOwner &&
      (canManageMembers ||
        (member.status === 'active' && member.userId === currentUserID)),
  );
  // Mechanism 3: only the project owner or the team creator may hard-delete an
  // external alias (permanent removal, not soft-remove).  The backend enforces
  // this too; the frontend just gates the button.
  const canHardDeleteExternal = Boolean(
    groupType === 'project' &&
      member &&
      member.status === 'active' &&
      !member.userId &&
      (project?.ownerUserId === currentUserID ||
        project?.team?.baseTag === 'creator'),
  );
  const canRestoreProjectMember = Boolean(
    groupType === 'project' &&
      member?.status === 'removed' &&
      canManageMembers &&
      normalizeProjectStatus(project?.status) === PROJECT_STATUS.NORMAL,
  );
  const canRemoveTeamMember = Boolean(
    groupType === 'team' &&
      memberIsActive &&
      member?.baseTag !== 'creator' &&
      (canManageSelected || member?.userId === currentUserID),
  );
  const canRestoreRemovedTeamMember =
    groupType === 'team' && canRestoreTeamMember(operatorBaseTag, member);

  useEffect(() => {
    setTags(member?.tags || []);
    setIdentity(projectIdentityOf(member?.tags));
    setJobTags(projectJobTagsOf(member?.tags));
    setBaseTag(member?.baseTag || 'member');
    setQualifications(member?.workerQualifications || []);
    setDisplayName(member?.displayName || '');
    setDefaultDisplayName(member?.defaultDisplayName || '');
    setAliases(member?.aliases || []);
    setSyncToProjects(false);
    setBindWord('');
    setBindUsers([]);
    setMergeTarget(undefined);
    setMergeTags([]);
  }, [member]);

  // Flat tags stored on the member = identity + job tags.
  const mergedTags = mergeProjectIdentityTags(identity, jobTags);

  useEffect(() => {
    if (
      groupType !== 'project' ||
      !member ||
      member.userId ||
      !bindWord.trim()
    ) {
      setBindUsers([]);
      return;
    }
    const timer = window.setTimeout(() => {
      setBindLoading(true);
      api.user
        .getUsers({ params: { word: bindWord.trim(), limit: 20 } })
        .then((result) =>
          setBindUsers(
            result.data.map((user) => ({ id: user.id, name: user.name })),
          ),
        )
        .catch((error) => error.default())
        .finally(() => setBindLoading(false));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [bindWord, groupType, member]);

  if (!member)
    return (
      <div className="IdentityMemberList__Detail">
        {formatMessage({ id: 'site.memberList.selectMember' })}
      </div>
    );
  const selectedMemberID = getMemberID(member);
  // Idempotent operation ids: pure functions of (project, subject, action,
  // payload), never Date.now().  A retried save must replay the same operation
  // instead of creating a duplicate — see projectMemberOperationId.  The
  // payload fingerprint keeps two different edits of the same member (e.g.
  // adding a second worker tag) from sharing an id and being swallowed by the
  // backend idempotency layer.
  const stableOp = (
    action: 'add' | 'update',
    content?: { tags?: string[]; displayName?: string; status?: string },
  ) =>
    projectMemberOperationId(
      groupID,
      {
        id: selectedMemberID,
        userId: member.userId,
        externalId: member.externalId,
        displayName,
        tags,
        status: member.status,
        version: member.version,
      },
      action,
      content,
    );

  const saveProject = async () => {
    // A creator/admin must not silently demote themselves by removing their
    // own identity tag; guard before sending the request (the backend also
    // rejects it).
    const blocked = removedSelfIdentityTags(member, mergedTags, currentUserID);
    if (blocked.length) {
      message.warning(
        formatMessage(
          { id: 'site.memberList.cannotRemoveOwnIdentity' },
          { tags: blocked.map((tag) => formatTag(tag)).join('、') },
        ),
      );
      return;
    }
    setSaving(true);
    try {
      const original = [
        {
          id: selectedMemberID,
          userId: member.userId,
          externalId: member.externalId,
          displayName: member.displayName,
          tags: member.tags,
          status: member.status,
          version: member.version,
        },
      ];
      const draft = [
        {
          id: selectedMemberID,
          userId: member.userId,
          externalId: member.externalId,
          displayName,
          tags: mergedTags,
          status: member.status,
          version: member.version,
        },
      ];
      const operations = diffProjectMembers(
        original,
        draft,
        (draftMember, action, content) =>
          projectMemberOperationId(groupID, draftMember, action, content),
      );
      if (operations.length)
        await api.member.applyProjectMemberChanges({
          projectID: groupID,
          data: { operations },
        });
      await onReload();
      message.success(
        formatMessage({ id: 'site.memberList.projectMembersUpdated' }),
      );
    } catch (error: any) {
      error.default();
    } finally {
      setSaving(false);
    }
  };

  const removeProjectMember = () => {
    if (!canRemoveProjectMember) return;
    Modal.confirm({
      title: formatMessage({ id: 'site.memberList.removeProjectMemberTitle' }),
      content: formatMessage(
        { id: 'site.memberList.removeMemberConfirm' },
        { name: member.displayName },
      ),
      okType: 'danger',
      okText: formatMessage({ id: 'site.memberList.remove' }),
      cancelText: formatMessage({ id: 'site.memberList.cancel' }),
      onOk: async () => {
        setSaving(true);
        try {
          await api.member.applyProjectMemberChanges({
            projectID: groupID,
            data: {
              operations: [
                {
                  operationId: stableOp('update', { status: 'removed' }),
                  action: 'update',
                  memberId: selectedMemberID,
                  expectedMemberVersion: member.version,
                  changes: { status: 'removed' },
                },
              ],
            },
          });
          await onReload();
          message.success(
            formatMessage({ id: 'site.memberList.projectMemberRemoved' }),
          );
        } catch (error: any) {
          error.default();
        } finally {
          setSaving(false);
        }
      },
    });
  };

  const hardDeleteExternal = () => {
    if (!canHardDeleteExternal) return;
    Modal.confirm({
      title: formatMessage({ id: 'site.memberList.hardDeleteExternalTitle' }),
      content: formatMessage(
        { id: 'site.memberList.hardDeleteExternalConfirm' },
        { name: member.displayName },
      ),
      okType: 'danger',
      okText: formatMessage({ id: 'site.memberList.hardDelete' }),
      cancelText: formatMessage({ id: 'site.memberList.cancel' }),
      onOk: async () => {
        setSaving(true);
        try {
          await api.member.hardDeleteProjectMember({
            projectID: groupID,
            memberID: selectedMemberID!,
          });
          await onReload();
          message.success(
            formatMessage({ id: 'site.memberList.projectMemberHardDeleted' }),
          );
        } catch (error: any) {
          error.default();
        } finally {
          setSaving(false);
        }
      },
    });
  };

  const restoreProjectMember = async () => {
    if (!canRestoreProjectMember) return;
    setSaving(true);
    try {
      await api.member.applyProjectMemberChanges({
        projectID: groupID,
        data: {
          operations: [
            {
              operationId: stableOp('add', {
                tags: mergedTags,
                displayName,
                status: 'active',
              }),
              action: 'add',
              memberId: selectedMemberID,
              userId: member.userId || undefined,
              displayName: member.displayName,
              tags: mergedTags,
              expectedMemberVersion: member.version,
            },
          ],
        },
      });
      await onReload();
      message.success(
        formatMessage({ id: 'site.memberList.projectMemberRestored' }),
      );
    } catch (error: any) {
      error.default();
    } finally {
      setSaving(false);
    }
  };

  const saveTeam = async () => {
    if (!canEditSelected) return;
    setSaving(true);
    try {
      let updated: any = member;
      if (canManageSelected) {
        const result = await api.member.updateTeamMember({
          teamID: groupID,
          memberID: selectedMemberID!,
          data: {
            expectedVersion: member.version,
            ...(canEditBaseTag ? { baseTag } : {}),
            tags,
            workerQualifications: qualifications,
          },
        });
        updated = result.data.member;
      }
      if (JSON.stringify(aliases) !== JSON.stringify(member.aliases)) {
        const aliasResult = await api.member.updateTeamMemberAliases({
          teamID: groupID,
          memberID: selectedMemberID!,
          aliases,
          expectedVersion: updated.version,
        });
        updated = aliasResult.data.member;
      }
      if (
        (defaultDisplayName || '') !== (member.defaultDisplayName || '') ||
        syncToProjects
      ) {
        const nameResult = await api.member.updateTeamMemberDefaultDisplayName({
          teamID: groupID,
          memberID: selectedMemberID!,
          defaultDisplayName,
          expectedVersion: updated.version,
          syncToProjects,
        });
        updated = nameResult.data.member;
        setSyncToProjects(false);
      }
      message.success(
        formatMessage({ id: 'site.memberList.teamMembersUpdated' }),
      );
      onSaved(toLowerCamelCase(updated));
    } catch (error: any) {
      error.default();
    } finally {
      setSaving(false);
    }
  };

  const removeTeamMember = () => {
    if (!canRemoveTeamMember) return;
    Modal.confirm({
      title: formatMessage({ id: 'site.memberList.removeTeamMemberTitle' }),
      content: formatMessage(
        { id: 'site.memberList.removeMemberConfirm' },
        { name: member.user?.name },
      ),
      okType: 'danger',
      okText: formatMessage({ id: 'site.memberList.remove' }),
      cancelText: formatMessage({ id: 'site.memberList.cancel' }),
      onOk: async () => {
        setSaving(true);
        try {
          await api.member.removeTeamMember({
            teamID: groupID,
            memberID: selectedMemberID!,
            expectedVersion: member.version,
          });
          await onReload();
          message.success(
            formatMessage({ id: 'site.memberList.teamMemberRemoved' }),
          );
        } catch (error: any) {
          error.default();
        } finally {
          setSaving(false);
        }
      },
    });
  };

  const restoreTeamMember = async () => {
    if (!canRestoreRemovedTeamMember) return;
    setSaving(true);
    try {
      await api.member.addTeamMember({
        teamID: groupID,
        data: {
          userId: member.userId,
          baseTag,
          tags,
          workerQualifications: qualifications,
        },
      });
      await onReload();
      message.success(
        formatMessage({ id: 'site.memberList.teamMemberRestored' }),
      );
    } catch (error: any) {
      error.default();
    } finally {
      setSaving(false);
    }
  };

  const bindUser = async (userID: string) => {
    setSaving(true);
    try {
      const result = await api.member.bindProjectMember({
        projectID: groupID,
        memberID: selectedMemberID!,
        userID,
        expectedVersion: member.version,
      });
      message.success(
        formatMessage({ id: 'site.memberList.projectMemberBound' }),
      );
      onSaved(toLowerCamelCase((result.data as any).member));
      await onReload();
    } catch (error: any) {
      const errorCode =
        error?.data?.identityCode || error?.data?.code;
      if (errorCode === 'MEMBER_MERGE_REQUIRED' || errorCode === 5109) {
        // The backend normally auto-merges now; this branch is the fallback
        // for a concurrent duplicate that still surfaces the explicit merge
        // dialog.
        const target = members.find(
          (item: any) => item.userId === userID && item.status !== 'removed',
        );
        if (target) {
          setMergeTarget(target);
          setMergeNameSource('target');
          setMergeTags([
            ...new Set([...(target.tags || []), ...(member.tags || [])]),
          ]);
          return;
        }
        message.warning(
          formatMessage({ id: 'site.memberList.mergeUnavailable' }),
        );
      } else {
        error.default();
      }
    } finally {
      setSaving(false);
    }
  };

  const mergeMembers = async () => {
    if (!mergeTarget) return;
    setSaving(true);
    try {
      await api.member.mergeProjectMember({
        projectID: groupID,
        memberID: selectedMemberID!,
        data: {
          targetMemberId: getMemberID(mergeTarget)!,
          expectedSourceVersion: member.version,
          expectedTargetVersion: mergeTarget.version,
          displayName:
            mergeNameSource === 'source'
              ? member.displayName
              : mergeTarget.displayName,
          tags: mergeTags,
        },
      });
      setMergeTarget(undefined);
      await onReload();
      message.success(
        formatMessage({ id: 'site.memberList.projectMembersMerged' }),
      );
    } catch (error: any) {
      error.default();
    } finally {
      setSaving(false);
    }
  };

  const transferOwner = async () => {
    if (groupType !== 'project' || !project || !member.userId || member.isOwner)
      return;
    setSaving(true);
    try {
      const result = await api.member.transferProjectOwner({
        projectID: groupID,
        newOwnerUserID: member.userId,
        expectedOwnerUserID: project.ownerUserId || undefined,
        expectedVersion: project.ownerVersion,
      });
      message.success(
        formatMessage({ id: 'site.memberList.ownerTransferred' }),
      );
      const data = toLowerCamelCase(result.data as any) as any;
      if (data.project) onProjectUpdated?.(data.project as Project);
      await onReload();
    } catch (error: any) {
      error.default();
    } finally {
      setSaving(false);
    }
  };

  const addAlias = () => {
    const value = aliasInput.trim();
    if (value && !aliases.includes(value)) setAliases([...aliases, value]);
    setAliasInput('');
  };
  return (
    <section className="IdentityMemberList__Detail">
      <div className="IdentityMemberList__Field">
        <span className="IdentityMemberList__Label">
          {formatMessage({ id: 'site.memberList.member' })}
        </span>
        <strong>
          {groupType === 'project'
            ? projectMemberPrimaryName(member)
            : member.user?.name}
        </strong>
        {member.userId ? (
          <Tag>{formatMessage({ id: 'site.memberList.registeredUser' })}</Tag>
        ) : (
          <Tag>{formatMessage({ id: 'site.memberList.externalUser' })}</Tag>
        )}
      </div>
      {groupType === 'project' ? (
        <>
          <div className="IdentityMemberList__Field">
            <span className="IdentityMemberList__Label">
              {formatMessage({ id: 'site.memberList.projectDisplayName' })}
            </span>
            <Input
              disabled={!canEditSelected}
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
            />
          </div>
          <div className="IdentityMemberList__Field">
            <span className="IdentityMemberList__Label">
              {formatMessage({ id: 'site.memberList.projectIdentity' })}
            </span>
            <Select
              disabled={!canEditSelected || !canEditIdentity}
              style={{ width: '100%' }}
              value={identity}
              onChange={setIdentity}
            >
              {identityOptions.map((code) => (
                <Select.Option key={code} value={code}>
                  {formatMessage({ id: identityLabelId(code) })}
                </Select.Option>
              ))}
            </Select>
          </div>
          <div className="IdentityMemberList__Field">
            <span className="IdentityMemberList__Label">
              {formatMessage({ id: 'site.memberList.projectJob' })}
            </span>
            <Select
              disabled={!canEditSelected}
              mode="multiple"
              style={{ width: '100%' }}
              value={jobTags}
              onChange={setJobTags}
            >
              {tagOptions
                .filter(
                  (tag) =>
                    tag.code !== 'creator' &&
                    tag.code !== 'admin' &&
                    (tag.assignable !== false || jobTags.includes(tag.code)),
                )
                .map((tag) => (
                  <Select.Option key={tag.code} value={tag.code}>
                    {formatTag(tag.code, tag.name || tag.code)}
                  </Select.Option>
                ))}
            </Select>
          </div>
          <div className="IdentityMemberList__Field">
            <span className="IdentityMemberList__Label">
              {formatMessage({ id: 'site.memberList.status' })}
            </span>
            <Tag
              color={
                member.status === 'removed'
                  ? 'default'
                  : member.status === 'invited'
                    ? 'orange'
                    : 'green'
              }
            >
              {formatMessage({
                id: memberStatusMessageId[member.status] || member.status,
              })}
            </Tag>
            {member.isOwner && <Tag color="gold">owner</Tag>}
          </div>
          {canManageMembers && !member.userId && (
            <div className="IdentityMemberList__Field">
              <span className="IdentityMemberList__Label">
                {formatMessage({ id: 'site.memberList.bindRegisteredUser' })}
              </span>
              <Input
                value={bindWord}
                onChange={(event) => setBindWord(event.target.value)}
                placeholder={formatMessage({
                  id: 'site.memberList.searchRegisteredUserPlaceholder',
                })}
              />
              {bindLoading && <Spin size="small" />}
              {bindUsers.map((user) => (
                <div
                  key={user.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginTop: 6,
                  }}
                >
                  <span>{user.name}</span>
                  <Button
                    size="small"
                    loading={saving}
                    onClick={() => bindUser(user.id)}
                  >
                    {formatMessage({ id: 'site.memberList.bind' })}
                  </Button>
                </div>
              ))}
            </div>
          )}
          {canManageMembers &&
            member.status === 'active' &&
            member.userId &&
            !member.isOwner && (
              <div className="IdentityMemberList__Field">
                <Button loading={saving} onClick={transferOwner}>
                  {formatMessage({ id: 'site.memberList.transferToOwner' })}
                </Button>
              </div>
            )}
        </>
      ) : (
        <>
          <div className="IdentityMemberList__Field">
            <span className="IdentityMemberList__Label">
              {formatMessage({ id: 'site.memberList.status' })}
            </span>
            <Tag color={member.status === 'removed' ? 'default' : 'green'}>
              {formatMessage({
                id: memberStatusMessageId[member.status] || member.status,
              })}
            </Tag>
            {member.baseTag === 'creator' && <Tag color="gold">creator</Tag>}
          </div>
          <div className="IdentityMemberList__Field">
            <span className="IdentityMemberList__Label">
              {formatMessage({ id: 'site.memberList.baseIdentity' })}
            </span>
            {member.baseTag === 'creator' ? (
              <Tag color="gold">{formatTag('creator')}</Tag>
            ) : (
              <Select
                disabled={!canEditBaseTag || !memberIsActive}
                style={{ width: '100%' }}
                value={baseTag}
                onChange={setBaseTag}
              >
                <Select.Option value="member">
                  {formatTag('member')}
                </Select.Option>
                <Select.Option value="admin">
                  {formatTag('admin')}
                </Select.Option>
              </Select>
            )}
          </div>
          <div className="IdentityMemberList__Field">
            <span className="IdentityMemberList__Label">
              {formatMessage({ id: 'site.memberList.defaultDisplayName' })}
            </span>
            <Input
              disabled={
                !memberIsActive ||
                (!canManageSelected && member?.userId !== currentUserID)
              }
              value={defaultDisplayName}
              onChange={(event) => setDefaultDisplayName(event.target.value)}
              placeholder={formatMessage({
                id: 'site.memberList.defaultDisplayNamePlaceholder',
              })}
            />
            {memberIsActive && (canManageSelected || member?.userId === currentUserID) && (
              <div
                style={{
                  marginTop: 6,
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 6,
                  alignItems: 'center',
                }}
              >
                <span className="IdentityMemberList__QuickSelectLabel">
                  {formatMessage({ id: 'site.memberList.quickSelectDisplayName' })}
                </span>
                <Tooltip
                  title={
                    !defaultDisplayName
                      ? formatMessage({ id: 'site.memberList.currentPreferred' })
                      : formatMessage({ id: 'userEdit.cancelPreferredTooltip' })
                  }
                >
                  <Tag
                    color={!defaultDisplayName ? 'gold' : undefined}
                    style={{ cursor: 'pointer' }}
                    onClick={() => setDefaultDisplayName('')}
                  >
                    {!defaultDisplayName ? (
                      <StarFilled style={{ marginRight: 4 }} />
                    ) : (
                      <StarOutlined style={{ marginRight: 4, opacity: 0.5 }} />
                    )}
                    {member.user?.name}
                    {member.user?.defaultDisplayName &&
                      member.user.defaultDisplayName !== member.user.name && (
                        <span style={{ marginLeft: 4, opacity: 0.85 }}>
                          ({formatMessage({ id: 'site.memberList.sitePreferred' })}: {member.user.defaultDisplayName})
                        </span>
                      )}
                  </Tag>
                </Tooltip>
                {(member.user?.aliases || []).map((alias: string) => {
                  const isCur = defaultDisplayName === alias;
                  return (
                    <Tooltip
                      key={`site-${alias}`}
                      title={
                        isCur
                          ? formatMessage({ id: 'userEdit.cancelPreferredTooltip' })
                          : formatMessage({ id: 'userEdit.setAsPreferredTooltip' })
                      }
                    >
                      <Tag
                        color={isCur ? 'gold' : undefined}
                        style={{ cursor: 'pointer' }}
                        onClick={() => setDefaultDisplayName(isCur ? '' : alias)}
                      >
                        {isCur ? (
                          <StarFilled style={{ marginRight: 4 }} />
                        ) : (
                          <StarOutlined style={{ marginRight: 4, opacity: 0.5 }} />
                        )}
                        {alias}
                      </Tag>
                    </Tooltip>
                  );
                })}
                {aliases.map((alias: string) => {
                  if ((member.user?.aliases || []).includes(alias)) return null;
                  const isCur = defaultDisplayName === alias;
                  return (
                    <Tooltip
                      key={`team-${alias}`}
                      title={
                        isCur
                          ? formatMessage({ id: 'userEdit.cancelPreferredTooltip' })
                          : formatMessage({ id: 'userEdit.setAsPreferredTooltip' })
                      }
                    >
                      <Tag
                        color={isCur ? 'gold' : undefined}
                        style={{ cursor: 'pointer' }}
                        onClick={() => setDefaultDisplayName(isCur ? '' : alias)}
                      >
                        {isCur ? (
                          <StarFilled style={{ marginRight: 4 }} />
                        ) : (
                          <StarOutlined style={{ marginRight: 4, opacity: 0.5 }} />
                        )}
                        {alias}
                      </Tag>
                    </Tooltip>
                  );
                })}
              </div>
            )}
            <div className="IdentityMemberList__Hint">
              {formatMessage({ id: 'site.memberList.defaultDisplayNameHint' })}
            </div>
            {canManageSelected && memberIsActive && (
              <div style={{ marginTop: 8 }}>
                <Checkbox
                  className="IdentityMemberList__SyncCheckbox"
                  checked={syncToProjects}
                  onChange={(e) => setSyncToProjects(e.target.checked)}
                >
                  <span
                    className="IdentityMemberList__SyncCheckboxLabel"
                    style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-color, inherit)' }}
                  >
                    {formatMessage({ id: 'site.memberList.syncToProjects' })}
                  </span>
                </Checkbox>
                <div className="IdentityMemberList__Hint" style={{ marginTop: 2 }}>
                  {formatMessage({ id: 'site.memberList.syncToProjectsHint' })}
                </div>
              </div>
            )}
          </div>
          <div className="IdentityMemberList__Field">
            <span className="IdentityMemberList__Label">
              {formatMessage({ id: 'site.memberList.teamTags' })}
            </span>
            <Select
              disabled={!canManageSelected || !memberIsActive}
              mode="multiple"
              style={{ width: '100%' }}
              value={tags}
              onChange={setTags}
            >
              {tagOptions
                .filter(
                  (tag) => tag.assignable !== false || tags.includes(tag.code),
                )
                .map((tag) => (
                  <Select.Option key={tag.code} value={tag.code}>
                    {formatTag(tag.code, tag.name || tag.code)}
                  </Select.Option>
                ))}
            </Select>
          </div>
          <div className="IdentityMemberList__Field">
            <span className="IdentityMemberList__Label">
              {formatMessage({ id: 'site.memberList.workerQualifications' })}
            </span>
            <Select
              disabled={!canManageSelected || !memberIsActive}
              mode="multiple"
              style={{ width: '100%' }}
              value={qualifications}
              onChange={setQualifications}
            >
              {PROJECT_WORKER_ROLES.map((tag) => (
                <Select.Option key={tag.key} value={tag.key}>
                  {tag.label}
                </Select.Option>
              ))}
            </Select>
          </div>
          <div className="IdentityMemberList__Field">
            <span className="IdentityMemberList__Label">
              {formatMessage({ id: 'site.memberList.siteAliasesReadonly' })}
            </span>
            <div>
              {(member.user?.aliases || []).length
                ? (member.user.aliases || []).map((alias: string) => {
                    const isCur = defaultDisplayName === alias;
                    return (
                      <Tooltip
                        key={alias}
                        title={
                          isCur
                            ? formatMessage({ id: 'userEdit.cancelPreferredTooltip' })
                            : formatMessage({ id: 'userEdit.setAsPreferredTooltip' })
                        }
                      >
                        <Tag
                          color={isCur ? 'gold' : undefined}
                          style={{
                            cursor:
                              canManageSelected || member?.userId === currentUserID
                                ? 'pointer'
                                : 'default',
                          }}
                          onClick={() => {
                            if (
                              canManageSelected ||
                              member?.userId === currentUserID
                            ) {
                              setDefaultDisplayName(isCur ? '' : alias);
                            }
                          }}
                        >
                          {isCur && <StarFilled style={{ marginRight: 4 }} />}
                          {alias}
                          {isCur && (
                            <span style={{ marginLeft: 4, fontWeight: 500 }}>
                              ({formatMessage({ id: 'site.memberList.currentPreferred' })})
                            </span>
                          )}
                        </Tag>
                      </Tooltip>
                    );
                  })
                : formatMessage({ id: 'site.memberList.none' })}
            </div>
          </div>
          <div className="IdentityMemberList__Field">
            <span className="IdentityMemberList__Label">
              {formatMessage({ id: 'site.memberList.teamAliases' })}
            </span>
            {canEditAlias ? (
              <div className="IdentityMemberList__AliasField">
                <div className="IdentityMemberList__Aliases">
                  {aliases.map((alias) => {
                    const isCur = defaultDisplayName === alias;
                    return (
                      <Tag
                        closable
                        key={alias}
                        color={isCur ? 'gold' : undefined}
                        style={{ cursor: 'pointer' }}
                        onClick={() => setDefaultDisplayName(isCur ? '' : alias)}
                        onClose={(e) => {
                          e.stopPropagation();
                          setAliases(aliases.filter((item) => item !== alias));
                          if (defaultDisplayName === alias) {
                            setDefaultDisplayName('');
                          }
                        }}
                      >
                        {isCur && <StarFilled style={{ marginRight: 4 }} />}
                        {alias}
                        {isCur && (
                          <span style={{ marginLeft: 4, fontWeight: 500 }}>
                            ({formatMessage({ id: 'site.memberList.currentPreferred' })})
                          </span>
                        )}
                      </Tag>
                    );
                  })}
                </div>
                <Input.TextArea
                  bordered={false}
                  autoSize={{ minRows: 2, maxRows: 4 }}
                  className="IdentityMemberList__AliasInput"
                  value={aliasInput}
                  onChange={(event) => setAliasInput(event.target.value)}
                  onPressEnter={(event) => {
                    event.preventDefault();
                    addAlias();
                  }}
                  placeholder={formatMessage({
                    id: 'site.memberList.aliasInputPlaceholder',
                  })}
                />
              </div>
            ) : (
              <div className="IdentityMemberList__Tags">
                {aliases.length
                  ? aliases.map((alias) => <Tag key={alias}>{alias}</Tag>)
                  : formatMessage({ id: 'site.memberList.none' })}
              </div>
            )}
          </div>
        </>
      )}
      <div className="IdentityMemberList__Actions">
        <Button onClick={onReload}>
          {formatMessage({ id: 'site.memberList.refresh' })}
        </Button>
        {canRemoveProjectMember && (
          <Button danger loading={saving} onClick={removeProjectMember}>
            <Icon icon="trash-alt" />{' '}
            {formatMessage({ id: 'site.memberList.removeMember' })}
          </Button>
        )}
        {canHardDeleteExternal && (
          <Button danger loading={saving} onClick={hardDeleteExternal}>
            <Icon icon="trash-alt" />{' '}
            {formatMessage({ id: 'site.memberList.hardDeleteExternal' })}
          </Button>
        )}
        {canRestoreProjectMember && (
          <Button loading={saving} onClick={restoreProjectMember}>
            <Icon icon="undo" />{' '}
            {formatMessage({ id: 'site.memberList.restoreMember' })}
          </Button>
        )}
        {canRemoveTeamMember && (
          <Button danger loading={saving} onClick={removeTeamMember}>
            <Icon icon="trash-alt" />{' '}
            {formatMessage({ id: 'site.memberList.removeMember' })}
          </Button>
        )}
        {canRestoreRemovedTeamMember && (
          <Button loading={saving} onClick={restoreTeamMember}>
            <Icon icon="undo" />{' '}
            {formatMessage({ id: 'site.memberList.restoreMember' })}
          </Button>
        )}
        <Button
          type="primary"
          disabled={!canEditSelected}
          loading={saving}
          onClick={groupType === 'project' ? saveProject : saveTeam}
        >
          {formatMessage({ id: 'site.memberList.save' })}
        </Button>
      </div>
      <Modal
        visible={Boolean(mergeTarget)}
        title={formatMessage({
          id: 'site.memberList.mergeProjectMembersTitle',
        })}
        onCancel={() => !saving && setMergeTarget(undefined)}
        onOk={mergeMembers}
        confirmLoading={saving}
        okText={formatMessage({ id: 'site.memberList.confirmMerge' })}
        cancelText={formatMessage({ id: 'site.memberList.cancel' })}
      >
        {mergeTarget && (
          <>
            <p>{formatMessage({ id: 'site.memberList.mergeHint' })}</p>
            <div className="IdentityMemberList__Field">
              <span className="IdentityMemberList__Label">
                {formatMessage({ id: 'site.memberList.projectDisplayName' })}
              </span>
              <Radio.Group
                value={mergeNameSource}
                onChange={(event) => setMergeNameSource(event.target.value)}
              >
                <Radio value="target">
                  {formatMessage(
                    { id: 'site.memberList.mergeExistingMember' },
                    { name: mergeTarget.displayName },
                  )}
                </Radio>
                <Radio value="source">
                  {formatMessage(
                    { id: 'site.memberList.mergeExternalName' },
                    { name: member.displayName },
                  )}
                </Radio>
              </Radio.Group>
            </div>
            <div className="IdentityMemberList__Field">
              <span className="IdentityMemberList__Label">
                {formatMessage({ id: 'site.memberList.mergedTags' })}
              </span>
              <Select
                mode="multiple"
                style={{ width: '100%' }}
                value={mergeTags}
                onChange={setMergeTags}
              >
                {tagOptions.map((tag) => (
                  <Select.Option key={tag.code} value={tag.code}>
                    {formatTag(tag.code, tag.name || tag.code)}
                  </Select.Option>
                ))}
              </Select>
            </div>
          </>
        )}
      </Modal>
    </section>
  );
};
