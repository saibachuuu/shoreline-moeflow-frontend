import { css } from '@emotion/core';
import classNames from 'classnames';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';
import { useHistory, useLocation, useRouteMatch } from 'react-router-dom';
import { Icon, TranslationProgress, MemberStats } from '@/components';
import {
  PROJECT_PERMISSION,
  PROJECT_STATUS,
  normalizeProjectStatus,
} from '@/constants';
import { FC, Project } from '@/interfaces';
import { AppState } from '@/store';
import { resetFilesState } from '@/store/file/slice';
import style from '@/style';
import { cardActiveEffect, cardClickEffect, clickEffect } from '@/utils/style';
import { can } from '@/utils/user';
import { getMemberStatsPermissions } from '@/utils/memberStats';

interface ProjectItemProps {
  from: 'team' | 'user';
  project: Project;
  className?: string;
}

export const ProjectItem: FC<ProjectItemProps> = ({
  from,
  project,
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
