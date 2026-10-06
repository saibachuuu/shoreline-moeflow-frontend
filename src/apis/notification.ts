import { request } from '.';
import { v4 as uuid } from 'uuid';

export type NotificationCategory = 'system' | 'team' | 'project' | 'personal';
export interface NoticeNode {
  type: string;
  text?: string;
  children?: NoticeNode[];
  url?: string;
  project_id?: string;
  name?: string;
}
export interface Audience {
  mode: 'all' | 'condition' | 'manual';
  user_ids?: string[];
  base_roles?: string[];
  worker_qualifications?: string[];
  tags?: string[];
  site_roles?: string[];
  team_ids?: string[];
  project_ids?: string[];
}
export interface NoticeInput {
  category: NotificationCategory;
  scope_id?: string;
  title: string;
  body: string;
  audience: Audience;
  email: boolean;
  publish_at?: string | null;
  expires_at?: string | null;
  draft?: boolean;
}
export interface Notice {
  id: string;
  category: NotificationCategory;
  source: string;
  event_type: string;
  actor_id: string;
  actor_name: string;
  team_id?: string;
  project_id?: string;
  title: string;
  body?: string;
  nodes?: NoticeNode[];
  feedback_text?: string;
  excerpt?: string;
  audience?: Audience;
  email?: boolean;
  state: string;
  version: number;
  created_at: string;
  publish_at: string;
  expires_at?: string;
  revoked_at?: string;
  revoke_reason?: string;
  error?: string;
  read: boolean;
  archived: boolean;
  recipient_count: number;
  deliveries?: Record<string, number>;
  delivery_reasons?: Record<string, number>;
}
export interface Page<T> {
  items: T[];
  next_cursor: string | null;
}
export interface Capabilities {
  enabled: boolean;
  can_send: boolean;
  can_view_sent: boolean;
  can_manage: boolean;
  can_manage_policy: boolean;
}
export interface Preview {
  count: number;
  email_count: number;
  email_summary: Record<string, number>;
  users: { id: string; name: string }[];
  nodes: NoticeNode[];
}
export const notificationApi = {
  capabilities: (category?: string, scopeId?: string, signal?: AbortSignal) =>
    request<Capabilities>({
      url: '/v1/me/notification-capabilities',
      params: { category, scope_id: scopeId },
      signal,
    }),
  counts: (signal?: AbortSignal) =>
    request<Record<string, number>>({
      url: '/v1/me/notifications/unread-counts',
      signal,
    }),
  list: (
    mode: 'inbox' | 'scope' | 'admin',
    params: Record<string, unknown>,
    signal?: AbortSignal,
  ) =>
    request<Page<Notice>>({
      url:
        mode === 'admin'
          ? '/v1/admin/notifications'
          : mode === 'scope'
            ? '/v1/notifications/sent'
            : '/v1/me/notifications',
      params,
      signal,
    }),
  detail: (
    id: string,
    mode: 'inbox' | 'scope' | 'admin',
    signal?: AbortSignal,
  ) =>
    request<Notice>({
      url: `${mode === 'admin' ? '/v1/admin/notifications' : mode === 'scope' ? '/v1/notifications' : '/v1/me/notifications'}/${id}`,
      signal,
    }),
  candidates: (
    category: string,
    scopeId: string | undefined,
    q: string,
    admin: boolean,
    signal?: AbortSignal,
    cursor?: string,
  ) =>
    request<Page<{ id: string; name: string }>>({
      url: admin
        ? '/v1/admin/notification-recipients'
        : '/v1/notification-recipients',
      params: { category, scope_id: scopeId, q, limit: 100, cursor },
      signal,
    }),
  preview: (data: NoticeInput, admin: boolean) =>
    request<Preview>({
      method: 'POST',
      url: admin
        ? '/v1/admin/notifications/preview'
        : '/v1/notifications/preview',
      data,
    }),
  publish: (data: NoticeInput, admin: boolean, key: string) =>
    request<Notice>({
      method: 'POST',
      url: admin ? '/v1/admin/notifications' : '/v1/notifications',
      data,
      headers: { 'Idempotency-Key': key },
    }),
  edit: (id: string, data: NoticeInput, version: number) =>
    request<Notice>({
      method: 'PATCH',
      url: `/v1/notifications/${id}`,
      data: { ...data, version },
    }),
  revoke: (notice: Notice, reason: string, admin: boolean, key: string) =>
    request<Notice>({
      method: 'POST',
      url: `${admin ? '/v1/admin/notifications' : '/v1/notifications'}/${notice.id}/revoke`,
      data: { confirmed: true, version: notice.version, reason },
      headers: { 'Idempotency-Key': key },
    }),
  receipt: (id: string, data: { read?: boolean; archived?: boolean }) =>
    request({ method: 'PATCH', url: `/v1/me/notifications/${id}`, data }),
  markRead: (category?: string) =>
    request({
      method: 'POST',
      url: '/v1/me/notifications/mark-read',
      data: { category },
    }),
  preferences: () =>
    request<{
      categories: Record<NotificationCategory, boolean>;
      version: number;
    }>({ url: '/v1/me/notification-preferences' }),
  savePreferences: (categories: Record<string, boolean>, version: number) =>
    request({
      method: 'PUT',
      url: '/v1/me/notification-preferences',
      data: { categories, version },
    }),
  policy: (id: string) =>
    request<{ team_admin: boolean; project_admin: boolean; version: number }>({
      url: `/v1/teams/${id}/notification-policy`,
    }),
  savePolicy: (
    id: string,
    data: { team_admin: boolean; project_admin: boolean; version: number },
  ) =>
    request({
      method: 'PUT',
      url: `/v1/teams/${id}/notification-policy`,
      data,
    }),
  operationKey: () => uuid(),
};
