import { css } from '@emotion/core';
import { Button, Checkbox, Switch, Tooltip, message } from 'antd';
import { useIntl } from 'react-intl';
import { useEffect, useState } from 'react';
import { api } from '@/apis';
import { FC, Project } from '@/interfaces';
import { PROJECT_WORKER_ROLES } from '@/apis/project';
import { isTeamCreatorOf } from '@/utils/projectMembers';
import { toLowerCamelCase } from '@/utils';
import style from '@/style';

/**
 * 项目职位锁定配置卡：仅团队创建者可操作。
 * 一级总开关（admin 与自定义职位收紧为仅团队创建者）+ 二级工种多选。
 */
export const PositionLockCard: FC<{
  project: Project;
  onProjectUpdated?: (project: Project) => void;
}> = ({ project, onProjectUpdated }) => {
  const { formatMessage } = useIntl();
  const isCreator = isTeamCreatorOf(project);
  const [enabled, setEnabled] = useState(
    project.positionLockEnabled === true,
  );
  const [tags, setTags] = useState<string[]>(
    project.positionLockTags || [],
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setEnabled(project.positionLockEnabled === true);
    setTags(project.positionLockTags || []);
  }, [project.positionLockEnabled, project.positionLockTags]);

  if (project.positionLockEnabled === undefined) return null;

  const save = async (nextEnabled: boolean, nextTags: string[]) => {
    setSaving(true);
    try {
      const result = await api.project.editProject({
        id: project.id,
        data: {
          positionLockEnabled: nextEnabled,
          positionLockTags: nextEnabled ? nextTags : [],
        },
      });
      // 后端返回 {message, project}（snake_case），取 project 并转 camelCase 再上抛
      const data = toLowerCamelCase(result.data as any) as any;
      if (data?.project) onProjectUpdated?.(data.project as Project);
      message.success(
        formatMessage({ id: 'site.memberList.positionLock.saved' }),
      );
    } catch (err) {
      if (err && typeof err === 'object' && 'default' in err) {
        (err as { default: () => void }).default();
      } else {
        message.error(
          formatMessage({ id: 'site.networkError' }),
        );
      }
    } finally {
      setSaving(false);
    }
  };

  const toggleEnabled = (next: boolean) => {
    setEnabled(next);
    if (!next) setTags([]);
    save(next, next ? tags : []);
  };

  const toggleTag = (tag: string, checked: boolean) => {
    const next = checked ? [...tags, tag] : tags.filter((t) => t !== tag);
    setTags(next);
    save(enabled, next);
  };

  if (!isCreator) {
    return project.positionLockEnabled ? (
      <div
        className="PositionLockCard PositionLockCard--readonly"
        css={css`
          padding: 8px ${style.paddingBase}px;
          font-size: 12px;
          color: ${style.textColorSecondary};
        `}
      >
        <Tooltip
          title={formatMessage({
            id: 'site.memberList.positionLock.readonlyTip',
          })}
        >
          <span>
            🔒 {formatMessage({ id: 'site.memberList.positionLock.active' })}
          </span>
        </Tooltip>
      </div>
    ) : null;
  }

  return (
    <div
      className="PositionLockCard"
      css={css`
        padding: 8px ${style.paddingBase}px;
        border-bottom: 1px solid ${style.borderColorLight};
        font-size: 13px;
      `}
    >
      <div
        css={css`
          display: flex;
          justify-content: space-between;
          align-items: center;
        `}
      >
        <span>
          {formatMessage({ id: 'site.memberList.positionLock.title' })}
        </span>
        <Switch
          size="small"
          checked={enabled}
          loading={saving}
          onChange={toggleEnabled}
        />
      </div>
      <div
        css={css`
          color: ${style.textColorSecondary};
          font-size: 12px;
          margin-top: 2px;
        `}
      >
        {formatMessage({ id: 'site.memberList.positionLock.level1Tip' })}
      </div>
      {enabled && (
        <div
          css={css`
            margin-top: 6px;
          `}
        >
          <div
            css={css`
              font-size: 12px;
              color: ${style.textColorSecondary};
            `}
          >
            {formatMessage({ id: 'site.memberList.positionLock.level2Title' })}
          </div>
          <Checkbox.Group
            value={tags}
            onChange={(values) => {
              const next = (values as string[]).slice();
              setTags(next);
              save(true, next);
            }}
            css={css`
              display: flex;
              flex-wrap: wrap;
              column-gap: 8px;
              margin-top: 4px;
            `}
          >
            {PROJECT_WORKER_ROLES.map((role) => (
              <Checkbox key={role.key} value={role.key}>
                {role.label}
              </Checkbox>
            ))}
          </Checkbox.Group>
          <Button
            size="small"
            danger
            loading={saving}
            css={css`
              margin-top: 6px;
            `}
            onClick={() => {
              setTags([]);
              save(true, []);
            }}
          >
            {formatMessage({ id: 'site.memberList.positionLock.clearTags' })}
          </Button>
        </div>
      )}
    </div>
  );
};

export default PositionLockCard;
