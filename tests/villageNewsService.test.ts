/** @vitest-environment node */
import { beforeEach, describe, expect, it, vi } from 'vitest';
const mock = vi.hoisted(() => ({
  uid: 'alice' as string | null,
  documents: new Map<string, unknown>(),
  getDocs: vi.fn(),
  set: vi.fn(),
}));
vi.mock('../firebase/config', () => ({
  getFirebaseDb: () => ({}),
  isFirebaseInitialized: () => true,
}));
vi.mock('../firebase/authService', () => ({
  authService: { isAuthenticated: () => !!mock.uid, getUserId: () => mock.uid },
}));
vi.mock('firebase/firestore', () => ({
  doc: (_db: unknown, path: string, id: string) => path + '/' + id,
  collection: vi.fn(),
  collectionGroup: vi.fn(),
  query: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  where: vi.fn(),
  documentId: () => '__name__',
  addDoc: vi.fn(),
  deleteDoc: vi.fn(),
  getDocs: mock.getDocs,
  serverTimestamp: () => 'server-time',
  runTransaction: async (_db: unknown, run: (transaction: unknown) => Promise<void>) =>
    run({
      get: async (key: string) => ({ exists: () => mock.documents.has(key) }),
      set: (key: string, value: unknown) => {
        mock.documents.set(key, value);
        mock.set(key, value);
      },
    }),
}));
import { sharedDataService } from '../firebase/sharedDataService';
beforeEach(() => {
  mock.uid = 'alice';
  mock.documents.clear();
  mock.set.mockClear();
  mock.getDocs.mockReset();
});
describe('village news transport', () => {
  it('deduplicates a milestone across retries but allows another account its own first', async () => {
    expect(await sharedDataService.publishMilestone('cooking')).toBe(true);
    expect(await sharedDataService.publishMilestone('cooking')).toBe(true);
    expect(mock.set).toHaveBeenCalledTimes(1);
    mock.uid = 'bob';
    expect(await sharedDataService.publishMilestone('cooking')).toBe(true);
    expect(mock.set).toHaveBeenCalledTimes(2);
    expect(mock.set.mock.calls[0][1]).toMatchObject({
      timestamp: 'server-time',
      metadata: { milestoneId: 'cooking' },
    });
  });
  it('does not write unknown milestones or signed-out actions', async () => {
    expect(await sharedDataService.publishMilestone('invented')).toBe(false);
    mock.uid = null;
    expect(await sharedDataService.publishMilestone('cooking')).toBe(false);
    expect(mock.set).not.toHaveBeenCalled();
  });
  it('distinguishes unavailable news from a successful empty result', async () => {
    mock.getDocs.mockRejectedValueOnce(new Error('offline'));
    expect(await sharedDataService.getVillageNews()).toEqual({ status: 'unavailable' });
    mock.getDocs.mockResolvedValueOnce({ docs: [], size: 0 });
    expect(await sharedDataService.getVillageNews()).toMatchObject({
      status: 'ready',
      events: [],
      truncated: false,
    });
  });
  it('retains precise cursors and reports a bounded recent feed', async () => {
    const docs = Array.from({ length: 101 }, (_, i) => ({
      id: String(i),
      data: () => ({
        timestamp: { seconds: 42, nanoseconds: i },
        contributorId: 'other',
        eventType: 'discovery',
      }),
    }));
    mock.getDocs.mockResolvedValueOnce({ docs, size: 101 });
    const result = await sharedDataService.getVillageNews();
    expect(result.status).toBe('ready');
    if (result.status === 'ready') {
      expect(result.events).toHaveLength(100);
      expect(result.events[1]).toMatchObject({ id: '1', seconds: 42, nanoseconds: 1 });
      expect(result.truncated).toBe(true);
    }
  });
});
