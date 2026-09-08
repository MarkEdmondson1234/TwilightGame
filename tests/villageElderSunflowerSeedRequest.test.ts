/**
 * The village elder (Elias) can be asked for a top-up of sunflower seeds,
 * separate from the one-time Acquaintance-tier gift. This is capped to once
 * per Spring (per calendar year) so it can't be used to farm free, otherwise
 * unsellable-for-free seeds by repeatedly walking away and re-approaching him.
 *
 * Season-gating (`requiredSeason`) is filtered only in ScriptedControls.tsx
 * (the rendering layer), not by services/dialogueService.ts, so it isn't
 * exercised here — it's the same, already-proven mechanism oldWomanKnitting.ts
 * already relies on. This file covers what's new: the friendship-tier gate
 * (checked by dialogueService, so testable via getDialogue) and the
 * once-per-year grant/cap logic in handleEliasQuestActions.
 */
/** @vitest-environment node */
import { describe, it, expect, beforeEach, afterAll, vi, afterEach } from 'vitest';
import { handleDialogueAction } from '../utils/dialogueHandlers';
import { inventoryManager } from '../utils/inventoryManager';
import { eventChainManager } from '../utils/EventChainManager';
import { getDialogue } from '../services/dialogueService';
import { createVillageElderNPC } from '../utils/npcs/village/villageElder';
import { friendshipManager } from '../utils/FriendshipManager';
import { TimeManager, Season, TimeOfDay, SEASONAL_DAYLIGHT } from '../utils/TimeManager';

function mockGameTime(year: number, totalDays: number) {
  return {
    year,
    season: Season.SPRING,
    day: totalDays,
    totalDays,
    hour: 12,
    minute: 0,
    timeOfDay: TimeOfDay.DAY,
    totalHours: totalDays * 24 + 12,
    daylight: SEASONAL_DAYLIGHT[Season.SPRING],
  };
}

function clearSunflowerSeeds(): void {
  while (inventoryManager.hasItem('seed_sunflower', 1)) {
    inventoryManager.removeItem('seed_sunflower', 1);
  }
}

describe('Village elder sunflower seed request', () => {
  beforeEach(async () => {
    eventChainManager.initialise();
    friendshipManager.reset();
    clearSunflowerSeeds();
    vi.spyOn(TimeManager, 'getCurrentTime').mockReturnValue(mockGameTime(1, 1));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(() => {
    clearSunflowerSeeds();
  });

  it('hides the ask option below Acquaintance tier', async () => {
    const npc = createVillageElderNPC('village_elder', { x: 0, y: 0 });
    const node = await getDialogue(npc, 'greeting');
    const askOption = node?.responses?.find((r) => r.nextId === 'sunflower_seed_request');

    expect(askOption).toBeUndefined();
  });

  it('shows the ask option once friendship reaches Acquaintance', async () => {
    friendshipManager.addPoints('village_elder', 300, 'test setup');

    const npc = createVillageElderNPC('village_elder', { x: 0, y: 0 });
    const node = await getDialogue(npc, 'greeting');
    const askOption = node?.responses?.find((r) => r.nextId === 'sunflower_seed_request');

    expect(askOption).toBeDefined();
  });

  it('grants exactly 3 sunflower seeds on first ask', () => {
    friendshipManager.addPoints('village_elder', 300, 'test setup');
    clearSunflowerSeeds(); // the tier-up itself already grants a starter 3

    handleDialogueAction('village_elder', 'sunflower_seed_request');

    expect(inventoryManager.getQuantity('seed_sunflower')).toBe(3);
  });

  it('redirects to the "already given" node on a second ask the same spring, granting no more seeds', () => {
    friendshipManager.addPoints('village_elder', 300, 'test setup');
    clearSunflowerSeeds();

    handleDialogueAction('village_elder', 'sunflower_seed_request');
    expect(inventoryManager.getQuantity('seed_sunflower')).toBe(3);

    const redirect = handleDialogueAction('village_elder', 'sunflower_seed_request');

    expect(redirect).toBe('sunflower_seed_already_given');
    expect(inventoryManager.getQuantity('seed_sunflower')).toBe(3);
  });

  it('allows asking again once the following year\'s spring arrives', () => {
    friendshipManager.addPoints('village_elder', 300, 'test setup');
    clearSunflowerSeeds();

    handleDialogueAction('village_elder', 'sunflower_seed_request');
    expect(inventoryManager.getQuantity('seed_sunflower')).toBe(3);

    vi.spyOn(TimeManager, 'getCurrentTime').mockReturnValue(mockGameTime(2, 400));
    const redirect = handleDialogueAction('village_elder', 'sunflower_seed_request');

    expect(redirect).toBeUndefined();
    expect(inventoryManager.getQuantity('seed_sunflower')).toBe(6);
  });
});
