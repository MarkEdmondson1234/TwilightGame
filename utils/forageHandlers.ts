/**
 * Forage Handlers - public entry point for all foraging interactions.
 *
 * This is a facade over utils/forage/ (mirroring the data/items.ts pattern):
 *
 *   utils/forage/types.ts         — ForageResult, ForageSource, gates
 *   utils/forage/helpers.ts       — quantity rolls, gate builders, save/cooldown
 *   utils/forage/sources.ts       — the declarative table of anchor sources
 *   utils/forage/anchorForage.ts  — executes table entries
 *   utils/forage/specialForage.ts — stream (dragonfly wings) + sparrow feathers
 *   utils/forage/bushHarvest.ts   — the four adjacent-bush harvests
 *   utils/forage/wildTiles.ts     — forest-floor fallback (strawberries, seeds)
 *
 * handleForageAction preserves the pre-refactor claim order exactly:
 * stamina → early cooldown scan → stream → sparrow → anchor table →
 * bushes → wild tiles.
 */

import { getTileCoords, getTileData, findTileTypeNearby, hasTileTypeNearby } from './mapUtils';
import { gameState } from '../GameState';
import { staminaManager } from './StaminaManager';
import { TIMING } from '../constants';
import { debugLog } from './debugLog';
import type { Position } from '../types';
import { TileType } from '../types';
import { forageNearbySource } from './forage/anchorForage';
import { forageStream, forageSparrowFeather } from './forage/specialForage';
import {
  handleBlackberryHarvest,
  handleBlueberryHarvest,
  handleHazelnutHarvest,
  handleRedBerryHarvest,
} from './forage/bushHarvest';
import { forageWildTile } from './forage/wildTiles';
import type { ForageResult } from './forage/types';

export type { ForageResult } from './forage/types';
export {
  handleBlackberryHarvest,
  handleHazelnutHarvest,
  handleBlueberryHarvest,
  handleRedBerryHarvest,
} from './forage/bushHarvest';

/**
 * Tiles whose multi-tile anchor participates in the EARLY cooldown scan below.
 *
 * Deliberately narrower than the full source table: BEE_HIVE is excluded (it
 * has its own cooldown check with a custom message), and the sources with
 * explicit cooldownMessages in sources.ts (heather, spruce, mustard, violet,
 * frost flower) also self-check. Tiles NOT listed here — dead spruce, spruce
 * trees, giant mushroom, sakura — have no cooldown gate anywhere, matching the
 * pre-refactor behaviour (flagged as a likely oversight in the refactor notes).
 */
const EARLY_COOLDOWN_TILES = [
  TileType.MOONPETAL,
  TileType.ADDERSMEAT,
  TileType.WOLFSBANE,
  TileType.ROSEBUSH_PINK,
  TileType.ROSEBUSH_RED,
  TileType.LUMINESCENT_TOADSTOOL,
  TileType.FOREST_MUSHROOM,
  TileType.MUSTARD_FLOWER,
  TileType.FROST_FLOWER,
  TileType.HEATHER,
  TileType.MEADOW_GRASS,
];

/**
 * Handle foraging action - search for wild seeds on forageable tiles
 * Only works in forest/outdoor maps
 * Returns result with found seed info, or null if nothing found
 */
export function handleForageAction(playerPos: Position, currentMapId: string): ForageResult {
  // Foraging costs stamina
  if (!staminaManager.performActivity('forage')) {
    return { found: false, message: '' };
  }

  const { x: playerTileX, y: playerTileY } = getTileCoords(playerPos);
  const tileData = getTileData(playerTileX, playerTileY);

  if (!tileData) {
    return { found: false, message: 'Nothing to forage here.' };
  }

  // Check cooldown FIRST (applies to all foraging types)
  // For multi-tile sprites (like moonpetal/addersmeat 3x3), check cooldown at anchor position
  // Note: BEE_HIVE handles its own cooldown check with a custom message
  let cooldownCheckPos = { x: playerTileX, y: playerTileY };
  let skipEarlyCooldownCheck = false;

  // Check if player is near a forageable multi-tile sprite anchor (for 2x2 and 3x3 area foraging)
  const forageableResult = findTileTypeNearby(playerTileX, playerTileY, EARLY_COOLDOWN_TILES);
  if (forageableResult.found && forageableResult.position) {
    cooldownCheckPos = forageableResult.position;
  }

  // BEE_HIVE handles its own cooldown with a custom message, so skip early check
  if (hasTileTypeNearby(playerTileX, playerTileY, TileType.BEE_HIVE)) {
    skipEarlyCooldownCheck = true;
  }

  if (
    !skipEarlyCooldownCheck &&
    gameState.isForageTileOnCooldown(
      currentMapId,
      cooldownCheckPos.x,
      cooldownCheckPos.y,
      TIMING.FORAGE_COOLDOWN_MS
    )
  ) {
    debugLog('Forage', `Tile (${cooldownCheckPos.x}, ${cooldownCheckPos.y}) is on cooldown`);
    return { found: false, message: '' };
  }

  // Special sources: stream (dragonfly wings) and sparrow feathers. Each owns
  // the forage when its trigger is nearby; null means "not mine, continue".
  const streamResult = forageStream(playerTileX, playerTileY, currentMapId);
  if (streamResult) return streamResult;

  const sparrowResult = forageSparrowFeather(playerTileX, playerTileY, currentMapId);
  if (sparrowResult) return sparrowResult;

  // Declarative anchor sources (moonpetal, rosebushes, bee hive, …) — first
  // match in FORAGE_SOURCES wins.
  const anchoredResult = forageNearbySource(playerTileX, playerTileY, currentMapId);
  if (anchoredResult) return anchoredResult;

  // Adjacent bush harvests — a result with a message (out of season, on
  // cooldown) short-circuits; an empty message means "no bush of this kind
  // nearby, try the next".
  const brambleResult = handleBlackberryHarvest(playerPos, currentMapId);
  if (brambleResult.found || brambleResult.message) return brambleResult;

  const hazelResult = handleHazelnutHarvest(playerPos, currentMapId);
  if (hazelResult.found || hazelResult.message) return hazelResult;

  const blueberryResult = handleBlueberryHarvest(playerPos, currentMapId);
  if (blueberryResult.found || blueberryResult.message) return blueberryResult;

  const redBerryResult = handleRedBerryHarvest(playerPos, currentMapId);
  if (redBerryResult.found || redBerryResult.message) return redBerryResult;

  // Forest floor fallback (wild strawberries, mushrooms, seed drops)
  return forageWildTile(tileData.type, playerTileX, playerTileY, currentMapId);
}