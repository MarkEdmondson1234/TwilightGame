/**
 * WreathWorkshopManager
 *
 * Manages the seasonal appearance of Mushra's crafting table in the village
 * square during autumn. The table appears on days 1–7 of autumn each year,
 * giving the player a window to accept Mushra's wreath workshop quest.
 *
 * Logic:
 *   - Place table when:  season=Autumn AND day 1–7 AND quest not yet started AND not complete
 *   - Remove table when: above condition no longer true AND quest not active
 *   - If quest is active (accepted), the table stays until quest completes
 *   - If quest is complete, the table is in the seed shed — don't spawn in village
 *
 * Called periodically from App.tsx alongside seasonalEventManager.check().
 */

import { TimeManager, Season } from './TimeManager';
import { gameState } from '../GameState';
import { itemAssets } from '../assets';
import {
  isWreathWorkshopComplete,
  isWreathWorkshopActive,
  VILLAGE_CRAFTING_TABLE_ID,
} from '../data/questHandlers/mushraWreathHandler';

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
    const questActive = isWreathWorkshopActive();

    const tableInVillage = this.isTableInVillage();

    if (questComplete) {
      // Quest done — table should be in seed shed, not village
      if (tableInVillage) {
        gameState.removePlacedItem(VILLAGE_CRAFTING_TABLE_ID);
      }
      return;
    }

    if (questActive) {
      // Quest accepted — keep the table in place while player works on it
      // (Table was already spawned when the quest started, or by a previous check)
      if (!tableInVillage) {
        this.placeTable();
      }
      return;
    }

    // Quest not yet started: show table only during the autumn window
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
      position: { x: 12, y: 23 },
      mapId: VILLAGE_MAP_ID,
      image: itemAssets.crafting_table,
      timestamp: Date.now(),
      permanent: true,
    });
    console.log('[WreathWorkshopManager] Placed crafting table in village');
  }
}

export const wreathWorkshopManager = new WreathWorkshopManagerClass();
