import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const mock = vi.hoisted(() => ({
  uid: 'reader' as string | null,
  status: 'idle',
  getNews: vi.fn(),
  publish: vi.fn(),
  saved: new Map<string, unknown>(),
  listener: null as null | ((state: { user?: { uid: string } | null; status?: string }) => void),
  syncListener: null as
    | null
    | ((state: { user?: { uid: string } | null; status?: string }) => void),
}));
vi.mock('../firebase/safe', () => ({
  whenFirebaseSettled: async () => true,
  getAuthService: () => ({
    getState: () => ({ user: mock.uid ? { uid: mock.uid } : null }),
    onAuthStateChange: (
      listener: (state: { user?: { uid: string } | null; status?: string }) => void
    ) => {
      mock.listener = listener;
      listener({ user: mock.uid ? { uid: mock.uid } : null });
      return () => {};
    },
  }),
  getSyncManager: () => ({
    getState: () => ({ status: mock.status }),
    onStateChange: (
      listener: (state: { user?: { uid: string } | null; status?: string }) => void
    ) => {
      mock.syncListener = listener;
      listener({ status: mock.status });
      return () => {};
    },
  }),
  getSharedDataService: () => ({ getVillageNews: mock.getNews, publishMilestone: mock.publish }),
}));
vi.mock('../GameState', () => ({
  gameState: {
    startQuest: vi.fn(),
    getQuestData: (_: string, key: string) => mock.saved.get(key),
    setQuestData: (_: string, key: string, value: unknown) => mock.saved.set(key, value),
  },
}));
import { useVillageNews } from '../hooks/useVillageNews';
import { readVillageNews } from '../utils/villageNewsStorage';
import { eventBus, GameEvent } from '../utils/EventBus';
const ready = {
  status: 'ready',
  ownContributorId: 'self',
  truncated: false,
  events: [
    {
      id: 'e1',
      seconds: 20,
      nanoseconds: 5,
      contributorId: 'other',
      eventType: 'achievement',
      metadata: { milestoneId: 'skiing' },
    },
  ],
};
beforeEach(() => {
  mock.uid = 'reader';
  mock.status = 'idle';
  mock.saved.clear();
  mock.getNews.mockReset().mockResolvedValue(ready);
  mock.publish.mockReset().mockResolvedValue(true);
});
describe('returning player news lifecycle', () => {
  it('waits for initial cloud sync before reading or publishing', async () => {
    mock.status = 'syncing';
    const hook = renderHook(() => useVillageNews(true));
    await waitFor(() => expect(hook.result.current.uid).toBe('reader'));
    expect(mock.getNews).not.toHaveBeenCalled();
    act(() => {
      mock.status = 'idle';
      mock.syncListener?.({ status: 'idle' });
    });
    await waitFor(() => expect(hook.result.current.batch?.stories).toHaveLength(1));
  });
  it('leaves failures unread and retries on reconnect', async () => {
    mock.getNews.mockResolvedValueOnce({ status: 'unavailable' });
    const hook = renderHook(() => useVillageNews(true));
    await waitFor(() => expect(hook.result.current.unavailable).toBe(true));
    expect(readVillageNews('reader').cursor).toBeUndefined();
    act(() => window.dispatchEvent(new Event('online')));
    await waitFor(() => expect(hook.result.current.batch?.stories).toHaveLength(1));
    act(() => hook.result.current.markRead());
    expect(readVillageNews('reader').cursor).toEqual({ id: 'e1', seconds: 20, nanoseconds: 5 });
  });
  it('does not replay a deferred batch after a cutscene', async () => {
    const hook = renderHook(({ enabled }) => useVillageNews(enabled), {
      initialProps: { enabled: true },
    });
    await waitFor(() => expect(hook.result.current.batch).not.toBeNull());
    act(() => hook.result.current.dismiss());
    hook.rerender({ enabled: false });
    hook.rerender({ enabled: true });
    expect(hook.result.current.dismissed).toBe(true);
    expect(readVillageNews('reader').cursor).toBeUndefined();
    expect(mock.getNews).toHaveBeenCalledTimes(1);
  });
  it('retains failed milestone writes and retries without dropping other progress', async () => {
    mock.publish.mockResolvedValueOnce(false);
    const hook = renderHook(() => useVillageNews(true));
    await waitFor(() => expect(hook.result.current.batch).not.toBeNull());
    act(() => {
      eventBus.emit(GameEvent.PLAYER_MILESTONE, { milestoneId: 'cooking' });
      window.dispatchEvent(new Event('online'));
    });
    await waitFor(() => expect(mock.publish).toHaveBeenCalledTimes(1));
    expect(readVillageNews('reader').pending).toEqual(['cooking']);
    act(() => window.dispatchEvent(new Event('online')));
    await waitFor(() => expect(readVillageNews('reader').published).toEqual(['cooking']));
    expect(readVillageNews('reader').recent).toHaveLength(1);
  });
  it('discards a slow response after the account changes', async () => {
    let resolve!: (value: unknown) => void;
    mock.getNews.mockReturnValueOnce(
      new Promise((r) => {
        resolve = r;
      })
    );
    const hook = renderHook(() => useVillageNews(true));
    await waitFor(() => expect(mock.getNews).toHaveBeenCalledOnce());
    await act(async () => {
      mock.uid = null;
      mock.listener?.({ user: null });
      resolve(ready);
    });
    expect(hook.result.current.batch).toBeNull();
    expect(mock.saved.size).toBe(0);
  });
});
