/** @vitest-environment node */
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { handleDialogueAction } from '../utils/dialogueHandlers';
import { inventoryManager } from '../utils/inventoryManager';
import { eventChainManager } from '../utils/EventChainManager';
import { getDialogue } from '../services/dialogueService';
import { createGhostNPC } from '../utils/npcs/village/queenAvaricia';
import {
  GHOST_QUEEN_QUEST_ID,
  advanceGhostQuestToHasBook,
} from '../data/questHandlers/ghostQueenHandler';

/**
 * Regression: the stage-2 "greeting" node's book-delivery response routed
 * directly to 'ghost_deliver', skipping the 'ghost_deliver_book' pass-through
 * node that dialogueHandlers.ts intercepts to actually remove history_book
 * from inventory. That made the item linger forever after completing the
 * quest through the normal in-game dialogue path (get book from Mushra →
 * return to the ghost → deliver it).
 */

function clearHistoryBook(): void {
  while (inventoryManager.hasItem('history_book', 1)) {
    inventoryManager.removeItem('history_book', 1);
  }
}

describe('Queen Avaricia ghost_queen book delivery', () => {
  beforeEach(async () => {
    eventChainManager.initialise();
    eventChainManager.resetChain(GHOST_QUEEN_QUEST_ID);
    clearHistoryBook();
    await eventChainManager.startChain(GHOST_QUEEN_QUEST_ID, {});
    advanceGhostQuestToHasBook();
    inventoryManager.addItem('history_book', 1);
  });

  afterAll(() => {
    clearHistoryBook();
  });

  it('routes the stage-2 greeting response through the item-removing pass-through node', async () => {
    const npc = createGhostNPC();
    const node = await getDialogue(npc, 'greeting');
    const deliverOption = node?.responses?.find((r) => r.text.startsWith('The history book'));

    expect(deliverOption?.nextId).toBe('ghost_deliver_book');
  });

  it('removes history_book from inventory when delivered via the dialogue path', () => {
    expect(inventoryManager.getQuantity('history_book')).toBe(1);

    const redirect = handleDialogueAction('ghost_queen', 'ghost_deliver_book');

    expect(redirect).toBe('ghost_deliver');
    expect(inventoryManager.getQuantity('history_book')).toBe(0);
  });
});
