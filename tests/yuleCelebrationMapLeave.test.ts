/** @vitest-environment node */
/**
 * Regression for issue #30: Yule celebration NPCs weren't reset when the player
 * left the village map before the 10-minute timer finished.
 *
 * Root cause: MapManager.loadMap() calls npcManager.setCurrentMap(mapId) as soon
 * as a transition starts. App.tsx's handleMapTransition calls transitionToMap()
 * BEFORE running the Yule forceEnd() check, so by the time forceEnd() ran,
 * npcManager's "current map" was already the destination — not 'village'.
 * removeDynamicNPC()/clearEventOverrides() silently no-opped (wrong map / NPC
 * not found via currentMapId lookup), leaving festival NPCs in place and
 * static NPCs (Village Elder, Mr Fox) stuck at their Yule-tree positions.
 *
 * Fix: NPCManager.removeDynamicNPC() accepts an explicit mapId, and
 * clearEventOverrides() looks NPCs up across all maps — both independent of
 * currentMapId — and YuleCelebrationManager passes YULE_MAP_ID explicitly.
 *
 * Now that the celebration is clock-driven (no more click-to-begin), gathering
 * is entered via check() under TimeManager.setTimeOverride() — see
 * tests/harvestFeastConsoleTestability.test.ts for the same pattern.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TimeManager, Season } from '../utils/TimeManager';
import { gameState } from '../GameState';
import { npcManager } from '../NPCManager';
import { mapManager, transitionToMap } from '../maps';
import { yuleCelebrationManager } from '../utils/YuleCelebrationManager';
import { createNPC } from '../utils/npcs/createNPC';
import { YULE_NPC_CONFIGS } from '../data/yuleCelebration';
import type { MapDefinition } from '../types';
import { TileType } from '../types';

const YEAR = 777_002; // fictional, won't collide with any other test's year

function tinyMap(id: string, npcs: ReturnType<typeof createNPC>[] = []): MapDefinition {
  return {
    id,
    name: id,
    width: 5,
    height: 5,
    grid: Array.from({ length: 5 }, () => Array(5).fill(TileType.GRASS)),
    spawnPoint: { x: 2, y: 2 },
    transitions: [],
    colorScheme: 'village',
    npcs,
  } as unknown as MapDefinition;
}

describe('Yule celebration — leaving the map early (#30)', () => {
  beforeEach(() => {
    gameState.setYuleStartedAt(null);
  });

  afterEach(() => {
    TimeManager.clearTimeOverride();
  });

  it('restores static NPC positions and removes festival NPCs when the player leaves before the timer ends', () => {
    const elder = createNPC({
      id: 'village_elder',
      name: 'Village Elder',
      position: { x: 5, y: 5 },
      sprite: '',
      dialogue: [{ id: 'default', text: 'Hi.' }],
    });
    const shopkeeper = createNPC({
      id: 'shopkeeper',
      name: 'Mr Fox',
      position: { x: 10, y: 10 },
      sprite: '',
      dialogue: [{ id: 'default', text: 'Hi.' }],
    });
    mapManager.registerMap(tinyMap('village', [elder, shopkeeper]));
    mapManager.registerMap(tinyMap('mums_kitchen', []));
    transitionToMap('village', { x: 2, y: 2 });

    // Jump to Winter day 42/hour 9 — the gathering hour — and let check()
    // drive gathering the same way the game loop does.
    TimeManager.setTimeOverride({ season: Season.WINTER, day: 42, hour: 9, year: YEAR });
    yuleCelebrationManager.check({ x: 2, y: 2 });

    expect(npcManager.getNPCById('village_elder')?.position).toEqual(
      YULE_NPC_CONFIGS.find((c) => c.celebrationId === 'village_elder')!.position
    );
    expect(npcManager.getNPCById('festival_mum')).not.toBeNull();
    expect(yuleCelebrationManager.isActive()).toBe(true);

    // Mirror App.tsx's handleMapTransition exactly: transitionToMap() runs first
    // (which moves npcManager's currentMapId), then the Yule forceEnd() check.
    const { map } = transitionToMap('mums_kitchen', { x: 2, y: 2 });
    if (map.id !== 'village' && yuleCelebrationManager.isActive()) {
      yuleCelebrationManager.forceEnd();
    }
    npcManager.setCurrentMap(map.id);

    // Return to village
    transitionToMap('village', { x: 2, y: 2 });

    expect(npcManager.getNPCById('village_elder')?.position).toEqual({ x: 5, y: 5 });
    expect(npcManager.getNPCById('shopkeeper')?.position).toEqual({ x: 10, y: 10 });
    expect(npcManager.getNPCById('festival_mum')).toBeNull();
    expect(npcManager.getNPCById('festival_old_woman_knitting')).toBeNull();
    expect(npcManager.getNPCById('festival_child')).toBeNull();
    expect(npcManager.getNPCById('festival_mushra')).toBeNull();
    expect(npcManager.getNPCById('festival_bear')).toBeNull();
    expect(yuleCelebrationManager.isActive()).toBe(false);

    // forceEnd() now persists through GameState's synced accessors, not
    // localStorage — the celebration must not be re-triggerable this year.
    expect(gameState.hasYuleBeenCelebrated(YEAR)).toBe(true);
    expect(gameState.getYuleStartedAt()).toBeNull();
  });
});
