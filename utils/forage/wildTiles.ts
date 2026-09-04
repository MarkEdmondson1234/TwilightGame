/**
 * Wild-tile foraging: the forest floor fallback at the end of the forage
 * chain — wild strawberries, loose mushrooms and rarity-weighted seed drops
 * on FORAGEABLE_TILES. Runs only when no anchor source or bush claimed the
 * forage first.
 */

import { gameState } from '../../GameState';
import { inventoryManager } from '../inventoryManager';
import { characterData } from '../CharacterData';
import { generateForageSeed } from '../../data/items';
import { TimeManager, Season } from '../TimeManager';
import { debugLog } from '../debugLog';
import { saveForageResult } from './helpers';
import { TileType } from '../../types';
import type { ForageResult } from './types';

/**
 * Forageable tile types - tiles where players can search for wild seeds
 */
const FORAGEABLE_TILES: TileType[] = [
  TileType.FERN,
  TileType.MUSHROOM,
  TileType.GRASS,
  TileType.WILD_STRAWBERRY,
];

/**
 * Forage the tile the player is standing on (forest/deep_forest maps only).
 * Every earlier forage kind (anchor sources, streams, sparrows, bushes) must
 * have declined before this runs.
 */
export function forageWildTile(
  tileType: TileType,
  playerTileX: number,
  playerTileY: number,
  currentMapId: string
): ForageResult {
  // Forest foraging only
  if (!currentMapId.startsWith('forest') && currentMapId !== 'deep_forest') {
    return { found: false, message: 'Nothing to forage here.' };
  }

  // Check if standing on a forageable tile
  if (!FORAGEABLE_TILES.includes(tileType)) {
    return { found: false, message: 'Nothing to forage here.' };
  }

  // Wild strawberries only fruit in summer - check before recording forage so cooldown isn't wasted
  if (tileType === TileType.WILD_STRAWBERRY) {
    const currentSeason = TimeManager.getCurrentTime().season;
    if (currentSeason !== Season.SUMMER) {
      const message =
        currentSeason === Season.SPRING
          ? 'The wild strawberry plants are not ripe yet — they fruit in summer.'
          : 'The wild strawberry season has already passed for this year.';
      debugLog('Forage', `Wild strawberries out of season (${currentSeason})`);
      return { found: false, message, outOfSeason: true };
    }
  }

  // Record the forage attempt (starts cooldown for this tile)
  gameState.recordForage(currentMapId, playerTileX, playerTileY);

  // Special handling for wild strawberry plants
  if (tileType === TileType.WILD_STRAWBERRY) {
    // 70% chance to find strawberries (more common than seed foraging)
    if (Math.random() < 0.7) {
      // Random yield: 2-5 strawberries
      const berryYield = Math.floor(Math.random() * 4) + 2; // 2-5
      inventoryManager.addItem('crop_strawberry', berryYield);

      // 30% chance to also get seeds when picking berries
      const gotSeeds = Math.random() < 0.3;
      let seedCount = 0;
      if (gotSeeds) {
        seedCount = Math.floor(Math.random() * 2) + 1; // 1-2 seeds
        inventoryManager.addItem('seed_wild_strawberry', seedCount);
      }

      const inventoryData = inventoryManager.getInventoryData();
      characterData.saveInventory(inventoryData.items, inventoryData.tools);

      const message = gotSeeds
        ? `You picked ${berryYield} strawberries and found ${seedCount} seeds!`
        : `You picked ${berryYield} strawberries!`;

      debugLog('Forage', `${message}`);
      return {
        found: true,
        seedId: gotSeeds ? 'seed_wild_strawberry' : undefined,
        seedName: gotSeeds ? 'Wild Strawberry Seeds' : undefined,
        message,
      };
    } else {
      debugLog('Forage', 'Strawberry plant had no ripe berries');
      return { found: false, message: 'This strawberry plant has no ripe berries yet.' };
    }
  }

  // Mushroom foraging - gives mushroom items, not seeds
  if (tileType === TileType.MUSHROOM) {
    // 70% chance to find nothing (silent failure)
    if (Math.random() < 0.7) {
      debugLog('Forage', 'Searched mushrooms but found nothing');
      // Cooldown already started by the recordForage above — no need to re-record.
      return { found: false, message: '' };
    }

    // Found mushrooms!
    inventoryManager.addItem('mushroom', 1);
    saveForageResult(currentMapId, playerTileX, playerTileY);

    debugLog('Forage', 'Found a mushroom');
    return {
      found: true,
      seedId: 'mushroom',
      seedName: 'Mushroom',
      message: 'Found a mushroom!',
    };
  }

  // Regular foraging for other tiles - uses rarity-weighted random drops
  const seed = generateForageSeed();

  if (!seed) {
    // Silent failure - no message
    debugLog('Forage', 'Searched but found nothing');
    return { found: false, message: '' };
  }

  // Found a seed! Add to inventory
  inventoryManager.addItem(seed.id, 1);
  const inventoryData = inventoryManager.getInventoryData();
  characterData.saveInventory(inventoryData.items, inventoryData.tools);

  debugLog('Forage', `Found ${seed.displayName}`);
  return {
    found: true,
    seedId: seed.id,
    seedName: seed.displayName,
    message: `Found ${seed.displayName}!`,
  };
}