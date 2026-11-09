import {
  Alert,
  Checkbox,
  Input,
  message,
  Modal,
  Radio,
  Select,
  Space,
  Spin,
  Table,
} from 'antd';
import { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import {
  labelSnapshot,
  LabelCapabilities,
  LabelSnapshot,
  LabelState,
  MergePreview,
} from '@/apis/labelSnapshot';
import { FC } from '@/interfaces';
import {
  canDeleteLabels,
  canSubmitSnapshotAction,
  hasMergeConflicts,
} from './labelSnapshotLogic';

export type SnapshotAction = 'create' | 'restore' | 'merge' | null;
interface Props {
  projectId: string;
  targetId: string;
  languageName: string;
  action: SnapshotAction;
  onClose: () => void;
  onCapabilities: (capabilities: LabelCapabilities) => void;
}
const emptyCapabilities: LabelCapabilities = {
  create: false,
  restore: false,
  clearProofread: false,
  merge: false,
};

export const LabelSnapshotActions: FC<Props> = ({
  projectId,
  targetId,
  languageName,
  action,
  onClose,
  onCapabilities,
}) => {
  const { formatMessage } = useIntl();
  const t = (key: string, fallback: string) =>
    formatMessage({ id: `labelSnapshot.${key}`, defaultMessage: fallback });
  const [state, setState] = useState<LabelState>();
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState('');
  const [snapshots, setSnapshots] = useState<LabelSnapshot[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<string>('empty');
  const [field, setField] = useState('proofread');
  const [deleteLabels, setDeleteLabels] = useState(false);
  const [clearTips, setClearTips] = useState(false);
  const [preview, setPreview] = useState<MergePreview>();
  const [versions, setVersions] = useState<Record<string, string>>({});
  const [selections, setSelections] = useState<Record<string, string>>({});
  const showError = (error: { default?: () => void }) => error.default?.();

  useEffect(() => {
    let active = true;
    labelSnapshot
      .state(projectId)
      .then(({ data }) => {
        if (active) {
          setState(data);
          onCapabilities(data.capabilities);
        }
      })
      .catch(showError);
    return () => {
      active = false;
    };
  }, [projectId, onCapabilities]);

  useEffect(() => {
    if (!action) return;
    let active = true;
    setLoading(true);
    setListLoading(false);
    if (action === 'restore') {
      setPage(1);
      setSnapshots([]);
    }
    setSelected('empty');
    setField('proofread');
    setDeleteLabels(false);
    setClearTips(false);
    setPreview(undefined);
    setVersions({});
    setSelections({});
    labelSnapshot
      .state(projectId)
      .then(async ({ data }) => {
        if (active) {
          setState(data);
          onCapabilities(data.capabilities);
        }
        if (action === 'merge' && !data.recoveryRequired) {
          const result = await labelSnapshot.preview(projectId, targetId);
          if (active) setPreview(result.data);
        }
      })
      .catch(showError)
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [action, projectId, targetId, onCapabilities]);

  useEffect(() => {
    if (action !== 'restore' || !state?.capabilities.create) return;
    let active = true;
    setListLoading(true);
    labelSnapshot
      .list(projectId, { page, limit: 10 })
      .then(({ data, headers }) => {
        if (active) {
          const count = Number(headers['x-pagination-count'] || 0);
          setSnapshots(data);
          setTotal(count);
          if (page > Math.max(1, Math.ceil(count / 10)))
            setPage(Math.max(1, Math.ceil(count / 10)));
        }
      })
      .catch(showError)
      .finally(() => {
        if (active) setListLoading(false);
      });
    return () => {
      active = false;
    };
  }, [action, projectId, page, state?.capabilities.create]);

  const canDelete = canDeleteLabels(field, state?.hasSourceContent);
  const caps = state?.capabilities || emptyCapabilities;
  const unresolved = hasMergeConflicts(preview, versions, selections);
  const canSubmit =
    !listLoading &&
    canSubmitSnapshotAction(action, caps, field, selected, preview, unresolved);

  const perform = async () => {
    setBusy(true);
    try {
      if (action === 'create') {
        await labelSnapshot.create(projectId, name);
        message.success(t('created', '快照已建立'));
        setName('');
        onClose();
      } else {
        if (action === 'restore') {
          if (selected === 'empty')
            await labelSnapshot.clear(
              projectId,
              field,
              deleteLabels && canDelete,
              clearTips,
            );
          else await labelSnapshot.restore(projectId, selected);
        } else if (preview)
          await labelSnapshot.merge(
            projectId,
            targetId,
            preview,
            versions,
            selections,
          );
        window.location.reload(); // invalidate all project/target/file/editor caches
      }
    } catch (error) {
      showError(error as { default?: () => void });
    } finally {
      setBusy(false);
    }
  };
  const submit = () => {
    if (action === 'create') {
      void perform();
      return;
    }
    Modal.confirm({
      title: t('confirm', '确认建立保护快照并执行？'),
      content:
        deleteLabels && selected === 'empty'
          ? t(
              'deleteWarning',
              '将完全删除项目标签，包括其他语言的翻译、校对和批注。执行前自动建立全量快照；未提交修改不会保存。',
            )
          : t(
              'overwriteWarning',
              '将覆盖或清空对应标签数据。执行前自动建立项目全量快照；未提交修改不会保存，其他编辑页面需要重新打开。',
            ),
      okText: t('execute', '建立快照并执行'),
      okButtonProps: { danger: true },
      onOk: perform,
    });
  };
  const title =
    action === 'create'
      ? t('create', '建立快照')
      : action === 'restore'
        ? t('restore', '读取快照')
        : t('merge', '合并到翻译');

  return (
    <Modal
      title={title}
      visible={!!action}
      width={760}
      onCancel={() => {
        if (!busy) onClose();
      }}
      maskClosable={false}
      closable={!busy}
      confirmLoading={busy}
      onOk={submit}
      okButtonProps={{
        disabled: loading || busy || !canSubmit || state?.recoveryRequired,
        danger: action !== 'create',
      }}
      okText={action === 'create' ? title : t('continue', '继续')}
      cancelButtonProps={{ disabled: busy }}
      destroyOnClose
    >
      <Spin spinning={loading || busy || listLoading}>
        {state?.recoveryRequired && (
          <Alert
            type="error"
            message={t(
              'recoveryRequired',
              '上次标签操作未完成，需要恢复保护快照',
            )}
            action={
              caps.restore ? (
                <a
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await labelSnapshot.recover(projectId);
                      window.location.reload();
                    } catch (error) {
                      showError(error as { default?: () => void });
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  {t('recover', '恢复保护快照')}
                </a>
              ) : undefined
            }
          />
        )}
        {action === 'create' && (
          <Space direction="vertical" style={{ width: '100%' }}>
            <Alert
              type="info"
              message={t(
                'scope',
                '保存项目全部标签、所有语言和作者的翻译、校对、选定状态及批注（含历史文件修订）；不备份图片和导出文件。',
              )}
            />
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={120}
              placeholder={t('name', '快照名称（可选）')}
            />
          </Space>
        )}
        {action === 'restore' && (
          <Space direction="vertical" style={{ width: '100%' }}>
            <Radio
              checked={selected === 'empty'}
              onChange={() => setSelected('empty')}
            >
              {t('empty', '空存档（按栏位清空）')}
            </Radio>
            <Table<LabelSnapshot>
              size="small"
              rowKey="id"
              dataSource={snapshots}
              rowSelection={{
                type: 'radio',
                selectedRowKeys: selected === 'empty' ? [] : [selected],
                onChange: (keys) => setSelected(String(keys[0])),
              }}
              pagination={{
                current: page,
                pageSize: 10,
                total,
                onChange: setPage,
                showSizeChanger: false,
              }}
              columns={[
                { title: t('nameColumn', '名称'), dataIndex: 'name' },
                { title: t('creator', '建立者'), dataIndex: 'actorName' },
                {
                  title: t('createdAt', '建立时间'),
                  dataIndex: 'created',
                  render: (value: string) =>
                    new Date(
                      /(?:Z|[+-]\d\d:\d\d)$/.test(value) ? value : `${value}Z`,
                    ).toLocaleString(),
                },
                {
                  title: t('labelCount', '标签数'),
                  render: (_, row) => row.counts.sources,
                },
              ]}
            />
            {selected === 'empty' ? (
              <>
                <Radio.Group
                  value={field}
                  onChange={(event) => {
                    setField(event.target.value);
                    setDeleteLabels(false);
                    setClearTips(false);
                  }}
                >
                  <Radio value="source" disabled={!caps.restore}>
                    {t('source', '清空原文（连带翻译和校对）')}
                  </Radio>
                  <Radio value="translation" disabled={!caps.restore}>
                    {t('translation', '清空翻译（所有人的翻译和校对）')}
                  </Radio>
                  <Radio value="proofread" disabled={!caps.clearProofread}>
                    {t('proofread', '清空校对（保留选定状态）')}
                  </Radio>
                </Radio.Group>
                {field !== 'proofread' && (
                  <Checkbox
                    checked={deleteLabels}
                    disabled={!canDelete}
                    onChange={(event) => setDeleteLabels(event.target.checked)}
                  >
                    {t('deleteLabels', '完全删除标签')}
                    {field === 'translation' && state?.hasSourceContent
                      ? ` — ${t('hasSource', '原文字段有内容，不能删除标签')}`
                      : ''}
                  </Checkbox>
                )}
                {field === 'proofread' && (
                  <Checkbox
                    checked={clearTips}
                    onChange={(event) => setClearTips(event.target.checked)}
                  >
                    {t('clearTips', '清除批注')}
                  </Checkbox>
                )}
                {deleteLabels && (
                  <Alert
                    type="warning"
                    message={t(
                      'crossLanguage',
                      '标签共用于所有语言，完全删除会连带删除其他语言的数据。',
                    )}
                  />
                )}
              </>
            ) : (
              <Alert
                type="warning"
                message={t(
                  'restoreScope',
                  '完整覆盖项目所有语言的标签数据。新增文件的标签也会被清空，但不会删除文件；快照关联文件或语言被删除、替换时拒绝恢复。',
                )}
              />
            )}
          </Space>
        )}
        {action === 'merge' && (
          <Space direction="vertical" style={{ width: '100%' }}>
            <Alert
              type="warning"
              message={`${t('mergeScope', '仅合并当前项目当前语言；自动建立全量快照，随后清空该语言全部校对栏，保留批注。')} ${languageName}`}
            />
            {preview && !preview.proofreadCount && (
              <Alert
                type="info"
                message={t('nothing', '当前语言没有校对记录')}
              />
            )}
            {preview?.candidates
              .filter((candidate) => candidate.versions.length > 1)
              .map((candidate) => (
                <div key={candidate.key}>
                  <p>
                    #{candidate.rank} · {candidate.userName} ·{' '}
                    {candidate.sourceContent}
                  </p>
                  <Select
                    style={{ width: '100%' }}
                    placeholder={t('chooseVersion', '请选择保留的校对内容')}
                    value={versions[candidate.key]}
                    onChange={(value) =>
                      setVersions((old) => ({ ...old, [candidate.key]: value }))
                    }
                  >
                    {candidate.versions.map((version) => (
                      <Select.Option key={version.id} value={version.id}>
                        {version.content}
                      </Select.Option>
                    ))}
                  </Select>
                </div>
              ))}
            {preview?.selectionConflicts.map((conflict) => (
              <div key={conflict.sourceId}>
                <p>
                  #
                  {
                    preview.candidates.find(
                      (candidate) => candidate.sourceId === conflict.sourceId,
                    )?.rank
                  }{' '}
                  ·{' '}
                  {t(
                    'chooseSelected',
                    '多位校对者的翻译都会保留，请选择最终选定者',
                  )}
                </p>
                <Select
                  style={{ width: '100%' }}
                  value={selections[conflict.sourceId]}
                  onChange={(value) =>
                    setSelections((old) => ({
                      ...old,
                      [conflict.sourceId]: value,
                    }))
                  }
                >
                  {preview.candidates
                    .filter(
                      (candidate) => candidate.sourceId === conflict.sourceId,
                    )
                    .map((candidate) => (
                      <Select.Option
                        key={candidate.userId}
                        value={candidate.userId}
                      >
                        {candidate.userName}
                      </Select.Option>
                    ))}
                </Select>
              </div>
            ))}
            {preview && !unresolved && !!preview.proofreadCount && (
              <Alert
                type="success"
                message={t('ready', '冲突已解决，可以建立快照并执行合并')}
              />
            )}
          </Space>
        )}
      </Spin>
    </Modal>
  );
};
