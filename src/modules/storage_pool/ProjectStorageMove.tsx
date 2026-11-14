import { css } from '@emotion/core';
import { Button, message, Popconfirm, Table, Select, Switch, Tag } from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';
import api from '@/apis';
import { Content, ContentItem, ContentTitle } from '@/components';
import { FC, Project } from '@/interfaces';
import { AppState } from '@/store';
import { editProject, setCurrentProject } from '@/store/project/slice';
import { toLowerCamelCase } from '@/utils';
import { TransferProgress } from './TransferProgress';
import {
  listSources,
  listTransfers,
  lockProject,
  moveProject,
  retryTransfer,
  cancelTransfer,
  deleteTransfer,
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
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const sequence = useRef(0);
  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState(false);
  const [locking, setLocking] = useState(false);
  const [targetValue, setTargetValue] = useState<string | undefined>(undefined);

  const refreshProject = useCallback(
    () =>
      api
        .getProject({ id: projectId })
        .then((result) => {
          const nextProject = toLowerCamelCase(result.data) as Project;
          dispatch(setCurrentProject(nextProject));
          dispatch(editProject(nextProject));
        })
        .catch(() => undefined),
    [projectId, dispatch],
  );

  const reload = useCallback(() => {
    if (!isAdmin) return;
    const requestSequence = ++sequence.current;
    setLoading(true);
    Promise.all([listSources(), listTransfers(projectId, { page, limit: 5 })])
      .then(([sourceResult, transferResult]) => {
        if (requestSequence !== sequence.current) return;
        setSources(sourceResult.data || []);
        setTransfers(transferResult.data || []);
        const count = Number(transferResult.headers['x-pagination-count'] || 0);
        setTotal(count);
        if (page > Math.max(1, Math.ceil(count / 5)))
          setPage(Math.max(1, Math.ceil(count / 5)));
        void refreshProject();
      })
      .catch(() => {
        message.error(fm({ id: 'storagePool.loadFailed' }));
      })
      .finally(() => {
        if (requestSequence === sequence.current) setLoading(false);
      });
  }, [projectId, isAdmin, page, refreshProject, fm]);

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
      reload();
    }, 10000);
    return () => window.clearInterval(timer);
  }, [hasActive, reload]);

  if (!isAdmin) {
    return null;
  }

  const storageSourceId = currentProject?.storageSourceId || null;
  const locked = !!currentProject?.storagePoolLocked;
  const currentSource = sources.find((s) => s.id === storageSourceId) || null;
  // 目标下拉：默认存储 + 启用的来源，但去掉当前所在（原地踏步后端会拒）。
  const enabledSources = sources.filter(
    (s) => s.enabled && s.id !== storageSourceId,
  );

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
      message.error(
        error?.data?.message || fm({ id: 'storagePool.moveFailed' }),
      );
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
      message.error(
        error?.data?.message || fm({ id: 'storagePool.saveFailed' }),
      );
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
      message.error(
        error?.data?.message || fm({ id: 'storagePool.retryFailed' }),
      );
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
      {
        <ContentItem>
          <div style={{ width: '100%' }}>
            <Button size="small" type="link" onClick={reload} loading={loading}>
              {fm({ id: 'storagePool.refreshProgress' })}
            </Button>
            <Table<TransferRecord>
              rowKey="id"
              size="small"
              dataSource={transfers}
              loading={loading}
              pagination={{
                current: page,
                total,
                pageSize: 5,
                onChange: setPage,
                showSizeChanger: false,
              }}
              columns={[
                {
                  title: fm({ id: 'storagePool.direction' }),
                  render: (_, record) =>
                    `${record.directionName} · ${record.source.name}${record.targetSource?.id && record.targetSource.id !== record.source.id ? ` → ${record.targetSource.name}` : ''}`,
                },
                {
                  title: fm({ id: 'storagePool.status' }),
                  dataIndex: 'statusName',
                },
                {
                  title: fm({ id: 'storagePool.progress' }),
                  render: (_, record) => <TransferProgress record={record} />,
                },
                {
                  title: fm({ id: 'storagePool.lastError' }),
                  dataIndex: 'lastError',
                },
                {
                  title: fm({ id: 'storagePool.actions' }),
                  render: (_, record) => (
                    <>
                      {RETRYABLE_STATUS.includes(record.status) && !locked && (
                        <Button
                          size="small"
                          disabled={acting}
                          onClick={() => handleRetry(record)}
                        >
                          {fm({ id: 'storagePool.retry' })}
                        </Button>
                      )}
                      {(record.status === 0 ||
                        record.status === 7 ||
                        (record.status === 4 && !record.lastError)) && (
                        <Popconfirm
                          title={fm({
                            id:
                              record.status === 0
                                ? 'storagePool.cancelQueueConfirm'
                                : 'storagePool.deleteRecordConfirm',
                            defaultMessage:
                              record.status === 0
                                ? '删除尚未开始的排队任务？'
                                : '只删除历史记录，不删除存储对象？',
                          })}
                          onConfirm={async () => {
                            try {
                              if (record.status === 0)
                                await cancelTransfer(record.id);
                              else await deleteTransfer(record.id);
                              reload();
                            } catch (error) {
                              (error as { default?: () => void }).default?.();
                            }
                          }}
                        >
                          <Button size="small" danger>
                            {fm({
                              id:
                                record.status === 0
                                  ? 'storagePool.cancelQueue'
                                  : 'storagePool.deleteRecord',
                              defaultMessage:
                                record.status === 0 ? '删除队列' : '删除记录',
                            })}
                          </Button>
                        </Popconfirm>
                      )}
                    </>
                  ),
                },
              ]}
            />
          </div>
        </ContentItem>
      }
    </Content>
  );
};
