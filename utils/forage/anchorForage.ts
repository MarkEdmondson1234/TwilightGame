/**
 * Executes a declarative forage source: find its anchor near the player, run
 * its gates, roll for success, grant the item. One shared implementation for
 * every entry in FORAGE_SOURCES — the pre-refactor chain had ~18 hand-written
 * copies of exactly this shape.
 */

import { findTileTypeNearby } from '../mapUtils';
import { gameState } from '../../GameState';
import { inventoryManager } from '../inventoryManager';
import { getItem } from '../../data/items';
import { TIMING } from '../../constants';
import { debugLog } from '../debugLog';
import { rollForageQuantity, saveForageResult } from './helpers';
import { FORAGE_SOURCES } from './sources';
import type { ForageResult, ForageSource } from './types';

/** Find the anchor tile of a source near the player, or null. */
function findAnchorFor(
  source: ForageSource,
  playerTileX: number,
  playerTileY: number
): { x: number; y: number } | null {
  if (source.findAnchor) {
    return source.findAnchor(playerTileX, playerTileY);
  }
  const result = findTileTypeNearby(playerTileX, playerTileY, source.tileTypes);
  return result.found ? result.position ?? null : null;
}

/**
 * Run one source's harvest against its anchor. Never returns "not this
 * source" — by the time this runs, the anchor check has already claimed the
 * forage for this source.
 */
function harvestFromAnchor(
  source: ForageSource,
  anchor: { x: number; y: number },
  currentMapId: string
): ForageResult {
  // Gates (season, night, weather, …) — first block wins.
  for (const gate of source.gates ?? []) {
    const blocked = gate();
    if (blocked) return blocked;
  }

  // Optional explicit cooldown against the ANCHOR position (whole multi-tile
  // sprite shares one cooldown).
  if (
    source.cooldownMessage &&
    gameState.isForageTileOnCooldown(currentMapId, anchor.x, anchor.y, TIMING.FORAGE_COOLDOWN_MS)
  ) {
    return { found: false, message: source.cooldownMessage };
  }

  const item = getItem(source.itemId);
  if (!item) {
    console.error(`[Forage] ${source.itemId} item not found!`);
    return { found: false, message: 'Something went wrong.' };
  }

  // Per-item success rate, falling back to the source's documented default.
  const successRate = item.forageSuccessRate ?? source.fallbackSuccessRate;
  if (Math.random() >= successRate) {
    // Failure — still set the cooldown so the whole anchor area goes quiet.
    gameState.recordForage(currentMapId, anchor.x, anchor.y);
    return { found: false, message: source.failureMessage };
  }

  const quantity = (source.rollQuantity ?? rollForageQuantity)();
  inventoryManager.addItem(source.itemId, quantity);
  debugLog(
    'Forage',
    `Found ${quantity} ${item.displayName} from ${source.label} (${(successRate * 100).toFixed(0)}% success rate)`
  );
  saveForageResult(currentMapId, anchor.x, anchor.y, source.itemId);

  return {
    found: true,
    seedId: source.itemId, // Reuse field for item ID
    seedName: item.displayName,
    message: source.successMessage
      ? source.successMessage(item.displayName, quantity)
      : `Found ${quantity} ${item.displayName}!`,
  };
}

/**
 * Walk FORAGE_SOURCES in order; the first source with an anchor near the
 * player owns the forage. Returns null when no source matches — the caller
 * should fall through to the next forage kind.
 */
export function forageNearbySource(
  playerTileX: number,
  playerTileY: number,
  currentMapId: string
): ForageResult | null {
  for (const source of FORAGE_SOURCES) {
    const anchor = findAnchorFor(source, playerTileX, playerTileY);
    if (anchor) {
      debugLog(
        'Forage',
        `Found ${source.label} anchor at (${anchor.x}, ${anchor.y}), player at (${playerTileX}, ${playerTileY})`
      );
      return harvestFromAnchor(source, anchor, currentMapId);
    }
  }
  return null;
}