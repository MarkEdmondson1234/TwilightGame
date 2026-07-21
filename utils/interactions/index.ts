/**
 * Interaction system — public entry point.
 *
 * `getAvailableInteractions` answers "what can the player do at this position?". It builds
 * a shared context once, then walks the ordered provider registry collecting options.
 *
 * This replaced a single 1,300-line function. Each provider now lives in its own file
 * under ./providers/ — see ./README.md before adding one.
 */

import { getTileData } from '../mapUtils';
import { gameState } from '../../GameState';
import { getItem } from '../../data/items';
import { INTERACTION_PROVIDERS } from './registry';
import type {
  AvailableInteraction,
  GetInteractionsConfig,
  InteractionContext,
  InteractionProvider,
  PlacedItem,
} from './types';

export * from './types';
export { INTERACTION_PROVIDERS } from './registry';

/**
 * Find the placed item under an interaction position.
 *
 * Large decorations (placedScale > 1) render centred on their anchor tile, so a click
 * anywhere inside their scaled bounding box should hit them — not just the anchor.
 */
function findItemAtPosition(
  placedItems: PlacedItem[],
  tileX: number,
  tileY: number
): PlacedItem | undefined {
  return placedItems.find((item) => {
    const def = getItem(item.itemId);
    // Items with interactionTileRadius: 0 only respond to clicks on their (optionally offset) anchor tile
    if (def?.interactionTileRadius === 0) {
      const ix = item.position.x + (def.interactionOffsetX ?? 0);
      const iy = item.position.y + (def.interactionOffsetY ?? 0);
      return tileX === ix && tileY === iy;
    }
    if (item.position.x === tileX && item.position.y === tileY) return true;
    const scale = item.customScale ?? def?.placedScale ?? 1;
    if (scale <= 1) return false;
    // Sprite renders from (position - (scale-1)/2) to (position + (scale+1)/2) in tile coords.
    // Lower bound uses (scale-1)/2; upper bound uses (scale+1)/2 (one tile larger).
    const halfLo = (scale - 1) / 2;
    const halfHi = (scale + 1) / 2;
    return (
      tileX >= Math.floor(item.position.x - halfLo) &&
      tileX <= Math.floor(item.position.x + halfHi) &&
      tileY >= Math.floor(item.position.y - halfLo) &&
      tileY <= Math.floor(item.position.y + halfHi)
    );
  });
}

/** Build the context shared by every provider. */
function createInteractionContext(config: GetInteractionsConfig): InteractionContext {
  const tileX = Math.floor(config.position.x);
  const tileY = Math.floor(config.position.y);
  const placedItems = gameState.getPlacedItems(config.currentMapId);

  return {
    ...config,
    playerSizeTier: config.playerSizeTier ?? 0,
    tileX,
    tileY,
    tileData: getTileData(tileX, tileY),
    tilePos: { x: tileX, y: tileY },
    placedItems,
    itemAtPosition: findItemAtPosition(placedItems, tileX, tileY),
  };
}

/**
 * Walk providers in order, concatenating what they offer.
 *
 * Stops early at the first provider that returns `exclusive: true` — that provider's
 * interactions are kept, and every provider after it is skipped.
 *
 * Exported separately from `getAvailableInteractions` so it can be tested without
 * standing up a map, a player and a save file.
 */
export function runProviders(
  providers: InteractionProvider[],
  ctx: InteractionContext
): AvailableInteraction[] {
  const interactions: AvailableInteraction[] = [];

  for (const provider of providers) {
    const result = provider(ctx);

    if (Array.isArray(result)) {
      interactions.push(...result);
      continue;
    }

    interactions.push(...result.interactions);
    if (result.exclusive) break;
  }

  return interactions;
}

/**
 * Get all available interactions at a specific position.
 * Returns an array of interaction options that can be presented to the player.
 */
export function getAvailableInteractions(config: GetInteractionsConfig): AvailableInteraction[] {
  return runProviders(INTERACTION_PROVIDERS, createInteractionContext(config));
}
