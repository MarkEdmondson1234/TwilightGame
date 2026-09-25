/** @vitest-environment node */
import { COMMUNAL_EASEL } from '../data/communalEasel';
import { describe, it, expect, vi } from 'vitest';
import { homeUpstairs } from '../maps/definitions/homeUpstairs';
import { mumsKitchen } from '../maps/definitions/mumsKitchen';
import { TILE_LEGEND } from '../data/tiles';
import { CollisionType } from '../types';
import { getItem } from '../data/items';
import {
  getMiniGameLocationsForMap,
  getMiniGamesForMapLocation,
  getMiniGamesForPlacedItem,
} from '../minigames/registry';
import { placedItemProvider } from '../utils/interactions/providers/placedItems';
import type { InteractionContext, PlacedItem } from '../utils/interactions/types';
import {
  TINY_WREATH_MAP_ID,
  TINY_WREATH_TABLE_ID,
  TINY_WREATH_TABLE_POSITION,
} from '../utils/tinyWreathLesson';

/**
 * Mushra's Tiny Wreath lives upstairs (issue #157), on her existing hand-drawn
 * crafting table, not the communal easel. These pin down where the table sits and
 * that it is the only route the lesson points at.
 */

const { x: TX, y: TY } = TINY_WREATH_TABLE_POSITION;

function isWalkable(x: number, y: number): boolean {
  const tile = homeUpstairs.grid[y]?.[x];
  if (tile === undefined) return false;
  return TILE_LEGEND[tile].collisionType !== CollisionType.SOLID;
}

/** Same bounding box the click hit-test uses (utils/interactions/index.ts). */
function tableHitTiles(): Array<{ x: number; y: number }> {
  const scale = getItem('crafting_table')?.placedScale ?? 1;
  const lo = (scale - 1) / 2;
  const hi = (scale + 1) / 2;
  const tiles: Array<{ x: number; y: number }> = [];
  for (let y = Math.floor(TY - lo); y <= Math.floor(TY + hi); y++)
    for (let x = Math.floor(TX - lo); x <= Math.floor(TX + hi); x++) tiles.push({ x, y });
  return tiles;
}

function placedTable(): PlacedItem {
  return {
    id: TINY_WREATH_TABLE_ID,
    itemId: 'crafting_table',
    position: { x: TX, y: TY },
    mapId: TINY_WREATH_MAP_ID,
    image: '/table.png',
    permanent: true,
  } as PlacedItem;
}

describe('Tiny Wreath workshop upstairs', () => {
  it('targets the real upstairs map id', () => {
    expect(TINY_WREATH_MAP_ID).toBe(homeUpstairs.id);
    expect(mumsKitchen.transitions.some((t) => t.toMapId === TINY_WREATH_MAP_ID)).toBe(true);
  });

  it('stands on floor with walkable floor in front of it', () => {
    expect(isWalkable(TX, TY)).toBe(true);
    expect(isWalkable(TX, TY + 1) || isWalkable(TX + 1, TY) || isWalkable(TX - 1, TY)).toBe(true);
  });

  it('does not cover the stairs, the arrival spot or the spawn point', () => {
    const covered = tableHitTiles();
    const hits = (p: { x: number; y: number }) =>
      covered.some((t) => t.x === Math.floor(p.x) && t.y === Math.floor(p.y));
    const protectedSpots = [
      ...homeUpstairs.transitions.map((t) => t.fromPosition),
      ...mumsKitchen.transitions
        .filter((t) => t.toMapId === TINY_WREATH_MAP_ID)
        .map((t) => t.toPosition),
      homeUpstairs.spawnPoint,
    ];
    expect(protectedSpots.filter(hits)).toEqual([]);
  });

  it('is a fixed crafting table that opens the wreath workshop and cannot be picked up', () => {
    expect(getItem('crafting_table')?.fixed).toBe(true);
    const interactions = placedItemProvider({
      itemAtPosition: placedTable(),
      onPlacedItemAction: vi.fn(),
      onOpenMiniGame: vi.fn(),
      tilePos: { x: TX, y: TY },
    } as unknown as InteractionContext);
    expect(interactions.map((i) => i.label)).toContain('Make a Wreath');
    expect(interactions.find((i) => i.type === 'pickup_item')).toBeUndefined();
    expect(getMiniGamesForPlacedItem('crafting_table').map((m) => m.id)).toContain('wreath-making');
  });

  it('does not hang the wreath workshop on the communal easel', () => {
    expect(
      getMiniGamesForMapLocation(COMMUNAL_EASEL.mapId, COMMUNAL_EASEL.x, COMMUNAL_EASEL.y).map(
        (m) => m.id
      )
    ).not.toContain('wreath-making');
    expect(getMiniGameLocationsForMap(COMMUNAL_EASEL.mapId).map((l) => l.def.id)).not.toContain(
      'wreath-making'
    );
  });
});
