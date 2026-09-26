import { useCallback, useEffect, useState } from 'react';
import { getZitengCheck, triggerZitengCheck, ZitengCheck } from './api';
import { shouldKeepPolling } from './logic';

/** 轮询间隔：查询通常几百毫秒内完成，1.5s 足够且不打扰 */
const POLL_INTERVAL_MS = 1500;
/** 轮询上限：避免任务卡死时无限轮询 */
const MAX_POLLS = 40;

interface ProjectCheckEntry {
  check: ZitengCheck | null;
  loading: boolean;
  listeners: Set<() => void>;
  polls: number;
  timer: ReturnType<typeof setTimeout> | null;
  fetching: boolean;
}

const cache = new Map<string, ProjectCheckEntry>();

function getOrCreateEntry(projectID: string): ProjectCheckEntry {
  let entry = cache.get(projectID);
  if (!entry) {
    entry = {
      check: null,
      loading: false,
      listeners: new Set(),
      polls: 0,
      timer: null,
      fetching: false,
    };
    cache.set(projectID, entry);
  }
  return entry;
}

function notify(entry: ProjectCheckEntry) {
  entry.listeners.forEach((fn) => {
    try {
      fn();
    } catch {
      // ignore listener error
    }
  });
}

function startPolling(projectID: string, entry: ProjectCheckEntry) {
  if (entry.timer) {
    clearTimeout(entry.timer);
    entry.timer = null;
  }
  entry.polls = 0;

  const tick = async () => {
    try {
      const resp = await getZitengCheck({ projectID });
      entry.check = resp.data?.check ?? null;
      notify(entry);
      if (shouldKeepPolling(entry.check)) {
        entry.polls += 1;
        if (entry.polls < MAX_POLLS && entry.listeners.size > 0) {
          entry.timer = setTimeout(tick, POLL_INTERVAL_MS);
        }
      }
    } catch (e) {
      // 查询接口网络抖动，不提前断定
    }
  };

  tick();
}

/**
 * 共享的紫藤撞车状态 Hook。
 *
 * 保证顶部 Alert 与搜索框下方细行共享同一个轮询和状态，避免重复发请求。
 */
export function useZitengCheck(projectID: string) {
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!projectID) return;
    const entry = getOrCreateEntry(projectID);
    const listener = () => setTick((t) => t + 1);
    entry.listeners.add(listener);

    // 首次有监听者挂载时，启动获取/轮询
    if (entry.listeners.size === 1 && !entry.check && !entry.timer) {
      startPolling(projectID, entry);
    }

    return () => {
      entry.listeners.delete(listener);
      if (entry.listeners.size === 0) {
        if (entry.timer) {
          clearTimeout(entry.timer);
          entry.timer = null;
        }
      }
    };
  }, [projectID]);

  const retry = useCallback(async () => {
    if (!projectID) return;
    const entry = getOrCreateEntry(projectID);
    entry.loading = true;
    notify(entry);
    try {
      const resp = await triggerZitengCheck({ projectID });
      entry.check = resp.data?.check ?? null;
      startPolling(projectID, entry);
    } finally {
      entry.loading = false;
      notify(entry);
    }
  }, [projectID]);

  const entry = getOrCreateEntry(projectID);
  return {
    check: entry.check,
    loading: entry.loading,
    retry,
  };
}
