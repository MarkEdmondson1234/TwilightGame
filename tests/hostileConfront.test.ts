/**
 * @vitest-environment node
 *
 * "Confront" must start a fight the same way being caught does.
 *
 * A hostile NPC's combat screen can be reached two ways: the goblin walks into
 * you (NPCManager emits COMBAT_INITIATED on contact), or you click it and pick
 * "Confront" from its menu — which the proximity radial menu also pops up on
 * its own when it gets close. App.tsx keys its post-combat cleanup (open the
 * lava passage, despawn the goblin) on COMBAT_INITIATED. "Confront" used to
 * open the combat screen directly, so a fight started that way was won for
 * nothing: no passage, the goblin still standing and unfrozen, and a rematch
 * three seconds later. That is what "we beat it but it's still there" was.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { generateRandomCave } from '../maps/procedural';
import { npcManager } from '../NPCManager';
import * as actions from '../utils/actionHandlers';
import { npcProvider } from '../utils/interactions/providers/npc';
import type { InteractionContext } from '../utils/interactions/types';
import { eventBus, GameEvent } from '../utils/EventBus';
import { gameState } from '../GameState';

const GOBLIN_DEPTH = 5;

function goblinCave(seed: number) {
  vi.spyOn(gameState, 'getLavaEntrance').mockReturnValue(null);
  const map = generateRandomCave(seed, GOBLIN_DEPTH);
  const goblin = map.npcs!.find((npc) => npc.id.startsWith('goblin_depth_'))!;
  expect(goblin).toBeDefined();
  npcManager.registerNPCs(map.id, map.npcs!);
  npcManager.setCurrentMap(map.id);
  return { map, goblin };
}

describe('Confront on a hostile NPC', () => {
  const emitted: unknown[] = [];
  let unsubscribe: () => void;

  beforeEach(() => {
    emitted.length = 0;
    unsubscribe = eventBus.on(GameEvent.COMBAT_INITIATED, (payload) => emitted.push(payload));
  });
  afterEach(() => {
    unsubscribe();
    vi.restoreAllMocks();
  });

  it('is offered for the goblin', () => {
    const { goblin } = goblinCave(7);
    vi.spyOn(actions, 'checkNPCInteraction').mockReturnValue(goblin.id);
    vi.spyOn(npcManager, 'getNPCAtPosition').mockReturnValue(goblin);

    const offered = npcProvider({
      position: goblin.position,
      onOpenMiniGame: vi.fn(),
    } as unknown as InteractionContext);

    expect(offered.map((o) => o.label)).toContain('Confront');
  });

  it('starts the fight through COMBAT_INITIATED, not by opening the screen directly', () => {
    const { goblin } = goblinCave(7);
    vi.spyOn(actions, 'checkNPCInteraction').mockReturnValue(goblin.id);
    vi.spyOn(npcManager, 'getNPCAtPosition').mockReturnValue(goblin);
    const onOpenMiniGame = vi.fn();

    const confront = npcProvider({
      position: goblin.position,
      onOpenMiniGame,
    } as unknown as InteractionContext).find((o) => o.label === 'Confront')!;
    confront.execute();

    expect(
      onOpenMiniGame,
      'Confront opened the combat screen directly. App.tsx never learns which NPC is ' +
        'being fought, so winning despawns nothing and opens no passage.'
    ).not.toHaveBeenCalled();
    expect(emitted).toEqual([
      expect.objectContaining({
        npcId: goblin.id,
        miniGameId: goblin.hostileConfig!.combatMiniGameId,
      }),
    ]);
  });

  it('freezes the goblin for the duration, like being caught does', () => {
    const { goblin } = goblinCave(7);
    expect(npcManager.initiateCombat(goblin.id, 'confront')).toBe(true);

    // A frozen hostile NPC neither wanders nor re-triggers contact.
    const before = { ...goblin.position };
    npcManager.updateNPCs(0.5, { x: goblin.position.x + 0.5, y: goblin.position.y });
    expect(goblin.position).toEqual(before);
    expect(emitted).toHaveLength(1);

    npcManager.unfreezeNPC(goblin.id);
  });

  it('refuses for anything that is not hostile', () => {
    expect(npcManager.initiateCombat('village_elder')).toBe(false);
    expect(emitted).toEqual([]);
  });
});

describe('a beaten goblin stays beaten', () => {
  afterEach(() => vi.restoreAllMocks());

  // The cave keeps the same seed all day, so re-entering it regenerates the
  // same map. Restoring the passage but respawning the goblin beside it meant
  // every visit was a rematch that revealed nothing.
  it('is not respawned once its passage is open in this cave', () => {
    const seed = 7;
    vi.spyOn(gameState, 'getLavaEntrance').mockImplementation((mapId: string) =>
      mapId === `cave_${seed}` ? { x: 5, y: 5 } : null
    );
    const map = generateRandomCave(seed, GOBLIN_DEPTH);
    expect(map.npcs!.some((npc) => npc.id.startsWith('goblin_depth_'))).toBe(false);
    expect(map.transitions!.some((t) => t.toMapId === 'RANDOM_LAVA')).toBe(true);
  });

  it('still guards a cave nobody has beaten it in', () => {
    vi.spyOn(gameState, 'getLavaEntrance').mockReturnValue(null);
    const map = generateRandomCave(7, GOBLIN_DEPTH);
    expect(map.npcs!.some((npc) => npc.id.startsWith('goblin_depth_'))).toBe(true);
  });
});
