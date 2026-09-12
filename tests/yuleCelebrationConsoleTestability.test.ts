/** @vitest-environment node */
/**
 * Regression guard for console/DevTools testability, mirroring
 * tests/harvestFeastConsoleTestability.test.ts.
 *
 * The 10-minute gifting window used to be a bare setInterval anchored to an
 * in-memory Date.now() timestamp, lost on reload. It's now anchored to
 * gameState.yule.startedAt — real Date.now() the moment THIS client first
 * observes gathering begin — so a developer who jumps straight to the
 * gathering hour via TimeManager.setTimeOverride() sees the window start
 * immediately (not tied to the real calendar reaching day 42), and advancing
 * fake time past the duration concludes the celebration on the next check().
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TimeManager, Season } from '../utils/TimeManager';
import { gameState } from '../GameState';
import { mapManager, transitionToMap } from '../maps';
import { createNPC } from '../utils/npcs/createNPC';
import { yuleCelebrationManager } from '../utils/YuleCelebrationManager';
import { YULE_TREE_POSITION, YULE_CELEBRATION_DURATION_MS } from '../data/yuleCelebration';
import type { MapDefinition } from '../types';
import { TileType } from '../types';

const YEAR = 777_003; // fictional, won't collide with any other test's year

function villageMap(): MapDefinition {
  const elder = createNPC({
    id: 'village_elder',
    name: 'Village Elder',
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

describe('Yule celebration — console time-override testability', () => {
  beforeEach(() => {
    mapManager.registerMap(villageMap());
    transitionToMap('village', { x: 15, y: 15 });
    gameState.setYuleStartedAt(null);
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000_000_000);
  });

  afterEach(() => {
    TimeManager.clearTimeOverride();
    vi.useRealTimers();
  });

  it('anchors the gifting window to real Date.now() at the moment gathering was observed, not a calendar formula', () => {
    // Simulates a developer opening the console and jumping straight to the
    // gathering hour — exactly what TimeManager.setTimeOverride is for.
    TimeManager.setTimeOverride({ season: Season.WINTER, day: 42, hour: 9, year: YEAR });

    yuleCelebrationManager.check(YULE_TREE_POSITION);

    const startedAt = gameState.getYuleStartedAt();
    expect(startedAt).toBe(Date.now());
    expect(yuleCelebrationManager.isActive()).toBe(true);
    expect(gameState.hasYuleBeenCelebrated(YEAR)).toBe(false);

    // Just under the full duration later — still active.
    vi.setSystemTime(startedAt! + YULE_CELEBRATION_DURATION_MS - 1000);
    yuleCelebrationManager.check(YULE_TREE_POSITION);
    expect(gameState.hasYuleBeenCelebrated(YEAR)).toBe(false);

    // Just past the full duration — concludes on the next check(), including
    // the 1.5s blackout teardown timer.
    vi.setSystemTime(startedAt! + YULE_CELEBRATION_DURATION_MS + 1000);
    yuleCelebrationManager.check(YULE_TREE_POSITION);
    vi.advanceTimersByTime(1600);

    expect(gameState.hasYuleBeenCelebrated(YEAR)).toBe(true);
    expect(gameState.getYuleStartedAt()).toBeNull(); // cleared on conclusion
    expect(yuleCelebrationManager.isActive()).toBe(false);
  });
});
