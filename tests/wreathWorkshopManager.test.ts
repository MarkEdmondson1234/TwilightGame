/** @vitest-environment node */
/**
 * Regression guard: Mushra's village crafting table used to stay in the village
 * forever once the quest was accepted ("no rush" — the table was only removed
 * for a quest that had never been started). That meant an unfinished quest left
 * the table sitting in the village straight through winter and spring, since
 * only `questComplete` and `!isInWindow` (with the quest never started) removed
 * it. The table must be gated on the autumn day 1-7 window regardless of
 * whether the quest is unstarted or merely unfinished — only completion exempts
 * it (by moving it to the seed shed instead).
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { wreathWorkshopManager } from '../utils/WreathWorkshopManager';
import { gameState } from '../GameState';
import { TimeManager, Season } from '../utils/TimeManager';
import { eventChainManager } from '../utils/EventChainManager';
import { QUEST_ID, VILLAGE_CRAFTING_TABLE_ID } from '../data/questHandlers/mushraWreathHandler';

const VILLAGE_MAP_ID = 'village';

function hasVillageTable(): boolean {
  return gameState
    .getPlacedItems(VILLAGE_MAP_ID)
    .some((item) => item.id === VILLAGE_CRAFTING_TABLE_ID);
}

describe('WreathWorkshopManager', () => {
  beforeEach(() => {
    eventChainManager.initialise();
    eventChainManager.resetChain(QUEST_ID);
    for (const item of gameState.getPlacedItems(VILLAGE_MAP_ID)) {
      gameState.removePlacedItem(item.id);
    }
  });

  afterEach(() => {
    TimeManager.clearTimeOverride();
  });

  it('places the table during the autumn window before the quest is started', () => {
    TimeManager.setTimeOverride({ season: Season.AUTUMN, year: 5000, day: 3 });
    wreathWorkshopManager.check();
    expect(hasVillageTable()).toBe(true);
  });

  it('removes the table once the window closes with the quest never started', () => {
    TimeManager.setTimeOverride({ season: Season.AUTUMN, year: 5000, day: 3 });
    wreathWorkshopManager.check();
    expect(hasVillageTable()).toBe(true);

    TimeManager.setTimeOverride({ season: Season.WINTER, year: 5000, day: 3 });
    wreathWorkshopManager.check();
    expect(hasVillageTable()).toBe(false);
  });

  it('removes the table once the window closes even though the quest is active but unfinished', async () => {
    TimeManager.setTimeOverride({ season: Season.AUTUMN, year: 5001, day: 3 });
    await eventChainManager.startChain(QUEST_ID);
    wreathWorkshopManager.check();
    expect(hasVillageTable()).toBe(true);

    // Quest is still on 'gathering' — never delivered materials — and the window closes.
    TimeManager.setTimeOverride({ season: Season.WINTER, year: 5001, day: 3 });
    wreathWorkshopManager.check();
    expect(hasVillageTable()).toBe(false);
    expect(eventChainManager.isChainActive(QUEST_ID)).toBe(true);
  });

  it('places the table again next autumn if the quest is still unfinished', async () => {
    TimeManager.setTimeOverride({ season: Season.AUTUMN, year: 5002, day: 3 });
    await eventChainManager.startChain(QUEST_ID);
    wreathWorkshopManager.check();

    TimeManager.setTimeOverride({ season: Season.WINTER, year: 5002, day: 3 });
    wreathWorkshopManager.check();
    expect(hasVillageTable()).toBe(false);

    TimeManager.setTimeOverride({ season: Season.AUTUMN, year: 5003, day: 3 });
    wreathWorkshopManager.check();
    expect(hasVillageTable()).toBe(true);
  });

  it('never places the table in the village once the quest is complete', async () => {
    TimeManager.setTimeOverride({ season: Season.AUTUMN, year: 5004, day: 3 });
    await eventChainManager.startChain(QUEST_ID);
    await eventChainManager.advanceToStage(QUEST_ID, 'complete');

    // Manufacture the bug scenario directly: table present in village, in-window.
    gameState.addPlacedItem({
      id: VILLAGE_CRAFTING_TABLE_ID,
      itemId: 'crafting_table',
      position: { x: 15, y: 24 },
      mapId: VILLAGE_MAP_ID,
      image: 'x',
      timestamp: Date.now(),
      permanent: true,
    });

    wreathWorkshopManager.check();
    expect(hasVillageTable()).toBe(false);
  });
});
