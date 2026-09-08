import { css } from '@emotion/core';
import { Button, message, Modal, Tag } from 'antd';
import classNames from 'classnames';
import copy from 'copy-to-clipboard';
import { useState } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';
import { useHistory } from 'react-router-dom';
import {
  Content,
  ContentItem,
  ContentTitle,
  FormItem,
  Icon,
} from '@/components';
import api from '@/apis';
import {
  PROJECT_PERMISSION,
  PROJECT_STATUS,
  normalizeProjectStatus,
} from '@/constants';
import { FC, Project } from '@/interfaces';
import { AppState } from '@/store';
import {
  deleteProject,
  editProject,
  setCurrentProject,
} from '@/store/project/slice';
import style from '../../style';
import { toLowerCamelCase } from '@/utils';
import { can } from '@/utils/user';
import { projectMemberOperationId } from '@/utils/projectMembers';
import { formatPermissionLabel } from '@/utils/identityLabels';
import { ProjectEditForm } from './ProjectEditForm';

interface ProjectSettingBaseProps {
  className?: string;
}

export const ProjectSettingBase: FC<ProjectSettingBaseProps> = ({
  className,
}) => {
  const { formatMessage } = useIntl();
  const history = useHistory();
  const dispatch = useDispatch();
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [lifecycleLoading, setLifecycleLoading] = useState(false);
  const currentTeam = useSelector((state: AppState) => state.team.currentTeam);
  const currentProjectSet = useSelector(
    (state: AppState) => state.projectSet.currentProjectSet,
  );
  const currentProject = useSelector(
    (state: AppState) => state.project.currentProject,
  ) as Project;
  const userID = useSelector((state: AppState) => state.user.id);
  const [permissionsVisible, setPermissionsVisible] = useState(false);
  const status = normalizeProjectStatus(currentProject.status);
  const reportError = (error: any) => {
    if (typeof error?.default === 'function') {
      error.default();
    } else {
      message.error(
        error?.message ||
          formatMessage({ id: 'site.projectSetting.operationFailed' }),
      );
    }
  };

  const updateLifecycle = (action: 'complete' | 'reopen' | 'clear') => {
    setLifecycleLoading(true);
    const call =
      action === 'complete'
        ? api.completeProject
        : action === 'reopen'
          ? api.reopenProject
          : api.clearProject;
    call({
      id: currentProject.id,
      expectedVersion: currentProject.statusVersion,
    })
      .then((result: any) => {
        const nextProject = toLowerCamelCase(
          result.data.project || result.data,
        ) as Project;
        nextProject.status = normalizeProjectStatus(nextProject.status);
        // Keep the previous member summary when the lifecycle response does not
        // carry one, so project cards never render with an undefined
        // memberSummary (which froze the member stats in a render loop).
        if (!nextProject.memberSummary) {
          nextProject.memberSummary =
            (currentProject as any)?.memberSummary || [];
        }
        dispatch(setCurrentProject(nextProject));
        dispatch(editProject(nextProject));
        message.success(
          action === 'clear'
            ? formatMessage({ id: 'site.projectSetting.clearSuccess' })
            : action === 'complete'
              ? formatMessage({ id: 'site.projectSetting.completeSuccess' })
              : formatMessage({ id: 'site.projectSetting.reopenSuccess' }),
        );
      })
      .catch(reportError)
      .finally(() => setLifecycleLoading(false));
  };

  const showLeaveConfirm = () =>
    Modal.confirm({
      title: formatMessage({ id: 'project.leave' }),
      content: formatMessage({ id: 'project.leaveConfirm' }),
      onOk: () => {
        setLeaveLoading(true);
        api
          .getProjectMembers({
            projectID: currentProject.id,
            params: { status: 'active', limit: 1000 },
          })
          .then((result) => {
            const member = result.data.find((item) => item.userId === userID);
            if (!member) {
              message.error(
                formatMessage({ id: 'site.projectSetting.notProjectMember' }),
              );
              return Promise.reject(
                new Error('current user is not a project member'),
              );
            }
            return api.applyProjectMemberChanges({
              projectID: currentProject.id,
              data: {
                operations: [
                  {
                    // Stable idempotency key (project+subject+action+payload): a
                    // retried leave must replay instead of creating a second
                    // operation; the removed payload distinguishes it from other
                    // updates of the same member.
                    operationId: projectMemberOperationId(
                      currentProject.id,
                      {
                        id: member.memberId,
                        userId: member.userId,
                        displayName: member.displayName,
                        tags: member.tags,
                        status: member.status,
                        version: member.version,
                      },
                      'update',
                      { status: 'removed' },
                    ),
                    action: 'update',
                    memberId: member.memberId,
                    expectedMemberVersion: member.version,
                    changes: { status: 'removed' },
                  },
                ],
              },
            });
          })
          .then((result: any) => {
            const data = toLowerCamelCase(result.data);
            message.success(
              formatMessage({ id: 'site.projectSetting.leaveProjectSuccess' }),
            );
            if (currentTeam && currentProjectSet) {
              if (data.project) dispatch(editProject(data.project));
              history.replace(
                `/dashboard/teams/${currentTeam.id}/project-sets/${currentProjectSet.id}`,
              );
            } else {
              dispatch(deleteProject({ id: currentProject.id }));
              history.replace('/dashboard/projects');
            }
          })
          .catch(reportError)
          .finally(() => setLeaveLoading(false));
      },
      okText: formatMessage({ id: 'form.ok' }),
      cancelText: formatMessage({ id: 'form.cancel' }),
    });

  const confirmLifecycle = (action: 'complete' | 'clear') =>
    Modal.confirm({
      title:
        action === 'clear'
          ? formatMessage({ id: 'site.projectSetting.clearTitle' })
          : formatMessage({ id: 'site.projectSetting.completeTitle' }),
      content:
        action === 'clear'
          ? formatMessage({ id: 'site.projectSetting.clearConfirm' })
          : formatMessage({ id: 'site.projectSetting.completeConfirm' }),
      okType: action === 'clear' ? 'danger' : 'primary',
      okText:
        action === 'clear'
          ? formatMessage({ id: 'site.projectSetting.clearOk' })
          : formatMessage({ id: 'site.projectSetting.completeOk' }),
      cancelText: formatMessage({ id: 'form.cancel' }),
      onOk: () => updateLifecycle(action),
    });

  return (
    <div
      className={classNames('ProjectSettingBase', className)}
      css={css`
        width: 100%;
        max-width: ${style.contentMaxWidth}px;
        padding: ${style.paddingBase}px;
      `}
    >
      <Content>
        <ContentTitle>{formatMessage({ id: 'project.me' })}</ContentTitle>
        <ContentItem>
          <span>
            {formatMessage({ id: 'site.projectSetting.currentIdentityTag' })}
          </span>
          <div>
            {(currentProject.effectivePermissions || [])
              .slice(0, 4)
              .map((permission) => (
                <Tag key={permission}>
                  {formatPermissionLabel(formatMessage, permission)}
                </Tag>
              ))}
          </div>
          <Button
            type="link"
            onClick={() => setPermissionsVisible((visible) => !visible)}
          >
            {formatMessage({ id: 'site.permission' })}{' '}
            <Icon icon={permissionsVisible ? 'caret-up' : 'caret-down'} />
          </Button>
        </ContentItem>
        {permissionsVisible && (
          <ContentItem>
            <div>
              {(currentProject.effectivePermissions || []).map((permission) => (
                <Tag key={permission}>
                  {formatPermissionLabel(formatMessage, permission)}
                </Tag>
              ))}
            </div>
          </ContentItem>
        )}
        {currentProject.ownerUserId !== userID && (
          <ContentItem>
            <Button block onClick={showLeaveConfirm} loading={leaveLoading}>
              {formatMessage({ id: 'project.leave' })}
            </Button>
          </ContentItem>
        )}
      </Content>
      <Content>
        <ContentTitle>{formatMessage({ id: 'project.info' })}</ContentTitle>
        <FormItem label={formatMessage({ id: 'project.id' })}>
          {currentProject.id}{' '}
          <Button
            type="ghost"
            onClick={() =>
              copy(
                `${window.location.origin}/dashboard/join/project/${currentProject.id}`,
              )
            }
          >
            {formatMessage({ id: 'group.copyJoinLink' })}
          </Button>
        </FormItem>
        <ContentItem>
          <ProjectEditForm readOnly={status !== PROJECT_STATUS.NORMAL} />
        </ContentItem>
      </Content>
      <Content>
        <ContentTitle>
          {formatMessage({ id: 'site.projectSetting.actions' })}
        </ContentTitle>
        {status === PROJECT_STATUS.NORMAL &&
          can(currentProject, PROJECT_PERMISSION.COMPLETE_PROJECT) && (
            <ContentItem>
              <Button
                block
                onClick={() => confirmLifecycle('complete')}
                loading={lifecycleLoading}
              >
                {formatMessage({ id: 'site.projectSetting.completeTitle' })}
              </Button>
            </ContentItem>
          )}
        {status === PROJECT_STATUS.COMPLETED &&
          can(currentProject, PROJECT_PERMISSION.COMPLETE_PROJECT) && (
            <ContentItem>
              <Button
                block
                onClick={() => updateLifecycle('reopen')}
                loading={lifecycleLoading}
              >
                {formatMessage({ id: 'site.projectSetting.reopenButton' })}
              </Button>
            </ContentItem>
          )}
        {status === PROJECT_STATUS.NORMAL &&
          (currentTeam?.baseTag || currentProject.team?.baseTag) ===
            'creator' && (
            <ContentItem>
              <Button
                danger
                block
                onClick={() => confirmLifecycle('clear')}
                loading={lifecycleLoading}
              >
                {formatMessage({ id: 'site.projectSetting.clearTitle' })}
              </Button>
            </ContentItem>
          )}
      </Content>
    </div>
  );
};
