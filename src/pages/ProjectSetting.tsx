import { css } from '@emotion/core';
import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';
import { useDispatch } from 'react-redux';
import { Redirect, Route, Switch, useLocation, useRouteMatch } from 'react-router-dom';
import {
  ApplicationList,
  DashboardBox,
  InvitationList,
  MemberList,
  NavTab,
  NavTabs,
  Spin,
} from '@/components';
import { PROJECT_PERMISSION, PROJECT_STATUS, normalizeProjectStatus } from '@/constants';
import { useProjectHeartbeat, useTitle } from '@/hooks';
import { FC, Project } from '@/interfaces';
import { AppState } from '@/store';
import { can } from '@/utils/user';
import { ProjectFinishedTip } from '@/components/project/ProjectFinishedTip';
import { ProjectSettingBase } from '@/components/project/ProjectSettingBase';
import { ProjectSettingTarget } from '@/components/project/ProjectSettingTarget';
import { editProject, setCurrentProject } from '@/store/project/slice';

/** 团队设置页的属性接口 */
interface ProjectSettingProps {
  project?: Project;
}
/**
 * 团队设置页
 */
const ProjectSetting: FC<ProjectSettingProps> = ({ project }) => {
  const { formatMessage } = useIntl(); // i18n
  const dispatch = useDispatch();
  useTitle(); // 设置标题
  const { path, url } = useRouteMatch();
  const location = useLocation();
  const platform = useSelector((state: AppState) => state.site.platform);
  const currentProject = useSelector(
    (state: AppState) => state.project.currentProject,
  );
  const isMobile = platform === 'mobile';
  const status = normalizeProjectStatus(currentProject?.status);
  const isCompleted = status === PROJECT_STATUS.COMPLETED;

  const isMemberTab = location.pathname.includes('/setting/member');
  useProjectHeartbeat(project?.id || currentProject?.id, {
    action: isMemberTab ? 'staff' : 'setting',
  });

  const nav = currentProject && (
    <NavTabs>
      <NavTab to={`${url}/base`}>
        {formatMessage({ id: 'site.baseSetting' })}
      </NavTab>
      {!isCompleted && (
        <>
          <NavTab to={`${url}/member`}>
            {formatMessage({ id: 'site.memberSetting' })}
          </NavTab>
          {can(currentProject, PROJECT_PERMISSION.CHECK_USER) && (
            <NavTab to={`${url}/application`}>
              {formatMessage({ id: 'site.applicationSetting' })}
            </NavTab>
          )}
          {can(currentProject, PROJECT_PERMISSION.INVITE_USER) && (
            <NavTab to={`${url}/invitation`}>
              {formatMessage({ id: 'site.invitationSetting' })}
            </NavTab>
          )}
          <NavTab to={`${url}/target`}>
            {formatMessage({ id: 'project.targetSetting' })}
          </NavTab>
        </>
      )}
      {/* <NavTab to={`${url}/role`}>
        {formatMessage({ id: 'site.roleSetting' })}
      </NavTab> */}
    </NavTabs>
  );

  // 已清空项目不可再进入设置；已完结项目保留基础页用于只读查看和恢复。
  if (status === PROJECT_STATUS.CLEARED) {
    return <ProjectFinishedTip />;
  }

  return currentProject ? (
    <DashboardBox
      // PC 版显示导航
      nav={!isMobile && nav}
      content={
        <Switch>
          {isMobile ? (
            // 手机版导航单独为一个页面
            <Route exact path={`${path}`}>
              {nav}
            </Route>
          ) : (
            // PC 版自动跳转到第一个导航
            <Redirect exact from={`${path}`} to={`${path}/base`} />
          )}
          <Route path={`${path}/base`}>
            <ProjectSettingBase />
          </Route>
          <Route path={`${path}/member`}>
            {isCompleted ? <ProjectFinishedTip /> : <MemberList groupType="project" currentGroup={currentProject} onProjectUpdated={(nextProject) => { dispatch(setCurrentProject(nextProject)); dispatch(editProject(nextProject)); }} />}
          </Route>
          <Route path={`${path}/application`}>
            {isCompleted ? <ProjectFinishedTip /> : (
              <ApplicationList
                type="group"
                groupType="project"
                currentGroup={currentProject}
              />
            )}
          </Route>
          <Route path={`${path}/invitation`}>
            {isCompleted ? <ProjectFinishedTip /> : <InvitationList groupType="project" currentGroup={currentProject} />}
          </Route>
          <Route path={`${path}/target`}>
            {isCompleted ? <ProjectFinishedTip /> : <ProjectSettingTarget />}
          </Route>
          <Route path={`${path}/role`}>
            {formatMessage({ id: 'project.customRole' })}
          </Route>
        </Switch>
      }
    />
  ) : (
    <Spin
      size="large"
      css={css`
        flex: auto;
        display: flex;
        justify-content: center;
        align-items: center;
      `}
    />
  );
};
export default ProjectSetting;
