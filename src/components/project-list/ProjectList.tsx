import { css } from '@emotion/core';
import { Button, Select } from 'antd';
import { CancelToken } from 'axios';
import classNames from 'classnames';
import React, { useEffect, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';
import { useHistory, useRouteMatch } from 'react-router-dom';
import { EmptyTip, Icon, List } from '@/components';
import { ProjectItem } from './ProjectItem';
import api, { resultTypes } from '@/apis';
import { PROJECT_STATUS, normalizeProjectStatus } from '@/constants';
import { FC, UserProjectSet, Project } from '@/interfaces';
import { AppState } from '@/store';
import {
  clearProjects,
  createProject,
  resetProjectsState,
  setProjectsState,
} from '@/store/project/slice';
import style from '@/style';
import { toLowerCamelCase } from '@/utils';
import { clickEffect } from '@/utils/style';
import { buildTeamProjectSearchParams } from '@/utils/projectSearch';
import {
  PROJECT_WORKER_ROLES,
  ProjectWorkerRole,
  ProjectActivePresence,
  getTeamActivePresence,
} from '@/apis/project';

/** 项目列表的属性接口 */
interface ProjectListProps {
  from: 'user' | 'team';
  className?: string;
  searchRightButton?: React.ReactNode | React.ReactElement;
  onSearchRightButtonClick?: (e: React.MouseEvent) => void;
}
/**
 * 项目列表
 */
export const ProjectList: FC<ProjectListProps> = ({
  from,
  searchRightButton,
  onSearchRightButtonClick,
  className,
}) => {
  const { formatMessage } = useIntl(); // i18n
  const projects = useSelector((state: AppState) => state.project.projects);
  const platform = useSelector((state: AppState) => state.site.platform);
  const isMobile = platform === 'mobile';
  const history = useHistory(); // 路由
  const dispatch = useDispatch();
  const { url } = useRouteMatch();
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0); // 元素总个数
  // 当 from 为 team 时，才有 currentProjectSet 和 currentTeam
  const currentTeam = useSelector((state: AppState) => state.team.currentTeam);
  const currentProjectSet = useSelector(
    (state: AppState) => state.projectSet.currentProjectSet,
  );
  const currentUser = useSelector((state: AppState) => state.user);
  const currentProject = useSelector(
    (state: AppState) => state.project.currentProject,
  );

  const defaultPage = useSelector(
    (state: AppState) => state.project.projectsState.page,
  );
  const defaultWord = useSelector(
    (state: AppState) => state.project.projectsState.word,
  );
  const defaultScrollTop = useSelector(
    (state: AppState) => state.project.projectsState.scrollTop,
  );
  const status = useSelector(
    (state: AppState) => state.project.projectsState.status,
  );

  const [showWorkerSearch, setShowWorkerSearch] = useState(false);
  const [searchMode, setSearchMode] = useState<string>('search-project-name');
  const [selectedProjectSetIDs, setSelectedProjectSetIDs] = useState<string[]>(
    () => (currentProjectSet ? [currentProjectSet.id] : []),
  );
  const [availableProjectSets, setAvailableProjectSets] = useState<
    UserProjectSet[]
  >([]);
  const [searchRole, setSearchRole] = useState<ProjectWorkerRole | ''>('');
  const [activeWorkerSearch, setActiveWorkerSearch] = useState(false);
  const workerSearchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!currentProjectSet) {
      return;
    }
    setSelectedProjectSetIDs([currentProjectSet.id]);
  }, [currentProjectSet]);

  useEffect(() => {
    if (!currentTeam) {
      return;
    }
    api
      .getTeamProjectSets({ teamID: currentTeam.id, params: { limit: 1000 } })
      .then((result) => setAvailableProjectSets(toLowerCamelCase(result.data)))
      .catch((error) => error.default());
  }, [currentTeam]);

  const [activePresenceMap, setActivePresenceMap] = useState<
    Record<string, ProjectActivePresence>
  >({});

  // 轮询团队下所有项目的在线/工作活跃状态（实时性）
  useEffect(() => {
    if (from !== 'team' || !currentTeam) {
      return;
    }

    let isSubscribed = true;

    const fetchActivePresence = () => {
      if (
        typeof document !== 'undefined' &&
        document.visibilityState === 'hidden'
      ) {
        return;
      }
      getTeamActivePresence({ teamID: currentTeam.id })
        .then((result) => {
          if (!isSubscribed) return;
          const camelData = toLowerCamelCase(result.data);
          setActivePresenceMap(camelData.activeProjects || {});
        })
        .catch(() => {});
    };

    fetchActivePresence();
    const interval = setInterval(fetchActivePresence, 6000);

    const handleVisibilityChange = () => {
      if (
        typeof document !== 'undefined' &&
        document.visibilityState === 'visible'
      ) {
        fetchActivePresence();
      }
    };
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    return () => {
      isSubscribed = false;
      clearInterval(interval);
      if (typeof document !== 'undefined') {
        document.removeEventListener(
          'visibilitychange',
          handleVisibilityChange,
        );
      }
    };
  }, [from, currentTeam?.id]);

  const sortedProjects = React.useMemo(() => {
    if (!activePresenceMap || Object.keys(activePresenceMap).length === 0) {
      return projects;
    }
    const activeList: Project[] = [];
    const normalList: Project[] = [];
    for (const p of projects) {
      const presence = activePresenceMap[p.id] || p.activePresence;
      if (presence && presence.userCount > 0) {
        activeList.push(p);
      } else {
        normalList.push(p);
      }
    }
    return [...activeList, ...normalList];
  }, [projects, activePresenceMap]);

  /** 获取元素 */
  const handleChange = ({
    page,
    pageSize,
    word,
    cancelToken,
  }: {
    page: number;
    pageSize: number;
    word?: string;
    cancelToken: CancelToken;
  }) => {
    setLoading(true);
    dispatch(clearProjects());
    if (from === 'user') {
      return api
        .getUserProjects({
          params: {
            page,
            limit: pageSize,
            word,
            status,
          },
          configs: {
            cancelToken,
          },
        })
        .then((result) => {
          // 设置数量
          setTotal(result.headers['x-pagination-count']);
          setLoading(false);
          for (const project of result.data) {
            const camelProject = toLowerCamelCase(project);
            camelProject.status = normalizeProjectStatus(camelProject.status);
            dispatch(createProject({ project: camelProject }));
          }
        })
        .catch((error) => {
          // 如果是 cancel 的请求，则不取消 loading 状态，因为肯定有下一个请求
          if (error.type !== resultTypes.CANCEL_FAILURE) {
            setLoading(false);
          }
          error.default();
        });
    } else if (from === 'team') {
      const params = buildTeamProjectSearchParams({
        page,
        limit: pageSize,
        status,
        searchMode,
        searchRole,
        word,
        currentProjectSetID: currentProjectSet!.id,
        selectedProjectSetIDs,
      });
      return api
        .getTeamProjects({
          teamID: currentTeam!.id,
          params,
          configs: {
            cancelToken,
          },
        })
        .then((result) => {
          // 设置数量
          setTotal(result.headers['x-pagination-count']);
          setLoading(false);
          for (const project of result.data) {
            const camelProject = toLowerCamelCase(project);
            camelProject.status = normalizeProjectStatus(camelProject.status);
            dispatch(createProject({ project: camelProject }));
          }
        })
        .catch((error) => {
          // 如果是 cancel 的请求，则不取消 loading 状态，因为肯定有下一个请求
          if (error.type !== resultTypes.CANCEL_FAILURE) {
            setLoading(false);
          }
          error.default();
        });
    }
  };

  const handleWorkerSearchToggle = () => {
    setShowWorkerSearch((v) => !v);
  };

  const handleWorkerSearchClear = () => {
    setActiveWorkerSearch(false);
    setSearchRole('');
    setSearchMode('search-project-name');
    setSelectedProjectSetIDs(currentProjectSet ? [currentProjectSet.id] : []);
    dispatch(clearProjects());
    dispatch(setProjectsState({ word: '', page: 1 }));
    setLoading(true);
  };

  // 用于刷新 List 的唯一 ID
  let listID = '';
  if (from === 'user') {
    listID = currentUser.id;
  } else if (from === 'team') {
    listID =
      currentTeam!.id +
      currentProjectSet!.id +
      '-project-sets-' +
      selectedProjectSetIDs.join('-');
    if (activeWorkerSearch) {
      listID += '-ws-' + searchMode + '-' + (searchRole || 'any');
    }
  }

  return (
    <List
      id={listID + '-' + status.toString()}
      css={css`
        .List__ItemWrapper {
          padding: 0 ${style.paddingBase}px;
          margin-bottom: ${style.paddingBase}px;
        }
        .ProjectList__Statuses {
          display: flex;
          margin: 0 ${style.paddingBase}px 10px;
          border-radius: ${style.borderRadiusBase};
          overflow: hidden;
          border: 1px solid ${style.borderColorLighter};
        }
        .ProjectList__Status {
          display: flex;
          justify-content: center;
          flex: auto;
          padding: 3px 0;
          font-size: 12px;
          ${clickEffect()};
        }
        .ProjectList__CurrentProject {
          margin: 0 ${style.paddingBase}px ${style.paddingBase / 1.3}px;
          border-bottom: 1px solid ${style.borderColorLight};
        }
        .ProjectList__CurrentProjectTip {
          font-size: 12px;
          font-weight: bold;
          color: ${style.textColorSecondary};
          text-align: center;
          padding: ${style.paddingBase / 2}px 0 ${style.paddingBase / 3}px;
        }
        .ProjectList__Status--active {
          font-weight: bold;
          background: ${style.backgroundColorLight};
        }
      `}
      className={classNames(['ProjectList', className])}
      onChange={handleChange}
      loading={loading}
      total={total}
      items={sortedProjects}
      itemHeight={200}
      minPageSize={isMobile ? 10 : 15}
      itemCreater={(project) => (
        <ProjectItem
          from={from}
          project={project}
          activePresence={
            activePresenceMap[project.id] || project.activePresence
          }
        />
      )}
      emptyTipCreater={() => {
        if (status === PROJECT_STATUS.NORMAL) {
          if (from === 'user') {
            return (
              <EmptyTip
                className="ProjectList__EmptyTip"
                text={formatMessage({ id: 'myProject.emptyTip' })}
              />
            );
          } else if (from === 'team') {
            return (
              <EmptyTip
                className="ProjectList__EmptyTip"
                text={formatMessage({ id: 'project.emptyTip' })}
                buttons={
                  <Button
                    onClick={() => {
                      history.push(`${url}/create-project`);
                    }}
                  >
                    {formatMessage({ id: 'site.create' })}
                  </Button>
                }
              />
            );
          }
        } else {
          return (
            <EmptyTip
              className="ProjectList__EmptyTip"
              text={formatMessage({ id: 'project.emptyFinishedTip' })}
            />
          );
        }
      }}
      searchEmptyTipCreater={(word) => {
        return (
          <EmptyTip
            className="ProjectList__EmptyTip"
            text={formatMessage({ id: 'project.emptySearchTip' }, { word })}
          />
        );
      }}
      searchRightButton={searchRightButton}
      onSearchRightButtonClick={onSearchRightButtonClick}
      searchLeftButton={
        from === 'team' ? (
          <Icon
            icon="user-check"
            css={
              activeWorkerSearch &&
              css`
                color: ${style.primaryColor} !important;
              `
            }
          />
        ) : undefined
      }
      onSearchLeftButtonClick={
        from === 'team' ? handleWorkerSearchToggle : undefined
      }
      defaultPage={defaultPage}
      onPageChange={(page) => {
        dispatch(setProjectsState({ page }));
      }}
      defaultWord={defaultWord}
      onWordChange={(word) => {
        dispatch(setProjectsState({ word }));
      }}
      defaultScrollTop={defaultScrollTop}
      onScrollTopChange={(scrollTop) => {
        dispatch(setProjectsState({ scrollTop }));
      }}
      header={
        <>
          {from === 'team' && showWorkerSearch && (
            <div
              ref={workerSearchRef}
              css={css`
                margin: 0 ${style.paddingBase}px 10px;
                padding: 10px;
                background: ${style.backgroundColorLight};
                border-radius: ${style.borderRadiusBase};
                border: 1px solid ${style.borderColorLight};
                .WorkerSearch__Row {
                  display: flex;
                  align-items: center;
                  gap: 8px;
                  margin-bottom: 8px;
                  &:last-child {
                    margin-bottom: 0;
                  }
                }
                .WorkerSearch__Label {
                  flex: none;
                  width: 56px;
                  font-size: 12px;
                  color: ${style.textColorSecondary};
                }
                .WorkerSearch__Control {
                  flex: 1;
                  min-width: 0;
                }
              `}
            >
              <div className="WorkerSearch__Row">
                <span className="WorkerSearch__Label">
                  {formatMessage({ id: 'project.workerSearchMode' })}
                </span>
                <Select
                  className="WorkerSearch__Control"
                  size="small"
                  value={searchMode}
                  onChange={(newMode) => {
                    setSearchMode(newMode);
                    if (newMode === 'search-project-name') {
                      setActiveWorkerSearch(false);
                    } else if (!activeWorkerSearch) {
                      setActiveWorkerSearch(true);
                    }
                  }}
                >
                  <Select.Option value="search-project-name">
                    {formatMessage({ id: 'project.workerSearchProjectName' })}
                  </Select.Option>
                  <Select.Option value="search-worker">
                    {formatMessage({ id: 'project.workerSearchWorker' })}
                  </Select.Option>
                </Select>
              </div>
              <div className="WorkerSearch__Row">
                <span className="WorkerSearch__Label">
                  {formatMessage({ id: 'project.workerSearchRange' })}
                </span>
                <Select
                  className="WorkerSearch__Control"
                  size="small"
                  mode="multiple"
                  value={selectedProjectSetIDs}
                  onChange={(value) =>
                    setSelectedProjectSetIDs(value as string[])
                  }
                >
                  {[
                    currentProjectSet!,
                    ...availableProjectSets.filter(
                      (projectSet) => projectSet.id !== currentProjectSet!.id,
                    ),
                  ].map((projectSet) => (
                    <Select.Option
                      key={projectSet.id}
                      value={projectSet.id}
                      disabled={projectSet.id === currentProjectSet!.id}
                    >
                      {projectSet.name}
                    </Select.Option>
                  ))}
                </Select>
              </div>
              {searchMode === 'search-worker' && (
                <div className="WorkerSearch__Row">
                  <span className="WorkerSearch__Label">
                    {formatMessage({ id: 'project.workerSearchRole' })}
                  </span>
                  <Select
                    className="WorkerSearch__Control"
                    size="small"
                    value={searchRole}
                    onChange={(value) =>
                      setSearchRole(value as ProjectWorkerRole | '')
                    }
                  >
                    <Select.Option value="">
                      {formatMessage({ id: 'project.workerSearchAnyRole' })}
                    </Select.Option>
                    {PROJECT_WORKER_ROLES.map((role) => (
                      <Select.Option key={role.key} value={role.key}>
                        {formatMessage({
                          id: `project.workerRole.${role.key}`,
                        })}
                      </Select.Option>
                    ))}
                  </Select>
                </div>
              )}
              {activeWorkerSearch && (
                <div className="WorkerSearch__Row">
                  <Button size="small" onClick={handleWorkerSearchClear}>
                    <Icon icon="times" />
                    {formatMessage({ id: 'project.workerSearchClear' })}
                  </Button>
                </div>
              )}
            </div>
          )}
          {activeWorkerSearch && (
            <div
              css={css`
                margin: 0 ${style.paddingBase}px 10px;
                padding: 6px 10px;
                background: ${style.primaryColor}10;
                border-radius: ${style.borderRadiusBase};
                border: 1px solid ${style.primaryColor}30;
                font-size: 12px;
                color: ${style.textColorSecondary};
                display: flex;
                align-items: center;
                gap: 8px;
              `}
            >
              <Icon icon="user-check" style={{ color: style.primaryColor }} />
              <span>
                {formatMessage(
                  { id: 'project.searchingByRole' },
                  {
                    role: searchRole
                      ? formatMessage({
                          id: `project.workerRole.${searchRole}`,
                        })
                      : formatMessage({ id: 'project.workerSearchAnyRole' }),
                    projectSets: formatMessage(
                      { id: 'project.selectedProjectSets' },
                      { count: selectedProjectSetIDs.length },
                    ),
                  },
                )}
              </span>
              <span
                css={css`
                  margin-left: auto;
                  cursor: pointer;
                  ${clickEffect()};
                `}
                onClick={handleWorkerSearchClear}
              >
                <Icon icon="times" />
              </span>
            </div>
          )}
          <div className="ProjectList__Statuses">
            <div
              className={classNames('ProjectList__Status', {
                'ProjectList__Status--active': status === PROJECT_STATUS.NORMAL,
              })}
              onClick={() => {
                dispatch(resetProjectsState());
                dispatch(setProjectsState({ status: PROJECT_STATUS.NORMAL }));
              }}
            >
              {formatMessage({ id: 'project.working' })}
            </div>
            <div
              className={classNames('ProjectList__Status', {
                'ProjectList__Status--active':
                  status === PROJECT_STATUS.COMPLETED ||
                  status === PROJECT_STATUS.CLEARED,
              })}
              onClick={() => {
                dispatch(resetProjectsState());
                dispatch(
                  setProjectsState({ status: PROJECT_STATUS.COMPLETED }),
                );
              }}
            >
              {formatMessage({ id: 'project.finished' })}
            </div>
          </div>
          {currentProject &&
            !projects.find((project) => project.id === currentProject.id) && (
              <div className="ProjectList__CurrentProject">
                <ProjectItem from={from} project={currentProject} />
                <div className="ProjectList__CurrentProjectTip">
                  {formatMessage({ id: 'project.current' })}
                </div>
              </div>
            )}
        </>
      }
    />
  );
};
