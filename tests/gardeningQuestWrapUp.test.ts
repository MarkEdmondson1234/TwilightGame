/** @vitest-environment node */
/**
 * Regression for issue #23: Elias' gardening quest never ends — after the final
 * (autumn) delivery, the quest was correctly marked complete internally, but the
 * dialogue always routed to garden_wait_next_season ("come spring I shall have
 * something new for thee"), leaving the unreachable garden_quest_complete wrap-up
 * node dead code and implying the tutorial continues indefinitely.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { handleDialogueAction } from '../utils/dialogueHandlers';
import { inventoryManager } from '../utils/inventoryManager';
import { eventChainManager } from '../utils/EventChainManager';
import {
  GARDENING_QUEST_ID,
  hasCompletedSeason,
} from '../data/questHandlers/gardeningQuestHandler';

describe('Elias gardening quest — final delivery wraps up (#23)', () => {
  beforeEach(async () => {
    eventChainManager.initialise();
    eventChainManager.resetChain(GARDENING_QUEST_ID);
    while (inventoryManager.hasItem('honey', 1)) {
      inventoryManager.removeItem('honey', 1);
    }
    while (inventoryManager.hasItem('crop_tomato', 1)) {
      inventoryManager.removeItem('crop_tomato', 1);
    }
    await eventChainManager.startChain(GARDENING_QUEST_ID, {
      springCompleted: false,
      summerCompleted: false,
      autumnCompleted: false,
      currentSeasonTask: 'autumn',
      seedsReceived: ['spring', 'summer', 'autumn'],
    });
    await eventChainManager.advanceToStage(GARDENING_QUEST_ID, 'active');
  });

  it('routes to garden_task_complete (not the wrap-up) when spring/summer are still outstanding', () => {
    inventoryManager.addItem('honey', 1);
    eventChainManager.setMetadata(GARDENING_QUEST_ID, 'springCompleted', false);
    eventChainManager.setMetadata(GARDENING_QUEST_ID, 'summerCompleted', false);

    const result = handleDialogueAction('village_elder', 'garden_deliver_crop');

    expect(result).toBe('garden_task_complete');
    expect(hasCompletedSeason('autumn')).toBe(true);
  });

  it('routes to garden_quest_complete when the autumn delivery is the final season', () => {
    inventoryManager.addItem('honey', 1);
    eventChainManager.setMetadata(GARDENING_QUEST_ID, 'springCompleted', true);
    eventChainManager.setMetadata(GARDENING_QUEST_ID, 'summerCompleted', true);

    const result = handleDialogueAction('village_elder', 'garden_deliver_crop');

    expect(result).toBe('garden_quest_complete');
    expect(hasCompletedSeason('autumn')).toBe(true);
  });
});
