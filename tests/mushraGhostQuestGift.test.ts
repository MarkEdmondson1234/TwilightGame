/** @vitest-environment node */
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { handleDialogueAction } from '../utils/dialogueHandlers';
import { inventoryManager } from '../utils/inventoryManager';
import { eventChainManager } from '../utils/EventChainManager';
import { getDialogue } from '../services/dialogueService';
import { createMushraNPC } from '../utils/npcs/forest/mushra';
import {
  GHOST_QUEEN_QUEST_ID,
  isGhostQuestActive,
  getGhostQuestStage,
} from '../data/questHandlers/ghostQueenHandler';

/**
 * Regression: Mushra's "Do you know anything about a place called Nevarre?" dialogue
 * option was only gated by requiredQuest/hiddenIfQuestCompleted, so it stayed visible
 * for the ENTIRE ghost_queen quest (not just the 'searching' stage, before the book is
 * obtained) — unlike Queen Avaricia's equivalent node, which correctly uses
 * requiredQuestStage/maxQuestStage. A player could revisit Mushra and re-select it
 * after already receiving the book, stacking duplicate (non-stackable) history_book
 * items. handleMushraGhostQuestActions() also granted the item unconditionally, with
 * no "already have it" guard (unlike every other one-shot quest grant in the same file).
 */

function clearHistoryBook(): void {
  while (inventoryManager.hasItem('history_book', 1)) {
    inventoryManager.removeItem('history_book', 1);
  }
}

describe('Mushra ghost_queen book delivery', () => {
  beforeEach(async () => {
    eventChainManager.initialise();
    eventChainManager.resetChain(GHOST_QUEEN_QUEST_ID);
    clearHistoryBook();
    await eventChainManager.startChain(GHOST_QUEEN_QUEST_ID, {});
  });

  afterAll(() => {
    clearHistoryBook();
  });

  it('grants exactly one history_book even if the delivery node fires twice', () => {
    handleDialogueAction('mushra', 'mushra_nevarre_book_given');
    handleDialogueAction('mushra', 'mushra_nevarre_book_given');

    expect(inventoryManager.getQuantity('history_book')).toBe(1);
  });

  it('advances the quest to has_book on first delivery, and stays there on a repeat', () => {
    handleDialogueAction('mushra', 'mushra_nevarre_book_given');
    expect(getGhostQuestStage()).toBe('has_book');

    handleDialogueAction('mushra', 'mushra_nevarre_book_given');
    expect(getGhostQuestStage()).toBe('has_book');
    expect(isGhostQuestActive()).toBe(true);
  });

  it('hides the Nevarre dialogue option once the book has been delivered (stage advanced past searching)', async () => {
    handleDialogueAction('mushra', 'mushra_nevarre_book_given');
    expect(getGhostQuestStage()).toBe('has_book');

    const npc = createMushraNPC('mushra_test', { x: 0, y: 0 });
    const node = await getDialogue(npc, 'greeting');
    const nevarreOption = node?.responses?.find((r) => r.nextId === 'nevarre_enquiry');

    expect(nevarreOption).toBeUndefined();
  });
});
