import { css } from '@emotion/core';
import { Alert, Button, List, Tag } from 'antd';
import { useIntl } from 'react-intl';
import { FC } from '@/interfaces';
import { useZitengCheck } from './state';
import { deriveAlertState, suspicionLevelOf, suspectTitle } from './logic';

interface ZitengCheckAlertProps {
  projectID: string;
}

/**
 * 项目顶部的撞车提示。
 *
 * 三态：
 * - 等待中   → info
 * - 有疑似   → warning，并列出疑似项目名
 * - 查询失败 → error（**绝不显示为「未查到」**）
 * - 未查到   → **不渲染**（需求：没有疑似就不弹顶部提示）
 *
 * 注意：后端返回 snake_case（`suspect_count` 等），此处不做驼峰转换。
 */
export const ZitengCheckAlert: FC<ZitengCheckAlertProps> = ({ projectID }) => {
  const { formatMessage } = useIntl();
  const { check, loading, retry } = useZitengCheck(projectID);

  const state = deriveAlertState(check, (suspect) => suspectTitle(suspect));

  if (state.kind === 'none') {
    return null;
  }

  const wrapper = css`
    margin-bottom: 12px;
  `;

  if (state.kind === 'pending') {
    return (
      <div css={wrapper}>
        <Alert
          type="info"
          showIcon
          message={formatMessage({ id: 'project.zitengChecking' })}
        />
      </div>
    );
  }

  if (state.kind === 'failed') {
    return (
      <div css={wrapper}>
        <Alert
          type="error"
          showIcon
          message={formatMessage({ id: 'project.zitengCheckFailed' })}
          description={
            state.error ||
            formatMessage({ id: 'project.zitengCheckFailedHint' })
          }
          action={
            <Button size="small" loading={loading} onClick={retry}>
              {formatMessage({ id: 'project.zitengRetry' })}
            </Button>
          }
        />
      </div>
    );
  }

  // suspected
  return (
    <div css={wrapper}>
      <Alert
        type="warning"
        showIcon
        message={formatMessage(
          { id: 'project.zitengSuspected' },
          { count: state.titles.length },
        )}
        description={
          <List
            size="small"
            dataSource={check?.suspects ?? []}
            renderItem={(suspect, index) => {
              const level = suspicionLevelOf(suspect);
              return (
                <List.Item key={suspect.id || index}>
                  <span
                    css={css`
                      margin-right: 8px;
                    `}
                  >
                    {state.titles[index]}
                  </span>
                  {level === 'inProgress' && (
                    <Tag color="orange">
                      {formatMessage({ id: 'project.zitengStateInProgress' })}
                    </Tag>
                  )}
                  {level === 'published' && (
                    <Tag color="blue">
                      {formatMessage({ id: 'project.zitengStatePublished' })}
                    </Tag>
                  )}
                  {level === 'withdrawn' && (
                    <Tag>
                      {formatMessage({ id: 'project.zitengStateWithdrawn' })}
                    </Tag>
                  )}
                  {suspect.circle && (
                    <span
                      css={css`
                        color: var(--text-color-secondary);
                      `}
                    >
                      {suspect.circle}
                    </span>
                  )}
                </List.Item>
              );
            }}
          />
        }
        action={
          <Button size="small" loading={loading} onClick={retry}>
            {formatMessage({ id: 'project.zitengRetry' })}
          </Button>
        }
      />
    </div>
  );
};
