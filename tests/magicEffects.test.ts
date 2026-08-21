/** @vitest-environment node */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { applyPotionEffect, MagicEffectCallbacks } from '../utils/MagicEffects';
import { getGiftPreferenceReveal } from '../utils/actionHandlers';
import { createStaticNPC } from '../utils/npcs/createNPC';
import { farmManager } from '../utils/farmManager';
import { FarmPlotState, FarmPlot } from '../types';

/**
 * potion_revealing (the Revealing Tonic) used to always report success:false and
 * never consume itself — it just showed a toast telling the player to talk to an
 * NPC, with no actual reveal mechanism wired up anywhere. It is a real, brewable
 * recipe, so drinking it did nothing useful. It now behaves like the other
 * duration-based buff potions (Beast Tongue, Beastward): it sets an active potion
 * effect and reports success so the potion is actually consumed.
 */

function makeCallbacks(overrides: Partial<MagicEffectCallbacks> = {}): MagicEffectCallbacks {
  return {
    setWeather: vi.fn(),
    refreshTime: vi.fn(),
    setPlayerScale: vi.fn(),
    getPlayerScale: () => 1,
    setPlayerSizeTier: vi.fn(),
    getPlayerSizeTier: () => 0 as never,
    teleportPlayer: vi.fn(),
    openCharacterCreator: vi.fn(),
    showToast: vi.fn(),
    refreshFarmPlots: vi.fn(),
    getCurrentMapId: () => 'village',
    getPlayerPosition: () => ({ x: 0, y: 0 }),
    ...overrides,
  };
}

describe('potion_revealing (Revealing Tonic)', () => {
  it('succeeds and activates the reveal_gift_preference effect instead of no-op-ing', () => {
    const setActivePotionEffect = vi.fn();
    const callbacks = makeCallbacks({ setActivePotionEffect });

    const result = applyPotionEffect('potion_revealing', callbacks);

    expect(result.success).toBe(true);
    expect(result.effectType).toBe('reveal_gift_preference');
    expect(setActivePotionEffect).toHaveBeenCalledWith(
      'reveal_gift_preference',
      expect.any(Number)
    );
  });
});

describe('potion_root_revival', () => {
  beforeEach(() => {
    farmManager.loadPlots([]);
  });

  /**
   * Used to call farmManager.waterPlot() for both WILTING and DEAD plots and count
   * every one as revived regardless of outcome. waterPlot() explicitly refuses DEAD
   * plots and no-ops, so the toast lied — DEAD plots stayed dead. Now it uses
   * reviveCrop() (which does handle DEAD) and only counts actual successes.
   */
  it('actually revives dead crops, not just wilting ones', () => {
    farmManager.loadPlots([
      {
        mapId: 'village',
        position: { x: 1, y: 1 },
        state: FarmPlotState.DEAD,
        cropType: 'radish',
        plantedAtDay: 1,
        plantedAtHour: 8,
        lastWateredDay: 1,
        lastWateredHour: 8,
        stateChangedAtDay: 2,
        stateChangedAtHour: 8,
        plantedAtTimestamp: Date.now() - 100_000,
        lastWateredTimestamp: Date.now() - 100_000,
        stateChangedAtTimestamp: Date.now() - 50_000,
        quality: 'normal',
        fertiliserApplied: false,
      },
    ]);

    const callbacks = makeCallbacks({ getCurrentMapId: () => 'village' });
    const result = applyPotionEffect('potion_root_revival', callbacks);

    expect(result.message).toBe('Revived 1 crops');
    const revived = farmManager.getPlot('village', { x: 1, y: 1 });
    expect(revived?.state).toBe(FarmPlotState.WATERED);
    expect(revived?.cropType).toBe('radish');
  });

  it('reports 0 revived when there is nothing to revive', () => {
    const callbacks = makeCallbacks({ getCurrentMapId: () => 'village' });
    const result = applyPotionEffect('potion_root_revival', callbacks);

    expect(result.message).toBe('Revived 0 crops');
  });
});

describe('potion_harvest_moon', () => {
  beforeEach(() => {
    farmManager.loadPlots([]);
  });

  const growingPlot = (mapId: string, x: number, y: number): FarmPlot => ({
    mapId,
    position: { x, y },
    state: FarmPlotState.PLANTED,
    cropType: 'radish',
    plantedAtDay: 1,
    plantedAtHour: 8,
    lastWateredDay: 1,
    lastWateredHour: 8,
    stateChangedAtDay: 1,
    stateChangedAtHour: 8,
    plantedAtTimestamp: Date.now(),
    lastWateredTimestamp: Date.now(),
    stateChangedAtTimestamp: Date.now(),
    quality: 'normal',
    fertiliserApplied: false,
  });

  /**
   * Used to call farmManager.debugAdvanceTime() with no map scope, which rewinds
   * every plot on every map — not just the current one. Drinking this in one field
   * silently fast-forwarded crops on other maps (e.g. the shared village farm) past
   * their watering window too.
   */
  it('only matures crops on the current map, leaving other maps untouched', () => {
    farmManager.loadPlots([growingPlot('personal_garden', 1, 1), growingPlot('village', 2, 2)]);

    const callbacks = makeCallbacks({ getCurrentMapId: () => 'personal_garden' });
    const result = applyPotionEffect('potion_harvest_moon', callbacks);

    expect(result.message).toBe('Grew 1 crops');
    // A single calculatePlotState pass lands on WILTING before READY (the water-check
    // runs first) — the live 2s game-loop tick carries it the rest of the way to READY
    // in real play. What matters here is that time moved for this plot at all...
    expect(farmManager.getPlot('personal_garden', { x: 1, y: 1 })?.state).not.toBe(
      FarmPlotState.PLANTED
    );
    // ...and did not move at all for the other map's plot.
    expect(farmManager.getPlot('village', { x: 2, y: 2 })?.state).toBe(FarmPlotState.PLANTED);
  });
});

describe('getGiftPreferenceReveal', () => {
  const npcWithPreference = createStaticNPC({
    id: 'test_shopkeeper',
    name: 'Test Shopkeeper',
    position: { x: 0, y: 0 },
    sprite: 'sprite.png',
    dialogue: [],
    friendshipConfig: { canBefriend: true, startingPoints: 0, likedFoodTypes: ['savoury'] },
  });

  const npcWithoutPreference = createStaticNPC({
    id: 'test_stranger',
    name: 'Test Stranger',
    position: { x: 0, y: 0 },
    sprite: 'sprite.png',
    dialogue: [],
  });

  it("reveals a friendly, human-readable label for the NPC's liked food type", () => {
    expect(getGiftPreferenceReveal(npcWithPreference)).toBe(
      'Test Shopkeeper would love a gift of savoury foods!'
    );
  });

  it('returns null for an NPC with no known gift preference', () => {
    expect(getGiftPreferenceReveal(npcWithoutPreference)).toBeNull();
  });

  it('returns null for a null NPC (e.g. NPC not found)', () => {
    expect(getGiftPreferenceReveal(null)).toBeNull();
  });
});
