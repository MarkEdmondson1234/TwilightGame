/**
 * WreathWorkshopManager
 *
 * Manages the seasonal appearance of Mushra's crafting table in the village
 * square during autumn. The table appears on days 1–7 of autumn each year,
 * giving the player a window to accept and work on Mushra's wreath workshop quest.
 *
 * Logic:
 *   - Place table when:  season=Autumn AND day 1–7 AND quest not complete
 *   - Remove table when: outside that window (regardless of whether the quest
 *     has been started/is active) — an unfinished quest simply gets another
 *     window next autumn, rather than leaving the table sitting in the village
 *     through winter and spring
 *   - If quest is complete, the table is in the seed shed — don't spawn in village
 *
 * Called periodically from App.tsx alongside seasonalEventManager.check().
 */

import { TimeManager, Season } from './TimeManager';
import { gameState } from '../GameState';
import { itemAssets } from '../assets';
import {
  isWreathWorkshopComplete,
  VILLAGE_CRAFTING_TABLE_ID,
} from '../data/questHandlers/mushraWreathHandler';
import { debugLog } from './debugLog';

const VILLAGE_MAP_ID = 'village';

/** Days 1–7 of autumn: Mushra sets up her workshop */
const WORKSHOP_WINDOW_DAYS = 7;

class WreathWorkshopManagerClass {
  /**
   * Call this periodically from the game loop (alongside seasonalEventManager.check()).
   * Places or removes the crafting table based on current game state.
   */
  check(): void {
    const time = TimeManager.getCurrentTime();
    const isAutumn = time.season === Season.AUTUMN;
    const isInWindow = isAutumn && time.day >= 1 && time.day <= WORKSHOP_WINDOW_DAYS;

    const questComplete = isWreathWorkshopComplete();
    const tableInVillage = this.isTableInVillage();

    if (questComplete) {
      // Quest done — table should be in seed shed, not village
      if (tableInVillage) {
        gameState.removePlacedItem(VILLAGE_CRAFTING_TABLE_ID);
      }
      return;
    }

    // Quest not complete (whether not started, or started but not finished):
    // the table only exists during the autumn window. An unfinished quest gets
    // another window next autumn rather than the table lingering in the village.
    if (isInWindow && !tableInVillage) {
      this.placeTable();
    } else if (!isInWindow && tableInVillage) {
      gameState.removePlacedItem(VILLAGE_CRAFTING_TABLE_ID);
    }
  }

  private isTableInVillage(): boolean {
    return gameState
      .getPlacedItems(VILLAGE_MAP_ID)
      .some((item) => item.id === VILLAGE_CRAFTING_TABLE_ID);
  }

  private placeTable(): void {
    gameState.addPlacedItem({
      id: VILLAGE_CRAFTING_TABLE_ID,
      itemId: 'crafting_table',
      // Beside Mushra (village (14, 24)) so she stands at her bench — this is the
      // position the village map comment has always documented
      position: { x: 15, y: 24 },
      mapId: VILLAGE_MAP_ID,
      image: itemAssets.crafting_table,
      timestamp: Date.now(),
      permanent: true,
    });
    debugLog('WreathWorkshopManager', 'Placed crafting table in village');
  }
}

export const wreathWorkshopManager = new WreathWorkshopManagerClass();
