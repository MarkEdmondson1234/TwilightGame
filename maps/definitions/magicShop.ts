import { type MapDefinition, type Position, TileType, type RoomLayer } from '../../types';
import { parseGrid } from '../gridParser';
import { Z_PARALLAX_FAR, Z_SPRITE_FOREGROUND } from '../../zIndex';
import { magicShopMapId } from '../magicShopId';

/**
 * Magic Shop - Background Image Interior
 *
 * The rare shop reached through a "To Shop" door in the procedural forest and
 * mines (`RANDOM_SHOP`). Not a fixed map: `createMagicShop()` builds one per
 * visit, because its exit has to lead back to whichever forest or cave the
 * player came in from. `generateRandomShop()` in maps/procedural.ts delegates
 * here.
 *
 * Background: magic_shop_background.png (1920×1080, displayed at 960×540 @ 1.3×)
 * Foreground: magic_shop_layer1.png (herb table, lower left) — renders in front of player
 * width=960 = mapWidth(15) × TILE_SIZE(64), so one tile is 128px of the source art
 *
 * Walkmesh Grid Legend (invisible — collision only):
 * # = Wall/obstacle (solid)
 * . = Floor (walkable)
 * D = Door (transition tile — the arched door on the left wall)
 *
 * Rows 4-5 run behind the foreground table, so the player can walk between the
 * two layers; rows 6-8 under the table are solid so they can't stand inside it.
 * The potted plants on the right are solid too.
 */

// 15 columns × 10 rows (the art covers ~8.4 rows; the last row is off-image)
const gridString = `
###############
###############
###############
###############
...............
#..D.........##
######........#
######.........
######.........
###############
`;

/** Where the player appears on entering — on the floor beside the door. */
export const MAGIC_SHOP_SPAWN: Position = { x: 4, y: 5 };

const DOOR_POSITION: Position = { x: 3, y: 5 };

const magicShopLayers: RoomLayer[] = [
  // Layer 1: Background (walls, shelves, back table, plants — behind everything)
  {
    type: 'image',
    image: '/TwilightGame/assets-optimized/rooms/magicShop/magic_shop_background.jpg',
    zIndex: Z_PARALLAX_FAR, // -100: Behind everything
    parallaxFactor: 1.0,
    opacity: 1.0,
    width: 960, // = mapWidth (15) × TILE_SIZE (64) — keeps grid aligned with image
    height: 540, // 16:9 aspect ratio
    scale: 1.3,
    centered: true,
  },

  // Layer 2: Foreground herb table (in front of the player)
  {
    type: 'image',
    image: '/TwilightGame/assets-optimized/rooms/magicShop/magic_shop_layer1.png',
    zIndex: Z_SPRITE_FOREGROUND, // 200: In front of player
    parallaxFactor: 1.0,
    opacity: 1.0,
    width: 960, // Must match background (keeps grid aligned)
    height: 540,
    scale: 1.3,
    centered: true,
  },

  // Player is implicitly at Z_PLAYER (100) — between background and foreground
];

export function createMagicShop(
  seed: number,
  returnToMapId: string = 'village',
  returnToPosition: Position = { x: 12, y: 8 }
): MapDefinition {
  return {
    id: magicShopMapId(seed),
    name: 'Magic Shop',
    width: 15,
    height: 10,
    grid: parseGrid(gridString),
    colorScheme: 'indoor',
    isRandom: true,
    spawnPoint: MAGIC_SHOP_SPAWN,
    renderMode: 'background-image',
    characterScale: 2.5,
    referenceViewport: { width: 1280, height: 720 },
    layers: magicShopLayers,
    transitions: [
      {
        fromPosition: DOOR_POSITION,
        tileType: TileType.DOOR,
        toMapId: returnToMapId,
        toPosition: returnToPosition,
        label: 'Exit Shop',
        hasDoor: true,
      },
    ],
  };
}
