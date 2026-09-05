/** @vitest-environment node */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { generateLavaMap } from '../maps/procedural';
import { LAVA_LEAP_GUIDE_NAME } from '../utils/npcs/mine/lavaLeapGuide';
import { getMiniGamesForNPCName } from '../minigames/registry';
import { npcManager } from '../NPCManager';
import * as actions from '../utils/actionHandlers';
import { npcProvider } from '../utils/interactions/providers/npc';
import type { InteractionContext } from '../utils/interactions/types';
import { NPCBehavior, TileType } from '../types';

afterEach(() => vi.restoreAllMocks());

describe('Lava Leap discovery', () => {
  it.each([1, 42, 20260905])(
    'places Cinder on protected floor near the entrance for seed %s',
    (seed) => {
      const map = generateLavaMap(seed);
      const guide = map.npcs!.find((npc) => npc.name === LAVA_LEAP_GUIDE_NAME)!;
      expect(guide).toBeDefined();
      expect(guide.position).toEqual({ x: map.spawnPoint.x + 2, y: map.spawnPoint.y + 1 });
      expect(map.grid[guide.position.y][guide.position.x]).toBe(TileType.LAVA_FLOOR);
      expect(guide.behavior).toBe(NPCBehavior.STATIC);
      expect(guide.dialogue[0].text).toContain('Lava Leap');
      expect(getMiniGamesForNPCName(guide.name).map((game) => game.id)).toContain('lava-leap');
    }
  );

  it('offers and launches the game for Cinder despite a procedurally generated NPC id', () => {
    const guide = generateLavaMap(42).npcs!.find((npc) => npc.name === LAVA_LEAP_GUIDE_NAME)!;
    vi.spyOn(actions, 'checkNPCInteraction').mockReturnValue(guide.id);
    vi.spyOn(npcManager, 'getNPCAtPosition').mockReturnValue(guide);
    const onOpenMiniGame = vi.fn();
    const offered = npcProvider({
      position: guide.position,
      onOpenMiniGame,
    } as unknown as InteractionContext);
    const game = offered.find((option) => option.label === 'Lava Leap');
    expect(game).toBeDefined();
    game!.execute();
    expect(onOpenMiniGame).toHaveBeenCalledWith(
      'lava-leap',
      expect.objectContaining({ triggerType: 'npc', npcId: guide.id })
    );
  });
});
