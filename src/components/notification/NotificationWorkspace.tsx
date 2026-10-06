import './notification.css';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Button,
  Checkbox,
  Empty,
  Form,
  Input,
  List,
  Modal,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
} from 'antd';
import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';
import { Link, useHistory, useLocation, useRouteMatch } from 'react-router-dom';
import { AppState } from '@/store';
import {
  notificationApi as api,
  Notice,
  NoticeInput,
  NotificationCategory,
  Preview,
  Capabilities,
} from '@/apis/notification';
import { request } from '@/apis';
import { refreshNotifications } from '@/hooks/useNotificationCounts';
import { NotificationContent } from './NotificationContent';

const categories: NotificationCategory[] = ['system', 'team', 'project'];
const roles = [
  'raw_provider',
  'scanner',
  'cropper',
  'cleaner',
  'translator',
  'proofreader',
  'typesetter',
];
function errorText(error: unknown): string {
  if (error && typeof error === 'object') {
    const value = error as { data?: { message?: unknown }; message?: unknown };
    if (typeof value.data?.message === 'string') return value.data.message;
    if (typeof value.message === 'string') return value.message;
  }
  return 'Request failed';
}
function useText() {
  const intl = useIntl();
  return (key: string) => intl.formatMessage({ id: `notification.${key}` });
}
export interface WorkspaceProps {
  admin?: boolean;
  category?: NotificationCategory;
  scopeId?: string;
}

export function NotificationWorkspace(props: WorkspaceProps) {
  const userId = useSelector((s: AppState) => s.user.id);
  return (
    <Workspace
      key={`${userId}:${props.admin}:${props.category}:${props.scopeId}`}
      {...props}
    />
  );
}
function Workspace({ admin = false, category, scopeId }: WorkspaceProps) {
  const t = useText();
  const { url } = useRouteMatch();
  const location = useLocation();
  const [caps, setCaps] = useState<Capabilities>();
  const [error, setError] = useState('');
  const mode = admin ? 'admin' : category ? 'scope' : 'inbox';
  const segment = location.pathname
    .slice(url.length)
    .split('/')
    .filter(Boolean);
  useEffect(() => {
    let controller: AbortController;
    let active = true;
    const check = () => {
      if (document.visibilityState === 'hidden') return;
      controller?.abort();
      controller = new AbortController();
      api
        .capabilities(category, scopeId, controller.signal)
        .then((r) => {
          if (active) {
            setCaps(r.data);
            setError('');
          }
        })
        .catch((e) => {
          if (active && !controller.signal.aborted) {
            setCaps(undefined);
            setError(errorText(e));
          }
        });
    };
    check();
    const timer = setInterval(check, 60000);
    window.addEventListener('focus', check);
    return () => {
      active = false;
      controller?.abort();
      clearInterval(timer);
      window.removeEventListener('focus', check);
    };
  }, [category, scopeId]);
  return (
    <section
      className="NotificationWorkspace"
      style={{
        padding: 16,
        width: '100%',
        maxWidth: 1100,
        margin: '0 auto',
        minWidth: 0,
        overflowWrap: 'anywhere',
      }}
    >
      <Typography.Title level={3}>
        {t(admin ? 'management' : category ? 'scopeManagement' : 'title')}
      </Typography.Title>
      {error && <Alert type="error" message={error} showIcon />}
      {!caps ? (
        !error && <Spin />
      ) : !caps.enabled ? (
        <Alert type="info" message={t('disabled')} />
      ) : (admin && !caps.can_manage) ||
        (mode === 'scope' && !caps.can_view_sent) ? (
        <Alert type="warning" message={t('forbidden')} />
      ) : segment[0] === 'new' && caps.can_send ? (
        <Compose
          admin={admin}
          category={category || 'system'}
          scopeId={scopeId}
          base={url}
        />
      ) : segment[0] ? (
        <NoticeDetail
          key={segment.join('/')}
          id={segment[0]}
          mode={mode}
          base={url}
          editing={segment[1] === 'edit'}
        />
      ) : (
        <>
          <NoticeList
            canSend={caps.can_send}
            mode={mode}
            category={category}
            scopeId={scopeId}
            base={url}
          />
          {category === 'team' && caps.can_manage_policy && scopeId && (
            <TeamPolicy id={scopeId} />
          )}
        </>
      )}
    </section>
  );
}

function NoticeList({
  canSend,
  mode,
  category,
  scopeId,
  base,
}: {
  canSend: boolean;
  mode: 'admin' | 'scope' | 'inbox';
  category?: NotificationCategory;
  scopeId?: string;
  base: string;
}) {
  const t = useText();
  const [filters, setFilters] = useState<Record<string, unknown>>({});
  const [items, setItems] = useState<Notice[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [prefs, setPrefs] = useState<{
    categories: Record<string, boolean>;
    version: number;
  }>();
  const abort = useRef<AbortController>();
  const generation = useRef(0);
  const load = useCallback(
    async (after?: string) => {
      const ticket = ++generation.current;
      abort.current?.abort();
      abort.current = new AbortController();
      setBusy(true);
      setError('');
      try {
        const result = await api.list(
          mode,
          {
            ...filters,
            category: category || filters.category,
            scope_id: scopeId,
            cursor: after,
            limit: 20,
          },
          abort.current.signal,
        );
        if (ticket === generation.current) {
          setItems((old) =>
            after ? [...old, ...result.data.items] : result.data.items,
          );
          setCursor(result.data.next_cursor);
        }
      } catch (e) {
        if (ticket === generation.current) setError(errorText(e));
      } finally {
        if (ticket === generation.current) setBusy(false);
      }
    },
    [mode, category, scopeId, filters],
  );
  const cancel = useCallback(() => {
    generation.current += 1;
    abort.current?.abort();
  }, []);
  useEffect(() => {
    setItems([]);
    void load();
    return cancel;
  }, [load, refresh, cancel]);
  useEffect(() => {
    const reload = () => setRefresh((v) => v + 1);
    window.addEventListener('moeflow-notifications-changed', reload);
    return () =>
      window.removeEventListener('moeflow-notifications-changed', reload);
  }, []);
  useEffect(() => {
    const refreshVisible = () => {
      if (document.visibilityState !== 'hidden')
        setRefresh((value) => value + 1);
    };
    const timer = setInterval(refreshVisible, 30000);
    window.addEventListener('focus', refreshVisible);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', refreshVisible);
    };
  }, []);
  const filter = (name: string, value: unknown) =>
    setFilters((old) => ({ ...old, [name]: value || undefined }));
  return (
    <>
      <Space wrap style={{ marginBottom: 16 }}>
        {mode !== 'inbox' && canSend && (
          <Link to={`${base}/new`}>
            <Button type="primary">
              {t(mode === 'admin' ? 'sendSystem' : 'send')}
            </Button>
          </Link>
        )}
        <Button onClick={() => setRefresh((v) => v + 1)}>{t('refresh')}</Button>
        {mode === 'inbox' && (
          <>
            <Button
              onClick={async () => {
                try {
                  await api.markRead(filters.category as string | undefined);
                  refreshNotifications();
                } catch (e) {
                  setError(errorText(e));
                }
              }}
            >
              {t('markAllRead')}
            </Button>
            <Button
              onClick={async () => {
                try {
                  setPrefs((await api.preferences()).data);
                } catch (e) {
                  setError(errorText(e));
                }
              }}
            >
              {t('preferences')}
            </Button>
          </>
        )}
      </Space>
      {mode === 'inbox' && (
        <p>
          <Link to="/dashboard/user/invitations">{t('invitations')}</Link> ·{' '}
          <Link to="/dashboard/user/related-applications">
            {t('applications')}
          </Link>
        </p>
      )}
      <Space wrap style={{ marginBottom: 16 }}>
        <Input.Search
          aria-label={t('search')}
          placeholder={t('search')}
          allowClear
          onSearch={(value) => filter('q', value)}
          style={{ width: 240, maxWidth: '100%' }}
        />
        {!category && (
          <Select
            aria-label={t('category')}
            placeholder={t('category')}
            style={{ width: 140 }}
            allowClear
            onChange={(value) => filter('category', value)}
            options={categories.map((value) => ({ value, label: t(value) }))}
          />
        )}
        {mode === 'inbox' ? (
          <>
            <Checkbox
              checked={filters.unread === 'true'}
              onChange={(e) =>
                filter('unread', e.target.checked ? 'true' : undefined)
              }
            >
              {t('unread')}
            </Checkbox>
            <Checkbox
              checked={filters.archived === 'true'}
              onChange={(e) =>
                filter('archived', e.target.checked ? 'true' : undefined)
              }
            >
              {t('archived')}
            </Checkbox>
          </>
        ) : (
          <>
            <Select
              aria-label={t('state')}
              placeholder={t('state')}
              allowClear
              style={{ width: 150 }}
              onChange={(v) => filter('state', v)}
              options={[
                'draft',
                'scheduled',
                'preparing',
                'dispatching',
                'published',
                'cancelled',
              ].map((value) => ({ value, label: t(value) }))}
            />
            <Checkbox
              onChange={(e) =>
                filter('revoked', e.target.checked ? 'true' : undefined)
              }
            >
              {t('revoked')}
            </Checkbox>
          </>
        )}
      </Space>
      {mode === 'admin' && (
        <Space wrap style={{ marginBottom: 16 }}>
          <Select
            style={{ width: 160 }}
            allowClear
            aria-label={t('emailStatus')}
            placeholder={t('emailStatus')}
            onChange={(value) => filter('delivery_state', value)}
            options={[
              'pending',
              'leased',
              'accepted',
              'retry_wait',
              'skipped',
              'failed',
              'unknown',
              'cancelled',
            ].map((value) => ({ value, label: t(value) }))}
          />
          <Checkbox
            onChange={(e) =>
              filter('expired', e.target.checked ? 'true' : undefined)
            }
          >
            {t('expired')}
          </Checkbox>
          {['team_id', 'project_id', 'actor_id', 'source', 'event_type'].map(
            (name) => (
              <Input
                key={name}
                placeholder={t(name)}
                aria-label={t(name)}
                style={{ width: 180 }}
                onBlur={(e) => filter(name, e.target.value)}
              />
            ),
          )}
          <Input
            type="datetime-local"
            aria-label={t('from')}
            onChange={(e) =>
              filter(
                'from',
                e.target.value ? new Date(e.target.value).toISOString() : '',
              )
            }
          />
          <Input
            type="datetime-local"
            aria-label={t('to')}
            onChange={(e) =>
              filter(
                'to',
                e.target.value ? new Date(e.target.value).toISOString() : '',
              )
            }
          />
        </Space>
      )}
      {error && <Alert type="error" message={error} showIcon />}
      <List
        loading={busy}
        dataSource={items}
        locale={{ emptyText: <Empty description={t('empty')} /> }}
        renderItem={(item) => (
          <List.Item key={item.id}>
            <div style={{ minWidth: 0, width: '100%' }}>
              <Space wrap>
                <Tag>{t(item.category)}</Tag>
                <Tag>{t(item.revoked_at ? 'revoked' : item.state)}</Tag>
                {mode === 'inbox' && !item.read && (
                  <Tag color="blue">{t('unread')}</Tag>
                )}
              </Space>
              <div>
                <Link to={`${base}/${item.id}`}>{item.title}</Link>
              </div>
              {item.excerpt && <p>{item.excerpt}</p>}
              <Typography.Text type="secondary">
                {item.actor_name} · {new Date(item.created_at).toLocaleString()}
              </Typography.Text>
            </div>
          </List.Item>
        )}
      />
      {cursor && (
        <Button loading={busy} onClick={() => void load(cursor)}>
          {t('loadMore')}
        </Button>
      )}
      <Modal
        title={t('preferences')}
        visible={!!prefs}
        onCancel={() => setPrefs(undefined)}
        onOk={async () => {
          if (!prefs) return;
          try {
            await api.savePreferences(prefs.categories, prefs.version);
            setPrefs(undefined);
            refreshNotifications();
          } catch (e) {
            setError(errorText(e));
            setPrefs(undefined);
          }
        }}
      >
        <p>{t('preferenceHint')}</p>
        {prefs &&
          categories.map((c) => (
            <p key={c}>
              <Checkbox
                checked={prefs.categories[c]}
                onChange={(e) =>
                  setPrefs({
                    ...prefs,
                    categories: { ...prefs.categories, [c]: e.target.checked },
                  })
                }
              >
                {t(c)}
              </Checkbox>
            </p>
          ))}
      </Modal>
    </>
  );
}

function NoticeDetail({
  id,
  mode,
  base,
  editing,
}: {
  id: string;
  mode: 'admin' | 'scope' | 'inbox';
  base: string;
  editing: boolean;
}) {
  const t = useText();
  const history = useHistory();
  const userId = useSelector((s: AppState) => s.user.id);
  const [note, setNote] = useState<Notice>();
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [confirm, setConfirm] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const operation = useRef(api.operationKey());
  useEffect(() => {
    const abort = new AbortController();
    let active = true;
    setNote(undefined);
    setError('');
    api
      .detail(id, mode, abort.signal)
      .then(async (r) => {
        if (!active) return;
        setNote(r.data);
        if (mode === 'inbox' && !r.data.read) {
          await api.receipt(id, { read: true });
          if (active) refreshNotifications();
        }
      })
      .catch((e) => {
        if (active) setError(errorText(e));
      });
    return () => {
      active = false;
      abort.abort();
    };
  }, [id, mode, reload]);
  useEffect(() => {
    if (!note || note.revoked_at) return;
    const preparing = ['preparing', 'dispatching'].includes(note.state);
    const refreshVisible = () => {
      if (document.visibilityState !== 'hidden')
        setReload((value) => value + 1);
    };
    const timer = setInterval(refreshVisible, preparing ? 5000 : 30000);
    window.addEventListener('focus', refreshVisible);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', refreshVisible);
    };
  }, [note]);
  const canEdit =
    note &&
    note.actor_id === userId &&
    !note.revoked_at &&
    ['draft', 'scheduled'].includes(note.state) &&
    (mode !== 'admin' || note.category === 'system');
  if (editing && note && canEdit)
    return (
      <Compose
        category={note.category}
        scopeId={note.project_id || note.team_id}
        base={base}
        initial={note}
        admin={mode === 'admin'}
      />
    );
  return (
    <>
      <Space wrap>
        <Button onClick={() => history.push(base)}>{t('back')}</Button>
        <Button
          onClick={() => {
            setConfirm(false);
            setReload((v) => v + 1);
          }}
        >
          {t('refresh')}
        </Button>
      </Space>
      {error && <Alert type="error" message={error} showIcon />}
      {!note ? (
        !error && <Spin />
      ) : (
        <>
          <Typography.Title level={4}>{note.title}</Typography.Title>
          <p>
            {note.actor_name} · {new Date(note.created_at).toLocaleString()} ·{' '}
            {t(note.category)} · {t(note.revoked_at ? 'revoked' : note.state)}
          </p>
          <NotificationContent nodes={note.nodes || []} />
          {note.feedback_text && (
            <pre
              style={{
                whiteSpace: 'pre-wrap',
                overflowWrap: 'anywhere',
                fontFamily: 'inherit',
              }}
            >
              {note.feedback_text}
            </pre>
          )}
          {note.revoked_at && (
            <Alert
              type="warning"
              message={t('revoked')}
              description={note.revoke_reason}
            />
          )}
          {note.error && (
            <Alert
              type="warning"
              message={t('deliveryWarning')}
              description={note.error}
            />
          )}
          {mode !== 'inbox' && (
            <>
              <p>
                {t('recipientCount')}: {note.recipient_count}
              </p>
              <Space wrap>
                {Object.entries(note.deliveries || {}).map(([state, count]) => (
                  <Tag key={state}>
                    {t(state)}: {count}
                  </Tag>
                ))}
                {Object.entries(note.delivery_reasons || {}).map(
                  ([reasonCode, count]) => (
                    <Tag key={`reason-${reasonCode}`}>
                      {t(reasonCode)}: {count}
                    </Tag>
                  ),
                )}
              </Space>
            </>
          )}
          <Space wrap style={{ display: 'flex', marginTop: 20 }}>
            {mode === 'inbox' ? (
              <>
                <Button
                  onClick={async () => {
                    try {
                      await api.receipt(id, { read: false });
                      refreshNotifications();
                      history.push(base);
                    } catch (e) {
                      setError(errorText(e));
                    }
                  }}
                >
                  {t('markUnread')}
                </Button>
                <Button
                  onClick={async () => {
                    try {
                      await api.receipt(id, { archived: !note.archived });
                      refreshNotifications();
                      history.push(base);
                    } catch (e) {
                      setError(errorText(e));
                    }
                  }}
                >
                  {t(note.archived ? 'unarchive' : 'archive')}
                </Button>
              </>
            ) : (
              <>
                {canEdit && (
                  <Button onClick={() => history.push(`${base}/${id}/edit`)}>
                    {t('editDraft')}
                  </Button>
                )}
                {!note.revoked_at && (
                  <Button
                    danger
                    onClick={() => {
                      setReason('');
                      operation.current = api.operationKey();
                      setConfirm(true);
                    }}
                  >
                    {t('revoke')}
                  </Button>
                )}
              </>
            )}
          </Space>
          <Modal
            title={t('confirmRevoke')}
            visible={confirm}
            confirmLoading={busy}
            okButtonProps={{ danger: true, disabled: !reason.trim() }}
            okText={t('revoke')}
            onCancel={() => !busy && setConfirm(false)}
            onOk={async () => {
              setBusy(true);
              try {
                const r = await api.revoke(
                  note,
                  reason,
                  mode === 'admin',
                  operation.current,
                );
                setNote(r.data);
                setConfirm(false);
                refreshNotifications();
              } catch (e) {
                setError(errorText(e));
                setConfirm(false);
              } finally {
                setBusy(false);
              }
            }}
          >
            <p>{note.title}</p>
            <p>
              {note.id} · {note.actor_name} · {t(note.category)} ·{' '}
              {t(note.state)}
            </p>
            <Alert
              type="warning"
              message={t('cannotRecall')}
              style={{ marginBottom: 12 }}
            />
            <Input.TextArea
              aria-label={t('reason')}
              placeholder={t('reason')}
              maxLength={500}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </Modal>
        </>
      )}
    </>
  );
}

function Compose({
  category,
  scopeId,
  admin = false,
  base,
  initial,
}: {
  category: NotificationCategory;
  scopeId?: string;
  admin?: boolean;
  base: string;
  initial?: Notice;
}) {
  const t = useText();
  const history = useHistory();
  const [data, setData] = useState<NoticeInput>({
    category,
    scope_id: category === 'system' ? undefined : scopeId,
    title: initial?.title || '',
    body: initial?.body || '',
    audience: initial?.audience || { mode: 'manual', user_ids: [] },
    email: initial?.email || false,
    publish_at: initial?.publish_at,
    expires_at: initial?.expires_at,
  });
  const [userOptions, setUserOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const [userSearch, setUserSearch] = useState('');
  const [userCursor, setUserCursor] = useState<string>();
  const [nextUserCursor, setNextUserCursor] = useState<string | null>(null);
  const [projectCursor, setProjectCursor] = useState<string>();
  const [nextProjectCursor, setNextProjectCursor] = useState<string | null>(
    null,
  );
  const [projectSearch, setProjectSearch] = useState('');
  const [projectOptions, setProjectOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const [projectDialog, setProjectDialog] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<{
    result: Preview;
    data: NoticeInput;
    key: string;
  }>();
  const update = (values: Partial<NoticeInput>) => {
    setData((old) => ({ ...old, ...values }));
    setPreview(undefined);
  };
  useEffect(() => {
    const abort = new AbortController();
    let active = true;
    const timer = setTimeout(() => {
      api
        .candidates(
          category,
          scopeId,
          userSearch,
          admin,
          abort.signal,
          userCursor,
        )
        .then((r) => {
          if (active) {
            setNextUserCursor(r.data.next_cursor);
            const options = r.data.items.map((u) => ({
              value: u.id,
              label: `${u.name} (${u.id.slice(-6)})`,
            }));
            setUserOptions((old) =>
              userCursor ? [...old, ...options] : options,
            );
          }
        })
        .catch((e) => {
          if (active) setError(errorText(e));
        });
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
      abort.abort();
    };
  }, [category, scopeId, admin, userSearch, userCursor]);
  useEffect(() => {
    if (!projectDialog) return;
    const abort = new AbortController();
    let active = true;
    const timer = setTimeout(() => {
      request<{
        items: { id: string; name: string }[];
        next_cursor: string | null;
      }>({
        url: '/v1/notification-project-cards',
        params: { q: projectSearch, cursor: projectCursor },
        signal: abort.signal,
      })
        .then((r) => {
          if (active) {
            setNextProjectCursor(r.data.next_cursor);
            const options = r.data.items.map((p) => ({
              value: p.id,
              label: p.name,
            }));
            setProjectOptions((old) =>
              projectCursor ? [...old, ...options] : options,
            );
          }
        })
        .catch((e) => {
          if (active) setError(errorText(e));
        });
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
      abort.abort();
    };
  }, [projectDialog, projectSearch, projectCursor]);
  const inspect = async (draft: boolean) => {
    setBusy(true);
    setError('');
    try {
      const payload = { ...data, draft };
      const r = await api.preview(payload, admin);
      setPreview({ result: r.data, data: payload, key: api.operationKey() });
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  const roleSelect = (
    field: 'base_roles' | 'worker_qualifications' | 'tags' | 'site_roles',
    options: string[],
  ) => (
    <Select
      mode="multiple"
      style={{ width: '100%' }}
      aria-label={t(field)}
      placeholder={t(field)}
      value={data.audience[field]}
      onChange={(value) =>
        update({ audience: { ...data.audience, [field]: value } })
      }
      options={options.map((value) => ({ value, label: t(value) }))}
    />
  );
  return (
    <>
      <Button onClick={() => history.push(base)}>{t('back')}</Button>
      <Typography.Title level={4}>
        {t(admin ? 'sendSystem' : 'send')}
      </Typography.Title>
      <Alert
        type="info"
        message={t('moderationHint')}
        style={{ marginBottom: 16 }}
      />
      {error && <Alert type="error" message={error} showIcon />}
      <Form layout="vertical" onFinish={() => void inspect(false)}>
        <Form.Item label={t('subject')} required>
          <Input
            aria-label={t('subject')}
            maxLength={200}
            value={data.title}
            onChange={(e) => update({ title: e.target.value })}
          />
        </Form.Item>
        <Form.Item label={t('body')} required>
          <Space wrap style={{ marginBottom: 8 }}>
            {['b', 'i', 'u', 's', 'quote', 'list', 'url'].map((tag) => (
              <Button
                key={tag}
                size="small"
                onClick={() =>
                  update({
                    body:
                      data.body +
                      (tag === 'list'
                        ? '\n[list]\n[*]...\n[/list]'
                        : tag === 'url'
                          ? '[url=https://example.com]...[/url]'
                          : `[${tag}]...[/${tag}]`),
                  })
                }
              >
                {tag}
              </Button>
            ))}
            <Button size="small" onClick={() => setProjectDialog(true)}>
              {t('insertProject')}
            </Button>
          </Space>
          <Input.TextArea
            aria-label={t('body')}
            rows={9}
            maxLength={10000}
            showCount
            value={data.body}
            onChange={(e) => update({ body: e.target.value })}
          />
        </Form.Item>
        <Form.Item label={t('recipients')} required>
          <Select
            style={{ width: '100%' }}
            value={data.audience.mode}
            onChange={(mode) =>
              update({
                audience: mode === 'manual' ? { mode, user_ids: [] } : { mode },
              })
            }
            options={['manual', 'condition', 'all'].map((value) => ({
              value,
              label: t(value),
            }))}
          />
        </Form.Item>
        {data.audience.mode === 'manual' && (
          <Form.Item>
            <Select
              mode="multiple"
              showSearch
              filterOption={false}
              value={data.audience.user_ids}
              style={{ width: '100%' }}
              aria-label={t('searchUsers')}
              placeholder={t('searchUsers')}
              onSearch={(value) => {
                setUserSearch(value);
                setUserCursor(undefined);
              }}
              dropdownRender={(menu) => (
                <>
                  {menu}
                  {nextUserCursor && (
                    <Button
                      block
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => setUserCursor(nextUserCursor)}
                    >
                      {t('loadMore')}
                    </Button>
                  )}
                </>
              )}
              onChange={(user_ids) =>
                update({ audience: { mode: 'manual', user_ids } })
              }
              options={userOptions}
            />
          </Form.Item>
        )}
        {data.audience.mode === 'all' && (
          <Alert
            message={t('allWarning')}
            type="warning"
            style={{ marginBottom: 16 }}
          />
        )}
        {data.audience.mode === 'condition' && (
          <Space
            direction="vertical"
            style={{ width: '100%', marginBottom: 16 }}
          >
            {category === 'system' ? (
              <>
                {roleSelect('site_roles', ['admin', 'member'])}
                <Select
                  mode="tags"
                  tokenSeparators={[',', ' ']}
                  style={{ width: '100%' }}
                  placeholder={t('teamIds')}
                  value={data.audience.team_ids}
                  onChange={(team_ids) =>
                    update({
                      audience: { ...data.audience, team_ids, project_ids: [] },
                    })
                  }
                />
                <Select
                  mode="tags"
                  tokenSeparators={[',', ' ']}
                  style={{ width: '100%' }}
                  placeholder={t('projectIds')}
                  value={data.audience.project_ids}
                  onChange={(project_ids) =>
                    update({
                      audience: { ...data.audience, project_ids, team_ids: [] },
                    })
                  }
                />
              </>
            ) : (
              <>
                {roleSelect('base_roles', ['creator', 'admin', 'member'])}
                {roleSelect(
                  category === 'team' ? 'worker_qualifications' : 'tags',
                  roles,
                )}
              </>
            )}
          </Space>
        )}
        <Form.Item>
          <Checkbox
            checked={data.email}
            onChange={(e) => update({ email: e.target.checked })}
          >
            {t('sendEmail')}
          </Checkbox>
          <p>{t('emailHint')}</p>
        </Form.Item>
        <Form.Item label={t('schedule')}>
          <Input
            type="datetime-local"
            onChange={(e) =>
              update({
                publish_at: e.target.value
                  ? new Date(e.target.value).toISOString()
                  : null,
              })
            }
          />
          <small>
            {data.publish_at
              ? new Date(data.publish_at).toLocaleString()
              : t('immediate')}
          </small>
        </Form.Item>
        <Form.Item label={t('expires')}>
          <Input
            type="datetime-local"
            onChange={(e) =>
              update({
                expires_at: e.target.value
                  ? new Date(e.target.value).toISOString()
                  : null,
              })
            }
          />
        </Form.Item>
        <Space wrap>
          <Button type="primary" htmlType="submit" loading={busy}>
            {t('preview')}
          </Button>
          <Button loading={busy} onClick={() => void inspect(true)}>
            {t('saveDraft')}
          </Button>
        </Space>
      </Form>
      <Modal
        visible={!!preview}
        title={t(preview?.data.draft ? 'saveDraft' : 'confirmSend')}
        width={760}
        style={{ maxWidth: 'calc(100vw - 24px)' }}
        confirmLoading={busy}
        okButtonProps={{ disabled: !preview?.result.count }}
        onCancel={() => !busy && setPreview(undefined)}
        onOk={async () => {
          if (!preview) return;
          setBusy(true);
          setError('');
          try {
            const r = initial
              ? await api.edit(initial.id, preview.data, initial.version)
              : await api.publish(preview.data, admin, preview.key);
            setPreview(undefined);
            refreshNotifications();
            history.push(`${base}/${r.data.id}`);
          } catch (e) {
            setError(errorText(e));
          } finally {
            setBusy(false);
          }
        }}
      >
        {error && <Alert type="error" message={error} showIcon />}
        {preview && (
          <>
            <Typography.Title level={4}>{preview.data.title}</Typography.Title>
            <NotificationContent nodes={preview.result.nodes} />
            <p>
              {t('recipientCount')}: {preview.result.count} · {t('emailCount')}:{' '}
              {preview.result.email_count}
            </p>
            <Space wrap>
              {Object.entries(preview.result.email_summary).map(
                ([state, count]) => (
                  <Tag key={state}>
                    {t(state)}: {count}
                  </Tag>
                ),
              )}
            </Space>
            <p>{preview.result.users.map((u) => u.name).join('、')}</p>
            <Alert type="warning" message={t('previewHint')} />
          </>
        )}
      </Modal>
      <Modal
        visible={projectDialog}
        title={t('insertProject')}
        footer={null}
        onCancel={() => setProjectDialog(false)}
      >
        <Select
          showSearch
          filterOption={false}
          style={{ width: '100%' }}
          placeholder={t('searchProjects')}
          onSearch={(value) => {
            setProjectSearch(value);
            setProjectCursor(undefined);
          }}
          dropdownRender={(menu) => (
            <>
              {menu}
              {nextProjectCursor && (
                <Button
                  block
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setProjectCursor(nextProjectCursor)}
                >
                  {t('loadMore')}
                </Button>
              )}
            </>
          )}
          options={projectOptions}
          onChange={(value) => {
            update({ body: data.body + `\n[project]${value}[/project]\n` });
            setProjectDialog(false);
          }}
        />
      </Modal>
    </>
  );
}

function TeamPolicy({ id }: { id: string }) {
  const t = useText();
  const [policy, setPolicy] = useState<{
    team_admin: boolean;
    project_admin: boolean;
    version: number;
  }>();
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    api
      .policy(id)
      .then((r) => {
        if (active) setPolicy(r.data);
      })
      .catch((e) => {
        if (active) setError(errorText(e));
      });
    return () => {
      active = false;
    };
  }, [id]);
  return (
    <section style={{ marginTop: 28 }}>
      <Typography.Title level={4}>{t('policy')}</Typography.Title>
      {error && <Alert type="error" message={error} />}
      {policy && (
        <>
          <p>
            <Checkbox
              checked={policy.team_admin}
              onChange={(e) =>
                setPolicy({ ...policy, team_admin: e.target.checked })
              }
            >
              {t('allowTeamAdmin')}
            </Checkbox>
          </p>
          <p>
            <Checkbox
              checked={policy.project_admin}
              onChange={(e) =>
                setPolicy({ ...policy, project_admin: e.target.checked })
              }
            >
              {t('allowProjectAdmin')}
            </Checkbox>
          </p>
          <Button
            onClick={async () => {
              try {
                await api.savePolicy(id, policy);
                setPolicy((await api.policy(id)).data);
                setError('');
              } catch (e) {
                setError(errorText(e));
              }
            }}
          >
            {t('save')}
          </Button>
        </>
      )}
    </section>
  );
}

export function NotificationEntry({
  category,
  scopeId,
  to,
}: {
  category: 'team' | 'project';
  scopeId: string;
  to: string;
}) {
  const t = useText();
  const userId = useSelector((s: AppState) => s.user.id);
  const [allowed, setAllowed] = useState(false);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setAllowed(false);
    api
      .capabilities(category, scopeId, controller.signal)
      .then((r) => {
        if (active) setAllowed(r.data.enabled && r.data.can_view_sent);
      })
      .catch(() => {});
    return () => {
      active = false;
      controller.abort();
    };
  }, [category, scopeId, userId]);
  return allowed ? (
    <Link to={to}>
      <Button>{t('scopeManagement')}</Button>
    </Link>
  ) : null;
}
