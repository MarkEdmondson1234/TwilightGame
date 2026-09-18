/** @vitest-environment node */
import { beforeEach, describe, expect, it, vi } from 'vitest';
const mock = vi.hoisted(() => ({
  uid: 'skier-1' as string | null,
  score: -1,
  write: vi.fn(),
  fail: false,
}));
vi.mock('../firebase/config', () => ({
  getFirebaseDb: () => ({}),
  isFirebaseInitialized: () => true,
}));
vi.mock('../firebase/authService', () => ({
  authService: {
    getUserId: () => mock.uid,
    isAuthenticated: () => !!mock.uid,
    getUser: () => ({ displayName: 'Skier' }),
  },
}));
vi.mock('firebase/firestore', () => ({
  doc: (_db: unknown, path: string, uid: string) => `${path}/${uid}`,
  collection: vi.fn(),
  query: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  onSnapshot: vi.fn(),
  serverTimestamp: () => 'server-time',
  runTransaction: async (_db: unknown, fn: (t: unknown) => Promise<void>) => {
    if (mock.fail) throw new Error('offline');
    await fn({
      get: async () => ({ exists: () => mock.score >= 0, data: () => ({ score: mock.score }) }),
      set: mock.write,
    });
  },
}));
import { skiingScoreService } from '../firebase/skiingScoreService';

describe('skiing score transport', () => {
  beforeEach(() => {
    mock.uid = 'skier-1';
    mock.score = -1;
    mock.fail = false;
    mock.write.mockClear();
  });
  it('publishes one best on the matching starting-level board', async () => {
    expect(await skiingScoreService.submit(4, { score: 200, distance: 2000, level: 4 })).toBe(true);
    expect(mock.write).toHaveBeenCalledWith(
      'skiingBoards/v2_4/scores/skier-1',
      expect.objectContaining({ score: 200, name: 'Skier', updatedAt: 'server-time' })
    );
  });
  it('does not replace a stronger record with a later weaker run', async () => {
    mock.score = 300;
    await skiingScoreService.submit(1, { score: 200, distance: 2000, level: 1 });
    expect(mock.write).not.toHaveBeenCalled();
  });
  it('leaves offline or signed-out play functional', async () => {
    mock.uid = null;
    expect(await skiingScoreService.submit(1, { score: 20, distance: 200, level: 1 })).toBe(false);
    mock.uid = 'skier-1';
    mock.fail = true;
    expect(await skiingScoreService.submit(1, { score: 20, distance: 200, level: 1 })).toBe(false);
  });
});
