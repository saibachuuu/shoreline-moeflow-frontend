import { css } from '@emotion/core';
import { message } from 'antd';
import classNames from 'classnames';
import { createPortal } from 'react-dom';
import { useEffect, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';
import { Icon, Tooltip, EditWorkers } from '@/components';
import { api } from '@/apis';
import {
  APIProjectMember,
  APIProjectMemberSummary,
  PROJECT_WORKER_DISPLAY_ROLES,
} from '@/apis/project';
import {
  diffProjectMembers,
  formatProjectMemberNameWithAliases,
  projectMemberIdempotencyHeader,
} from '@/utils/projectMembers';
import { FC } from '@/interfaces';
import { AppState } from '@/store';
import style from '@/style';
import { clickEffect } from '@/utils/style';
import {
  hasCompleteMemberVersions,
  memberSummarySignature,
} from '@/utils/memberStats';
import { getProjectWorkerIconColor } from './projectWorkers';

interface MemberStatsProps {
  projectId: string;
  teamId: string;
  members?: Array<APIProjectMember | APIProjectMemberSummary>;
  qualificationMode?: 'qualified' | 'open';
  canEdit?: boolean;
  canManageMembers?: boolean;
  className?: string;
  onMembersUpdate?: (members: APIProjectMember[]) => void;
}

export const MemberStats: FC<MemberStatsProps> = ({
  projectId,
  teamId,
  members = [],
  qualificationMode = 'qualified',
  canEdit = false,
  canManageMembers = false,
  className,
  onMembersUpdate,
}) => {
  const { formatMessage } = useIntl();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const normalizeMember = (
    member: (APIProjectMember | APIProjectMemberSummary) & { id?: string },
  ): APIProjectMember =>
    ({
      ...member,
      memberId: member.memberId || member.id || '',
      version:
        'version' in member && Number.isInteger(member.version)
          ? member.version
          : Number.NaN,
      user: member.user ?? null,
    }) as APIProjectMember;
  const [loadedMembers, setLoadedMembers] = useState<APIProjectMember[]>(
    members.map(normalizeMember),
  );
  const buttonRef = useRef<HTMLSpanElement | null>(null);
  const currentUser = useSelector((state: AppState) => state.user);
  // Sync the prop into state by CONTENT, not by array reference: a caller that
  // passes a fresh array every render (e.g. an undefined memberSummary falling
  // back to the ``members = []`` default) would otherwise retrigger this effect
  // on every render and loop setState forever.
  const memberSummaryKey = memberSummarySignature(members);
  useEffect(() => {
    setLoadedMembers(members.map(normalizeMember));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberSummaryKey]);

  const getMembersForRole = (role: string, status = 'active') =>
    loadedMembers.filter(
      (member) => member.status === status && member.tags.includes(role),
    );

  // Load all project members in ONE request: the backend accepts a
  // comma-separated status list (``active,invited``), so the editor and the
  // post-save refresh no longer fan out one request per status.  Keeping every
  // load behind this single helper guarantees the two call sites stay merged.
  const loadProjectMembers = async (): Promise<APIProjectMember[]> => {
    const result = await api.member.getProjectMembers({
      projectID: projectId,
      params: { status: 'active,invited', limit: 100 },
    });
    return result.data.map(normalizeMember);
  };

  const refreshMembers = async () => {
    const nextMembers = await loadProjectMembers();
    setLoadedMembers(nextMembers);
    onMembersUpdate?.(nextMembers);
    return nextMembers;
  };

  const save = async (operations: ReturnType<typeof diffProjectMembers>) => {
    if (!operations.length) {
      setOpen(false);
      return;
    }
    try {
      await api.member.applyProjectMemberChanges({
        projectID: projectId,
        data: { operations },
        // operations[].operationId are stable (project+subject+action), so a
        // retried batch replays the same idempotent operation instead of
        // creating duplicates.  The header only carries an ASCII copy (the
        // backend treats it as a request id) -- the raw id may contain a
        // Chinese external name which HTTP headers cannot encode.
        configs: {
          headers: {
            'Idempotency-Key': projectMemberIdempotencyHeader(
              operations[0].operationId,
            ),
          },
        },
      });
      await refreshMembers();
      setOpen(false);
      message.success(formatMessage({ id: 'memberStats.updated' }));
    } catch (error: any) {
      // The batch endpoint stops at the first failed operation. Refreshing here
      // keeps already committed operations visible before the next attempt.
      if (Array.isArray(error?.data?.results) && error.data.results.length) {
        try {
          await refreshMembers();
          setOpen(false);
        } catch (refreshError: any) {
          refreshError?.default?.();
        }
      }
      error?.default?.();
    }
  };

  const openEditor = async (event: React.MouseEvent) => {
    event.stopPropagation();
    setLoading(true);
    try {
      if (!hasCompleteMemberVersions(loadedMembers)) {
        // Project cards contain a compact member summary without reliable
        // versions. Refresh it before editing so operations carry the
        // optimistic-concurrency version returned by the member endpoint.
        const nextMembers = await loadProjectMembers();
        setLoadedMembers(nextMembers);
        onMembersUpdate?.(nextMembers);
      }
      setOpen(true);
    } catch (error: any) {
      error.default();
    } finally {
      setLoading(false);
    }
  };

  const rect = buttonRef.current?.getBoundingClientRect();
  return (
    <div
      className={classNames('MemberStats', className)}
      css={css`
        display: flex;
        flex-wrap: nowrap;
        align-items: center;
        gap: 6px;
        min-height: 28px;
        margin: 5px 0;
        font-size: 12px;
        color: ${style.textColorSecondary};
        overflow: hidden;
        /* The role label keeps a single line: the text span ellipsizes when the
         card is narrow while the icon stays flex:none, so a scrollbar or tight
         width can never clip the icon itself. */
        .MemberStats__Role {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          white-space: nowrap;
          min-width: 0;
        }
        .MemberStats__RoleText {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          min-width: 0;
        }
        .MemberStats__RoleIcon {
          flex: none;
        }
        .MemberStats__Edit {
          flex: none;
          margin-left: auto;
          padding: 4px 9px;
          border: 1px solid ${style.borderColorLight};
          border-radius: ${style.borderRadiusBase};
          color: ${style.textColorSecondaryLighter};
          display: inline-flex;
          align-items: center;
          ${clickEffect()};
        }
      `}
    >
      {PROJECT_WORKER_DISPLAY_ROLES.map((role) => {
        const roleMembers = getMembersForRole(role.key);
        const invitedRoleMembers = getMembersForRole(role.key, 'invited');
        const roleLabel = formatMessage({
          id: `project.workerRole.${role.key}`,
        });
        const roleSummary = roleMembers.length
          ? formatMessage(
              { id: 'memberStats.roleSummary' },
              {
                role: roleLabel,
                members: roleMembers
                  .map((member) => formatProjectMemberNameWithAliases(member))
                  .join('、'),
              },
            )
          : invitedRoleMembers.length
            ? formatMessage(
                { id: 'memberStats.roleSummaryInvited' },
                {
                  role: roleLabel,
                  members: invitedRoleMembers
                    .map((member) => formatProjectMemberNameWithAliases(member))
                    .join('、'),
                },
              )
            : formatMessage(
                { id: 'memberStats.roleSummaryNone' },
                { role: roleLabel },
              );
        return (
          <Tooltip key={role.key} overlay={roleSummary}>
            <span className="MemberStats__Role">
              <span className="MemberStats__RoleText">{role.label}:</span>
              <Icon
                className="MemberStats__RoleIcon"
                icon="user-circle"
                style={{
                  color: getProjectWorkerIconColor(loadedMembers, role.key),
                }}
              />
            </span>
          </Tooltip>
        );
      })}
      {canEdit && (
        <span
          ref={buttonRef}
          className="MemberStats__Button MemberStats__Edit"
          onClick={openEditor}
          title={formatMessage({ id: 'memberStats.editTitle' })}
          role="button"
          tabIndex={0}
        >
          <Icon icon="pencil-alt" spin={loading} />{' '}
          {formatMessage({ id: 'memberStats.edit' })}
        </span>
      )}
      {open &&
        rect &&
        createPortal(
          <div
            onClick={(event) => {
              // 弹窗虽然通过 portal 挂在 body 上，但在 React 树里仍是项目卡片的
              // 子节点；不阻止冒泡会触发卡片的跳转（回到项目浏览页）。
              event.stopPropagation();
              setOpen(false);
            }}
            css={css`
              position: fixed;
              inset: 0;
              z-index: 1000;
              @media (max-width: 640px) {
                background: rgba(0, 0, 0, 0.45);
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 10px;
                box-sizing: border-box;
                overflow-y: auto;
                -webkit-overflow-scrolling: touch;
              }
            `}
          >
            <div
              onClick={(event) => event.stopPropagation()}
              css={css`
                position: fixed;
                top: ${Math.max(10, Math.min(rect.bottom + 5, window.innerHeight - 560))}px;
                left: ${Math.max(10, Math.min(rect.left, window.innerWidth - 660))}px;
                z-index: 1001;
                background: ${style.backgroundColorLight};
                color: ${style.textColor};
                border-radius: ${style.borderRadiusBase};
                box-shadow: ${style.boxShadowBase};
                @media (max-width: 640px) {
                  position: relative !important;
                  top: auto !important;
                  left: auto !important;
                  margin: auto;
                  width: 100% !important;
                  max-width: calc(100vw - 20px) !important;
                  max-height: calc(100dvh - 20px) !important;
                  display: flex;
                  flex-direction: column;
                  overflow-y: auto;
                  -webkit-overflow-scrolling: touch;
                }
              `}
            >
              <EditWorkers
                projectId={projectId}
                teamId={teamId}
                qualificationMode={qualificationMode}
                members={loadedMembers}
                canManageMembers={canManageMembers}
                currentUserId={currentUser.id}
                onSave={save}
                onRefresh={async () => {
                  await refreshMembers();
                }}
                onCancel={() => setOpen(false)}
              />
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
};
