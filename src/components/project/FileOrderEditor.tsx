import { css } from '@emotion/core';
import { Alert, Button, Empty, Modal, Select, Spin, message } from 'antd';
import axios from 'axios';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import { Prompt } from 'react-router-dom';
import { api, resultTypes } from '@/apis';
import { File } from '@/interfaces';
import { toLowerCamelCase } from '@/utils';
import { moveFile, sortFilesByIds } from '@/utils/fileOrder';

interface Props {
  projectID: string;
  onClose: (saved: boolean) => void;
}

/** Full-directory draft: ordinary pagination/search never limits a saved order. */
export const FileOrderEditor = ({ projectID, onClose }: Props) => {
  const { formatMessage } = useIntl();
  const text = (key: string) => formatMessage({ id: `fileList.order.${key}` });
  const [files, setFiles] = useState<File[]>([]);
  const [initialIds, setInitialIds] = useState<string[]>([]);
  const [version, setVersion] = useState('');
  const [defaultIds, setDefaultIds] = useState<string[]>([]);
  const [initialHasManualOrder, setInitialHasManualOrder] = useState(false);
  const [resetToDefault, setResetToDefault] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const draggedId = useRef<string | null>(null);
  const [dropId, setDropId] = useState<string | null>(null);
  const dirty =
    files.some((file, index) => file.id !== initialIds[index]) ||
    (resetToDefault && initialHasManualOrder);
  const fileCount = files.length;
  const options = useMemo(
    () =>
      Array.from({ length: fileCount }, (_, index) => ({
        value: index,
        label: String(index + 1),
      })),
    [fileCount],
  );

  useEffect(() => {
    let active = true;
    const source = axios.CancelToken.source();
    api.file
      .getFileOrder(projectID, { cancelToken: source.token })
      .then(({ data }) => {
        if (!active) return;
        const snapshot = toLowerCamelCase(data);
        setFiles(snapshot.files);
        setInitialIds(snapshot.files.map((file) => file.id));
        setVersion(snapshot.version);
        setDefaultIds(snapshot.defaultFileIds);
        setInitialHasManualOrder(
          snapshot.files.some((file) => file.manualOrder != null),
        );
      })
      .catch((error) => {
        if (active && error.type !== resultTypes.CANCEL_FAILURE)
          error.default();
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      source.cancel();
    };
  }, [projectID]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const cancel = () => {
    if (!dirty) return onClose(false);
    Modal.confirm({
      title: text('discard'),
      onOk: () => onClose(false),
      okText: text('discardButton'),
      cancelText: text('continue'),
    });
  };

  const save = async () => {
    if (saving || !version || !dirty) return;
    setSaving(true);
    try {
      const result = await api.file.saveFileOrder(
        projectID,
        files.map((file) => file.id),
        version,
        resetToDefault,
      );
      message.success(result.data.message);
      onClose(true);
    } catch (error) {
      (error as { default: () => void }).default();
      setSaving(false);
    }
  };

  const moveTo = (id: string, position: number) => {
    const from = files.findIndex((file) => file.id === id);
    if (
      saving ||
      from < 0 ||
      from === position ||
      position < 0 ||
      position >= files.length
    )
      return;
    setResetToDefault(false);
    setFiles((current) =>
      moveFile(
        current,
        current.findIndex((file) => file.id === id),
        position,
      ),
    );
  };

  const autoSort = () => {
    setFiles((current) => sortFilesByIds(current, defaultIds));
    setResetToDefault(true);
  };

  return (
    <section
      aria-label={text('title')}
      css={css`
        flex: 1;
        min-height: 0;
        overflow: auto;
        padding: 12px;
        .order-toolbar {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 12px;
        }
        .order-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
          gap: 12px;
          margin-top: 12px;
        }
        .order-card {
          padding: 8px;
          border: 2px solid #ddd;
          border-radius: 6px;
          cursor: grab;
          background: white;
        }
        .order-card[data-drop='true'] {
          border-color: #1890ff;
        }
        .order-card img {
          width: 100%;
          height: 180px;
          object-fit: contain;
          user-select: none;
        }
        .order-name {
          overflow-wrap: anywhere;
          margin: 8px 0;
        }
      `}
    >
      <Prompt when={dirty} message={text('discard')} />
      <div className="order-toolbar">
        <Button
          disabled={loading || saving || !version || files.length === 0}
          onClick={autoSort}
        >
          {text('autoSort')}
        </Button>
        <Button
          type="primary"
          loading={saving}
          disabled={loading || !dirty || !version}
          onClick={save}
        >
          {text('save')}
        </Button>
        <Button disabled={saving} onClick={cancel}>
          {text('cancel')}
        </Button>
        <span>
          {text('title')} ({files.length})
        </span>
      </div>
      <Alert
        type="info"
        showIcon
        message={text(resetToDefault ? 'autoSortHint' : 'hint')}
      />
      <Spin spinning={loading}>
        {!loading && files.length === 0 && <Empty />}
        <div className="order-grid">
          {files.map((file, index) => (
            <article
              key={file.id}
              className="order-card"
              data-drop={dropId === file.id}
              draggable={!saving}
              onDragStart={(event) => {
                draggedId.current = file.id;
                event.dataTransfer.effectAllowed = 'move';
                event.dataTransfer.setData('text/plain', file.id);
              }}
              onDragOver={(event) => {
                if (saving || !draggedId.current) return;
                event.preventDefault();
                event.dataTransfer.dropEffect = 'move';
                setDropId(file.id);
              }}
              onDrop={(event) => {
                event.preventDefault();
                if (!saving && draggedId.current) {
                  const id = draggedId.current;
                  moveTo(
                    id,
                    files.findIndex((f) => f.id === file.id),
                  );
                }
                draggedId.current = null;
                setDropId(null);
              }}
              onDragEnd={() => {
                draggedId.current = null;
                setDropId(null);
              }}
            >
              <img
                src={
                  file.coverUrl && file.coverUrl !== 'generating'
                    ? file.coverUrl
                    : file.url
                }
                alt={file.name}
                draggable={false}
                loading="lazy"
              />
              <div className="order-name">{file.name}</div>
              <label>
                {text('position')}
                <Select
                  aria-label={`${text('position')} ${file.name}`}
                  style={{ width: '100%' }}
                  disabled={saving}
                  value={index}
                  options={options}
                  showSearch
                  optionFilterProp="label"
                  onChange={(position) => moveTo(file.id, position)}
                />
              </label>
            </article>
          ))}
        </div>
      </Spin>
    </section>
  );
};
