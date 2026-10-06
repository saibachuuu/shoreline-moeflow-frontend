import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from '@/store';
import { request } from '@/apis';
import {
  NotificationSync,
  queryKey,
  SyncQuery,
  SyncReply,
  SyncSnapshot,
} from '@/services/notificationSync';

const changed = 'moeflow-notifications-changed';
export const refreshNotifications = () =>
  window.dispatchEvent(new Event(changed));
const pools = new Map<
  string,
  { client: NotificationSync; references: number; close: () => void }
>();
const empty: SyncSnapshot = { key: '{}' };

/** Badge and active workspace share a single account-scoped request stream. */
export function useNotificationSync(query?: SyncQuery) {
  const userId = useSelector((state: AppState) => state.user.id);
  const token = useSelector((state: AppState) => state.user.token);
  const account = `${userId}:${token}`;
  const key = query === undefined ? undefined : queryKey(query);
  const [value, setValue] = useState<{
    account: string;
    snapshot: SyncSnapshot;
  }>({ account: '', snapshot: empty });
  useEffect(() => {
    if (!userId) return;
    let pool = pools.get(account);
    if (!pool) {
      const client = new NotificationSync(
        async (params, signal) =>
          (
            await request<SyncReply>({
              url: '/v1/me/notification-sync',
              params,
              signal,
            })
          ).data,
        () => document.visibilityState !== 'hidden',
      );
      window.addEventListener('focus', client.focus);
      document.addEventListener('visibilitychange', client.focus);
      window.addEventListener(changed, client.refresh);
      pool = {
        client,
        references: 0,
        close: () => {
          client.dispose();
          window.removeEventListener('focus', client.focus);
          document.removeEventListener('visibilitychange', client.focus);
          window.removeEventListener(changed, client.refresh);
        },
      };
      pools.set(account, pool);
    }
    const shared = pool;
    shared.references++;
    const id = Symbol('notification-view');
    if (key !== undefined) shared.client.setView(id, JSON.parse(key));
    const update = () =>
      setValue({ account, snapshot: shared.client.snapshot });
    const unsubscribe = shared.client.subscribe(update);
    update();
    return () => {
      unsubscribe();
      if (key !== undefined) shared.client.setView(id);
      if (--shared.references === 0) {
        shared.close();
        pools.delete(account);
      }
    };
  }, [account, userId, key]);
  const snapshot = value.account === account ? value.snapshot : empty;
  return key !== undefined && snapshot.key !== key
    ? { key, pending: true }
    : snapshot;
}

export function useNotificationCounts() {
  const { data } = useNotificationSync();
  return { enabled: data?.enabled || false, total: data?.counts.total || 0 };
}
