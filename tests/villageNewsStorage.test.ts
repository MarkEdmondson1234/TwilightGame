/** @vitest-environment node */
import { beforeEach, describe, expect, it, vi } from 'vitest';
const data = vi.hoisted(() => new Map<string, unknown>());
vi.mock('../GameState', () => ({
  gameState: {
    startQuest: vi.fn(),
    getQuestData: (_: string, key: string) => data.get(key),
    setQuestData: (_: string, key: string, value: unknown) => data.set(key, value),
  },
}));
import { queueMilestone, readVillageNews, updateVillageNews } from '../utils/villageNewsStorage';
beforeEach(() => data.clear());
describe('news persistence', () => {
  it('queues a milestone once, keeps it pending for retries, and isolates accounts', () => {
    queueMilestone('alice', 'cooking');
    queueMilestone('alice', 'cooking');
    expect(readVillageNews('alice').pending).toEqual(['cooking']);
    expect(readVillageNews('bob').pending).toEqual([]);
    updateVillageNews('alice', (state) => ({ ...state, pending: [], published: ['cooking'] }));
    queueMilestone('alice', 'cooking');
    expect(readVillageNews('alice').pending).toEqual([]);
  });
  it('keeps cursor and pending milestones when a batch is stored', () => {
    queueMilestone('alice', 'gardening');
    const cursor = { seconds: 123, nanoseconds: 2, id: 'x' };
    updateVillageNews('alice', (state) => ({ ...state, cursor }));
    updateVillageNews('alice', (state) => ({ ...state, recent: [] }));
    expect(readVillageNews('alice')).toMatchObject({ cursor, pending: ['gardening'] });
  });
  it('ignores unknown milestone IDs', () => {
    queueMilestone('alice', '__proto__');
    queueMilestone('alice', 'not-a-feature');
    expect(data.size).toBe(0);
  });
});
