/**
 * SeasonalEventManager
 *
 * Manages the physical seasonal decorations that appear in the village square
 * on festival days (day 42 of each season, from 9am until midnight).
 *
 * The paired cutscenes are handled independently by CutsceneManager via the
 * `time` trigger. This manager's sole job is to place/remove the PlacedItem
 * decoration at {x:24, y:16} on the village map.
 *
 * Logic:
 *   - Place decoration when: day === 42 AND hour >= 9, item not yet placed
 *   - Remove decoration when: above condition is no longer true (day changes)
 *
 * Decoration images are placeholder paths. Replace each with the real asset
 * once the sprite is ready and optimised.
 */

import { TimeManager, Season } from './TimeManager';
import { gameState } from '../GameState';
import { debugLog } from './debugLog';

// ============================================================================
// Constants
// ============================================================================

const VILLAGE_MAP_ID = 'village';

/** Position in the village square where the festival decoration appears */
const DECORATION_POSITION = { x: 24, y: 16 };

/** Fixed ID so we can reliably find and remove the active decoration */
const DECORATION_ITEM_ID = 'seasonal_decoration_current';

/**
 * Maps each season to the item ID and placeholder image for its decoration.
 * Replace image paths with real asset URLs once sprites are created.
 */
const SEASON_DECORATIONS: Partial<Record<Season, { itemId: string; image: string }>> = {
  [Season.SPRING]: {
    itemId: 'seasonal_maypole',
    image: '/TwilightGame/assets/seasonal/maypole.png',
  },
  [Season.SUMMER]: {
    itemId: 'seasonal_bonfire',
    image: '/TwilightGame/assets/seasonal/bonfire.png',
  },
  [Season.AUTUMN]: {
    itemId: 'seasonal_harvest_table',
    image: '/TwilightGame/assets/seasonal/harvest_table.png',
  },
  // Winter's day-42 decoration is the Yule celebration — a richer, shared
  // community event owned by YuleCelebrationManager, which places its own
  // tree at the same village tile on its own schedule. This manager stays
  // out of Winter entirely so the two never collide (same carve-out Autumn
  // already has for the Harvest Feast).
};

// ============================================================================
// SeasonalEventManager Class
// ============================================================================

class SeasonalEventManagerClass {
  /**
   * Call this periodically (every TIMING.SEASONAL_EVENT_CHECK_MS) from the
   * game loop. It places or removes the village decoration based on game time.
   */
  check(): void {
    const time = TimeManager.getCurrentTime();

    // Autumn's day-42 decoration is now the Harvest Feast, and Winter's is
    // now the Yule celebration — both richer, shared community events owned
    // by their own managers (HarvestFeastManager/YuleCelebrationManager),
    // which place their own decoration at the same village tile on their own
    // schedule. This manager stays out of both entirely so they never
    // collide with the generic decoration below.
    if (time.season === Season.AUTUMN || time.season === Season.WINTER) {
      const existingItem = this.getActiveDecoration();
      if (existingItem) this.removeDecoration();
      return;
    }

    const isFestivalTime = time.day === 42 && time.hour >= 9;
    const existingItem = this.getActiveDecoration();

    if (isFestivalTime && !existingItem) {
      this.placeDecoration(time.season);
    } else if (!isFestivalTime && existingItem) {
      this.removeDecoration();
    }
  }

  // ============================================================================
  // Private helpers
  // ============================================================================

  private getActiveDecoration() {
    return gameState.getPlacedItems(VILLAGE_MAP_ID).find((item) => item.id === DECORATION_ITEM_ID);
  }

  private placeDecoration(season: Season): void {
    const decorationData = SEASON_DECORATIONS[season];
    if (!decorationData) return;

    gameState.addPlacedItem({
      id: DECORATION_ITEM_ID,
      itemId: decorationData.itemId,
      position: DECORATION_POSITION,
      mapId: VILLAGE_MAP_ID,
      image: decorationData.image,
      timestamp: Date.now(),
      permanent: true, // Prevent normal decay — SeasonalEventManager controls removal
    });

    debugLog(
      'SeasonalEventManager',
      `Placed ${decorationData.itemId} in village square for ${season}`
    );
  }

  private removeDecoration(): void {
    gameState.removePlacedItem(DECORATION_ITEM_ID);
    debugLog('SeasonalEventManager', 'Removed seasonal decoration from village square');
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const seasonalEventManager = new SeasonalEventManagerClass();
