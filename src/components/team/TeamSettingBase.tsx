import { css } from '@emotion/core';
import { FormItem, Icon } from '@/components';
import { Button, Input, message, Modal, Switch, Tag } from 'antd';
import { useState, useEffect } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';
import { useHistory } from 'react-router-dom';
import { Content, ContentItem, ContentTitle, TeamEditForm } from '@/components';
import api from '@/apis';
import { TEAM_PERMISSION } from '@/constants';
import { AppState } from '@/store';
import {
  clearCurrentTeam,
  deleteTeam as deleteTeamActionCreator,
  editTeam,
  setCurrentTeam,
} from '@/store/team/slice';
import style from '@/style';
import { FC, UserTeam } from '@/interfaces';
import { can } from '@/utils/user';
import { toLowerCamelCase } from '@/utils';
import copy from 'copy-to-clipboard';
import { AvatarUpload } from '@/components/shared/AvatarUpload';

/** 团队基础设置的属性接口 */
interface TeamSettingBaseProps {
  className?: string;
}
/**
 * 团队基础设置
 */
export const TeamSettingBase: FC<TeamSettingBaseProps> = ({ className }) => {
  const history = useHistory(); // 路由
  const { formatMessage } = useIntl(); // i18n
  const dispatch = useDispatch();
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [wqmLoading, setWqmLoading] = useState(false);
  const [newArchiveKey, setNewArchiveKey] = useState('');
  const [archiveKeysLoading, setArchiveKeysLoading] = useState(false);
  const [archiveApiUrlInput, setArchiveApiUrlInput] = useState('');
  const currentTeam = useSelector(
    (state: AppState) => state.team.currentTeam,
  ) as UserTeam;
  const userID = useSelector((state: AppState) => state.user.id);
  const [permissionsVisible, setPermissionsVisible] = useState(false);
  const platform = useSelector((state: AppState) => state.site.platform);
  useEffect(() => {
    setArchiveApiUrlInput(currentTeam.archiveApiUrl || '');
  }, [currentTeam.archiveApiUrl]);
  const isMobile = platform === 'mobile';
  const reportError = (error: any) => {
    if (typeof error?.default === 'function') {
      error.default();
    } else {
      message.error(
        error?.message ||
          formatMessage({ id: 'site.teamSetting.operationFailed' }),
      );
    }
  };

  /**
   * 工作人员资格校验模式（仅团队创建者可切换）：
   * qualified 校验成员资格；open 不校验，全员可加入项目的任意职位。
   */
  const setQualificationMode = (mode: 'open' | 'qualified') => {
    setWqmLoading(true);
    api
      .editTeam({
        id: currentTeam.id,
        data: { workerQualificationMode: mode },
      })
      .then((result) => {
        const data = toLowerCamelCase(result.data);
        dispatch(editTeam(data.team));
        dispatch(setCurrentTeam(data.team));
        message.success(data.message);
      })
      .catch((error) => {
        reportError(error);
      })
      .finally(() => setWqmLoading(false));
  };

  /** 保存画廊归档 API key 列表（整体提交，后端按 id 增删改） */
  const saveArchiveKeys = (keys: any[]) => {
    setArchiveKeysLoading(true);
    api
      .editTeam({
        id: currentTeam.id,
        data: { archiveApiKeys: keys },
      })
      .then((result) => {
        const data = toLowerCamelCase(result.data);
        dispatch(editTeam(data.team));
        dispatch(setCurrentTeam(data.team));
        message.success(data.message);
      })
      .catch((error) => {
        reportError(error);
      })
      .finally(() => setArchiveKeysLoading(false));
  };

  /** 添加一个新的画廊归档 API key */
  const addArchiveKey = () => {
    const key = newArchiveKey.trim();
    if (!key) {
      message.warning(
        formatMessage({ id: 'site.archiveApiKeyEmptyTip' }),
      );
      return;
    }
    saveArchiveKeys([
      ...(currentTeam.archiveApiKeys || []),
      { key },
    ]);
    setNewArchiveKey('');
  };

  /** 删除一个画廊归档 API key */
  const removeArchiveKey = (id: string) => {
    saveArchiveKeys(
      (currentTeam.archiveApiKeys || []).filter((key) => key.id !== id),
    );
  };

  /** 保存画廊归档 API 基址（留空 = 使用系统默认） */
  const saveArchiveApiUrl = () => {
    setArchiveKeysLoading(true);
    api
      .editTeam({
        id: currentTeam.id,
        data: { archiveApiUrl: archiveApiUrlInput.trim() },
      })
      .then((result) => {
        const data = toLowerCamelCase(result.data);
        dispatch(editTeam(data.team));
        dispatch(setCurrentTeam(data.team));
        message.success(data.message);
      })
      .catch((error) => {
        reportError(error);
      })
      .finally(() => setArchiveKeysLoading(false));
  };

  /** 解散团队 */
  const deleteTeam = () => {
    setDeleteLoading(true);
    api
      .deleteTeam({ id: currentTeam.id })
      .then((result) => {
        setDeleteLoading(false);
        // 删除成功
        dispatch(deleteTeamActionCreator({ id: currentTeam.id }));
        dispatch(clearCurrentTeam());
        // 跳转到主页
        history.replace(`/dashboard`);
        // 弹出提示
        message.success(result.data.message);
      })
      .catch((error) => {
        reportError(error);
        setDeleteLoading(false);
      });
  };

  /** 退出团队确认 */
  const showLeaveConfirm = () => {
    Modal.confirm({
      title: formatMessage({ id: 'team.leave' }),
      content: formatMessage({ id: 'team.leaveConfirm' }),
      onOk: () => {
        setLeaveLoading(true);
        api
          .getTeamMembers({
            teamID: currentTeam.id,
            params: { status: 'active', limit: 1000 },
          })
          .then((result) => {
            const member = result.data.find((item) => item.userId === userID);
            if (!member) {
              message.error(
                formatMessage({ id: 'site.teamSetting.notTeamMember' }),
              );
              return Promise.reject(
                new Error('current user is not a team member'),
              );
            }
            return api.removeTeamMember({
              teamID: currentTeam.id,
              memberID: member.id,
              expectedVersion: member.version,
            });
          })
          .then((result) => {
            setLeaveLoading(false);
            dispatch(deleteTeamActionCreator({ id: currentTeam.id }));
            message.success(
              formatMessage({ id: 'site.teamSetting.leaveTeamSuccess' }),
            );
            if (isMobile) {
              history.push('/dashboard/teams');
            } else {
              history.push('/dashboard');
            }
          })
          .catch((error) => {
            setLeaveLoading(false);
            reportError(error);
          });
      },
      onCancel: () => {},
      okText: formatMessage({ id: 'form.ok' }),
      cancelText: formatMessage({ id: 'form.cancel' }),
    });
  };

  /** 解散团队确认 */
  const confirmDeleteTeam = () => {
    Modal.confirm({
      title: (
        <div>
          <Icon
            css={css`
              color: red;
              margin-right: 5px;
            `}
            icon="exclamation-triangle"
          />
          {formatMessage({ id: 'team.deleteTipTitle' })}
        </div>
      ),
      content: formatMessage(
        { id: 'team.deleteTip' },
        { team: currentTeam.name },
      ),
      okText: formatMessage({ id: 'team.delete' }),
      okType: 'danger',
      cancelText: formatMessage({ id: 'form.cancel' }),
      onOk() {
        deleteTeam();
      },
      onCancel() {},
    });
  };

  return (
    <div
      className={className}
      css={css`
        width: 100%;
        max-width: ${style.contentMaxWidth}px;
        padding: ${style.paddingBase}px;
        .TeamSettingBase__PermissionsToggleIcon {
          margin-left: 5px;
        }
      `}
    >
      <Content>
        <ContentTitle>{formatMessage({ id: 'team.me' })}</ContentTitle>
        <ContentItem>
          {formatMessage(
            { id: 'site.myRoleIs' },
            { role: currentTeam.baseTag || 'member' },
          )}
          <Button
            className="TeamSettingBase__PermissionsToggle"
            type="link"
            onClick={() => {
              setPermissionsVisible((x) => !x); // 显示/隐藏权限
            }}
          >
            {formatMessage({ id: 'site.permission' })}{' '}
            <Icon
              icon={permissionsVisible ? 'caret-up' : 'caret-down'}
              className="TeamSettingBase__PermissionsToggleIcon"
            />
          </Button>
        </ContentItem>
        {permissionsVisible && (
          <ContentItem>
            <div className="permissions">
              {(currentTeam.effectivePermissions || []).map((permission) => (
                <Tag key={permission}>{permission}</Tag>
              ))}
            </div>
          </ContentItem>
        )}
        <ContentItem>
          {currentTeam.baseTag !== 'creator' && (
            <Button block onClick={showLeaveConfirm} loading={leaveLoading}>
              {formatMessage({ id: 'team.leave' })}
            </Button>
          )}
        </ContentItem>
      </Content>
      <Content>
        <ContentTitle>{formatMessage({ id: 'team.info' })}</ContentTitle>
        <FormItem label={formatMessage({ id: 'team.id' })}>
          {currentTeam.id}{' '}
          <Button
            type="ghost"
            onClick={() => {
              const root =
                window.location.protocol + '//' + window.location.host;
              const url = root + `/dashboard/join/team/${currentTeam.id}`;
              copy(url);
            }}
          >
            {formatMessage({ id: 'group.copyJoinLink' })}
          </Button>
        </FormItem>
        <div style={{ marginBottom: '24px' }}>
          <AvatarUpload
            type="team"
            disabled={!can(currentTeam, TEAM_PERMISSION.CHANGE)}
          />
        </div>
        <ContentItem>
          <TeamEditForm />
        </ContentItem>
      </Content>
      {/* 工作人员资格校验模式：仅团队创建者可切换。开启后不校验成员资格，
          全员均可加入项目的任意职位（团队成员管理中的工作人员资格栏仍照常展示）。 */}
      {currentTeam.baseTag === 'creator' && (
        <Content>
          <ContentTitle>
            {formatMessage({ id: 'site.teamSetting.workerQualificationCheck' })}
          </ContentTitle>
          <ContentItem>
            <Switch
              checked={currentTeam.workerQualificationMode === 'open'}
              loading={wqmLoading}
              onChange={(checked) =>
                setQualificationMode(checked ? 'open' : 'qualified')
              }
            />
            <span
              css={css`
                margin-left: 8px;
                color: ${style.textColorSecondary};
                font-size: 12px;
              `}
            >
              {formatMessage({ id: 'site.teamSetting.workerQualificationTip' })}
            </span>
          </ContentItem>
        </Content>
      )}
      {currentTeam.ocrQuotaMonth - currentTeam.ocrQuotaUsed > 0 && (
        <Content>
          <ContentTitle>
            {formatMessage({ id: 'site.aboutQuota' })}
          </ContentTitle>
          {/* <ContentItem>
          {formatMessage({ id: 'site.userCount' }) + formatMessage({ id: ':' })}
          {currentTeam.userCount}/{currentTeam.maxUser}
        </ContentItem> */}
          <ContentItem>
            {formatMessage({ id: 'site.ocrQuota' }) +
              formatMessage({ id: ':' })}
            {currentTeam.ocrQuotaMonth - currentTeam.ocrQuotaUsed}
            {' ' + formatMessage({ id: 'site.imageUnit' })}
          </ContentItem>
        </Content>
      )}
      {/* 画廊归档导入的第三方档案 API key（仅管理员可管理） */}
      {can(currentTeam, TEAM_PERMISSION.CHANGE) && (
        <Content>
          <ContentTitle>
            {formatMessage({ id: 'site.archiveApiKeys' })}
          </ContentTitle>
          <ContentItem>
            <div
              css={css`
                width: 100%;
                .TeamSettingBase__ApiUrl {
                  display: flex;
                  align-items: center;
                  margin-bottom: 16px;
                  .TeamSettingBase__ApiUrlInput {
                    flex: auto;
                    margin-right: 8px;
                  }
                }
                .TeamSettingBase__ApiUrlTip {
                  margin-top: 4px;
                  color: ${style.textColorSecondary};
                  font-size: 12px;
                }
                .TeamSettingBase__KeyItem {
                  display: flex;
                  align-items: center;
                  margin-bottom: 8px;
                  .TeamSettingBase__KeyTail {
                    margin-right: 8px;
                  }
                  .TeamSettingBase__KeyRemark {
                    flex: auto;
                    color: ${style.textColorSecondary};
                    font-size: 12px;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                  }
                }
                .TeamSettingBase__KeyAdd {
                  display: flex;
                  align-items: center;
                  margin-top: 8px;
                  .TeamSettingBase__KeyAddInput {
                    flex: auto;
                    margin-right: 8px;
                  }
                }
              `}
            >
              <div className="TeamSettingBase__ApiUrl">
                <Input
                  className="TeamSettingBase__ApiUrlInput"
                  value={archiveApiUrlInput}
                  onChange={(event) => setArchiveApiUrlInput(event.target.value)}
                  placeholder={formatMessage({
                    id: 'site.archiveApiUrlPlaceholder',
                  })}
                  onPressEnter={saveArchiveApiUrl}
                />
                <Button
                  type="primary"
                  loading={archiveKeysLoading}
                  onClick={saveArchiveApiUrl}
                >
                  {formatMessage({ id: 'site.save' })}
                </Button>
              </div>
              <div className="TeamSettingBase__ApiUrlTip">
                {formatMessage({ id: 'site.archiveApiUrlTip' })}
              </div>
              {(currentTeam.archiveApiKeys || []).map((key) => (
                <div key={key.id} className="TeamSettingBase__KeyItem">
                  <Tag className="TeamSettingBase__KeyTail">
                    {key.keyTail}
                  </Tag>
                  <span className="TeamSettingBase__KeyRemark">
                    {key.remark || key.keyTail}
                  </span>
                  <Button
                    size="small"
                    danger
                    loading={archiveKeysLoading}
                    onClick={() => removeArchiveKey(key.id)}
                  >
                    {formatMessage({ id: 'site.delete' })}
                  </Button>
                </div>
              ))}
              <div className="TeamSettingBase__KeyAdd">
                <Input
                  className="TeamSettingBase__KeyAddInput"
                  value={newArchiveKey}
                  onChange={(event) => setNewArchiveKey(event.target.value)}
                  placeholder={formatMessage({
                    id: 'site.archiveApiKeyPlaceholder',
                  })}
                  onPressEnter={addArchiveKey}
                />
                <Button
                  type="primary"
                  loading={archiveKeysLoading}
                  onClick={addArchiveKey}
                >
                  {formatMessage({ id: 'site.add' })}
                </Button>
              </div>
            </div>
          </ContentItem>
        </Content>
      )}
      <Content>
        {can(currentTeam, TEAM_PERMISSION.DELETE) && (
          <>
            <ContentTitle>
              {formatMessage({ id: 'site.dangerZone' })}
            </ContentTitle>
            <ContentItem>
              <Button block onClick={confirmDeleteTeam} loading={deleteLoading}>
                {formatMessage({ id: 'team.delete' })}
              </Button>
            </ContentItem>
          </>
        )}
      </Content>
    </div>
  );
};
