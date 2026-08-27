import { css } from '@emotion/core';
import { Alert, Button, message, Progress, Spin } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import { api } from '@/apis';
import { FC } from '@/interfaces';

interface ArchiveImportProgressProps {
  projectID: string;
}

interface ArchiveImportTaskState {
  id: string;
  status: number;
  stage: string;
  totalPages: number;
  completedPages: number;
  error: string;
  dismissed?: boolean;
  gid?: string;
  token?: string;
}

/** 运行中的任务状态：QUEUED/RESOLVING/DOWNLOADING/VALIDATING/IMPORTING */
const RUNNING_STATUSES = [0, 1, 2, 3, 4];
const FAILED_STATUS = 6;

/**
 * 画廊归档导入进度条：轮询任务状态；进行中显示进度，失败提供重试，
 * 由运行中变为已完成时刷新页面让文件列表重新加载。
 */
export const ArchiveImportProgress: FC<ArchiveImportProgressProps> = ({
  projectID,
}) => {
  const { formatMessage } = useIntl();
  const [task, setTask] = useState<ArchiveImportTaskState | null>(null);
  const [loading, setLoading] = useState(false);
  const [dismissing, setDismissing] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const prevStatus = useRef<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      try {
        const resp = await api.project.getArchiveImportTask({ projectID });
        const raw = (resp.data?.task ?? null) as ArchiveImportTaskState | null;
        // 用户已关闭提示的任务视为无任务，不再展示
        const next = raw && raw.dismissed ? null : raw;
        if (cancelled) return;
        setTask(next);
        if (!next) {
          prevStatus.current = null;
          return;
        }
        if (prevStatus.current !== null && next.status !== prevStatus.current) {
          // 由运行中变为已完成 → 刷新页面让文件列表重新加载
          if (
            RUNNING_STATUSES.includes(prevStatus.current) &&
            next.status === 5
          ) {
            window.location.reload();
            return;
          }
        }
        prevStatus.current = next.status;
        if (RUNNING_STATUSES.includes(next.status)) {
          timer.current = setTimeout(poll, 3000);
        }
      } catch (e) {
        // 状态查询失败静默，等待下一次轮询
      }
    };
    poll();
    return () => {
      cancelled = true;
      if (timer.current) {
        clearTimeout(timer.current);
      }
    };
  }, [projectID, reloadKey]);

  const retry = () => {
    if (!task) return;
    setLoading(true);
    api.project
      .importFromArchive({
        projectID,
        gid: task.gid || '',
        token: task.token || '',
      })
      .then(() => {
        message.success(formatMessage({ id: 'project.archiveImportQueued' }));
        setReloadKey((key) => key + 1);
      })
      .catch(() => {
        message.error(formatMessage({ id: 'project.archiveImportTriggerFailed' }));
      })
      .finally(() => setLoading(false));
  };

  const dismiss = () => {
    setDismissing(true);
    api.project
      .dismissArchiveImportTask({ projectID })
      .then(() => setTask(null))
      .catch(() => {
        message.error(
          formatMessage({ id: 'project.archiveImportDismissFailed' }),
        );
      })
      .finally(() => setDismissing(false));
  };

  if (!task) {
    return null;
  }

  if (FAILED_STATUS === task.status) {
    return (
      <div
        css={css`
          margin-bottom: 12px;
        `}
      >
        <Alert
          type="error"
          showIcon
          message={formatMessage({ id: 'project.archiveImportFailed' })}
          description={task.error}
          action={
            <span>
              <Button
                size="small"
                danger
                loading={loading}
                onClick={retry}
                css={css`
                  margin-right: 8px;
                `}
              >
                {formatMessage({ id: 'project.archiveImportRetry' })}
              </Button>
              <Button size="small" loading={dismissing} onClick={dismiss}>
                {formatMessage({ id: 'project.archiveImportDismiss' })}
              </Button>
            </span>
          }
        />
      </div>
    );
  }

  if (RUNNING_STATUSES.includes(task.status)) {
    const percent =
      task.totalPages > 0
        ? Math.min(
            100,
            Math.round((task.completedPages / task.totalPages) * 100),
          )
        : undefined;
    return (
      <div
        css={css`
          margin-bottom: 12px;
        `}
      >
        <Alert
          type="info"
          showIcon
          message={
            (task.stage || formatMessage({ id: 'project.archiveImport' })) +
            (task.completedPages > 0
              ? ` ${task.completedPages}/${task.totalPages}`
              : '')
          }
          description={
            percent !== undefined ? (
              <Progress percent={percent} status="active" size="small" />
            ) : (
              <Spin size="small" />
            )
          }
        />
      </div>
    );
  }

  // SUCCEEDED：首次挂载即已完成时显示完成提示（由运行中转完成的场景会触发刷新）
  return (
    <div
      css={css`
        margin-bottom: 12px;
      `}
    >
      <Alert
        type="success"
        showIcon
        message={formatMessage({ id: 'project.archiveImportDone' })}
        action={
          <Button size="small" loading={dismissing} onClick={dismiss}>
            {formatMessage({ id: 'project.archiveImportDismiss' })}
          </Button>
        }
      />
    </div>
  );
};