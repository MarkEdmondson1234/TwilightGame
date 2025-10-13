import { mapManager } from './MapManager';
import { COLOR_SCHEMES } from './colorSchemes';
import { homeInterior } from './definitions/homeInterior';
import { village } from './definitions/village';
import { generateRandomForest, generateRandomCave, generateRandomShop } from './procedural';

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
  mapManager.registerMap(village);

  // Generate and register initial random maps
  // These will be regenerated when transitioning to RANDOM_* IDs
  mapManager.registerMap(generateRandomForest());
  mapManager.registerMap(generateRandomCave());
  mapManager.registerMap(generateRandomShop());
}

/**
 * Handle transition to a map, generating random maps as needed
 */
export function transitionToMap(mapId: string, spawnPoint?: { x: number; y: number }) {
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
        newMap = generateRandomShop();
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
