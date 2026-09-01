/**
 * @vitest-environment node
 *
 * What counts as losing a race for a ripe crop.
 *
 * Ripening is derived on every client from `plantedAtTimestamp` and is
 * deliberately never flushed, so the stored document for a crop that matured
 * since its last sync still reads WATERED while every player sees it standing
 * ripe. An earlier version compared the stored state against the harvested
 * state and so declared a lost race on *every* ordinary harvest — including in
 * single player, where there is nobody to lose to. The claim settles the
 * planting instead: same crop, same sowing, not already picked.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FarmPlotState, type FarmPlot } from '../../types';

const { runTransaction, transactionSet, transactionDelete } = vi.hoisted(() => ({
  runTransaction: vi.fn(),
  transactionSet: vi.fn(),
  transactionDelete: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(() => ({})),
  setDoc: vi.fn(),
  deleteDoc: vi.fn(),
  collection: vi.fn(),
  onSnapshot: vi.fn(),
  runTransaction,
  serverTimestamp: vi.fn(() => ({ _serverTimestamp: true })),
  Timestamp: class {},
}));

vi.mock('../../firebase/config', () => ({
  getFirebaseDb: vi.fn(() => ({})),
  isFirebaseInitialized: vi.fn(() => true),
}));

vi.mock('../../firebase/authService', () => ({
  authService: {
    isAuthenticated: () => true,
    getUser: () => ({ displayName: 'Someone Else', email: null }),
    getUserId: () => 'uid-1',
  },
}));

import { communityGardenService } from '../../firebase/communityGardenService';

const PLANTED_AT = 1_700_000_000_000;

/** Run the claim against a given stored document (or `null` for no document). */
async function claimAgainst(
  remote: Record<string, unknown> | null,
  expected: { cropType: string | null; plantedAtTimestamp: number | null; knownRemote: boolean },
  result: FarmPlot = harvestedPlot()
): Promise<boolean> {
  runTransaction.mockImplementation(async (_db: unknown, fn: (t: unknown) => Promise<boolean>) =>
    fn({
      get: async () => ({ exists: () => remote !== null, data: () => remote }),
      set: transactionSet,
      delete: transactionDelete,
    })
  );
  return communityGardenService.claimPlot('village:3:4', expected, result);
}

/** The stored document for a salad that was watered and has since ripened. */
function wateredDoc() {
  return {
    mapId: 'village',
    x: 3,
    y: 4,
    state: FarmPlotState.WATERED,
    cropType: 'salad',
    plantedAtTimestamp: PLANTED_AT,
    lastWateredTimestamp: PLANTED_AT + 1000,
    stateChangedAtTimestamp: PLANTED_AT + 1000,
    quality: 'normal',
    fertiliserApplied: false,
  };
}

/** What an annual crop's plot looks like after we picked it. */
function harvestedPlot(): FarmPlot {
  return {
    mapId: 'village',
    position: { x: 3, y: 4 },
    state: FarmPlotState.FALLOW,
    cropType: null,
    plantedAtDay: null,
    plantedAtHour: null,
    lastWateredDay: null,
    lastWateredHour: null,
    stateChangedAtDay: 1,
    stateChangedAtHour: 12,
    plantedAtTimestamp: null,
    lastWateredTimestamp: null,
    stateChangedAtTimestamp: Date.now(),
    quality: 'normal',
    fertiliserApplied: false,
  };
}

const ours = { cropType: 'salad', plantedAtTimestamp: PLANTED_AT, knownRemote: true };

describe('shared farm — settling a harvest claim', () => {
  beforeEach(() => {
    runTransaction.mockReset();
    transactionSet.mockReset();
    transactionDelete.mockReset();
  });

  it('wins when the crop merely ripened since its last sync', async () => {
    // The regression: stored state WATERED, harvested state FALLOW, same planting.
    expect(await claimAgainst(wateredDoc(), ours)).toBe(true);
    expect(transactionDelete).toHaveBeenCalled();
  });

  it('wins when the stored state already says READY', async () => {
    expect(await claimAgainst({ ...wateredDoc(), state: FarmPlotState.READY }, ours)).toBe(true);
  });

  it('wins on a crop that ripened while wilting', async () => {
    expect(await claimAgainst({ ...wateredDoc(), state: FarmPlotState.WILTING }, ours)).toBe(true);
  });

  it('loses when the same plant has already been picked into cooldown', async () => {
    // Herbs stay in place after a harvest, so the document keeps the planting.
    expect(await claimAgainst({ ...wateredDoc(), state: FarmPlotState.HERB_COOLDOWN }, ours)).toBe(
      false
    );
  });

  it('loses when the plot now holds a different crop', async () => {
    expect(await claimAgainst({ ...wateredDoc(), cropType: 'carrot' }, ours)).toBe(false);
  });

  it('loses when the plot holds a later sowing of the same crop', async () => {
    expect(
      await claimAgainst({ ...wateredDoc(), plantedAtTimestamp: PLANTED_AT + 60_000 }, ours)
    ).toBe(false);
  });

  it('loses when a plot we were watching has been deleted', async () => {
    // Harvesting an annual deletes the document — somebody got there first.
    expect(await claimAgainst(null, ours)).toBe(false);
  });

  it('wins when the plot was never synced, so a loss cannot be proven', async () => {
    expect(await claimAgainst(null, { ...ours, knownRemote: false })).toBe(true);
  });

  it('wins when the transaction fails — an unproven loss is not a loss', async () => {
    runTransaction.mockRejectedValue(new Error('offline'));
    expect(await communityGardenService.claimPlot('village:3:4', ours, harvestedPlot())).toBe(true);
  });

  it('writes the harvested plot back when it is not cleared to fallow', async () => {
    const herbCooldown: FarmPlot = {
      ...harvestedPlot(),
      state: FarmPlotState.HERB_COOLDOWN,
      cropType: 'mint',
      plantedAtTimestamp: PLANTED_AT,
    };
    const stored = { ...wateredDoc(), cropType: 'mint', state: FarmPlotState.READY };

    expect(await claimAgainst(stored, { ...ours, cropType: 'mint' }, herbCooldown)).toBe(true);
    expect(transactionSet).toHaveBeenCalled();
    expect(transactionDelete).not.toHaveBeenCalled();
  });
});
