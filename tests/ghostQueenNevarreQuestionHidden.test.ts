/** @vitest-environment node */
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { eventChainManager } from '../utils/EventChainManager';
import { getDialogue } from '../services/dialogueService';
import { GHOST_QUEEN_QUEST_ID } from '../data/questHandlers/ghostQueenHandler';
import { createMumNPC } from '../utils/npcs/homeNPCs';
import { createMushraNPC } from '../utils/npcs/forest/mushra';
import { createOldWomanKnittingNPC } from '../utils/npcs/village/oldWomanKnitting';
import { createShopkeeperNPC } from '../utils/npcs/village/shopkeeper';
import { createVillageElderNPC } from '../utils/npcs/village/villageElder';
import { createWitchWolfNPC } from '../utils/npcs/forest/witchWolf';
import { NPC } from '../types';

/**
 * Every villager who can be asked about Nevarre during the ghost_queen quest
 * hand-copies the same `hiddenIfQuestCompleted: 'ghost_queen'` guard onto
 * their "Do you know anything about a place called Nevarre?" response. This
 * pins that guard in place across all six NPCs, so a future edit that drops
 * it on one of them (e.g. a copy-paste of the response block) is caught
 * instead of leaving a dangling question once Queen Avaricia has revealed
 * herself.
 */

const NEVARRE_QUESTION = 'Do you know anything about a place called Nevarre?';

const NPC_FACTORIES: Array<{ label: string; create: () => NPC }> = [
  { label: 'Mum', create: () => createMumNPC('mum_test', { x: 0, y: 0 }) },
  { label: 'Mushra', create: () => createMushraNPC('mushra_test', { x: 0, y: 0 }) },
  { label: 'Althea', create: () => createOldWomanKnittingNPC('althea_test', { x: 0, y: 0 }) },
  { label: 'Shopkeeper', create: () => createShopkeeperNPC('shopkeeper_test', { x: 0, y: 0 }) },
  {
    label: 'Village Elder',
    create: () => createVillageElderNPC('village_elder_test', { x: 0, y: 0 }),
  },
  { label: 'The Witch', create: () => createWitchWolfNPC('witch_test', { x: 0, y: 0 }) },
];

async function findNevarreOption(npc: NPC) {
  const node = await getDialogue(npc, 'greeting');
  return node?.responses?.find((r) => r.text === NEVARRE_QUESTION);
}

describe('Nevarre dialogue option disappears once ghost_queen is completed', () => {
  beforeEach(async () => {
    eventChainManager.initialise();
    eventChainManager.resetChain(GHOST_QUEEN_QUEST_ID);
    await eventChainManager.startChain(GHOST_QUEEN_QUEST_ID, {});
  });

  afterAll(() => {
    eventChainManager.resetChain(GHOST_QUEEN_QUEST_ID);
  });

  it.each(NPC_FACTORIES)('$label offers the Nevarre question while the quest is active', async ({ create }) => {
    expect(await findNevarreOption(create())).toBeDefined();
  });

  it.each(NPC_FACTORIES)('$label hides the Nevarre question once ghost_queen is completed', async ({ create }) => {
    await eventChainManager.advanceToStage(GHOST_QUEEN_QUEST_ID, 'completed');
    expect(await findNevarreOption(create())).toBeUndefined();
  });
});
