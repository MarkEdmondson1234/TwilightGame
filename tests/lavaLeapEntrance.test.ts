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
import { gameState } from '../GameState';
import { mapManager } from '../maps';
import { transitionProvider } from '../utils/interactions/providers/transition';
import { transitionBlockedReason } from '../utils/transitionRequirements';
import { LAVA_LEAP_QUEST, unlockLavaPassage } from '../minigames/lava-leap/progression';
import { createState } from '../minigames/lava-leap/engine';

afterEach(() => vi.restoreAllMocks());

describe('Lava Leap discovery', () => {
  it('gates the deeper passage for keyboard/touch and mouse, but keeps the way back open', () => {
    const map = generateLavaMap(42);
    const deeper = map.transitions!.find((t) => t.requiresQuest === LAVA_LEAP_QUEST)!;
    const back = map.transitions!.find((t) => t.label === 'Back to the Mines')!;
    expect(deeper).toBeDefined();
    vi.spyOn(gameState, 'isQuestStarted').mockReturnValue(false);
    const stage = vi.spyOn(gameState, 'getQuestStage').mockReturnValue(0);
    expect(transitionBlockedReason(deeper)).toContain('Complete Lava Leap');
    expect(transitionBlockedReason(back)).toBeNull();
    vi.spyOn(mapManager, 'getTransitionAt').mockReturnValue({ transition: deeper });
    const onTransition = vi.fn();
    const options = transitionProvider({
      position: deeper.fromPosition,
      playerSizeTier: 0,
      onTransition,
    } as unknown as InteractionContext);
    options[0].execute();
    expect(onTransition).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, blocked: true })
    );
    vi.mocked(gameState.isQuestStarted).mockReturnValue(true);
    stage.mockReturnValue(1);
    expect(transitionBlockedReason(deeper)).toBeNull();
    expect(
      transitionProvider({
        position: deeper.fromPosition,
        playerSizeTier: 0,
      } as InteractionContext)[0].label
    ).toBe('Go Through Door');
  });

  it('unlocks only after a real branch completion, never practice or the first crossing alone', () => {
    const start = vi.spyOn(gameState, 'startQuest').mockImplementation(() => {});
    const stage = vi.spyOn(gameState, 'setQuestStage').mockImplementation(() => {});
    const complete = vi.spyOn(gameState, 'completeQuest').mockImplementation(() => {});
    const s = createState();
    unlockLavaPassage(s, false);
    s.won = true;
    unlockLavaPassage(s, false);
    s.courseId = 'forge';
    unlockLavaPassage(s, true);
    expect(start).not.toHaveBeenCalled();
    unlockLavaPassage(s, false);
    expect(start).toHaveBeenCalledWith(LAVA_LEAP_QUEST);
    expect(stage).toHaveBeenCalledWith(LAVA_LEAP_QUEST, 1);
    expect(complete).toHaveBeenCalledWith(LAVA_LEAP_QUEST);
  });
  it.each([1, 42, 20260905])(
    'places Cinder on protected floor beside the deeper passage for seed %s',
    (seed) => {
      const map = generateLavaMap(seed);
      const guide = map.npcs!.find((npc) => npc.name === LAVA_LEAP_GUIDE_NAME)!;
      expect(guide).toBeDefined();
      expect(guide.position).toEqual({ x: 25, y: 16 });
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
