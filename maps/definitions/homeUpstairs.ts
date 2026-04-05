import { MapDefinition, TileType, RoomLayer } from '../../types';
import { parseGrid } from '../gridParser';
import { Z_PARALLAX_FAR } from '../../zIndex';

/**
 * Home Upstairs - Bedroom area (background-image interior)
 *
 * Placeholder background until a unique drawing is complete.
 * Image: /TwilightGame/assets/rooms/empty_room.png (1920×1080, displayed at 960×540)
 *
 * Walkmesh Grid Legend (invisible — collision only):
 * # = Wall/obstacle (solid)
 * . = Floor (walkable)
 * D = Door (transition tile — stairs down to Mum's Kitchen)
 *
 * Key positions:
 * - mumsKitchen transition spawns player at {x:3, y:6} → walkable row 6
 * - Transition back to kitchen at {x:3, y:7} → door tile at grid[7][3]
 */

// 15 columns × 9 rows — standard background-image room layout
const gridString = `
###############
###############
###############
###############
...............
...............
...............
...D...........
###############
`;

const homeUpstairsLayers: RoomLayer[] = [
  {
    type: 'image',
    image: '/TwilightGame/assets/rooms/empty_room.png',
    zIndex: Z_PARALLAX_FAR,
    parallaxFactor: 1.0,
    opacity: 1.0,
    width: 960,
    height: 540,
    scale: 1.3,
    centered: true,
  },
];

export const homeUpstairs: MapDefinition = {
  id: 'home_upstairs',
  name: 'Home Upstairs',
  width: 15,
  height: 9,
  grid: parseGrid(gridString),
  colorScheme: 'indoor',
  isRandom: false,
  spawnPoint: { x: 7, y: 6 },
  renderMode: 'background-image',
  characterScale: 1.8,
  referenceViewport: { width: 1280, height: 720 },
  layers: homeUpstairsLayers,
  transitions: [
    {
      fromPosition: { x: 3, y: 7 }, // Stairs down
      tileType: TileType.DOOR,
      toMapId: 'mums_kitchen',
      toPosition: { x: 11, y: 4 }, // Back to kitchen near stairs
      label: 'Downstairs',
      hasDoor: true,
    },
  ],
};
