import {
  NotificationSync,
  NotificationSyncData,
  SyncReply,
} from './notificationSync';

const data = (revision = 'v1'): NotificationSyncData => ({
  enabled: true,
  revision,
  capabilities: {
    enabled: true,
    can_send: false,
    can_manage: false,
    can_manage_policy: false,
    can_view_sent: false,
  },
  counts: { total: 2 },
  page: { items: [], next_cursor: null },
});
const flush = async (ms: number) => {
  await jest.advanceTimersByTimeAsync(ms);
};
let client: NotificationSync;
beforeEach(() => jest.useFakeTimers());
afterEach(() => {
  client?.dispose();
  jest.useRealTimers();
});

test('badge and active list coalesce into one request; unchanged poll emits nothing', async () => {
  const fetcher = jest
    .fn<Promise<SyncReply>, [Record<string, unknown>, AbortSignal]>()
    .mockResolvedValueOnce(data())
    .mockResolvedValue({ unchanged: true, revision: 'v1' });
  client = new NotificationSync(fetcher);
  const badge = jest.fn(),
    page = jest.fn();
  client.subscribe(badge);
  client.subscribe(page);
  client.setView(Symbol('list'), { view: 'inbox', limit: 20 });
  await flush(50);
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(fetcher.mock.calls[0][0]).toMatchObject({ view: 'inbox' });
  const before = page.mock.calls.length;
  await flush(20000);
  expect(fetcher).toHaveBeenCalledTimes(2);
  expect(fetcher.mock.calls[1][0].revision).toBe('v1');
  expect(page).toHaveBeenCalledTimes(before);
});

test('rapid focus and visibility signals do not duplicate an in-flight request', async () => {
  let finish!: (reply: SyncReply) => void;
  const fetcher = jest.fn<
    Promise<SyncReply>,
    [Record<string, unknown>, AbortSignal]
  >(
    () =>
      new Promise<SyncReply>((r) => {
        finish = r;
      }),
  );
  client = new NotificationSync(fetcher);
  client.subscribe(() => {});
  await flush(50);
  await flush(6000);
  client.focus();
  client.focus();
  await flush(100);
  expect(fetcher).toHaveBeenCalledTimes(1);
  finish(data());
  await flush(0);
  client.focus();
  client.focus();
  await flush(100);
  expect(fetcher).toHaveBeenCalledTimes(2);
});

test('hidden page pauses network and account disposal aborts the old response', async () => {
  let visible = false;
  let finish!: (reply: SyncReply) => void;
  const fetcher = jest.fn<
    Promise<SyncReply>,
    [Record<string, unknown>, AbortSignal]
  >(
    () =>
      new Promise<SyncReply>((r) => {
        finish = r;
      }),
  );
  client = new NotificationSync(fetcher, () => visible);
  const change = jest.fn();
  client.subscribe(change);
  await flush(50);
  expect(fetcher).not.toHaveBeenCalled();
  visible = true;
  client.focus();
  await flush(100);
  const signal = fetcher.mock.calls[0][1];
  client.dispose();
  finish(data());
  await flush(0);
  expect(signal.aborted).toBe(true);
  expect(change).not.toHaveBeenCalled();
});

test('filter switch rejects stale reply and keeps badge totals while loading the new view', async () => {
  let finish!: (reply: SyncReply) => void;
  const fetcher = jest
    .fn<Promise<SyncReply>, [Record<string, unknown>, AbortSignal]>()
    .mockResolvedValueOnce(data())
    .mockImplementationOnce(
      () =>
        new Promise((r) => {
          finish = r;
        }),
    )
    .mockResolvedValue(data('v3'));
  client = new NotificationSync(fetcher);
  client.subscribe(() => {});
  const view = Symbol();
  client.setView(view, { view: 'admin' });
  await flush(50);
  client.refresh();
  await flush(100);
  client.setView(view, { view: 'admin', q: '中文' });
  expect(client.snapshot.data?.counts.total).toBe(2);
  expect(client.snapshot.data?.page).toBeUndefined();
  finish(data('stale'));
  await flush(50);
  expect(client.snapshot.data?.revision).toBe('v3');
});

test('failures back off and mutations during a request schedule just one followup', async () => {
  let finish!: (reply: SyncReply) => void;
  const fetcher = jest
    .fn<Promise<SyncReply>, [Record<string, unknown>, AbortSignal]>()
    .mockRejectedValueOnce(new Error('offline'))
    .mockImplementationOnce(
      () =>
        new Promise((r) => {
          finish = r;
        }),
    )
    .mockResolvedValue(data());
  client = new NotificationSync(fetcher);
  client.subscribe(() => {});
  client.setView(Symbol(), { view: 'inbox' });
  await flush(50);
  await flush(39999);
  expect(fetcher).toHaveBeenCalledTimes(1);
  await flush(1);
  expect(fetcher).toHaveBeenCalledTimes(2);
  client.refresh();
  client.refresh();
  finish(data());
  await flush(100);
  expect(fetcher).toHaveBeenCalledTimes(3);
});
