/** @vitest-environment node */
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { miniGameManager } from '../minigames/MiniGameManager';
import { inventoryManager } from '../utils/inventoryManager';
import { TimeManager, Season } from '../utils/TimeManager';

/**
 * Mini-game requirement gating.
 *
 * `checkRequirements` decides whether the radial menu offers a mini-game at all. If it does
 * not verify the required items, the option appears regardless — the player starts a game
 * they cannot pay for, and `processResult` silently removes nothing at the end. That is what
 * happened to pumpkin carving: its pumpkin requirement used `consumeOn: 'onComplete'`, which
 * the old check skipped entirely, so the requirement was decorative.
 *
 * The rule these tests lock in: you must HOLD every required item to play, whatever
 * `consumeOn` says. `consumeOn` decides only WHEN the item is taken.
 */

const PUMPKIN = 'crop_pumpkin';

/** Pin the clock to autumn so these tests isolate ITEM gating from SEASON gating. */
function setAutumn(): void {
  TimeManager.setTimeOverride({ season: Season.AUTUMN });
  // Fail loudly rather than skipping — a test that quietly does nothing is worse than none.
  expect(TimeManager.getCurrentTime().season).toBe(Season.AUTUMN);
}

describe('Mini-game requirement gating', () => {
  afterAll(() => TimeManager.clearTimeOverride());

  beforeEach(() => {
    while (inventoryManager.hasItem(PUMPKIN, 1)) {
      inventoryManager.removeItem(PUMPKIN, 1);
    }
  });

  it('refuses a mini-game whose required item the player does not hold', () => {
    setAutumn();
    const result = miniGameManager.checkRequirements('pumpkin-carving');
    expect(result.canPlay).toBe(false);
    // `=== false` narrows the discriminated union; `!result.canPlay` does not.
    if (result.canPlay === false) {
      expect(result.reason).toMatch(/Requires 1x/i);
    }
  });

  it('allows it once the player holds the item, even though it is consumed on completion', () => {
    setAutumn();
    inventoryManager.addItem(PUMPKIN, 1);
    expect(miniGameManager.checkRequirements('pumpkin-carving').canPlay).toBe(true);
  });

  it('reports unknown mini-games rather than throwing', () => {
    const result = miniGameManager.checkRequirements('no-such-game');
    expect(result.canPlay).toBe(false);
  });
});

describe('Pumpkin carving is reachable', () => {
  it('is offered by the village child and gated to autumn', async () => {
    const { getMiniGamesForNPC } = await import('../minigames/registry');
    const offered = getMiniGamesForNPC('child').map((g) => g.id);
    expect(offered).toContain('pumpkin-carving');

    const { pumpkinCarvingDefinition } = await import('../minigames/pumpkin-carving/definition');
    expect(pumpkinCarvingDefinition.availability?.seasons).toEqual(['autumn']);
    expect(pumpkinCarvingDefinition.requirements?.[0]?.itemId).toBe(PUMPKIN);
  });
});
