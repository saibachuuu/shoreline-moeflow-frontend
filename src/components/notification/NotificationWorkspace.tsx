import './notification.css';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Collapse,
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
  Page,
} from '@/apis/notification';
import { request } from '@/apis';
import {
  refreshNotifications,
  useNotificationSync,
} from '@/hooks/useNotificationCounts';
import { ContentTitle } from '@/components/shared/ContentTitle';
import { NavTab } from '@/components/shared/NavTab';
import { Icon } from '@/components/icon';
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
  const token = useSelector((s: AppState) => s.user.token);
  return (
    <Workspace
      key={`${userId}:${token}:${props.admin}:${props.category}:${props.scopeId}`}
      {...props}
    />
  );
}
function Workspace({ admin = false, category, scopeId }: WorkspaceProps) {
  const t = useText();
  const { url } = useRouteMatch();
  const location = useLocation();
  const [filters, setFilters] = useState<Record<string, unknown>>({});
  const [advanced, setAdvanced] = useState(false);
  const mode = admin ? 'admin' : category ? 'scope' : 'inbox';
  const segment = location.pathname
    .slice(url.length)
    .split('/')
    .filter(Boolean);
  const view =
    segment[0] === 'new' ? 'compose' : segment[0] ? `${mode}_detail` : mode;
  const sync = useNotificationSync({
    ...(!segment.length ? filters : {}),
    view,
    category: category || filters.category,
    scope_id: scopeId,
    notification_id:
      segment[0] && segment[0] !== 'new' ? segment[0] : undefined,
    limit: 20,
  });
  const caps = sync.pending ? undefined : sync.data?.capabilities;
  const error = sync.error
    ? errorText(sync.error)
    : sync.data?.view_error?.message;
  return (
    <section className={`NotificationWorkspace NotificationWorkspace--${mode}`}>
      <header className="NotificationWorkspace__heading">
        <div role="heading" aria-level={1}>
          <ContentTitle>
            {t(admin ? 'management' : category ? 'scopeManagement' : 'title')}
          </ContentTitle>
        </div>
        <span className="NotificationWorkspace__subtitle">
          {t(mode === 'inbox' ? 'inboxHint' : 'managementHint')}
        </span>
      </header>
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
          current={sync.data?.notice}
          syncError={error}
          mode={mode}
          base={url}
          editing={segment[1] === 'edit'}
        />
      ) : (
        <>
          <NoticeList
            key={JSON.stringify(filters)}
            page={sync.pending ? undefined : sync.data?.page}
            advanced={advanced}
            setAdvanced={setAdvanced}
            filters={filters}
            setFilters={setFilters}
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
  page,
  filters,
  setFilters,
  advanced,
  setAdvanced,
}: {
  canSend: boolean;
  advanced: boolean;
  setAdvanced: React.Dispatch<React.SetStateAction<boolean>>;
  mode: 'admin' | 'scope' | 'inbox';
  category?: NotificationCategory;
  scopeId?: string;
  base: string;
  page?: Page<Notice>;
  filters: Record<string, unknown>;
  setFilters: React.Dispatch<React.SetStateAction<Record<string, unknown>>>;
}) {
  const t = useText();
  const [items, setItems] = useState<Notice[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState<Page<Notice>>();
  const [prefs, setPrefs] = useState<{
    categories: Record<string, boolean>;
    version: number;
  }>();
  const applied = useRef<Page<Notice>>();
  const controller = useRef<AbortController>();
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    if (!page || page === applied.current) return;
    if (!applied.current) {
      setItems(page.items);
      setCursor(page.next_cursor);
      setLoaded(true);
      applied.current = page;
      return;
    }
    // Count/capability updates do not imply that the list changed.
    if (JSON.stringify(page) === JSON.stringify(applied.current)) return;
    // Reconcile existing visible rows quietly; don't insert new rows or reset scroll/pagination.
    const previousIds = new Set(applied.current.items.map((n) => n.id));
    const fresh = new Map(page.items.map((n) => [n.id, n]));
    const hasNew = page.items.some((n) => !previousIds.has(n.id));
    if (hasNew) setPending(page);
    else setPending(undefined);
    {
      setItems((old) =>
        old
          .filter((n) => !previousIds.has(n.id) || fresh.has(n.id))
          .map((n) => fresh.get(n.id) || n),
      );
      if (!hasNew) applied.current = page;
    }
  }, [page]);
  const applyPending = () => {
    if (!pending) return;
    setItems(pending.items);
    setCursor(pending.next_cursor);
    applied.current = pending;
    setPending(undefined);
  };
  const filter = (name: string, value: unknown) =>
    setFilters((old) => ({ ...old, [name]: value || undefined }));
  const loadMore = async () => {
    if (!cursor || busy) return;
    const abort = new AbortController();
    controller.current = abort;
    setBusy(true);
    setError('');
    try {
      const r = await api.list(
        mode,
        {
          ...filters,
          category: category || filters.category,
          scope_id: scopeId,
          cursor,
          limit: 20,
        },
        abort.signal,
      );
      if (!abort.signal.aborted) {
        setItems((old) => [
          ...old,
          ...r.data.items.filter((n) => !old.some((o) => o.id === n.id)),
        ]);
        setCursor(r.data.next_cursor);
      }
    } catch (e) {
      if (!abort.signal.aborted) setError(errorText(e));
    } finally {
      if (!abort.signal.aborted) setBusy(false);
    }
  };
  return (
    <>
      <div className="NotificationToolbar">
        <Input.Search
          className="NotificationToolbar__search"
          allowClear
          defaultValue={filters.q as string}
          aria-label={t('search')}
          placeholder={t('search')}
          onSearch={(value) => filter('q', value.trim())}
        />
        <div className="NotificationToolbar__actions">
          <Button
            aria-label={t('refresh')}
            title={t('refresh')}
            onClick={() => {
              applyPending();
              refreshNotifications();
            }}
            icon={<Icon icon="sync-alt" />}
          />
          {mode === 'inbox' ? (
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
          ) : (
            canSend && (
              <Link to={`${base}/new`}>
                <Button type="primary" icon={<Icon icon="plus" />}>
                  {t(mode === 'admin' ? 'sendSystem' : 'send')}
                </Button>
              </Link>
            )
          )}
        </div>
      </div>
      <div className="NotificationFilters">
        {!category && (
          <Select
            allowClear
            aria-label={t('category')}
            placeholder={t('category')}
            value={filters.category as string}
            onChange={(v) => filter('category', v)}
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
              allowClear
              aria-label={t('state')}
              placeholder={t('state')}
              value={filters.state as string}
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
              checked={filters.revoked === 'true'}
              onChange={(e) =>
                filter('revoked', e.target.checked ? 'true' : undefined)
              }
            >
              {t('revoked')}
            </Checkbox>
          </>
        )}
        {mode === 'admin' && (
          <Button type="text" onClick={() => setAdvanced(!advanced)}>
            {t('moreFilters')}{' '}
            <Icon icon={advanced ? 'caret-up' : 'caret-down'} />
          </Button>
        )}
        {mode === 'inbox' && (
          <span className="NotificationFilters__links">
            <Link to="/dashboard/user/invitations">{t('invitations')}</Link>
            <Link to="/dashboard/user/related-applications">
              {t('applications')}
            </Link>
          </span>
        )}
      </div>
      {mode === 'admin' && advanced && (
        <div className="NotificationFilters__advanced">
          <label>
            {t('emailStatus')}
            <Select
              allowClear
              value={filters.delivery_state as string}
              onChange={(v) => filter('delivery_state', v)}
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
          </label>
          {['team_id', 'project_id', 'actor_id', 'source', 'event_type'].map(
            (name) => (
              <label key={name}>
                {t(name)}
                <Input
                  defaultValue={filters[name] as string}
                  aria-label={t(name)}
                  onPressEnter={(e) => filter(name, e.currentTarget.value)}
                  onBlur={(e) => {
                    if (e.target.value !== (filters[name] || ''))
                      filter(name, e.target.value);
                  }}
                />
              </label>
            ),
          )}
          {['from', 'to'].map((name) => (
            <label key={name}>
              {t(name)}
              <Input
                type="datetime-local"
                aria-label={t(name)}
                onChange={(e) =>
                  filter(
                    name,
                    e.target.value
                      ? new Date(e.target.value).toISOString()
                      : undefined,
                  )
                }
              />
            </label>
          ))}
          <Checkbox
            checked={filters.expired === 'true'}
            onChange={(e) =>
              filter('expired', e.target.checked ? 'true' : undefined)
            }
          >
            {t('expired')}
          </Checkbox>
        </div>
      )}
      {error && <Alert type="error" message={error} showIcon />}
      {pending && (
        <Button className="NotificationUpdates" block onClick={applyPending}>
          {t('updatesAvailable')}
        </Button>
      )}
      <List
        className="NotificationList"
        loading={!loaded}
        dataSource={items}
        locale={{
          emptyText: (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={t('empty')}
            />
          ),
        }}
        renderItem={(item) => (
          <List.Item
            key={item.id}
            className={
              mode === 'inbox' && !item.read ? 'NotificationList__unread' : ''
            }
          >
            <Link className="NotificationRow" to={`${base}/${item.id}`}>
              <span className="NotificationRow__icon">
                <Icon
                  icon={
                    item.category === 'project'
                      ? 'book'
                      : item.category === 'team'
                        ? 'home'
                        : 'bell'
                  }
                />
              </span>
              <span className="NotificationRow__main">
                <span className="NotificationRow__title">
                  {mode === 'inbox' && !item.read && (
                    <span
                      className="NotificationRow__dot"
                      aria-label={t('unread')}
                    />
                  )}
                  {item.title}
                </span>
                {item.excerpt && (
                  <span className="NotificationRow__excerpt">
                    {item.excerpt}
                  </span>
                )}
                <span className="NotificationRow__meta">
                  <span>{item.actor_name}</span>
                  <span>{t(item.category)}</span>
                  {(mode !== 'inbox' || item.state !== 'published') && (
                    <span>{t(item.revoked_at ? 'revoked' : item.state)}</span>
                  )}
                </span>
              </span>
              <time dateTime={item.created_at}>
                {new Date(item.created_at).toLocaleString()}
              </time>
              <Icon className="NotificationRow__arrow" icon="angle-right" />
            </Link>
          </List.Item>
        )}
      />
      {cursor && (
        <Button
          className="NotificationList__more"
          block
          loading={busy}
          onClick={() => void loadMore()}
        >
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
  current,
  syncError,
  mode,
  base,
  editing,
}: {
  id: string;
  current?: Notice;
  syncError?: string;
  mode: 'admin' | 'scope' | 'inbox';
  base: string;
  editing: boolean;
}) {
  const t = useText();
  const history = useHistory();
  const userId = useSelector((s: AppState) => s.user.id);
  const [note, setNote] = useState<Notice>();
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const operation = useRef(api.operationKey());
  const readRequested = useRef(false);
  useEffect(() => {
    setNote(current);
    if (
      current &&
      mode === 'inbox' &&
      !current.read &&
      !readRequested.current
    ) {
      readRequested.current = true;
      api
        .receipt(id, { read: true })
        .then(refreshNotifications)
        .catch((e) => {
          readRequested.current = false;
          setError(errorText(e));
        });
    }
  }, [current, id, mode]);
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
    <div className="NotificationDetail">
      <Space wrap>
        <Button onClick={() => history.push(base)}>{t('back')}</Button>
        <Button
          onClick={() => {
            setConfirm(false);
            refreshNotifications();
          }}
        >
          {t('refresh')}
        </Button>
      </Space>
      {error && <Alert type="error" message={error} showIcon />}
      {!note ? (
        !error && !syncError && <Spin />
      ) : (
        <>
          <Typography.Title className="NotificationDetail__title" level={4}>
            {note.title}
          </Typography.Title>
          <p className="NotificationDetail__meta">
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
    </div>
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
    <div className="NotificationCompose">
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
        <div className="NotificationCompose__dates">
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
        </div>
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
    </div>
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
    <Collapse ghost className="NotificationPolicy">
      <Collapse.Panel header={t('policy')} key="policy">
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
      </Collapse.Panel>
    </Collapse>
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
  return allowed ? <NavTab to={to}>{t('scopeManagement')}</NavTab> : null;
}
