import { css } from '@emotion/core';
import classNames from 'classnames';
import { useCallback, useMemo } from 'react';
import { useIntl } from 'react-intl';
import { ProjectActivePresence } from '@/apis/project';
import { FC } from '@/interfaces';
import style from '@/style';
import { Tooltip } from './Tooltip';

/** “编辑中”状态徽章的属性接口 */
interface EditingStatusBadgeProps {
  /** 项目活跃人员状态；为空或无人活跃时渲染为空 */
  presence?: ProjectActivePresence | null;
  className?: string;
  /** 是否显示尾部跳动的省略号，默认显示 */
  showEllipsis?: boolean;
}

/**
 * “编辑中”状态徽章
 *
 * 复用于项目卡片、项目成员窗口和项目设置窗口，用于提示当前正在编辑项目的人员。
 */
export const EditingStatusBadge: FC<EditingStatusBadgeProps> = ({
  presence,
  className,
  showEllipsis = true,
}) => {
  const { formatMessage } = useIntl();

  const getActionTarget = useCallback(
    (action?: string): string => {
      if (!action) return '';
      if (action === 'staff' || action === 'member_list') {
        return formatMessage({ id: 'project.action.staff' });
      }
      if (action === 'setting' || action === 'project_info') {
        return formatMessage({ id: 'project.action.setting' });
      }
      if (action === 'translation' || action === 'translating') {
        return formatMessage({ id: 'project.action.translation' });
      }
      return '';
    },
    [formatMessage],
  );

  const editingText = useMemo(() => {
    if (!presence || presence.userCount <= 0) {
      return '';
    }
    const users = presence.users || [];
    const delimiter = formatMessage({ id: 'project.editingNamesDelimiter' });
    const someone = formatMessage({ id: 'project.editingSomeone' });

    if (users.length === 1) {
      const name = users[0].name || someone;
      const target = getActionTarget(users[0].action);
      if (target) {
        return formatMessage(
          { id: 'project.editingSingleWithAction' },
          { name, target },
        );
      }
      return formatMessage({ id: 'project.editingSingle' }, { name });
    }
    if (users.length === 2 && presence.userCount === 2) {
      const names = users.map((u) => u.name || someone).join(delimiter);
      const target1 = getActionTarget(users[0].action);
      const target2 = getActionTarget(users[1].action);
      if (target1 && target1 === target2) {
        return formatMessage(
          { id: 'project.editingMultipleWithAction' },
          { names, target: target1 },
        );
      }
      return formatMessage({ id: 'project.editingMultiple' }, { names });
    }
    if (presence.userCount >= 2 && users.length > 0) {
      const firstName = users[0].name || someone;
      const firstTarget = getActionTarget(users[0].action);
      const allSameTarget =
        Boolean(firstTarget) &&
        users.every((u) => getActionTarget(u.action) === firstTarget);
      if (allSameTarget) {
        return formatMessage(
          { id: 'project.editingManyWithAction' },
          {
            name: firstName,
            count: presence.userCount,
            others: presence.userCount - 1,
            target: firstTarget,
          },
        );
      }
      return formatMessage(
        { id: 'project.editingMany' },
        {
          name: firstName,
          count: presence.userCount,
          others: presence.userCount - 1,
        },
      );
    }
    return formatMessage(
      { id: 'project.editingCount' },
      { count: presence.userCount },
    );
  }, [presence, formatMessage, getActionTarget]);

  if (!presence || presence.userCount <= 0) {
    return null;
  }

  const tooltipTitle = (
    <div>
      <div style={{ fontWeight: 'bold', marginBottom: 2 }}>
        {formatMessage(
          { id: 'project.workingUsers' },
          { count: presence.userCount },
        )}
      </div>
      <div>
        {presence.users
          .map((u) => {
            const target = getActionTarget(u.action);
            return target ? `${u.name} (${target})` : u.name;
          })
          .join(formatMessage({ id: 'project.editingNamesDelimiter' }))}
      </div>
    </div>
  );

  return (
    <Tooltip title={tooltipTitle}>
      <div
        className={classNames('EditingStatusBadge', className)}
        css={css`
          display: inline-flex;
          align-items: center;
          max-width: 100%;
          padding: 1px 7px;
          border-radius: 10px;
          background-color: ${style.primaryColor}18;
          border: 1px solid ${style.primaryColor}38;
          color: ${style.primaryColor};
          font-size: 11px;
          line-height: 16px;
          font-weight: 500;
          .EditingStatusBadge__Dot {
            flex: none;
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background-color: ${style.primaryColor};
            margin-right: 5px;
            display: inline-block;
            animation: editingStatusPulse 1.4s infinite ease-in-out;
          }
          .EditingStatusBadge__Text {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          .EditingStatusBadge__Ellipsis {
            flex: none;
            display: inline-flex;
            margin-left: 1px;
            font-family: monospace;
            letter-spacing: 0.5px;
          }
          .EditingStatusBadge__EllipsisDot {
            display: inline-block;
            animation: editingStatusDotBlink 1.4s infinite ease-in-out both;
          }
          .EditingStatusBadge__EllipsisDot--1 {
            animation-delay: 0s;
          }
          .EditingStatusBadge__EllipsisDot--2 {
            animation-delay: 0.2s;
          }
          .EditingStatusBadge__EllipsisDot--3 {
            animation-delay: 0.4s;
          }
          @keyframes editingStatusDotBlink {
            0%,
            80%,
            100% {
              opacity: 0.2;
              transform: translateY(0);
            }
            40% {
              opacity: 1;
              transform: translateY(-1.5px);
            }
          }
          @keyframes editingStatusPulse {
            0%,
            100% {
              transform: scale(0.85);
              opacity: 0.5;
            }
            50% {
              transform: scale(1.25);
              opacity: 1;
            }
          }
        `}
      >
        <span className="EditingStatusBadge__Dot" />
        <span className="EditingStatusBadge__Text">{editingText}</span>
        {showEllipsis && (
          <span className="EditingStatusBadge__Ellipsis">
            <span className="EditingStatusBadge__EllipsisDot EditingStatusBadge__EllipsisDot--1">
              .
            </span>
            <span className="EditingStatusBadge__EllipsisDot EditingStatusBadge__EllipsisDot--2">
              .
            </span>
            <span className="EditingStatusBadge__EllipsisDot EditingStatusBadge__EllipsisDot--3">
              .
            </span>
          </span>
        )}
      </div>
    </Tooltip>
  );
};
