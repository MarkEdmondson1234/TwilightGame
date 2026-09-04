/**
 * Special forage sources that don't fit the declarative tile-anchor table:
 *
 *  - Stream (dragonfly wings): triggered by being ADJACENT to a 5×5 stream
 *    sprite, not by a tile anchor; cooldown is recorded at the player's tile.
 *  - Sparrow feathers: triggered by a nearby sparrow NPC whose animated state
 *    is sitting/landing; cooldown is recorded at the sparrow's tile.
 */

import { getTileData, getTileCoords } from '../mapUtils';
import { gameState } from '../../GameState';
import { inventoryManager } from '../inventoryManager';
import { getItem } from '../../data/items';
import { TileType } from '../../types';
import { npcManager } from '../../NPCManager';
import { debugLog } from '../debugLog';
import {
  dragonfliesGate,
  rollPairQuantity,
  saveForageResult,
} from './helpers';import type { ForageResult } from './types';

/** Stream sprites are 5×5 tiles with the anchor at the centre (±2 tiles). */
const STREAM_HALF_SIZE = 2;
/** Search radius to find a stream anchor: 2 (sprite half-size) + 1 adjacency + 1 buffer. */
const STREAM_SEARCH_RADIUS = 4;

/**
 * True when the player stands adjacent to (but outside) a 5×5 stream area.
 * Scans nearby tiles for a STREAM anchor, then checks adjacency to the
 * sprite's footprint.
 */
function isAdjacentToStream(playerTileX: number, playerTileY: number): boolean {
  for (let dy = -STREAM_SEARCH_RADIUS; dy <= STREAM_SEARCH_RADIUS; dy++) {
    for (let dx = -STREAM_SEARCH_RADIUS; dx <= STREAM_SEARCH_RADIUS; dx++) {
      const checkX = playerTileX + dx;
      const checkY = playerTileY + dy;
      const checkTile = getTileData(checkX, checkY);
      if (checkTile?.type !== TileType.STREAM) continue;

      // The 5×5 sprite extends from (anchor-2, anchor-2) to (anchor+2, anchor+2);
      // the player must be within 1 tile of it but not inside it.
      const streamLeft = checkX - STREAM_HALF_SIZE;
      const streamRight = checkX + STREAM_HALF_SIZE;
      const streamTop = checkY - STREAM_HALF_SIZE;
      const streamBottom = checkY + STREAM_HALF_SIZE;

      const adjacent =
        playerTileX >= streamLeft - 1 &&
        playerTileX <= streamRight + 1 &&
        playerTileY >= streamTop - 1 &&
        playerTileY <= streamBottom + 1 &&
        !(
          playerTileX >= streamLeft &&
          playerTileX <= streamRight &&
          playerTileY >= streamTop &&
          playerTileY <= streamBottom
        );
      if (adjacent) return true;
    }
  }
  return false;
}

/**
 * Stream foraging (dragonfly wings). Returns a ForageResult when the player is
 * near a stream (the stream owns the forage), or null to continue.
 */
export function forageStream(
  playerTileX: number,
  playerTileY: number,
  currentMapId: string
): ForageResult | null {
  if (!isAdjacentToStream(playerTileX, playerTileY)) return null;

  const blocked = dragonfliesGate(
    'Dragonflies only appear in spring and summer during the day.'
  )();
  if (blocked) return blocked;

  const dragonflyWings = getItem('dragonfly_wings');
  if (!dragonflyWings) {
    console.error('[Forage] Dragonfly wings item not found!');
    return { found: false, message: 'Something went wrong.' };
  }

  // Per-item success rate (dragonfly_wings has forageSuccessRate: 1.0)
  const successRate = dragonflyWings.forageSuccessRate ?? 0.5; // Default to 50% if not specified
  if (Math.random() >= successRate) {
    // Failure - set cooldown but don't give item
    gameState.recordForage(currentMapId, playerTileX, playerTileY);
    return {
      found: false,
      message: 'You search near the stream, but find nothing.',
    };
  }

  const quantityFound = rollPairQuantity();
  inventoryManager.addItem('dragonfly_wings', quantityFound);
  debugLog(
    'Forage',
    `Found ${quantityFound} ${dragonflyWings.displayName} near stream (${(successRate * 100).toFixed(0)}% success rate)`
  );
  // No itemId passed — dragonfly_wings is not a rare-discovery item.
  saveForageResult(currentMapId, playerTileX, playerTileY);

  return {
    found: true,
    seedId: 'dragonfly_wings', // Reuse field for item ID
    seedName: dragonflyWings.displayName, // Use displayName for UI
    message: `Found ${quantityFound} ${dragonflyWings.displayName}!`,
  };
}

/** Find a sparrow NPC within foraging range (3 tiles) of the player. */
function findNearbySparrowNPC(
  playerTileX: number,
  playerTileY: number
): { id: string; position: { x: number; y: number }; animatedStates?: { currentState?: string } } | null {
  const npcs = npcManager.getCurrentMapNPCs();
  return (
    npcs.find(
      (npc) =>
        npc.id.startsWith('sparrow_') &&
        Math.abs(npc.position.x - playerTileX) <= 3 &&
        Math.abs(npc.position.y - playerTileY) <= 3
    ) ?? null
  );
}

/**
 * Sparrow feather foraging. Returns a ForageResult when a sparrow is nearby
 * (the sparrow owns the forage), or null to continue.
 */
export function forageSparrowFeather(
  playerTileX: number,
  playerTileY: number,
  currentMapId: string
): ForageResult | null {
  const sparrow = findNearbySparrowNPC(playerTileX, playerTileY);
  if (!sparrow) return null;

  const sparrowTile = getTileCoords(sparrow.position);

  // Same conditions as dragonflies: spring/summer, daytime
  const blocked = dragonfliesGate(
    'Sparrows only shed feathers in spring and summer during the day.'
  )();
  if (blocked) return blocked;

  // Feathers fall when the sparrow lands — check its animated state
  const state = sparrow.animatedStates?.currentState;
  if (state && state !== 'sitting' && state !== 'landing') {
    return {
      found: false,
      message:
        'The sparrow is flying about. Wait for it to land before searching for feathers.',
    };
  }

  const featherItem = getItem('feather');
  if (!featherItem) {
    console.error('[Forage] Feather item not found in items.ts!');
    return { found: false, message: 'Something went wrong.' };
  }

  const successRate = featherItem.forageSuccessRate ?? 0.5;
  if (Math.random() >= successRate) {
    gameState.recordForage(currentMapId, sparrowTile.x, sparrowTile.y);
    return {
      found: false,
      message: 'You search near the sparrow, but find no feathers this time.',
    };
  }

  const quantityFound = rollPairQuantity();
  inventoryManager.addItem('feather', quantityFound);
  debugLog(
    'Forage',
    `Found ${quantityFound} Feather(s) near sparrow (${(successRate * 100).toFixed(0)}% success rate)`
  );
  saveForageResult(currentMapId, sparrowTile.x, sparrowTile.y, 'feather');

  return {
    found: true,
    seedId: 'feather',
    seedName: featherItem.displayName,
    message: `Found ${quantityFound} ${featherItem.displayName}${quantityFound > 1 ? 's' : ''}!`,
  };
}