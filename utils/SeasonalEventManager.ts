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
const SEASON_DECORATIONS: Record<
  Season,
  { itemId: string; image: string }
> = {
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
  [Season.WINTER]: {
    itemId: 'seasonal_yule_tree',
    image: '/TwilightGame/assets-optimized/seasonal/yule_tree.png',
  },
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
    return gameState
      .getPlacedItems(VILLAGE_MAP_ID)
      .find((item) => item.id === DECORATION_ITEM_ID);
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

    console.log(
      `[SeasonalEventManager] Placed ${decorationData.itemId} in village square for ${season}`
    );
  }

  private removeDecoration(): void {
    gameState.removePlacedItem(DECORATION_ITEM_ID);
    console.log('[SeasonalEventManager] Removed seasonal decoration from village square');
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const seasonalEventManager = new SeasonalEventManagerClass();
