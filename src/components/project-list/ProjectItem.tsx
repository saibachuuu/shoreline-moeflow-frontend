import { css } from '@emotion/core';
import classNames from 'classnames';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';
import { useHistory, useLocation, useRouteMatch } from 'react-router-dom';
import { Icon, TranslationProgress, MemberStats, Tooltip } from '@/components';
import {
  PROJECT_PERMISSION,
  PROJECT_STATUS,
  normalizeProjectStatus,
} from '@/constants';
import { FC, Project } from '@/interfaces';
import { ProjectActivePresence } from '@/apis/project';
import { AppState } from '@/store';
import { resetFilesState } from '@/store/file/slice';
import style from '@/style';
import { cardActiveEffect, cardClickEffect, clickEffect } from '@/utils/style';
import { can } from '@/utils/user';
import { getMemberStatsPermissions } from '@/utils/memberStats';

interface ProjectItemProps {
  from: 'team' | 'user';
  project: Project;
  activePresence?: ProjectActivePresence | null;
  className?: string;
}

export const ProjectItem: FC<ProjectItemProps> = ({
  from,
  project,
  activePresence,
  className,
}) => {
  const { formatMessage } = useIntl();
  const { url } = useRouteMatch();
  const location = useLocation();
  const history = useHistory();
  const dispatch = useDispatch();
  const currentProjectSet = useSelector(
    (state: AppState) => state.projectSet.currentProjectSet,
  );
  const status = normalizeProjectStatus(project.status);
  const presence = activePresence || project.activePresence;
  const isWorking = Boolean(presence && presence.userCount > 0);
  const memberStatsPermissions = getMemberStatsPermissions(project, status);
  const urlPrefix = from === 'team' ? '/projects' : '';

  const handleClick = () => {
    dispatch(resetFilesState());
    if (can(project, PROJECT_PERMISSION.ACCESS)) {
      history.push(`${url + urlPrefix}/${project.id}`);
    } else {
      history.push(`${url + urlPrefix}/${project.id}/preview`);
    }
  };

  const handleSettingClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    history.push(`${url + urlPrefix}/${project.id}/setting`);
  };

  return (
    <div
      className={classNames('ProjectItem', className, {
        'ProjectItem--hasBelong': from === 'user',
        'ProjectItem--active': location.pathname.includes(
          'projects/' + project.id,
        ),
        'ProjectItem--completed': status === PROJECT_STATUS.COMPLETED,
        'ProjectItem--cleared': status === PROJECT_STATUS.CLEARED,
        'ProjectItem--working': isWorking,
      })}
      css={css`
        position: relative;
        width: 100%;
        border-radius: ${style.borderRadiusBase};
        overflow: hidden;
        transition:
          box-shadow 100ms,
          border-color 100ms;
        border: 1px solid ${style.borderColorLight};
        ${cardClickEffect()};
        background-color: ${style.backgroundColorLight};
        color: ${style.textColor};
        padding: 3px ${style.paddingBase - 5}px 0;
        &.ProjectItem--hasBelong {
          padding-top: ${style.paddingBase - 3}px;
        }
        &.ProjectItem--active {
          ${cardActiveEffect()};
        }
        &.ProjectItem--working {
          border: 1.5px solid ${style.primaryColor};
          box-shadow: 0 0 10px ${style.primaryColor}38;
        }
        .ProjectItem__WorkingBadge {
          display: inline-flex;
          align-items: center;
          margin-left: 8px;
          padding: 1px 7px;
          border-radius: 10px;
          background-color: ${style.primaryColor}18;
          border: 1px solid ${style.primaryColor}38;
          color: ${style.primaryColor};
          font-size: 11px;
          line-height: 16px;
          font-weight: 500;
          vertical-align: middle;
        }
        .ProjectItem__WorkingDot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background-color: ${style.primaryColor};
          margin-right: 4px;
          display: inline-block;
          animation: workingPulse 1.4s infinite ease-in-out;
        }
        .ProjectItem__WorkingEllipsis {
          display: inline-flex;
          margin-left: 1px;
          font-family: monospace;
          letter-spacing: 0.5px;
        }
        .ProjectItem__Dot {
          display: inline-block;
          animation: dotBlink 1.4s infinite ease-in-out both;
        }
        .ProjectItem__Dot--1 {
          animation-delay: 0s;
        }
        .ProjectItem__Dot--2 {
          animation-delay: 0.2s;
        }
        .ProjectItem__Dot--3 {
          animation-delay: 0.4s;
        }
        @keyframes dotBlink {
          0%, 80%, 100% {
            opacity: 0.2;
            transform: translateY(0);
          }
          40% {
            opacity: 1;
            transform: translateY(-1.5px);
          }
        }
        @keyframes workingPulse {
          0%, 100% {
            transform: scale(0.85);
            opacity: 0.5;
          }
          50% {
            transform: scale(1.25);
            opacity: 1;
          }
        }
        &.ProjectItem--completed::after,
        &.ProjectItem--cleared::after {
          content: '';
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 4;
        }
        &.ProjectItem--completed::after,
        &.ProjectItem--cleared::after {
          background: rgba(128, 128, 128, 0.22);
        }
        &.ProjectItem--cleared::before {
          content: '';
          position: absolute;
          left: -8%;
          top: 50%;
          width: 116%;
          height: 2px;
          background: ${style.errorColor}d0;
          box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.18);
          transform: rotate(-8deg);
          transform-origin: center;
          pointer-events: none;
          z-index: 5;
        }
        .ProjectItem__Content {
          position: relative;
          z-index: 3;
        }
        .ProjectItem__Belong {
          width: 100%;
          display: flex;
          align-items: center;
          font-size: 12px;
          line-height: 12px;
          color: ${style.textColorSecondary};
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .ProjectItem__TeamName {
          flex: none;
          max-width: 31%;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .ProjectItem__TeamToProjectSetIcon {
          flex: none;
          margin: 0 4px;
        }
        .ProjectItem__ProjectSetName {
          flex: none;
          max-width: calc(69% - 14px);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .ProjectItem__Name {
          max-height: 60px;
          overflow: hidden;
          word-break: break-all;
          font-size: 14px;
          line-height: 20px;
          margin: 5px 0;
        }
        .ProjectItem__ProjectSetTag {
          flex: none;
          font-size: 13px;
          font-weight: bold;
          color: ${style.primaryColor};
          margin-right: 8px;
        }
        .ProjectItem__Bottom {
          display: flex;
          align-items: center;
          height: 32px;
        }
        .ProjectItem__BottomButtonWrapper {
          margin-left: auto;
          font-size: 12px;
          display: flex;
          align-items: center;
          color: ${style.textColorSecondaryLighter};
        }
        .ProjectItem__BottomButtonSetting {
          flex: none;
          border-radius: ${style.borderRadiusBase};
          padding: 5px 9px;
          margin-right: -8px;
          ${clickEffect()};
        }
        .ProjectItem__BottomButtonIcon {
          margin-right: 3px;
        }
      `}
      onClick={handleClick}
    >
      <div className="ProjectItem__Content">
        {from === 'user' && (
          <div className="ProjectItem__Belong">
            <div className="ProjectItem__TeamName">{project.team.name}</div>
            <Icon
              className="ProjectItem__TeamToProjectSetIcon"
              icon="angle-right"
            />
            <div className="ProjectItem__ProjectSetName">
              {project.projectSet.default
                ? formatMessage({ id: 'projectSet.default' })
                : project.projectSet.name}
            </div>
          </div>
        )}
        <div className="ProjectItem__Name">
          {from === 'team' &&
            currentProjectSet &&
            project.projectSet.id !== currentProjectSet.id && (
              <span className="ProjectItem__ProjectSetTag">
                {project.projectSet.default
                  ? formatMessage({ id: 'projectSet.default' })
                  : project.projectSet.name}
              </span>
            )}
          {project.name}
          {isWorking && (
            <Tooltip
              title={
                <div>
                  <div style={{ fontWeight: 'bold', marginBottom: 2 }}>
                    {formatMessage(
                      { id: 'project.workingUsers' },
                      { count: presence!.userCount },
                    )}
                  </div>
                  <div>
                    {presence!.users.map((u) => u.name).join('、')}
                  </div>
                </div>
              }
            >
              <span className="ProjectItem__WorkingBadge">
                <span className="ProjectItem__WorkingDot" />
                <span>{formatMessage({ id: 'project.working' })}</span>
                <span className="ProjectItem__WorkingEllipsis">
                  <span className="ProjectItem__Dot ProjectItem__Dot--1">.</span>
                  <span className="ProjectItem__Dot ProjectItem__Dot--2">.</span>
                  <span className="ProjectItem__Dot ProjectItem__Dot--3">.</span>
                </span>
              </span>
            </Tooltip>
          )}
        </div>
        <MemberStats
          projectId={project.id}
          teamId={project.team.id}
          qualificationMode={project.team.workerQualificationMode}
          members={project.memberSummary}
          canEdit={memberStatsPermissions.canOpen}
          canManageMembers={memberStatsPermissions.canManage}
        />
        <TranslationProgress
          className="ProjectItem__TranslationProgressLine"
          sourceCount={project.sourceCount * project.targetCount}
          translatedSourceCount={project.translatedSourceCount}
          checkedSourceCount={project.checkedSourceCount}
          type="line"
        />
        <div className="ProjectItem__Bottom">
          <TranslationProgress
            className="ProjectItem__TranslationProgressText"
            sourceCount={project.sourceCount * project.targetCount}
            translatedSourceCount={project.translatedSourceCount}
            checkedSourceCount={project.checkedSourceCount}
            type="text"
          />
          <div className="ProjectItem__BottomButtonWrapper">
            {status === PROJECT_STATUS.CLEARED ? (
              <div className="ProjectItem__BottomButton">
                <Icon
                  className="ProjectItem__BottomButtonIcon"
                  icon="times-circle"
                />
                {formatMessage({ id: 'project.finished' })}
              </div>
            ) : status === PROJECT_STATUS.COMPLETED ? (
              can(project, PROJECT_PERMISSION.COMPLETE_PROJECT) ? (
                <div
                  className="ProjectItem__BottomButtonSetting"
                  onClick={handleSettingClick}
                >
                  <Icon
                    className="ProjectItem__BottomButtonIcon"
                    icon="sync-alt"
                  />
                  {formatMessage({ id: 'projectItem.restore' })}
                </div>
              ) : (
                <div className="ProjectItem__BottomButton">
                  <Icon className="ProjectItem__BottomButtonIcon" icon="eye" />
                  {formatMessage({ id: 'project.finished' })}
                </div>
              )
            ) : can(project, PROJECT_PERMISSION.ACCESS) ? (
              <div
                className="ProjectItem__BottomButtonSetting"
                onClick={handleSettingClick}
              >
                <Icon className="ProjectItem__BottomButtonIcon" icon="cog" />
                {formatMessage({ id: 'site.setting' })}
              </div>
            ) : (
              <div className="ProjectItem__BottomButton">
                <Icon className="ProjectItem__BottomButtonIcon" icon="plus" />
                {formatMessage({ id: 'site.join' })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
