/**
 * Cooking stations — the one answer to "can the player cook here?" (#151, #157).
 *
 * Cooking is only allowed near a fire. Three kinds of place count:
 *
 * - STOVE / CAMPFIRE tiles drawn into a map grid;
 * - the fireplace in Mum's kitchen, which is part of a background painting and so has no
 *   tile of its own (its position is `MUMS_KITCHEN_FIREPLACE`);
 * - any placed item whose definition sets `cookingStation` (the campfire the player buys
 *   and puts down outdoors).
 *
 * The recipe book's Cook button, the "Cook here" interaction, the E/C keys, the touch
 * action button and the glowing station markers all read this module, so they can never
 * disagree about whether a fire is close enough. Brewing at the cauldron is separate and
 * still uses `checkCookingLocation` in actionHandlers.
 */

import type { Position } from '../types';
import { TileType } from '../types';
import { COOKING } from '../constants';
import { getItem } from '../data/items';
import { gameState } from '../GameState';
import { mapManager } from '../maps';
import { getTileCoords } from './mapUtils';
import { MUMS_KITCHEN_FIREPLACE } from './kitchenFireplace';

export type CookingStationKind = 'stove' | 'campfire' | 'fireplace';

/** Inclusive rectangle of tiles a station occupies. */
interface TileRect {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface CookingStation {
  kind: CookingStationKind;
  /** Stable key for React lists and for "is this the same station?" checks. */
  id: string;
  /** Visual centre in tile units — where the glow and the Cook button are drawn. */
  centre: Position;
  /** Tiles the station occupies. */
  tiles: TileRect;
  /**
   * How far past its own tiles a click still counts as "on" the station. The fireplace and
   * tile stations are usually wall/solid tiles, so the floor in front of them counts too.
   * A placed campfire only answers clicks on itself, so walking around it still works.
   */
  clickPadding: number;
  /** Set when the station is a placed item (its PlacedItem id). */
  placedItemId?: string;
}

/** Shown wherever Cook is unavailable because no fire is close. */
export const NO_COOKING_STATION_MESSAGE =
  "Find a fire or stove to cook — Mum's fireplace, or a campfire you've placed.";

/** Tea needs Mum's kettle, which hangs over the kitchen fireplace. */
export const TEA_NEEDS_FIREPLACE_MESSAGE =
  "Tea needs Mum's kettle — make it at the fireplace in Mum's kitchen.";

export const MUMS_KITCHEN_MAP_ID = 'mums_kitchen';

function singleTile(x: number, y: number): TileRect {
  return { minX: x, maxX: x, minY: y, maxY: y };
}

// Grid scans are cached per grid array: a map's grid is replaced, not mutated, on load.
const tileStationCache = new WeakMap<TileType[][], CookingStation[]>();

function getTileStations(mapId: string): CookingStation[] {
  const map = mapManager.getCurrentMap();
  // Only the loaded map's grid is authoritative (procedural maps are rebuilt on load).
  if (!map || map.id !== mapId || !map.grid) return [];
  const cached = tileStationCache.get(map.grid);
  if (cached) return cached;

  const stations: CookingStation[] = [];
  map.grid.forEach((row, y) =>
    row.forEach((tile, x) => {
      if (tile !== TileType.STOVE && tile !== TileType.CAMPFIRE) return;
      const kind: CookingStationKind = tile === TileType.STOVE ? 'stove' : 'campfire';
      stations.push({
        kind,
        id: `tile_${kind}_${x}_${y}`,
        centre: { x: x + 0.5, y: y + 0.5 },
        tiles: singleTile(x, y),
        clickPadding: 1,
      });
    })
  );
  tileStationCache.set(map.grid, stations);
  return stations;
}

function getFireplaceStation(mapId: string): CookingStation | null {
  if (mapId !== MUMS_KITCHEN_MAP_ID) return null;
  const { x, y } = MUMS_KITCHEN_FIREPLACE;
  return {
    kind: 'fireplace',
    id: 'mums_kitchen_fireplace',
    centre: { x: x + 0.5, y: y + 0.5 },
    tiles: singleTile(x, y),
    clickPadding: 1,
  };
}

function getPlacedStations(mapId: string): CookingStation[] {
  const stations: CookingStation[] = [];
  for (const item of gameState.getPlacedItems(mapId)) {
    const def = getItem(item.itemId);
    if (!def?.cookingStation) continue;
    // Placed sprites span (anchor - (scale-1)/2) to (anchor + (scale+1)/2): centred on anchor + 0.5.
    const scale = item.customScale ?? def.placedScale ?? 1;
    const cx = item.position.x + 0.5;
    const cy = item.position.y + 0.5;
    const half = scale / 2;
    stations.push({
      kind: 'campfire',
      id: `placed_${item.id}`,
      centre: { x: cx, y: cy },
      tiles: {
        minX: Math.floor(cx - half),
        maxX: Math.ceil(cx + half) - 1,
        minY: Math.floor(cy - half),
        maxY: Math.ceil(cy + half) - 1,
      },
      clickPadding: 0,
      placedItemId: item.id,
    });
  }
  return stations;
}

/** Every cooking station on a map — used to draw the glowing markers. */
export function getCookingStationsOnMap(mapId: string): CookingStation[] {
  const fireplace = getFireplaceStation(mapId);
  return [
    ...(fireplace ? [fireplace] : []),
    ...getTileStations(mapId),
    ...getPlacedStations(mapId),
  ];
}

/** Square (Chebyshev) distance in tiles from a tile to the nearest tile of a rectangle. */
function tileGap(tile: Position, rect: TileRect): number {
  const dx = Math.max(rect.minX - tile.x, 0, tile.x - rect.maxX);
  const dy = Math.max(rect.minY - tile.y, 0, tile.y - rect.maxY);
  return Math.max(dx, dy);
}

/**
 * The cooking station the player at `position` can use, or null when none is close enough.
 * The single predicate for "may the player cook here?".
 */
export function getNearbyCookingStation(
  position: Position | null | undefined,
  mapId: string | null | undefined
): CookingStation | null {
  if (!position || !mapId) return null;
  const tile = getTileCoords(position);
  let best: CookingStation | null = null;
  let bestGap = Infinity;
  for (const station of getCookingStationsOnMap(mapId)) {
    const gap = tileGap(tile, station.tiles);
    if (gap <= COOKING.STATION_RANGE_TILES && gap < bestGap) {
      best = station;
      bestGap = gap;
    }
  }
  return best;
}

/** True when a clicked tile is on (or directly in front of) the given station. */
export function isClickOnCookingStation(station: CookingStation, clickTile: Position): boolean {
  return tileGap(clickTile, station.tiles) <= station.clickPadding;
}

/** Why a recipe cannot be cooked here, or null when Cook should be enabled. */
export function getCookBlockedReason(
  recipeId: string,
  station: CookingStation | null
): string | null {
  if (!station) return NO_COOKING_STATION_MESSAGE;
  if (recipeId === 'tea' && station.kind !== 'fireplace') return TEA_NEEDS_FIREPLACE_MESSAGE;
  return null;
}

/** Friendly name for a station, for use mid-sentence ("You are beside the campfire"). */
export function getCookingStationLabel(station: CookingStation): string {
  switch (station.kind) {
    case 'fireplace':
      return "Mum's fireplace";
    case 'stove':
      return 'the stove';
    case 'campfire':
      return 'the campfire';
  }
}
