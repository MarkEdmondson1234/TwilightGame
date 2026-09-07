/** @vitest-environment node */
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { restoreQueenAvariciaFormIfComplete } from '../utils/gameInitializer';
import { npcManager } from '../NPCManager';
import { eventChainManager } from '../utils/EventChainManager';
import { GHOST_QUEEN_QUEST_ID, GHOST_QUEEN_NPC_ID } from '../data/questHandlers/ghostQueenHandler';
import { createGhostNPC } from '../utils/npcs/village/queenAvaricia';

/**
 * Regression: house1's `npcs: [createGhostQueenNPC()]` is a static array evaluated
 * once when the module loads, during initializeMaps() — the fast synchronous
 * startup phase that runs BEFORE eventChainManager.initialise() has loaded saved
 * progress. So isGhostQuestComplete() inside it always sees an empty progress map
 * and always bakes in the pre-reveal ghost, even for a player whose quest is
 * already completed. The only thing that ever shows the real Queen Avaricia is a
 * live in-session NPC swap on quest completion, which does not survive a reload —
 * a returning player with a completed quest would be stuck facing the pre-reveal
 * ghost with no way to progress her dialogue.
 */

describe('restoreQueenAvariciaFormIfComplete', () => {
  beforeEach(() => {
    eventChainManager.initialise();
    eventChainManager.resetChain(GHOST_QUEEN_QUEST_ID);
    // Simulate the always-stale registration that happens before progress loads.
    npcManager.registerNPCs('house1', [createGhostNPC()]);
  });

  afterAll(() => {
    eventChainManager.resetChain(GHOST_QUEEN_QUEST_ID);
  });

  it('does nothing if the quest is not complete (leaves the pre-reveal ghost in place)', async () => {
    await restoreQueenAvariciaFormIfComplete();

    const npc = npcManager.getNPCsForMap('house1').find((n) => n.id === GHOST_QUEEN_NPC_ID);
    expect(npc?.name).toBe('???');
  });

  it('swaps in Queen Avaricia when the quest was already complete before this session loaded', async () => {
    await eventChainManager.startChain(GHOST_QUEEN_QUEST_ID, {});
    await eventChainManager.advanceToStage(GHOST_QUEEN_QUEST_ID, 'completed');

    await restoreQueenAvariciaFormIfComplete();

    const npc = npcManager.getNPCsForMap('house1').find((n) => n.id === GHOST_QUEEN_NPC_ID);
    expect(npc?.name).toBe('Queen Avaricia');
    expect(npc?.portraitSprite).toBeDefined();
  });
});
