/**
 * SnowmanManager
 *
 * Places a snowman decoration at a random free tile whenever the player
 * finishes the "build_snowman" cutscene with the village child (see
 * data/cutscenes/buildSnowman.ts and App.tsx's handleCutsceneComplete).
 * Replayable, so many snowmen can accumulate around the village over a
 * winter — check() removes all of them the moment the season changes.
 *
 * Modeled directly on utils/SnowAngelManager.ts, simplified: there's no
 * per-map weather condition here, only a global season check.
 */

import { Position } from '../types';
import { TimeManager, Season } from './TimeManager';
import { gameState } from '../GameState';
import { mapManager } from '../maps';
import { getItem } from '../data/items';

export const SNOWMAN_IMAGE = '/TwilightGame/assets-optimized/seasonal/snowman.png';
const SNOWMAN_ITEM_ID = 'seasonal_snowman';
const MAX_PLACEMENT_ATTEMPTS = 30;

/** True when no existing placed item's footprint covers this tile. */
function isTileFree(mapId: string, pos: Position): boolean {
  const placedItems = gameState.getPlacedItems(mapId);
  return !placedItems.some((item) => {
    const def = getItem(item.itemId);

    if (def?.interactionTileRadius === 0) {
      const ix = item.position.x + (def.interactionOffsetX ?? 0);
      const iy = item.position.y + (def.interactionOffsetY ?? 0);
      return Math.floor(pos.x) === Math.floor(ix) && Math.floor(pos.y) === Math.floor(iy);
    }

    if (
      Math.floor(item.position.x) === Math.floor(pos.x) &&
      Math.floor(item.position.y) === Math.floor(pos.y)
    ) {
      return true;
    }

    const scale = item.customScale ?? def?.placedScale ?? 1;
    if (scale <= 1) return false;

    // Sprite renders from (position - (scale-1)/2) to (position + (scale+1)/2) in tile
    // coords — mirrors findItemAtPosition in utils/interactions/index.ts.
    const halfLo = (scale - 1) / 2;
    const halfHi = (scale + 1) / 2;
    return (
      Math.floor(pos.x) >= Math.floor(item.position.x - halfLo) &&
      Math.floor(pos.x) <= Math.floor(item.position.x + halfHi) &&
      Math.floor(pos.y) >= Math.floor(item.position.y - halfLo) &&
      Math.floor(pos.y) <= Math.floor(item.position.y + halfHi)
    );
  });
}

class SnowmanManagerClass {
  /**
   * Place a new snowman at a random free tile on the given map. Grass tufts
   * and dirt/farm plots are ordinary walkable ground tiles (not placed
   * items), so they're valid targets without any special-casing — only an
   * existing placed item or a wall/multi-tile-sprite footprint disqualifies
   * a tile (both handled by mapManager.findUnoccupiedPosition).
   *
   * Retries with fresh random targets rather than trusting a single spiral
   * search: findUnoccupiedPosition falls back towards the map's spawn point
   * when its first target is unlucky, which would cluster snowmen near
   * spawn instead of scattering them, as requested.
   */
  placeRandom(mapId: string): Position | null {
    const map = mapManager.getMap(mapId);
    if (!map) return null;

    for (let attempt = 0; attempt < MAX_PLACEMENT_ATTEMPTS; attempt++) {
      const target: Position = {
        x: Math.floor(Math.random() * map.width),
        y: Math.floor(Math.random() * map.height),
      };
      const pos = mapManager.findUnoccupiedPosition(mapId, target, (p) => isTileFree(mapId, p));
      if (!pos) continue;

      gameState.addPlacedItem({
        id: `snowman_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        itemId: SNOWMAN_ITEM_ID,
        position: pos,
        mapId,
        image: SNOWMAN_IMAGE,
        timestamp: Date.now(),
        permanent: true, // Removal is owned by check(), not the generic decay sweep
      });

      return pos;
    }

    return null;
  }

  /**
   * Call this periodically (every TIMING.SEASONAL_EVENT_CHECK_MS) from the game loop.
   * Removes every snowman, on every map, the moment it stops being winter.
   */
  check(): void {
    const snowmen = gameState
      .getAllPlacedItems()
      .filter((item) => item.itemId === SNOWMAN_ITEM_ID);
    if (snowmen.length === 0) return;

    if (!TimeManager.isCurrentSeason(Season.WINTER)) {
      for (const snowman of snowmen) {
        gameState.removePlacedItem(snowman.id);
      }
    }
  }
}

export const snowmanManager = new SnowmanManagerClass();
