import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from '@/store';
import { notificationApi } from '@/apis/notification';

type Snapshot = { enabled: boolean; total: number };
const empty: Snapshot = { enabled: false, total: 0 };
const changed = 'moeflow-notifications-changed';
export const refreshNotifications = () =>
  window.dispatchEvent(new Event(changed));
// Reference-counted polling: desktop/mobile consumers share one request stream per account.
const pools = new Map<
  string,
  {
    snapshot: Snapshot;
    listeners: Set<(value: Snapshot) => void>;
    close: () => void;
  }
>();
export function useNotificationCounts() {
  const userId = useSelector((state: AppState) => state.user.id);
  const [snapshot, setSnapshot] = useState(empty);
  useEffect(() => {
    setSnapshot(empty);
    if (!userId) return;
    let pool = pools.get(userId);
    if (!pool) {
      let alive = true;
      let controller: AbortController | undefined;
      let timer: ReturnType<typeof setTimeout>;
      let failures = 0;
      let inFlight = false;
      const listeners = new Set<(value: Snapshot) => void>();
      const current = { snapshot: empty, listeners, close: () => {} };
      const poll = async () => {
        clearTimeout(timer);
        if (!alive || inFlight) return;
        if (document.visibilityState === 'hidden') {
          timer = setTimeout(poll, 60000);
          return;
        }
        inFlight = true;
        controller = new AbortController();
        try {
          const caps = await notificationApi.capabilities(
            undefined,
            undefined,
            controller.signal,
          );
          const counts = caps.data.enabled
            ? await notificationApi.counts(controller.signal)
            : undefined;
          if (alive) {
            failures = 0;
            current.snapshot = {
              enabled: caps.data.enabled,
              total: counts?.data.total || 0,
            };
            current.listeners.forEach((fn) => fn(current.snapshot));
          }
        } catch {
          failures = Math.min(failures + 1, 4);
        } finally {
          inFlight = false;
          if (alive) timer = setTimeout(poll, 60000 * 2 ** failures);
        }
      };
      current.close = () => {
        alive = false;
        clearTimeout(timer);
        controller?.abort();
        window.removeEventListener('focus', poll);
        window.removeEventListener(changed, poll);
        document.removeEventListener('visibilitychange', poll);
      };
      window.addEventListener('focus', poll);
      window.addEventListener(changed, poll);
      document.addEventListener('visibilitychange', poll);
      pool = current;
      pools.set(userId, pool);
      void poll();
    }
    const subscribed = pool;
    subscribed.listeners.add(setSnapshot);
    setSnapshot(subscribed.snapshot);
    return () => {
      subscribed.listeners.delete(setSnapshot);
      if (!subscribed.listeners.size) {
        subscribed.close();
        pools.delete(userId);
      }
    };
  }, [userId]);
  return snapshot;
}
