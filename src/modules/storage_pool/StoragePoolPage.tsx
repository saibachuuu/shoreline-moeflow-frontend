import { css } from '@emotion/core';
import {
  Alert,
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Popconfirm,
  Progress,
  Row,
  Select,
  Statistic,
  Switch,
  Table,
  Tabs,
  Tag,
} from 'antd';
import dayjs from 'dayjs';
import React, { useCallback, useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import {
  createSource,
  deleteSource,
  getSettings,
  getStats,
  getUsage,
  listSources,
  listTransfers,
  retryTransfer,
  runScanOnce,
  StoragePoolSetting,
  StoragePoolStats,
  StoragePoolUsage,
  StorageSource,
  StorageSourceInput,
  testSource,
  TransferRecord,
  updateSettings,
  updateSource,
} from './api';
import { formatBytes } from '@/utils/size';

/** 与后端 TransferStatus 对应，仅用于上色。 */
const TRANSFER_STATUS_COLOR: Record<number, string> = {
  0: 'default',
  1: 'processing',
  2: 'processing',
  3: 'warning',
  4: 'success',
  5: 'error',
  6: 'warning',
};

/** 可重试的状态：FAILED / ABORTED。 */
const RETRYABLE_STATUS = [5, 6];

export const StoragePoolPage: React.FC = () => {
  const { formatMessage: fm } = useIntl();
  const [sources, setSources] = useState<StorageSource[]>([]);
  const [transfers, setTransfers] = useState<TransferRecord[]>([]);
  const [stats, setStats] = useState<StoragePoolStats | null>(null);
  const [settings, setSettings] = useState<StoragePoolSetting | null>(null);
  const [usage, setUsage] = useState<StoragePoolUsage | null>(null);
  const [quota, setQuota] = useState({ gb: 20, objects: 2000, projects: 20 });
  const [savingQuota, setSavingQuota] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [togglingKey, setTogglingKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<StorageSource | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [togglingSourceId, setTogglingSourceId] = useState<string | null>(null);
  const [form] = Form.useForm<StorageSourceInput>();

  const reload = useCallback(() => {
    setLoading(true);
    Promise.all([
      listSources(),
      listTransfers(),
      getStats(),
      getSettings(),
      getUsage(),
    ])
      .then(
        ([
          sourceResult,
          transferResult,
          statsResult,
          settingResult,
          usageResult,
        ]) => {
          setSources(sourceResult.data || []);
          setTransfers(transferResult.data || []);
          setStats(statsResult.data || null);
          setSettings(settingResult.data || null);
          setUsage(usageResult.data || null);
        },
      )
      .catch((error) => {
        console.error('[StoragePool] 加载失败', error);
        message.error(
          (error?.data?.message as string) ||
            fm({ id: 'storagePool.loadFailed' }),
        );
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  // 服务端的配额是权威值；刷新/保存后回填输入框。
  useEffect(() => {
    if (!settings) {
      return;
    }
    setQuota({
      gb: Math.round((settings.runMaxBytes / 1024 ** 3) * 100) / 100,
      objects: settings.runMaxObjects,
      projects: settings.runMaxProjects,
    });
  }, [settings]);

  const saveQuota = async () => {
    setSavingQuota(true);
    try {
      await updateSettings({
        runMaxBytes: Math.max(1024 * 1024, Math.round(quota.gb * 1024 ** 3)),
        runMaxObjects: quota.objects,
        runMaxProjects: quota.projects,
      });
      message.success(fm({ id: 'storagePool.quotaSaved' }));
      reload();
    } catch (error: any) {
      message.error(
        error?.data?.message || fm({ id: 'storagePool.saveFailed' }),
      );
    } finally {
      setSavingQuota(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({
      subPath: 'storage/',
      region: 'auto',
      addressingStyle: 'path',
      verifySsl: true,
      inactiveDays: 90,
      maxObjectsPerRun: 2000,
      enabled: true,
    });
    setModalOpen(true);
  };

  const openEdit = (source: StorageSource) => {
    setEditing(source);
    form.setFieldsValue({
      name: source.name,
      endpoint: source.endpoint,
      bucket: source.bucket,
      subPath: source.subPath,
      region: source.region,
      addressingStyle: source.addressingStyle,
      verifySsl: source.verifySsl,
      publicDomain: source.publicDomain,
      remark: source.remark,
      inactiveDays: source.inactiveDays,
      maxObjectsPerRun: source.maxObjectsPerRun,
      enabled: source.enabled,
      accessKeyId: '',
      secretAccessKey: '',
    });
    setModalOpen(true);
  };

  const submit = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      if (editing) {
        await updateSource(editing.id, values);
      } else {
        await createSource(values);
      }
      message.success(fm({ id: 'storagePool.saved' }));
      setModalOpen(false);
      reload();
    } catch (error: any) {
      // 后端 400/409 的文案更有信息量（连通性失败原因、锁定原因），直接用。
      message.error(
        error?.data?.message || fm({ id: 'storagePool.saveFailed' }),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async (source: StorageSource) => {
    setTesting(source.id);
    try {
      const result = await testSource(source.id);
      if (result.data?.ok) {
        message.success(fm({ id: 'storagePool.testOk' }));
      } else {
        message.error(result.data?.message || fm({ id: 'storagePool.testFailed' }));
      }
    } catch (error: any) {
      message.error(
        error?.data?.message || fm({ id: 'storagePool.testFailed' }),
      );
    } finally {
      setTesting(null);
    }
  };

  const handleDelete = async (source: StorageSource) => {
    try {
      await deleteSource(source.id);
      message.success(fm({ id: 'storagePool.deleted' }));
      reload();
    } catch (error: any) {
      message.error(
        error?.data?.message || fm({ id: 'storagePool.deleteFailed' }),
      );
    }
  };

  const handleRetry = async (record: TransferRecord) => {
    try {
      await retryTransfer(record.id);
      message.success(fm({ id: 'storagePool.retried' }));
      reload();
    } catch (error: any) {
      message.error(
        error?.data?.message || fm({ id: 'storagePool.retryFailed' }),
      );
    }
  };

  /** 表格里的启用开关：停用有项目的来源会让那些项目读不到文件，先警告。 */
  const doToggleEnabled = async (source: StorageSource, checked: boolean) => {
    setTogglingSourceId(source.id);
    try {
      await updateSource(source.id, { enabled: checked });
      message.success(fm({ id: 'storagePool.saved' }));
      reload();
    } catch (error: any) {
      message.error(
        error?.data?.message || fm({ id: 'storagePool.saveFailed' }),
      );
    } finally {
      setTogglingSourceId(null);
    }
  };

  const handleToggleEnabled = (source: StorageSource, checked: boolean) => {
    if (!checked && source.hasData) {
      Modal.confirm({
        title: fm({ id: 'storagePool.disableConfirm' }),
        content: fm({ id: 'storagePool.disableConfirmContent' }),
        okType: 'danger',
        okText: fm({ id: 'storagePool.confirm' }),
        cancelText: fm({ id: 'storagePool.cancel' }),
        onOk: () => doToggleEnabled(source, checked),
      });
      return;
    }
    doToggleEnabled(source, checked);
  };

  /** 开关走乐观更新：先翻 UI，失败再翻回来并提示。 */
  const toggleSetting = async (
    key: 'scanEnabled' | 'runEnabled',
    checked: boolean,
  ) => {
    if (!settings) {
      return;
    }
    const previous = settings;
    setTogglingKey(key);
    setSettings({ ...settings, [key]: checked });
    try {
      const payload =
        key === 'scanEnabled'
          ? { scanEnabled: checked }
          : { runEnabled: checked };
      const result = await updateSettings(payload);
      // 以服务端返回为准（同时带回 lastScan* 等字段）
      setSettings(result.data);
      message.success(
        fm({ id: checked ? 'storagePool.switchOn' : 'storagePool.switchOff' }),
      );
    } catch (error: any) {
      setSettings(previous);
      message.error(
        error?.data?.message || fm({ id: 'storagePool.switchFailed' }),
      );
    } finally {
      setTogglingKey(null);
    }
  };

  const handleScanNow = async () => {
    setScanning(true);
    try {
      const result = await runScanOnce();
      message.success(result.data?.message || fm({ id: 'storagePool.scanQueued' }));
      // 任务已入队，稍后刷新能看到迁移记录；这里先拉一次状态。
      reload();
    } catch (error: any) {
      message.error(
        error?.data?.message || fm({ id: 'storagePool.scanFailed' }),
      );
    } finally {
      setScanning(false);
    }
  };

  const formatTime = (value: string | null) =>
    value ? dayjs(value).format('YYYY-MM-DD HH:mm') : '—';

  const subPathLocked = Boolean(editing?.hasData);

  return (
    <div
      css={css`
        padding: 24px;
      `}
    >
      <Row gutter={16}>
        {[
          { label: fm({ id: 'storagePool.statSources' }), value: stats?.sources },
          {
            label: fm({ id: 'storagePool.statEnabled' }),
            value: stats?.enabledSources,
          },
          {
            label: fm({ id: 'storagePool.statMigrated' }),
            value: stats?.migratedProjects,
          },
          {
            label: fm({ id: 'storagePool.statActive' }),
            value: stats?.activeTransfers,
          },
        ].map((item) => (
          <Col span={6} key={item.label}>
            <Card size="small">
              <Statistic title={item.label} value={item.value ?? 0} />
            </Card>
          </Col>
        ))}
      </Row>

      {/* 自动巡查开关：beat 条目常驻，闸门在任务体里，所以这里一点就生效。 */}
      <Card
        size="small"
        css={css`
          margin-top: 16px;
        `}
        title={fm({ id: 'storagePool.autoScan' })}
        extra={
          <span
            css={css`
              color: #8c8c8c;
              font-size: 12px;
            `}
          >
            {settings?.nextRunAt
              ? fm(
                  { id: 'storagePool.nextRunAt' },
                  { time: formatTime(settings.nextRunAt) },
                )
              : fm({ id: 'storagePool.scheduleFallback' })}
          </span>
        }
      >
        <Row gutter={16} align="middle">
          <Col span={7}>
            <span
              css={css`
                margin-right: 8px;
              `}
            >
              {fm({ id: 'storagePool.scanEnabled' })}
            </span>
            <Switch
              checked={settings?.scanEnabled}
              loading={togglingKey === 'scanEnabled'}
              onChange={(checked) => toggleSetting('scanEnabled', checked)}
            />
            <div
              css={css`
                color: #8c8c8c;
                font-size: 12px;
                margin-top: 6px;
              `}
            >
              {fm({ id: 'storagePool.scanEnabledTip' })}
            </div>
          </Col>
          <Col span={10}>
            <div
              css={css`
                font-size: 12px;
                line-height: 20px;
              `}
            >
              <div>
                {fm({ id: 'storagePool.lastScanTime' })}：
                {formatTime(settings?.lastScanTime ?? null)}
              </div>
              <div
                css={css`
                  color: #8c8c8c;
                `}
              >
                {settings?.lastScanResult || fm({ id: 'storagePool.neverScanned' })}
              </div>
            </div>
          </Col>
          <Col
            span={7}
            css={css`
              text-align: right;
            `}
          >
            <Popconfirm
              title={fm({ id: 'storagePool.scanNowConfirm' })}
              okText={fm({ id: 'storagePool.confirm' })}
              cancelText={fm({ id: 'storagePool.cancel' })}
              onConfirm={handleScanNow}
            >
              <Button loading={scanning}>
                {fm({ id: 'storagePool.scanNow' })}
              </Button>
            </Popconfirm>
          </Col>
        </Row>

        <div
          css={css`
            border-top: 1px solid #f0f0f0;
            margin-top: 16px;
            padding-top: 12px;
            display: flex;
            align-items: center;
          `}
        >
          <span
            css={css`
              margin-right: 8px;
            `}
          >
            {fm({ id: 'storagePool.emergencyStop' })}
          </span>
          <Switch
            checked={settings ? !settings.runEnabled : false}
            loading={togglingKey === 'runEnabled'}
            onChange={(checked) => toggleSetting('runEnabled', !checked)}
          />
          <span
            css={css`
              color: #8c8c8c;
              font-size: 12px;
              margin-left: 12px;
            `}
          >
            {fm({ id: 'storagePool.emergencyStopTip' })}
          </span>
        </div>
      </Card>

      {/* 单轮工作量上限：预算只决定「这一轮开工哪几个项目」，不切分单个项目。 */}
      <Card
        size="small"
        css={css`
          margin-top: 16px;
        `}
        title={fm({ id: 'storagePool.quota' })}
        extra={
          <span
            css={css`
              color: #8c8c8c;
              font-size: 12px;
            `}
          >
            {usage
              ? fm(
                  { id: 'storagePool.pendingSummary' },
                  {
                    projects: usage.pending.projects,
                    size: formatBytes(usage.pending.bytes) || '0 B',
                  },
                )
              : '—'}
          </span>
        }
      >
        <Row gutter={16} align="middle">
          <Col span={7}>
            <div
              css={css`
                font-size: 12px;
                margin-bottom: 6px;
              `}
            >
              {fm({ id: 'storagePool.quotaBytes' })}
            </div>
            <InputNumber
              min={1}
              step={1}
              value={quota.gb}
              style={{ width: '100%' }}
              addonAfter="GB"
              onChange={(value) =>
                setQuota({ ...quota, gb: Number(value) || 1 })
              }
            />
          </Col>
          <Col span={6}>
            <div
              css={css`
                font-size: 12px;
                margin-bottom: 6px;
              `}
            >
              {fm({ id: 'storagePool.quotaObjects' })}
            </div>
            <InputNumber
              min={1}
              step={100}
              value={quota.objects}
              style={{ width: '100%' }}
              onChange={(value) =>
                setQuota({ ...quota, objects: Number(value) || 1 })
              }
            />
          </Col>
          <Col span={6}>
            <div
              css={css`
                font-size: 12px;
                margin-bottom: 6px;
              `}
            >
              {fm({ id: 'storagePool.quotaProjects' })}
            </div>
            <InputNumber
              min={1}
              step={1}
              value={quota.projects}
              style={{ width: '100%' }}
              onChange={(value) =>
                setQuota({ ...quota, projects: Number(value) || 1 })
              }
            />
          </Col>
          <Col
            span={5}
            css={css`
              text-align: right;
            `}
          >
            <Button type="primary" loading={savingQuota} onClick={saveQuota}>
              {fm({ id: 'storagePool.saveQuota' })}
            </Button>
          </Col>
        </Row>
        <div
          css={css`
            color: #8c8c8c;
            font-size: 12px;
            margin-top: 12px;
          `}
        >
          {fm({ id: 'storagePool.quotaTip' })}
        </div>
      </Card>

      {/* 全站用量：纯数据库求和，不含桶里没人指向的孤儿对象。 */}
      <Card
        size="small"
        css={css`
          margin-top: 16px;
        `}
        title={fm({ id: 'storagePool.usage' })}
      >
        <Row gutter={16}>
          {[
            {
              label: fm({ id: 'storagePool.usageTotal' }),
              value: formatBytes(usage?.total.bytes) || '—',
            },
            {
              label: fm({ id: 'storagePool.usageCover' }),
              value: formatBytes(usage?.total.coverBytes) || '—',
            },
            {
              label: fm({ id: 'storagePool.usageResample' }),
              value: formatBytes(usage?.total.resampleBytes) || '—',
            },
            {
              label: fm({ id: 'storagePool.usageOutput' }),
              value: formatBytes(usage?.total.outputBytes) || '—',
            },
            {
              label: fm({ id: 'storagePool.usageProjects' }),
              value: usage?.total.projects ?? 0,
            },
          ].map((item) => (
            <Col span={6} key={item.label}>
              <Statistic title={item.label} value={item.value} />
            </Col>
          ))}
        </Row>

        <Row
          gutter={16}
          css={css`
            margin-top: 16px;
          `}
        >
          <Col span={12}>
            <div
              css={css`
                font-size: 12px;
                color: #8c8c8c;
                margin-bottom: 6px;
              `}
            >
              {fm({ id: 'storagePool.usageBySource' })}
            </div>
            {(usage?.bySource || []).map((item) => (
              <div
                key={item.sourceId || 'default'}
                css={css`
                  display: flex;
                  justify-content: space-between;
                  font-size: 12px;
                  line-height: 22px;
                `}
              >
                <span>
                  {item.name || fm({ id: 'storagePool.defaultStorage' })}
                  <span
                    css={css`
                      color: #8c8c8c;
                      margin-left: 6px;
                    `}
                  >
                    {item.projects}
                  </span>
                </span>
                <span>{formatBytes(item.bytes) || '0 B'}</span>
              </div>
            ))}
          </Col>
          <Col span={12}>
            <div
              css={css`
                font-size: 12px;
                color: #8c8c8c;
                margin-bottom: 6px;
              `}
            >
              {fm({ id: 'storagePool.usageTop' })}
            </div>
            {(usage?.topProjects || []).slice(0, 5).map((item) => (
              <div
                key={item.id}
                css={css`
                  display: flex;
                  justify-content: space-between;
                  font-size: 12px;
                  line-height: 22px;
                `}
              >
                <span
                  css={css`
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                    margin-right: 8px;
                  `}
                >
                  {item.name}
                </span>
                <span>{formatBytes(item.bytes) || '0 B'}</span>
              </div>
            ))}
          </Col>
        </Row>
        <div
          css={css`
            color: #8c8c8c;
            font-size: 12px;
            margin-top: 12px;
          `}
        >
          {fm({ id: 'storagePool.usageNote' })}
        </div>
      </Card>

      <Card
        size="small"
        css={css`
          margin-top: 16px;
        `}
      >
        <Tabs defaultActiveKey="sources">
          <Tabs.TabPane
            key="sources"
            tab={fm({ id: 'storagePool.tabSources' })}
          >
            <div
              css={css`
                margin-bottom: 12px;
              `}
            >
              <Button type="primary" onClick={openCreate}>
                {fm({ id: 'storagePool.addSource' })}
              </Button>
            </div>
            <Table
              rowKey="id"
              size="small"
              loading={loading}
              dataSource={sources}
              pagination={false}
              columns={[
                { title: fm({ id: 'storagePool.name' }), dataIndex: 'name' },
                {
                  title: 'Endpoint',
                  dataIndex: 'endpoint',
                  ellipsis: true,
                },
                { title: fm({ id: 'storagePool.bucket' }), dataIndex: 'bucket' },
                {
                  title: fm({ id: 'storagePool.subPath' }),
                  dataIndex: 'subPath',
                  render: (value: string) => <Tag>{value || '(无)'}</Tag>,
                },
                {
                  title: fm({ id: 'storagePool.accessKey' }),
                  dataIndex: 'accessKeyId',
                },
                {
                  title: fm({ id: 'storagePool.hasData' }),
                  dataIndex: 'hasData',
                  render: (value: boolean) =>
                    value ? (
                      <Tag color="blue">{fm({ id: 'storagePool.yes' })}</Tag>
                    ) : (
                      '—'
                    ),
                },
                {
                  title: fm({ id: 'storagePool.enabled' }),
                  dataIndex: 'enabled',
                  render: (value: boolean, record: StorageSource) => (
                    <Switch
                      size="small"
                      checked={value}
                      loading={togglingSourceId === record.id}
                      onChange={(checked) => handleToggleEnabled(record, checked)}
                    />
                  ),
                },
                {
                  title: fm({ id: 'storagePool.actions' }),
                  render: (_: unknown, record: StorageSource) => (
                    <>
                      <Button
                        size="small"
                        loading={testing === record.id}
                        onClick={() => handleTest(record)}
                      >
                        {fm({ id: 'storagePool.test' })}
                      </Button>
                      <Button
                        size="small"
                        css={css`
                          margin-left: 8px;
                        `}
                        onClick={() => openEdit(record)}
                      >
                        {fm({ id: 'storagePool.edit' })}
                      </Button>
                      <Popconfirm
                        title={fm({ id: 'storagePool.deleteConfirm' })}
                        onConfirm={() => handleDelete(record)}
                      >
                        <Button
                          size="small"
                          danger
                          css={css`
                            margin-left: 8px;
                          `}
                        >
                          {fm({ id: 'storagePool.delete' })}
                        </Button>
                      </Popconfirm>
                    </>
                  ),
                },
              ]}
            />
          </Tabs.TabPane>

          <Tabs.TabPane
            key="transfers"
            tab={fm({ id: 'storagePool.tabTransfers' })}
          >
            <Table
              rowKey="id"
              size="small"
              loading={loading}
              dataSource={transfers}
              pagination={false}
              columns={[
                {
                  title: fm({ id: 'storagePool.project' }),
                  render: (_: unknown, record: TransferRecord) =>
                    record.project?.name || record.project?.id || '—',
                },
                {
                  title: fm({ id: 'storagePool.sourceName' }),
                  render: (_: unknown, record: TransferRecord) => {
                    const hasTarget =
                      record.targetSource?.id &&
                      record.targetSource.id !== record.source?.id;
                    if (hasTarget) {
                      return `${record.source?.name || '—'} → ${record.targetSource?.name || '—'}`;
                    }
                    return record.source?.name || '—';
                  },
                },
                {
                  title: fm({ id: 'storagePool.direction' }),
                  dataIndex: 'directionName',
                },
                {
                  title: fm({ id: 'storagePool.status' }),
                  dataIndex: 'status',
                  render: (value: number, record: TransferRecord) => (
                    <Tag color={TRANSFER_STATUS_COLOR[value] || 'default'}>
                      {record.statusName}
                    </Tag>
                  ),
                },
                {
                  title: fm({ id: 'storagePool.progress' }),
                  render: (_: unknown, record: TransferRecord) => (
                    <div>
                      <Progress
                        size="small"
                        percent={record.progressPercent}
                        format={() =>
                          `${record.copiedObjects}/${record.totalObjects}`
                        }
                      />
                      <div
                        css={css`
                          font-size: 12px;
                          color: #8c8c8c;
                          line-height: 18px;
                        `}
                      >
                        {formatBytes(record.copiedBytes) || '0 B'} /{' '}
                        {formatBytes(record.totalBytes) || '0 B'}
                      </div>
                      {record.breakdown?.objectCount ? (
                        <div
                          css={css`
                            font-size: 12px;
                            color: #8c8c8c;
                            line-height: 18px;
                          `}
                        >
                          {fm({ id: 'storagePool.breakdownOrigin' })}{' '}
                          {formatBytes(record.breakdown.originBytes) || '0 B'} ·{' '}
                          {fm({ id: 'storagePool.breakdownOutput' })}{' '}
                          {formatBytes(record.breakdown.outputBytes) || '0 B'}
                        </div>
                      ) : null}
                    </div>
                  ),
                },
                {
                  title: fm({ id: 'storagePool.lastError' }),
                  dataIndex: 'lastError',
                  ellipsis: true,
                },
                {
                  title: fm({ id: 'storagePool.actions' }),
                  render: (_: unknown, record: TransferRecord) =>
                    RETRYABLE_STATUS.includes(record.status) ? (
                      <Button size="small" onClick={() => handleRetry(record)}>
                        {fm({ id: 'storagePool.retry' })}
                      </Button>
                    ) : null,
                },
              ]}
            />
          </Tabs.TabPane>
        </Tabs>
      </Card>

      <Modal
        visible={modalOpen}
        title={
          editing
            ? fm({ id: 'storagePool.editSource' })
            : fm({ id: 'storagePool.addSource' })
        }
        confirmLoading={saving}
        onOk={submit}
        onCancel={() => setModalOpen(false)}
        destroyOnClose
        width={640}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label={fm({ id: 'storagePool.name' })}
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="endpoint"
            label="Endpoint"
            rules={[{ required: true }]}
            tooltip="例如 https://acc.r2.cloudflarestorage.com"
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="bucket"
            label={fm({ id: 'storagePool.bucket' })}
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="subPath"
            label={fm({ id: 'storagePool.subPath' })}
            tooltip={fm({ id: 'storagePool.subPathTip' })}
            rules={[
              {
                pattern: /^[A-Za-z0-9._\-/]*$/,
                message: fm({ id: 'storagePool.subPathInvalid' }),
              },
            ]}
          >
            <Input
              disabled={subPathLocked}
              placeholder="storage/"
              addonAfter={subPathLocked ? fm({ id: 'storagePool.locked' }) : null}
            />
          </Form.Item>
          {subPathLocked && (
            <div
              css={css`
                color: #cf1322;
                margin: -12px 0 12px;
                font-size: 12px;
              `}
            >
              {fm({ id: 'storagePool.subPathLockedReason' })}
            </div>
          )}
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="region"
                label={fm({ id: 'storagePool.region' })}
                tooltip={fm({ id: 'storagePool.regionTip' })}
              >
                <Input placeholder="auto" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="addressingStyle"
                label={fm({ id: 'storagePool.addressingStyle' })}
              >
                <Select
                  options={[
                    { value: 'path', label: 'path' },
                    { value: 'virtual', label: 'virtual' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="verifySsl"
                label={fm({ id: 'storagePool.verifySsl' })}
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            name="accessKeyId"
            label={fm({ id: 'storagePool.accessKey' })}
            rules={editing ? [] : [{ required: true }]}
            extra={editing ? fm({ id: 'storagePool.credentialKeepTip' }) : null}
          >
            <Input autoComplete="off" />
          </Form.Item>
          <Form.Item
            name="secretAccessKey"
            label={fm({ id: 'storagePool.secretKey' })}
            rules={editing ? [] : [{ required: true }]}
            extra={editing ? fm({ id: 'storagePool.credentialKeepTip' }) : null}
          >
            <Input.Password autoComplete="new-password" />
          </Form.Item>
          <Form.Item
            name="publicDomain"
            label={fm({ id: 'storagePool.publicDomain' })}
            tooltip={fm({ id: 'storagePool.publicDomainTip' })}
          >
            <Input placeholder="https://cdn.example.com/" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="inactiveDays"
                label={fm({ id: 'storagePool.inactiveDays' })}
                tooltip={fm({ id: 'storagePool.inactiveDaysTip' })}
              >
                <InputNumber min={1} max={3650} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="maxObjectsPerRun"
                label={fm({ id: 'storagePool.maxObjectsPerRun' })}
              >
                <InputNumber min={1} max={100000} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            name="enabled"
            label={fm({ id: 'storagePool.enabled' })}
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
