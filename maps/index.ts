import { startDiagnosticOperation } from '../utils/sessionDiagnostics';
import { mapManager } from './MapManager';
import { hashString } from '../utils/seededRandom';
import { depthsAfterTransition, PROCEDURAL_KINDS } from './proceduralDepth';
import type { Depths, ProceduralMapKind } from './proceduralDepth';
import { COLOR_SCHEMES } from './colorSchemes';
import { homeUpstairs } from './definitions/homeUpstairs';
import { village } from './definitions/village';
import { shop } from './definitions/shop';
import { house1 } from './definitions/house1';
import { house2 } from './definitions/house2';
import { house3 } from './definitions/house3';
import { house4 } from './definitions/house4';
import { cottageInterior } from './definitions/cottageInterior';
import { farmArea } from './definitions/farmArea';
import { orchard } from './definitions/orchard';
import { seedShed } from './definitions/seedShed';
import { debugNPCs } from './definitions/debugNPCs';
import { deepForest } from './definitions/deepForest';
import { kingLavaFrogLair } from './definitions/kingLavaFrogLair';
import { wizardTrials } from './definitions/wizardTrials';
import { strengthTrial } from './definitions/strengthTrial';
import { testOfPatience } from './definitions/testOfPatience';
import { witchHut } from './definitions/witchHut';
import { witchHutInterior } from './definitions/witchHutInterior';
import { seaSide } from './definitions/seaSide';
import { mumsKitchen } from './definitions/mumsKitchen';
import { magicalLake } from './definitions/magicalLake';
import { bearCave } from './definitions/bearCave';
import { bearDen } from './definitions/bearDen';
import { mushroomMap } from './definitions/mushroomMap';
import { mushraShop } from './definitions/mushraShop';
import { ruins } from './definitions/ruins';
import { personalGarden } from './definitions/personalGarden';
import {
  generateRandomForest,
  generateRandomCave,
  generateRandomShop,
  generateLavaMap,
} from './procedural';
import { gameState } from '../GameState';
import { debugLog } from '../utils/debugLog';

/**
 * Initialize all maps and color schemes
 * This should be called once at app startup
 */
export function initializeMaps(): void {
  // Register all color schemes
  Object.values(COLOR_SCHEMES).forEach((scheme) => {
    mapManager.registerColorScheme(scheme);
  });

  // Register designed maps
  mapManager.registerMap(homeUpstairs);
  mapManager.registerMap(village);
  mapManager.registerMap(shop);
  mapManager.registerMap(house1);
  mapManager.registerMap(house2);
  mapManager.registerMap(house3);
  mapManager.registerMap(house4);
  mapManager.registerMap(cottageInterior);
  mapManager.registerMap(farmArea);
  mapManager.registerMap(orchard);
  mapManager.registerMap(seedShed);
  mapManager.registerMap(debugNPCs);
  mapManager.registerMap(deepForest);
  mapManager.registerMap(kingLavaFrogLair);
  mapManager.registerMap(wizardTrials);
  mapManager.registerMap(strengthTrial);
  mapManager.registerMap(testOfPatience);
  mapManager.registerMap(witchHut);
  mapManager.registerMap(witchHutInterior);
  mapManager.registerMap(seaSide);
  mapManager.registerMap(mumsKitchen);
  mapManager.registerMap(magicalLake);
  mapManager.registerMap(bearCave);
  mapManager.registerMap(bearDen);
  mapManager.registerMap(mushroomMap);
  mapManager.registerMap(mushraShop);
  mapManager.registerMap(ruins);
  mapManager.registerMap(personalGarden);

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
export function transitionToMap(mapId: string, spawnPoint?: { x: number; y: number }) {
  const finishDiagnostic = startDiagnosticOperation('map_transition');
  try {
    const result = prepareMapTransition(mapId, spawnPoint);
    finishDiagnostic();
    return result;
  } catch (error) {
    finishDiagnostic(false);
    throw error;
  }
}

/**
 * The seed for one procedural map — a pure function of the calendar date and how
 * deep the player is, never `Date.now()` directly.
 *
 * Multiplayer: with a per-call clock seed, two players who walk into "the
 * forest" together arrive in *different* forests, with the lakes, wolves and
 * bears in different places — so RANDOM_* maps could never be shared. Now the id
 * `forest_<seed>` names one specific world that both of them rebuild
 * identically, which is what lets it be a presence room key (see
 * `multiplayer/sharedMaps.ts`). Single-player: it also fixes the long-standing
 * oddity where stepping out of the forest and straight back in regenerated it
 * entirely.
 *
 * **The real calendar date, not the in-game one.** An in-game day is two real
 * hours (`TimeManager.MS_PER_GAME_DAY`), so keying on `totalDays` reshuffled the
 * forest twelve times a day — and anyone standing in one when it rolled over was
 * stranded in a world no new arrival could reach. "The forest changed again"
 * should mean a day has actually passed.
 *
 * **UTC, not local time.** The date has to be the same string on both players'
 * devices, and a tablet's timezone is not something the game controls. UTC
 * rolls over at 1am BST / midnight GMT, which is nobody's play time.
 */
export function dailyProceduralSeed(kind: ProceduralMapKind, depth: number): number {
  return hashString(`${kind}:${calendarDayKey()}:${depth}`);
}

/** `YYYY-MM-DD` in UTC — the same string on every device at the same moment. */
export function calendarDayKey(at: number = Date.now()): string {
  return new Date(at).toISOString().slice(0, 10);
}

function updateDepthCounters(mapId: string): void {
  const before: Depths = {
    forest: gameState.getForestDepth(),
    cave: gameState.getCaveDepth(),
    lava: gameState.getLavaDepth(),
  };
  const after = depthsAfterTransition(mapId, before);

  // depthsAfterTransition only ever returns the same depth, one deeper, or a
  // reset to zero — so "not zero and not what it was" always means +1, which is
  // exactly what enterX() does.
  const apply: Record<ProceduralMapKind, (depth: number) => void> = {
    forest: (d) => (d === 0 ? gameState.resetForestDepth() : gameState.enterForest()),
    cave: (d) => (d === 0 ? gameState.resetCaveDepth() : gameState.enterCave()),
    lava: (d) => (d === 0 ? gameState.resetLavaDepth() : gameState.enterLava()),
  };

  for (const kind of PROCEDURAL_KINDS) {
    if (after[kind] === before[kind]) continue;
    if (after[kind] === 0) {
      debugLog('GameState', `Exited ${kind} completely (was at depth ${before[kind]})`);
    }
    apply[kind](after[kind]);
  }
}

function prepareMapTransition(mapId: string, spawnPoint?: { x: number; y: number }) {
  updateDepthCounters(mapId);

  // Handle RANDOM_* map IDs
  if (mapId.startsWith('RANDOM_')) {
    const type = mapId.replace('RANDOM_', '').toLowerCase();
    let newMap;

    switch (type) {
      case 'forest': {
        const depth = gameState.getForestDepth();
        newMap = generateRandomForest(dailyProceduralSeed('forest', depth), depth);
        break;
      }
      case 'cave': {
        const depth = gameState.getCaveDepth();
        newMap = generateRandomCave(dailyProceduralSeed('cave', depth), depth);
        break;
      }
      case 'shop': {
        // Generate shop with exit back to the current map location from game state
        const playerLocation = gameState.getPlayerLocation();
        newMap = generateRandomShop(undefined, playerLocation.mapId, playerLocation.position);
        break;
      }
      case 'lava': {
        const depth = gameState.getLavaDepth();
        newMap = generateLavaMap(dailyProceduralSeed('lava', depth), depth);
        break;
      }
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
export type { ProceduralMapKind } from './proceduralDepth';
