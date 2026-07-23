import { css } from '@emotion/core';
import classNames from 'classnames';
import { useRef, useState } from 'react';
import { IconProp } from '@fortawesome/fontawesome-svg-core';
import { createPortal } from 'react-dom';
import { Icon, Tooltip, EditWorkers } from '@/components';
import { FC } from '@/interfaces';
import style from '@/style';
import { clickEffect } from '@/utils/style';
import projectApi, {
  PROJECT_WORKER_DISPLAY_ROLES,
  ProjectWorkerRole,
  ProjectWorkers,
} from '@/apis/project';
import { getProjectWorkerIconColor } from './projectWorkers';

interface MemberStatsProps {
  workers: ProjectWorkers;
  projectId?: string;
  canEdit?: boolean;
  className?: string;
  onWorkersUpdate?: (workers: ProjectWorkers) => void;
}

export const MemberStats: FC<MemberStatsProps> = ({
  workers,
  projectId,
  canEdit = false,
  className,
  onWorkersUpdate,
}) => {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const editButtonRef = useRef<HTMLSpanElement | null>(null);

  const roles = PROJECT_WORKER_DISPLAY_ROLES;

  const getRoleIcon = (
    roleKey: ProjectWorkerRole,
  ): { icon: IconProp; color: string } => {
    return {
      icon: 'user-circle',
      color: getProjectWorkerIconColor(workers, roleKey),
    };
  };

  const getRoleTooltip = (role: {
    key: ProjectWorkerRole;
    label: string;
  }): string => {
    const members = workers[role.key];
    if (!members?.length) {
      return `暂无${role.label}人员`;
    }
    return `${role.label}：${members.join('、')}`;
  };

  const getPopupPosition = () => {
    if (!editButtonRef.current)
      return { top: 'auto', bottom: 'auto', left: 'auto', right: 'auto' };

    const rect = editButtonRef.current.getBoundingClientRect();
    const popupHeight = 320;
    const popupWidth = 300;
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const spaceBelow = viewportHeight - rect.bottom - 5;
    const spaceAbove = rect.top - 5;
    const spaceRight = viewportWidth - rect.right;

    const vertical =
      spaceBelow >= popupHeight
        ? { top: `${rect.bottom + 5}px`, bottom: 'auto' }
        : spaceAbove >= popupHeight
          ? { top: 'auto', bottom: `${viewportHeight - rect.top + 5}px` }
          : spaceBelow >= spaceAbove
            ? { top: `${rect.bottom + 5}px`, bottom: 'auto' }
            : { top: 'auto', bottom: `${viewportHeight - rect.top + 5}px` };

    const horizontal =
      spaceRight >= popupWidth
        ? { left: `${rect.right}px`, right: 'auto' }
        : rect.left >= popupWidth
          ? { left: 'auto', right: `${viewportWidth - rect.left}px` }
          : { left: '10px', right: 'auto' };

    return { ...vertical, ...horizontal };
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditModalOpen(true);
  };

  const handleEditCancel = () => {
    setIsEditModalOpen(false);
  };

  const handleEditSave = async (newWorkers: ProjectWorkers) => {
    if (!projectId) return;
    try {
      await projectApi.updateProjectWorkers({
        id: projectId,
        data: { workers: newWorkers },
      });
      setIsEditModalOpen(false);
      onWorkersUpdate?.(newWorkers);
    } catch (error) {
      console.error('更新工作人员失败:', error);
    }
  };

  const handleClickOutside = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditModalOpen(false);
  };

  return (
    <div
      className={classNames('MemberStats', className)}
      css={css`
        display: flex;
        flex-direction: column;
        margin: 5px 0;
        font-size: 12px;
        color: ${style.textColorSecondary};
        .MemberStats__Row {
          display: flex;
          align-items: center;
          margin-bottom: 5px;
          &:last-child {
            margin-bottom: 0;
          }
        }
        .MemberStats__StatusRow {
          justify-content: flex-start;
        }
        .MemberStats__ButtonRow {
          justify-content: flex-end;
        }
        .MemberStats__Item {
          display: flex;
          align-items: center;
          margin-right: 5px;
          &:last-child {
            margin-right: 0;
          }
        }
        .MemberStats__ItemLabel {
          margin-right: 4px;
        }
        .MemberStats__ItemIcon {
          margin-right: 4px;
          font-size: 13px;
        }
        .MemberStats__Button {
          flex: none;
          border-radius: ${style.borderRadiusBase};
          padding: 5px 9px;
          margin-left: 5px;
          ${clickEffect()};
          font-size: 12px;
          display: flex;
          align-items: center;
          color: ${style.textColorSecondaryLighter};
        }
        .MemberStats__ButtonIcon {
          margin-right: 3px;
        }
      `}
    >
      <div className="MemberStats__Row MemberStats__StatusRow">
        {roles.map((role) => {
          const iconData = getRoleIcon(role.key);
          return (
            <Tooltip key={role.key} overlay={getRoleTooltip(role)}>
              <span className="MemberStats__Item">
                <span className="MemberStats__ItemLabel">{role.label}:</span>
                <span
                  style={{ color: iconData.color, marginRight: '4px' }}
                  className="MemberStats__ItemIcon"
                >
                  <Icon icon={iconData.icon} />
                </span>
              </span>
            </Tooltip>
          );
        })}
      </div>
      {canEdit && (
        <div className="MemberStats__Row MemberStats__ButtonRow">
          <span
            className="MemberStats__Button"
            onClick={handleEditClick}
            ref={editButtonRef}
          >
            <Icon icon="pencil-alt" className="MemberStats__ButtonIcon" />
          </span>
        </div>
      )}
      {isEditModalOpen &&
        createPortal(
          <div
            css={css`
              position: fixed;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              z-index: 1000;
            `}
            onClick={handleClickOutside}
          >
            <div
              css={css`
                position: absolute;
                 background: ${style.backgroundColorLight};
                 color: ${style.textColor};
                border-radius: ${style.borderRadiusBase};
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
                z-index: 1001;
                max-height: calc(100vh - 20px);
                overflow-y: auto;
                max-width: calc(100vw - 20px);
              `}
              style={{
                ...getPopupPosition(),
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <EditWorkers
                workers={workers || {}}
                onSave={handleEditSave}
                onCancel={handleEditCancel}
              />
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
};
