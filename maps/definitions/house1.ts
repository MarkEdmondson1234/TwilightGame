import { MapDefinition, TileType, RoomLayer } from '../../types';
import { parseGrid } from '../gridParser';
import { Z_PARALLAX_FAR } from '../../zIndex';

/**
 * House 1 Interior - North-west house (background-image interior)
 *
 * Placeholder background until a unique drawing is complete.
 * Image: /TwilightGame/assets/rooms/empty_room.png (1920×1080, displayed at 960×540)
 *
 * Walkmesh Grid Legend (invisible — collision only):
 * # = Wall/obstacle (solid)
 * . = Floor (walkable)
 * D = Door (transition tile — exit to village)
 *
 * Key positions:
 * - Village transition spawns player at {x:2, y:6} → walkable row 6
 * - Exit door at {x:7, y:7} → bottom-centre door tile
 */

// 15 columns × 9 rows — standard background-image room layout
const gridString = `
###############
###############
###############
###############
###############
...............
...............
...............
.......D.......
###############
`;

const house1Layers: RoomLayer[] = [
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

export const house1: MapDefinition = {
  id: 'house1',
  name: 'House',
  width: 15,
  height: 10,
  grid: parseGrid(gridString),
  colorScheme: 'indoor',
  isRandom: false,
  spawnPoint: { x: 2, y: 6 },
  renderMode: 'background-image',
  characterScale: 1.8,
  referenceViewport: { width: 1280, height: 720 },
  layers: house1Layers,
  transitions: [
    {
      fromPosition: { x: 7, y: 8 }, // Door exit (bottom centre)
      tileType: TileType.DOOR,
      toMapId: 'village',
      toPosition: { x: 6, y: 6 },
      label: 'To Village',
      hasDoor: true,
    },
  ],
};
