/**
 * SnowAngelManager
 *
 * Manages snow angels the player creates by clicking a clear patch of snowy ground.
 * Each angel is a temporary PlacedItem, centred on a 2x2 tile block, that:
 *   - Disappears on its own after TIMING.SNOW_ANGEL_DURATION_MS (3 minutes)
 *   - Disappears immediately if it stops being winter or stops snowing
 *     (checked only while the player is on the map the angel is on)
 *
 * check() reads placed angels directly from gameState rather than tracking them
 * in memory, so angels carried over from a previous session (or left behind by a
 * dev-mode hot-reload of this module) still get cleaned up correctly.
 */

import { Position } from '../types';
import { TimeManager, Season } from './TimeManager';
import { gameState } from '../GameState';
import { mapManager } from '../maps';
import { TIMING } from '../constants';

export const SNOW_ANGEL_IMAGE = '/TwilightGame/assets-optimized/seasonal/snow_angel.png';
const SNOW_ANGEL_ITEM_ID = 'seasonal_snow_angel';

class SnowAngelManagerClass {
  /** Place a new snow angel centred on the given 2x2 block's top-left tile. */
  place(block: Position, mapId: string): void {
    const id = `snow_angel_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const position = { x: block.x + 1, y: block.y + 1 };
    const rotation = (Math.random() * 2 - 1) * (Math.PI / 9); // random tilt, ±20°

    gameState.addPlacedItem({
      id,
      itemId: SNOW_ANGEL_ITEM_ID,
      position,
      mapId,
      image: SNOW_ANGEL_IMAGE,
      timestamp: Date.now(),
      permanent: true, // opt out of the generic 2-minute decay sweep — this manager owns removal
      customScale: 2,
      rotation,
    });
  }

  /**
   * Call this periodically (every TIMING.SEASONAL_EVENT_CHECK_MS) from the game loop.
   * Removes any snow angel whose timer has expired, or whose conditions (winter + snow)
   * are no longer met on the map it's on.
   */
  check(): void {
    const angels = gameState.getAllPlacedItems().filter((item) => item.itemId === SNOW_ANGEL_ITEM_ID);
    if (angels.length === 0) return;

    const now = Date.now();
    const currentMapId = mapManager.getCurrentMapId();
    const conditionsStillMet =
      TimeManager.isCurrentSeason(Season.WINTER) && gameState.getWeather() === 'snow';

    for (const angel of angels) {
      const expired = now - angel.timestamp >= TIMING.SNOW_ANGEL_DURATION_MS;
      const conditionsFailed = angel.mapId === currentMapId && !conditionsStillMet;
      if (expired || conditionsFailed) {
        gameState.removePlacedItem(angel.id);
      }
    }
  }
}

export const snowAngelManager = new SnowAngelManagerClass();
