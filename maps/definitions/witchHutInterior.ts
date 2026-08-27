import { MapDefinition, TileType, RoomLayer } from '../../types';
import { parseGrid } from '../gridParser';
import { Z_PARALLAX_FAR } from '../../zIndex';

/**
 * Witch Hut Interior - Cosy magical dwelling (background-image interior)
 *
 * Background: witch_hut_interior1.png (1920x1080, displayed at 960x540 @ 1.3x)
 * width=960 = mapWidth(15) x TILE_SIZE(64), which keeps the debug grid aligned with the image
 *
 * Walkmesh Grid Legend (invisible - collision only):
 * # = Wall/obstacle (solid) - the horizon line above the floor
 * . = Floor (walkable)
 * D = Door (transition tile - exit to the hut clearing)
 *
 * Key positions:
 * - Bottom 3 rows (6-8) are the walkable floor band
 * - Spawn point and exit door both at {x:7, y:6} - centre of the top walkable row
 */

// 15 columns x 9 rows - standard background-image room layout
const gridString = `
###############
###############
###############
###############
#.#############
#..###...##...#
#......D......#
##............#
..............#
`;

const witchHutInteriorLayers: RoomLayer[] = [
  {
    type: 'image',
    image: '/TwilightGame/assets/rooms/witch_hut/witch_hut_interior1.png',
    zIndex: Z_PARALLAX_FAR, // -100: Behind everything
    parallaxFactor: 1.0,
    opacity: 1.0,
    width: 960,  // = mapWidth (15) x TILE_SIZE (64) - keeps grid aligned with image
    height: 540, // 16:9 aspect ratio
    scale: 1.3,
    centered: true,
  },
];

export const witchHutInterior: MapDefinition = {
  id: 'witch_hut_interior',
  name: 'Witch Hut - Interior',
  width: 15,
  height: 9,
  grid: parseGrid(gridString),
  colorScheme: 'indoor',
  isRandom: false,
  spawnPoint: { x: 7, y: 6 },
  renderMode: 'background-image',
  characterScale: 1.8,
  referenceViewport: { width: 1280, height: 720 },
  layers: witchHutInteriorLayers,
  transitions: [
    {
      fromPosition: { x: 7, y: 6 },
      tileType: TileType.DOOR,
      toMapId: 'witch_hut',
      toPosition: { x: 15, y: 19 }, // Just south of the door outside
      label: 'Exit Witch Hut',
      hasDoor: true,
    },
  ],
};
