/**
 * Shared helpers for the forage system: quantity rolls, gate builders and the
 * common "save + cooldown + rare-find announcement" step.
 */

import { gameState } from '../../GameState';
import { inventoryManager } from '../inventoryManager';
import { characterData } from '../CharacterData';
import { getItem } from '../../data/items';
import { Season, TimeManager } from '../TimeManager';
import { globalEventManager } from '../GlobalEventManager';
import type { ForageGate } from './types';

/**
 * Rare forageable items that trigger a global discovery event when found
 */
const RARE_FORAGE_ITEMS = new Set([
  'moonpetal',
  'addersmeat',
  'wolfsbane',
  'luminescent_toadstool',
  'shrinking_violet',
  'frost_flower',
  'heather_sprig',
  'fly_agaric',
  'fairy_bluebell',
  'ghost_lichen',
  'giant_mushroom_cap',
  'sakura_petal',
  'feather',
  'phoenix_ash',
]);

/** Save inventory and record forage cooldown at the given position */
export function saveForageResult(
  currentMapId: string,
  anchorX: number,
  anchorY: number,
  itemId?: string
): void {
  const inventoryData = inventoryManager.getInventoryData();
  characterData.saveInventory(inventoryData.items, inventoryData.tools);
  gameState.recordForage(currentMapId, anchorX, anchorY);

  // Publish discovery event for rare items
  if (itemId && RARE_FORAGE_ITEMS.has(itemId)) {
    const item = getItem(itemId);
    const displayName = item?.displayName || itemId;
    globalEventManager
      .publishEvent(
        'discovery',
        `Rare find: ${displayName}`,
        `discovered ${displayName} in the wild`,
        {
          mapId: currentMapId,
          mapName: currentMapId.replace(/_/g, ' '),
        }
      )
      .catch(() => {
        // Silently ignore - publishing is best-effort
      });
  }
}

/** Standard forage quantity roll: 50% chance of 1, 35% chance of 2, 15% chance of 3 */
export function rollForageQuantity(): number {
  const rand = Math.random();
  return rand < 0.5 ? 1 : rand < 0.85 ? 2 : 3;
}

/** Wings/feather quantity roll: 70% chance of 1, 30% chance of 2 */
export function rollPairQuantity(): number {
  return Math.random() < 0.7 ? 1 : 2;
}

/** Moonpetal quantity roll: 60% chance of 1, 30% chance of 2, 10% chance of 3 */
export function rollMoonpetalQuantity(): number {
  const rand = Math.random();
  return rand < 0.6 ? 1 : rand < 0.9 ? 2 : 3;
}

/**
 * Season gate: blocks with outOfSeason when the current season isn't allowed.
 * `message` may be a per-season function (e.g. heather words winter differently
 * from spring/summer).
 */
export function seasonGate(
  allowed: Season[],
  message: string | ((season: Season) => string)
): ForageGate {
  return () => {
    const { season } = TimeManager.getCurrentTime();
    if (allowed.includes(season)) return null;
    return {
      found: false,
      message: typeof message === 'function' ? message(season) : message,
      outOfSeason: true,
    };
  };
}

/** Night gate: blocks unless it is night (moonpetal/addersmeat bloom at night). */
export function nightGate(message: string): ForageGate {
  return () => {
    const { timeOfDay } = TimeManager.getCurrentTime();
    return timeOfDay === 'Night' ? null : { found: false, message };
  };
}

/**
 * Dragonflies-active gate: spring/summer daytime only. Shared by the stream
 * (dragonfly wings) source; note it does NOT set outOfSeason — a time-of-day
 * or season miss is a "not now", not a "wrong season".
 */
export function dragonfliesGate(message: string): ForageGate {
  return () => {
    const { season, timeOfDay } = TimeManager.getCurrentTime();
    const active = (season === Season.SPRING || season === Season.SUMMER) && timeOfDay === 'Day';
    return active ? null : { found: false, message };
  };
}

/** Weather gate: blocks unless the current weather matches (frost flowers need snow). */
export function weatherGate(required: string, message: string): ForageGate {
  return () => {
    return gameState.getWeather() === required ? null : { found: false, message };
  };
}