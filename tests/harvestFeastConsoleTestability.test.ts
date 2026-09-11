/** @vitest-environment node */
/**
 * Regression guard for console/DevTools testability.
 *
 * Food-consumption pacing used to be anchored to a pure calendar formula
 * (year -> the real-world Date.now() day 42/hour 18 "should" fall on). That
 * broke testing via TimeManager.setTimeOverride() (exposed on window for
 * exactly this kind of console-driven testing, see utils/gameInitializer.ts):
 * the override moves the displayed clock without moving Date.now(), so a
 * developer who jumps straight to hour 18 would see either nothing ever get
 * eaten (if the real calendar hadn't actually reached that formula's moment
 * yet) or everything vanish instantly (if it already had).
 *
 * Anchoring to gameState.harvestFeast.gatherStartedAt — real Date.now() the
 * moment THIS client first observes gathering begin — fixes that: the
 * countdown always starts from whenever the override was actually flipped,
 * which is exactly what makes this testable on the dev server without
 * waiting for the real date.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TimeManager, Season } from '../utils/TimeManager';
import { gameState } from '../GameState';
import { mapManager, transitionToMap } from '../maps';
import { createNPC } from '../utils/npcs/createNPC';
import { harvestFeastManager } from '../utils/HarvestFeastManager';
import {
  HARVEST_FEAST_TABLE_POSITION,
  HARVEST_FEAST_CONSUMPTION_INTERVAL_MS,
} from '../data/harvestFeast';
import type { MapDefinition } from '../types';
import { TileType } from '../types';

const YEAR = 777_001; // fictional, won't collide with any other test's year

function villageMap(): MapDefinition {
  const elder = createNPC({
    id: 'village_elder',
    name: 'Old Man Elias',
    position: { x: 5, y: 5 },
    sprite: '',
    dialogue: [{ id: 'default', text: 'Hi.' }],
  });
  return {
    id: 'village',
    name: 'village',
    width: 30,
    height: 30,
    grid: Array.from({ length: 30 }, () => Array(30).fill(TileType.GRASS)),
    spawnPoint: { x: 15, y: 15 },
    transitions: [],
    colorScheme: 'village',
    npcs: [elder],
  } as unknown as MapDefinition;
}

function placedFoodCount(): number {
  return gameState.getPlacedItems('village').filter((i) => i.itemId.startsWith('food_')).length;
}

describe('Harvest Feast — console time-override testability', () => {
  beforeEach(() => {
    mapManager.registerMap(villageMap());
    transitionToMap('village', { x: 15, y: 15 });
    gameState.setHarvestFeastGatherStartedAt(null);
    gameState.resetHarvestFeastContributions();
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000_000_000);
  });

  afterEach(() => {
    TimeManager.clearTimeOverride();
    vi.useRealTimers();
  });

  it('paces food disappearing from real Date.now() at the moment gathering was observed, not a calendar formula', () => {
    // Simulates a developer opening the console and jumping straight to the
    // gathering hour — exactly what TimeManager.setTimeOverride is for.
    TimeManager.setTimeOverride({ season: Season.AUTUMN, day: 42, hour: 18, year: YEAR });

    harvestFeastManager.check(HARVEST_FEAST_TABLE_POSITION);

    const gatherStartedAt = gameState.getHarvestFeastGatherStartedAt();
    expect(gatherStartedAt).toBe(Date.now());
    expect(placedFoodCount()).toBe(2); // Mum's corn bread + Althea's apple cobbler

    // Just under one interval later — nothing eaten yet.
    vi.setSystemTime(gatherStartedAt! + HARVEST_FEAST_CONSUMPTION_INTERVAL_MS - 1000);
    harvestFeastManager.check(HARVEST_FEAST_TABLE_POSITION);
    expect(placedFoodCount()).toBe(2);

    // Just past one interval — one dish eaten.
    vi.setSystemTime(gatherStartedAt! + HARVEST_FEAST_CONSUMPTION_INTERVAL_MS + 1000);
    harvestFeastManager.check(HARVEST_FEAST_TABLE_POSITION);
    expect(placedFoodCount()).toBe(1);

    // Just past two intervals — both eaten, and the feast concludes for this save.
    vi.setSystemTime(gatherStartedAt! + 2 * HARVEST_FEAST_CONSUMPTION_INTERVAL_MS + 1000);
    harvestFeastManager.check(HARVEST_FEAST_TABLE_POSITION);
    expect(placedFoodCount()).toBe(0);
    expect(gameState.hasHarvestFeastBeenCelebrated(YEAR)).toBe(true);
    expect(gameState.getHarvestFeastGatherStartedAt()).toBeNull(); // cleared on conclusion
  });
});
