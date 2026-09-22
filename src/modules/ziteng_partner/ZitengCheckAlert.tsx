import { css } from '@emotion/core';
import { Alert, Button, List, Tag } from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import { FC } from '@/interfaces';
import { getZitengCheck, triggerZitengCheck, ZitengCheck } from './api';
import {
  deriveAlertState,
  shouldKeepPolling,
  suspicionLevelOf,
  suspectTitle,
} from './logic';

interface ZitengCheckAlertProps {
  projectID: string;
}

/** 轮询间隔：查询通常几百毫秒内完成，1.5s 足够且不打扰 */
const POLL_INTERVAL_MS = 1500;
/** 轮询上限：避免任务卡死时无限轮询 */
const MAX_POLLS = 40;

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
  const [check, setCheck] = useState<ZitengCheck | null>(null);
  const [loading, setLoading] = useState(false);
  const polls = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    try {
      const resp = await getZitengCheck({ projectID });
      setCheck(resp.data?.check ?? null);
      return resp.data?.check ?? null;
    } catch (e) {
      // 查询接口本身失败：不伪装成「未查到」，也不硬塞一个失败态
      // （后端会把任务失败写进 verdict，这里只是网络层抖动）
      return null;
    }
  }, [projectID]);

  // 初次加载 + 结果未出时轮询
  useEffect(() => {
    let cancelled = false;
    polls.current = 0;

    const tick = async () => {
      const next = await load();
      if (cancelled) return;
      if (!shouldKeepPolling(next)) return;
      polls.current += 1;
      if (polls.current >= MAX_POLLS) return;
      timer.current = setTimeout(tick, POLL_INTERVAL_MS);
    };

    tick();
    return () => {
      cancelled = true;
      if (timer.current) clearTimeout(timer.current);
    };
  }, [projectID, load]);

  const retry = () => {
    setLoading(true);
    triggerZitengCheck({ projectID })
      .then((resp) => {
        setCheck(resp.data?.check ?? null);
        polls.current = 0;
        // 重新开始轮询
        const tick = async () => {
          const next = await load();
          if (!shouldKeepPolling(next)) return;
          polls.current += 1;
          if (polls.current >= MAX_POLLS) return;
          timer.current = setTimeout(tick, POLL_INTERVAL_MS);
        };
        tick();
      })
      .finally(() => setLoading(false));
  };

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
                    <Tag>{formatMessage({ id: 'project.zitengStateWithdrawn' })}</Tag>
                  )}
                  {suspect.circle && (
                    <span
                      css={css`
                        color: rgba(0, 0, 0, 0.45);
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