/**
 * Adjacent-bush harvests (blackberries, hazelnuts, blueberries, red berries).
 *
 * Four near-identical flows — find the bush type in the surrounding 8 tiles →
 * season check → cooldown check → random yield → grant item — differing only
 * in the BushHarvestConfig values below.
 */

import { getTileData, getSurroundingTiles, getTileCoords } from '../mapUtils';
import { gameState } from '../../GameState';
import { inventoryManager } from '../inventoryManager';
import { TimeManager, Season } from '../TimeManager';
import { TIMING } from '../../constants';
import { debugLog } from '../debugLog';
import { saveForageResult } from './helpers';
import type { Position } from '../../types';
import type { ForageResult } from './types';
import { TileType } from '../../types';

interface BushHarvestConfig {
  tileType: TileType;
  seasons: Season[];
  itemId: string;
  /** Lower-case plant name, for log lines only (e.g. "blackberries"). */
  logLabel: string;
  /** Inclusive yield range. */
  yieldMin: number;
  yieldMax: number;
  outOfSeasonMessage: string;
  successMessage: (quantity: number) => string;
}

/** Shared implementation for the four handleXHarvest functions below. */
function harvestBush(
  playerPos: Position,
  currentMapId: string,
  config: BushHarvestConfig
): ForageResult {
  const { x: playerTileX, y: playerTileY } = getTileCoords(playerPos);

  for (const tile of getSurroundingTiles({ x: playerTileX, y: playerTileY })) {
    const tileData = getTileData(tile.x, tile.y);
    if (!tileData || tileData.type !== config.tileType) continue;

    const { season } = TimeManager.getCurrentTime();
    if (!config.seasons.includes(season)) {
      debugLog('Forage', `${config.logLabel} bush out of season (${season})`);
      return { found: false, message: config.outOfSeasonMessage, outOfSeason: true };
    }

    if (gameState.isForageTileOnCooldown(currentMapId, tile.x, tile.y, TIMING.FORAGE_COOLDOWN_MS)) {
      return { found: false, message: "You've already picked from this bush. Come back tomorrow!" };
    }

    const quantity =
      Math.floor(Math.random() * (config.yieldMax - config.yieldMin + 1)) + config.yieldMin;
    inventoryManager.addItem(config.itemId, quantity);
    saveForageResult(currentMapId, tile.x, tile.y);

    debugLog('Forage', `Picked ${quantity} ${config.logLabel}`);
    return { found: true, message: config.successMessage(quantity) };
  }

  return { found: false, message: '' };
}

/**
 * Harvest blackberries from an adjacent bramble bush (summer only).
 * Returns { found: false, message: '' } if no brambles nearby — caller should continue.
 * Does not drain stamina — caller is responsible.
 */
export function handleBlackberryHarvest(playerPos: Position, currentMapId: string): ForageResult {
  return harvestBush(playerPos, currentMapId, {
    tileType: TileType.BRAMBLES,
    seasons: [Season.SUMMER],
    itemId: 'crop_blackberry',
    logLabel: 'blackberries',
    yieldMin: 3,
    yieldMax: 7,
    outOfSeasonMessage: 'The brambles have no ripe berries yet.',
    successMessage: (quantity) => `Picked ${quantity} blackberries!`,
  });
}

/**
 * Harvest hazelnuts from an adjacent hazel bush (autumn only).
 * Returns { found: false, message: '' } if no hazel bush nearby — caller should continue.
 * Does not drain stamina — caller is responsible.
 */
export function handleHazelnutHarvest(playerPos: Position, currentMapId: string): ForageResult {
  return harvestBush(playerPos, currentMapId, {
    tileType: TileType.HAZEL_BUSH,
    seasons: [Season.AUTUMN],
    itemId: 'crop_hazelnut',
    logLabel: 'hazelnuts',
    yieldMin: 4,
    yieldMax: 8,
    outOfSeasonMessage: 'The hazel bushes have no ripe nuts yet.',
    successMessage: (quantity) => `Picked ${quantity} hazelnuts!`,
  });
}

/**
 * Harvest blueberries from an adjacent blueberry bush (summer and autumn).
 * Returns { found: false, message: '' } if no blueberry bush nearby — caller should continue.
 * Does not drain stamina — caller is responsible.
 */
export function handleBlueberryHarvest(playerPos: Position, currentMapId: string): ForageResult {
  return harvestBush(playerPos, currentMapId, {
    tileType: TileType.BLUEBERRY_BUSH,
    seasons: [Season.SUMMER, Season.AUTUMN],
    itemId: 'crop_blueberry',
    logLabel: 'blueberries',
    yieldMin: 3,
    yieldMax: 6,
    outOfSeasonMessage: 'The blueberry bushes have no ripe berries yet.',
    successMessage: (quantity) => `Picked ${quantity} blueberries!`,
  });
}

/**
 * Harvest red berries from an adjacent hawthorn bush (autumn only).
 * Returns { found: false, message: '' } if no hawthorn bush nearby — caller should continue.
 * Does not drain stamina — caller is responsible.
 */
export function handleRedBerryHarvest(playerPos: Position, currentMapId: string): ForageResult {
  return harvestBush(playerPos, currentMapId, {
    tileType: TileType.BUSH,
    seasons: [Season.AUTUMN],
    itemId: 'red_berries',
    logLabel: 'red berries',
    yieldMin: 3,
    yieldMax: 6,
    outOfSeasonMessage: 'The hawthorn bush has no ripe berries yet.',
    successMessage: (quantity) => `Picked ${quantity} red berries!`,
  });
}