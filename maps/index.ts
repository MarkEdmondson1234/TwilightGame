import { mapManager } from './MapManager';
import { COLOR_SCHEMES } from './colorSchemes';
import { homeInterior } from './definitions/homeInterior';
import { homeUpstairs } from './definitions/homeUpstairs';
import { village } from './definitions/village';
import { shop } from './definitions/shop';
import { house1 } from './definitions/house1';
import { house2 } from './definitions/house2';
import { house3 } from './definitions/house3';
import { house4 } from './definitions/house4';
import { cottageInterior } from './definitions/cottageInterior';
import { farmArea } from './definitions/farmArea';
import { seedShed } from './definitions/seedShed';
import { debugNPCs } from './definitions/debugNPCs';
import { deepForest } from './definitions/deepForest';
import { witchHut } from './definitions/witchHut';
import { witchHutInterior } from './definitions/witchHutInterior';
import { mumsKitchen } from './definitions/mumsKitchen';
import { magicalLake } from './definitions/magicalLake';
import { generateRandomForest, generateRandomCave, generateRandomShop } from './procedural';
import { gameState } from '../GameState';

/**
 * Initialize all maps and color schemes
 * This should be called once at app startup
 */
export function initializeMaps(): void {
  // Register all color schemes
  Object.values(COLOR_SCHEMES).forEach(scheme => {
    mapManager.registerColorScheme(scheme);
  });

  // Register designed maps
  mapManager.registerMap(homeInterior);
  mapManager.registerMap(homeUpstairs);
  mapManager.registerMap(village);
  mapManager.registerMap(shop);
  mapManager.registerMap(house1);
  mapManager.registerMap(house2);
  mapManager.registerMap(house3);
  mapManager.registerMap(house4);
  mapManager.registerMap(cottageInterior);
  mapManager.registerMap(farmArea);
  mapManager.registerMap(seedShed);
  mapManager.registerMap(debugNPCs);
  mapManager.registerMap(deepForest);
  mapManager.registerMap(witchHut);
  mapManager.registerMap(witchHutInterior);
  mapManager.registerMap(mumsKitchen);
  mapManager.registerMap(magicalLake);

  // Generate and register initial random maps
  // These will be regenerated when transitioning to RANDOM_* IDs
  mapManager.registerMap(generateRandomForest());
  mapManager.registerMap(generateRandomCave());
  mapManager.registerMap(generateRandomShop());
}

/**
 * Handle transition to a map, generating random maps as needed
 * Also updates game state for depth tracking
 */
export function transitionToMap(mapId: string, spawnPoint?: { x: number; y: number }, fromMapId?: string) {
  // Track depth changes
  if (mapId.startsWith('RANDOM_')) {
    const type = mapId.replace('RANDOM_', '').toLowerCase();

    // Going deeper into forest/cave
    if (type === 'forest') {
      gameState.enterForest();
    } else if (type === 'cave') {
      gameState.enterCave();
    }
  } else if (mapId === 'village') {
    // Coming back to village - reset all depth counters
    const currentForestDepth = gameState.getForestDepth();
    const currentCaveDepth = gameState.getCaveDepth();

    if (currentForestDepth > 0) {
      console.log(`[GameState] Exited forest completely (was at depth ${currentForestDepth})`);
      gameState.resetForestDepth();
    }
    if (currentCaveDepth > 0) {
      console.log(`[GameState] Exited cave completely (was at depth ${currentCaveDepth})`);
      gameState.resetCaveDepth();
    }
  }

  // Handle RANDOM_* map IDs
  if (mapId.startsWith('RANDOM_')) {
    const type = mapId.replace('RANDOM_', '').toLowerCase();
    let newMap;

    switch (type) {
      case 'forest':
        newMap = generateRandomForest();
        break;
      case 'cave':
        newMap = generateRandomCave();
        break;
      case 'shop':
        // Generate shop with exit back to the current map location from game state
        const playerLocation = gameState.getPlayerLocation();
        newMap = generateRandomShop(undefined, playerLocation.mapId, playerLocation.position);
        break;
      default:
        throw new Error(`Unknown random map type: ${type}`);
    }

    mapManager.registerMap(newMap);
    return mapManager.transitionToMap(newMap.id, spawnPoint);
  }

  // Regular map transition
  return mapManager.transitionToMap(mapId, spawnPoint);
}

// Export the mapManager singleton
export { mapManager };
