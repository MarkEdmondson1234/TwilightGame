/** @vitest-environment node */
/**
 * Guards the one piece of Yule's multiplayer logic with no Harvest Feast
 * precedent: each of the 7 celebration NPCs is claimable once per year,
 * globally — not once per player. interceptGift() must succeed the first
 * time an NPC is gifted and return 'already_claimed' on every attempt after
 * that, once the NPC appears in the merged local+remote claim set (see
 * getEffectiveClaimedNpcIds() in utils/YuleCelebrationManager.ts).
 *
 * Firebase is unavailable in this test environment, so getYuleCelebrationService()
 * resolves to the stub (isAvailable() === false) — claimGift() is therefore
 * never actually called, and this exercises the local half of the merge
 * (gameState.yule.giftsClaimedLocally) directly, which is exactly what a
 * single client observes immediately after its own successful gift.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { TimeManager, Season } from '../utils/TimeManager';
import { gameState } from '../GameState';
import { mapManager, transitionToMap } from '../maps';
import { createNPC } from '../utils/npcs/createNPC';
import { yuleCelebrationManager } from '../utils/YuleCelebrationManager';
import { YULE_TREE_POSITION } from '../data/yuleCelebration';
import type { MapDefinition } from '../types';
import { TileType } from '../types';

const YEAR = 777_020; // fictional, won't collide with any other test's year

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

describe('Yule celebration — exclusive gift claims', () => {
  beforeEach(() => {
    mapManager.registerMap(villageMap());
    transitionToMap('village', { x: 15, y: 15 });
    gameState.resetYuleProgress();
    TimeManager.setTimeOverride({ season: Season.WINTER, day: 42, hour: 9, year: YEAR });
    yuleCelebrationManager.check(YULE_TREE_POSITION);
  });

  it('returns null for an NPC not participating in the celebration', () => {
    expect(yuleCelebrationManager.interceptGift('not_a_yule_npc', 'photo')).toBeNull();
  });

  it('succeeds the first time an NPC is gifted, then returns already_claimed', () => {
    const first = yuleCelebrationManager.interceptGift('village_elder', 'photo');
    expect(first).not.toBe('already_claimed');
    expect(first).not.toBeNull();
    expect(typeof (first as { rewardItemId: string }).rewardItemId).toBe('string');

    const second = yuleCelebrationManager.interceptGift('village_elder', 'photo');
    expect(second).toBe('already_claimed');
  });

  it('exclusivity is per-NPC — claiming one NPC does not block another', () => {
    yuleCelebrationManager.interceptGift('village_elder', 'photo');
    const otherResult = yuleCelebrationManager.interceptGift('shopkeeper', 'photo');
    expect(otherResult).not.toBe('already_claimed');
  });

  it('records the claim in GameState so it is re-derivable after a reload', () => {
    yuleCelebrationManager.interceptGift('village_elder', 'photo');
    expect(gameState.getYuleGiftsClaimedLocally()).toContain('village_elder');
  });
});
