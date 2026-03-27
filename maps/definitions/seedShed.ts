import { MapDefinition, TileType, RoomLayer } from '../../types';
import { parseGrid } from '../gridParser';
import { Z_PARALLAX_FAR } from '../../zIndex';

/**
 * Seed Shed - Background Image Interior
 *
 * A small shed where players can pick up free seeds for farming.
 *
 * Image dimensions: 1920x1080 pixels
 * Grid is 15x9 tiles to match standard room layout.
 *
 * Walkmesh Grid Legend:
 * . = Floor (walkable)
 * # = Wall/Obstacle (solid - back wall, cabinet, outside image area)
 * D = Door (transition)
 *
 * The grid is invisible - only used for collision!
 */

// 15 columns x 9 rows
// Top portion (rows 0-4): back wall with large seed storage cabinet — non-walkable
// Bottom portion (rows 5-7): wooden floor — walkable
const gridString = `
###############
###############
###############
###############
###############
...............
...............
.......D.......
###############
`;

const shedLayers: RoomLayer[] = [
  // Background image (seed shed interior)
  {
    type: 'image',
    image: '/TwilightGame/assets/rooms/seedShed/shed_interior.png',
    zIndex: Z_PARALLAX_FAR, // -100: Behind everything
    parallaxFactor: 1.0,
    opacity: 1.0,
    width: 960, // Using half dimensions like cottage interior (actual image is 1920x1080)
    height: 540,
    scale: 1.3, // Match bear den / cottage interior scale
    centered: true,
  },
  // Mess pile overlays (Mr Fox's Picnic quest) — hidden when cleaned
  {
    type: 'image',
    image: '/TwilightGame/assets/rooms/seedShed/shed_interior_mess1.png',
    zIndex: Z_PARALLAX_FAR + 1,
    parallaxFactor: 1.0,
    opacity: 1.0,
    width: 960,
    height: 540,
    scale: 1.3,
    centered: true,
    condition: { type: 'mess_pile', pileId: 0, showWhen: 'not_cleaned' },
  },
  {
    type: 'image',
    image: '/TwilightGame/assets/rooms/seedShed/shed_interior_mess2.png',
    zIndex: Z_PARALLAX_FAR + 1,
    parallaxFactor: 1.0,
    opacity: 1.0,
    width: 960,
    height: 540,
    scale: 1.3,
    centered: true,
    condition: { type: 'mess_pile', pileId: 1, showWhen: 'not_cleaned' },
  },
  {
    type: 'image',
    image: '/TwilightGame/assets/rooms/seedShed/shed_interior_mess3.png',
    zIndex: Z_PARALLAX_FAR + 1,
    parallaxFactor: 1.0,
    opacity: 1.0,
    width: 960,
    height: 540,
    scale: 1.3,
    centered: true,
    condition: { type: 'mess_pile', pileId: 2, showWhen: 'not_cleaned' },
  },
];

export const seedShed: MapDefinition = {
  id: 'seed_shed',
  name: 'Seed Shed',
  width: 15,
  height: 9,
  grid: parseGrid(gridString),
  colorScheme: 'indoor',
  isRandom: false,
  spawnPoint: { x: 7, y: 6 }, // Centre of floor
  renderMode: 'background-image',
  characterScale: 2.2,

  referenceViewport: { width: 1280, height: 720 },

  layers: shedLayers,

  transitions: [
    {
      fromPosition: { x: 7, y: 7 }, // Door at bottom centre
      tileType: TileType.DOOR,
      toMapId: 'farm_area',
      toPosition: { x: 8, y: 22 }, // Exit to farm area, on grass south of building
      label: 'Exit to Farm',
      hasDoor: true,
    },
  ],
};
