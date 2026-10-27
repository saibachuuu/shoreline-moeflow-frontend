import { css } from '@emotion/core';
import {
  Button,
  message,
  Popconfirm,
  Progress,
  Select,
  Switch,
  Tag,
} from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';
import api from '@/apis';
import { Content, ContentItem, ContentTitle } from '@/components';
import { FC, Project } from '@/interfaces';
import { AppState } from '@/store';
import { editProject, setCurrentProject } from '@/store/project/slice';
import { toLowerCamelCase } from '@/utils';
import { formatBytes } from '@/utils/size';
import {
  listSources,
  listTransfers,
  lockProject,
  moveProject,
  retryTransfer,
  StorageSource,
  TransferRecord,
} from './api';

/** 进行中：PENDING / COPYING / VERIFIED / SWITCHED。DONE 不算，强刷会闪。 */
const ACTIVE_STATUS = [0, 1, 2, 3];
/** 可重试：FAILED / ABORTED。 */
const RETRYABLE_STATUS = [5, 6];

/** 下拉里的「默认存储」选项值，后端收到空即回迁。 */
const DEFAULT_TARGET = '__default__';

interface ProjectStorageMoveProps {
  projectId: string;
}

/**
 * 项目设置里的手动搬迁（仅站长可见）。
 *
 * 一个下拉包圆三种去向：默认→源、源→默认、源A→源B直转，
 * 后端都是同一个 move 接口。外加一个锁定开关：锁住后自动巡查
 * 跳过、手动搬迁全拒，解锁后才能再挪。
 */
export const ProjectStorageMove: FC<ProjectStorageMoveProps> = ({
  projectId,
}) => {
  const { formatMessage: fm } = useIntl();
  const dispatch = useDispatch();
  const isAdmin = useSelector((state: AppState) => state.user.admin);
  const currentProject = useSelector(
    (state: AppState) => state.project.currentProject,
  ) as Project | null;
  const [sources, setSources] = useState<StorageSource[]>([]);
  const [transfers, setTransfers] = useState<TransferRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState(false);
  const [locking, setLocking] = useState(false);
  const [targetValue, setTargetValue] = useState<string | undefined>(undefined);

  const reload = useCallback(() => {
    setLoading(true);
    Promise.all([listSources(), listTransfers(projectId)])
      .then(([sourceResult, transferResult]) => {
        setSources(sourceResult.data || []);
        setTransfers(transferResult.data || []);
      })
      .catch(() => {
        message.error(fm({ id: 'storagePool.loadFailed' }));
      })
      .finally(() => setLoading(false));
  }, [projectId]);

  useEffect(() => {
    reload();
  }, [reload]);

  // 有进行中的任务时轮询进度；跑完了停掉，不空转。
  const hasActive = transfers.some((t) => ACTIVE_STATUS.includes(t.status));
  useEffect(() => {
    if (!hasActive) {
      return;
    }
    const timer = window.setInterval(() => {
      listTransfers(projectId)
        .then((result) => setTransfers(result.data || []))
        .catch(() => undefined);
    }, 10000);
    return () => window.clearInterval(timer);
  }, [hasActive, projectId]);

  if (!isAdmin) {
    return null;
  }

  const storageSourceId = currentProject?.storageSourceId || null;
  const locked = !!currentProject?.storagePoolLocked;
  const currentSource =
    sources.find((s) => s.id === storageSourceId) || null;
  // 目标下拉：默认存储 + 启用的来源，但去掉当前所在（原地踏步后端会拒）。
  const enabledSources = sources.filter(
    (s) => s.enabled && s.id !== storageSourceId,
  );
  const latest = transfers[0] || null;
  // 直转任务显示「源 → 目标」，一眼看出往哪搬。
  const latestTarget =
    latest?.targetSource?.id && latest.targetSource.id !== latest.source.id
      ? latest.targetSource.name
      : null;

  /** 操作完刷新项目详情：指针切了之后 storageSourceId 才会变。 */
  const refreshProject = () =>
    api
      .getProject({ id: projectId })
      .then((result: any) => {
        const nextProject = toLowerCamelCase(result.data) as Project;
        dispatch(setCurrentProject(nextProject));
        dispatch(editProject(nextProject));
      })
      .catch(() => undefined);

  const handleMove = async () => {
    if (!targetValue) {
      return;
    }
    setActing(true);
    try {
      await moveProject(
        projectId,
        targetValue === DEFAULT_TARGET ? null : targetValue,
      );
      message.success(fm({ id: 'storagePool.moveQueued' }));
      setTargetValue(undefined);
      reload();
      refreshProject();
    } catch (error: any) {
      message.error(error?.data?.message || fm({ id: 'storagePool.moveFailed' }));
    } finally {
      setActing(false);
    }
  };

  const handleLock = async (checked: boolean) => {
    setLocking(true);
    try {
      await lockProject(projectId, checked);
      message.success(fm({ id: 'storagePool.saved' }));
      refreshProject();
    } catch (error: any) {
      message.error(error?.data?.message || fm({ id: 'storagePool.saveFailed' }));
    } finally {
      setLocking(false);
    }
  };

  const handleRetry = async (record: TransferRecord) => {
    setActing(true);
    try {
      await retryTransfer(record.id);
      message.success(fm({ id: 'storagePool.retried' }));
      reload();
    } catch (error: any) {
      message.error(error?.data?.message || fm({ id: 'storagePool.retryFailed' }));
    } finally {
      setActing(false);
    }
  };

  return (
    <Content>
      <ContentTitle>{fm({ id: 'storagePool.moveTitle' })}</ContentTitle>
      <ContentItem>
        <span>{fm({ id: 'storagePool.moveCurrent' })}</span>
        <div>
          {storageSourceId ? (
            currentSource ? (
              <Tag color="blue">{currentSource.name}</Tag>
            ) : (
              <Tag color="red">
                {fm({ id: 'storagePool.moveSourceGone' })}
                {storageSourceId.slice(0, 8)}
              </Tag>
            )
          ) : (
            <Tag>{fm({ id: 'storagePool.defaultStorage' })}</Tag>
          )}
          {locked && (
            <Tag color="orange">{fm({ id: 'storagePool.lockedTag' })}</Tag>
          )}
        </div>
        <div
          css={css`
            display: flex;
            margin-top: 8px;
            gap: 8px;
            align-items: center;
          `}
        >
          <Select
            style={{ flex: 1 }}
            placeholder={fm({ id: 'storagePool.movePickTarget' })}
            value={targetValue}
            onChange={setTargetValue}
            loading={loading}
            disabled={locked}
          >
            {storageSourceId && (
              <Select.Option value={DEFAULT_TARGET}>
                {fm({ id: 'storagePool.defaultStorage' })}
              </Select.Option>
            )}
            {enabledSources.map((s) => (
              <Select.Option key={s.id} value={s.id}>
                {s.name}（{s.bucket}）
              </Select.Option>
            ))}
          </Select>
          <Popconfirm
            title={fm({ id: 'storagePool.moveConfirm' })}
            okText={fm({ id: 'storagePool.confirm' })}
            cancelText={fm({ id: 'storagePool.cancel' })}
            onConfirm={handleMove}
          >
            <Button
              type="primary"
              loading={acting}
              disabled={!targetValue || locked}
            >
              {fm({ id: 'storagePool.moveGo' })}
            </Button>
          </Popconfirm>
        </div>
        <div
          css={css`
            display: flex;
            margin-top: 8px;
            gap: 8px;
            align-items: center;
          `}
        >
          <Switch
            size="small"
            checked={locked}
            loading={locking}
            onChange={handleLock}
          />
          <span>{fm({ id: 'storagePool.lockHint' })}</span>
        </div>
      </ContentItem>
      {latest && (
        <ContentItem>
          <div
            css={css`
              width: 100%;
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
                {latest.directionName}
                {latestTarget ? `：${latest.source.name} → ${latestTarget}` : ''}
                {' · '}
                {latest.statusName}
              </span>
              {RETRYABLE_STATUS.includes(latest.status) && !locked && (
                <Button size="small" onClick={() => handleRetry(latest)}>
                  {fm({ id: 'storagePool.retry' })}
                </Button>
              )}
            </div>
            <Progress
              size="small"
              percent={latest.progressPercent}
              format={() => `${latest.copiedObjects}/${latest.totalObjects}`}
            />
            <div
              css={css`
                font-size: 12px;
                color: #8c8c8c;
              `}
            >
              {formatBytes(latest.copiedBytes) || '0 B'} /{' '}
              {formatBytes(latest.totalBytes) || '0 B'}
            </div>
            {latest.lastError && (
              <div
                css={css`
                  font-size: 12px;
                  color: #cf1322;
                `}
              >
                {latest.lastError}
              </div>
            )}
            <Button
              size="small"
              type="link"
              onClick={reload}
              loading={loading}
              css={css`
                padding-left: 0;
              `}
            >
              {fm({ id: 'storagePool.refreshProgress' })}
            </Button>
          </div>
        </ContentItem>
      )}
    </Content>
  );
};
