import type { Capabilities, Notice, Page } from '@/apis/notification';

export interface NotificationSyncData {
  enabled: boolean;
  capabilities: Capabilities;
  counts: { total: number };
  page?: Page<Notice>;
  notice?: Notice;
  view_error?: { status: number; message: string };
  revision: string;
}
export type SyncReply =
  | NotificationSyncData
  | { unchanged: true; revision: string };
export interface SyncSnapshot {
  key: string;
  pending?: boolean;
  data?: NotificationSyncData;
  error?: unknown;
}
export type SyncQuery = Record<string, unknown>;
export const queryKey = (query: SyncQuery) =>
  JSON.stringify(
    Object.fromEntries(
      Object.entries(query)
        .filter(([, v]) => v !== undefined)
        .sort(([a], [b]) => a.localeCompare(b)),
    ),
  );

/** One in-flight request + one timer for an account, irrespective of mounted badges/pages. */
export class NotificationSync {
  snapshot: SyncSnapshot = { key: '{}' };
  private listeners = new Set<() => void>();
  private views = new Map<symbol, SyncQuery>();
  private timer?: ReturnType<typeof setTimeout>;
  private controller?: AbortController;
  private generation = 0;
  private failures = 0;
  private lastStarted = 0;
  private disposed = false;
  private dirty = false;

  constructor(
    private fetcher: (
      query: SyncQuery,
      signal: AbortSignal,
    ) => Promise<SyncReply>,
    private visible: () => boolean = () => true,
  ) {}

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    if (this.listeners.size === 1) this.schedule(50);
    return () => {
      this.listeners.delete(listener);
    };
  }
  setView(id: symbol, query?: SyncQuery) {
    const before = queryKey(this.query());
    if (query) this.views.set(id, query);
    else this.views.delete(id);
    const after = queryKey(this.query());
    if (before === after) return;
    this.generation++;
    this.controller?.abort();
    this.controller = undefined;
    this.snapshot = {
      key: after,
      pending: true,
      data: this.snapshot.data
        ? {
            ...this.snapshot.data,
            page: undefined,
            notice: undefined,
            view_error: undefined,
            revision: '',
          }
        : undefined,
    };
    this.failures = 0;
    this.emit();
    this.schedule(50); // Coalesce badge mount, view mount and filter changes.
  }
  refresh = () => {
    if (this.controller) {
      this.dirty = true;
      return;
    }
    this.schedule(100);
  };
  focus = () => {
    if (
      !this.visible() ||
      this.controller ||
      Date.now() - this.lastStarted < 5000
    )
      return;
    this.schedule(100); // focus + visibilitychange share the same timer.
  };
  dispose() {
    this.disposed = true;
    this.generation++;
    clearTimeout(this.timer);
    this.controller?.abort();
    this.listeners.clear();
    this.views.clear();
  }
  private query() {
    return [...this.views.values()].pop() || {};
  }
  private emit() {
    this.listeners.forEach((listener) => listener());
  }
  private schedule(delay: number) {
    clearTimeout(this.timer);
    if (!this.disposed) this.timer = setTimeout(() => void this.poll(), delay);
  }
  private async poll() {
    if (this.disposed || this.controller) return;
    if (!this.visible()) {
      this.schedule(60000);
      return;
    }
    const generation = this.generation;
    const query = this.query();
    const key = queryKey(query);
    const controller = new AbortController();
    this.controller = controller;
    this.lastStarted = Date.now();
    try {
      const response = await this.fetcher(
        { ...query, revision: this.snapshot.data?.revision },
        controller.signal,
      );
      if (this.disposed || generation !== this.generation) return;
      this.failures = 0;
      if (!('unchanged' in response)) {
        this.snapshot = { key, data: response };
        this.emit();
      } else if (this.snapshot.error) {
        this.snapshot = { key, data: this.snapshot.data };
        this.emit();
      }
    } catch (error) {
      if (
        this.disposed ||
        generation !== this.generation ||
        controller.signal.aborted
      )
        return;
      this.failures = Math.min(4, this.failures + 1);
      // Fail closed on identity/permission failures; keep only transient list state in the UI.
      this.snapshot = { key, error };
      this.emit();
    } finally {
      if (!this.disposed && generation === this.generation) {
        this.controller = undefined;
        const delay = this.dirty
          ? 100
          : (query.view ? 20000 : 60000) * 2 ** this.failures;
        this.dirty = false;
        this.schedule(delay);
      }
    }
  }
}
