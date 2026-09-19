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
import { agilityScoreService } from '../firebase/agilityScoreService';

describe('agility score transport', () => {
  beforeEach(() => {
    mock.uid = 'skier-1';
    mock.score = -1;
    mock.fail = false;
    mock.write.mockClear();
  });
  it('publishes distance-only scores on the separate trial board', async () => {
    expect(await agilityScoreService.submit({ score: 200, distance: 2000, level: 1 })).toBe(true);
    expect(mock.write).toHaveBeenCalledWith(
      'agilityBoards/v1/scores/skier-1',
      expect.objectContaining({ score: 200, name: 'Skier', updatedAt: 'server-time' })
    );
  });
  it('does not replace a stronger record with a later weaker run', async () => {
    mock.score = 300;
    await agilityScoreService.submit({ score: 200, distance: 2000, level: 1 });
    expect(mock.write).not.toHaveBeenCalled();
  });
  it('leaves offline or signed-out play functional', async () => {
    mock.uid = null;
    expect(await agilityScoreService.submit({ score: 20, distance: 200, level: 1 })).toBe(false);
    mock.uid = 'skier-1';
    mock.fail = true;
    expect(await agilityScoreService.submit({ score: 20, distance: 200, level: 1 })).toBe(false);
  });
});

it('rejects scores that do not match the distance or tunnel', async () => {
  expect(await agilityScoreService.submit({ score: 9999, distance: 100, level: 1 })).toBe(false);
  expect(await agilityScoreService.submit({ score: 10, distance: 100, level: 4 })).toBe(false);
});
