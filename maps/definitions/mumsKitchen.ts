import { MapDefinition, TileType } from '../../types';
import { parseGrid } from '../gridParser';
import { createMumNPC } from '../../utils/npcFactories';

/**
 * Mum's Kitchen - Background Image Interior Test
 *
 * A cozy kitchen scene using background-image rendering mode.
 * The image shows: fireplace/stove on left, mum reading in armchair,
 * bookshelf, stairs going up on right, purple rug in center.
 *
 * Image dimensions: 960x540 pixels
 * At TILE_SIZE of 32: 960/32 = 30 tiles wide, 540/32 ≈ 17 tiles tall
 *
 * Walkmesh Grid Legend:
 * . = Floor (walkable)
 * # = Wall/Obstacle (solid)
 * F = Furniture (solid - stove, bookshelf, armchair)
 * D = Door (transition back to home_interior)
 *
 * The grid is invisible - only used for collision!
 */

const gridString = `
##############################
#FFFF........................#
#FFFF........................#
#FFFF........................#
#FFFF.FFFF..........FFFFFFFF##
#FFFF.FFFF..........FFFFFFFF.#
#.....FFFF...................#
#............................#
#............................#
#............................#
######D#######################
`;

export const mumsKitchen: MapDefinition = {
  id: 'mums_kitchen',
  name: "Mum's Kitchen",
  width: 30,
  height: 16,
  grid: parseGrid(gridString),
  colorScheme: 'indoor',
  isRandom: false,
  spawnPoint: { x: 10, y: 12 }, // Start in the middle of the room
  renderMode: 'background-image',
  characterScale: 1.5, // Make player/NPCs larger to fit the room scale

  // Background layers
  backgroundLayers: [
    {
      image: '/TwilightGame/assets/rooms/home/mums_kitchen.jpeg',
      zIndex: -100,
      parallaxFactor: 1.0,
      opacity: 1.0,
      useNativeSize: true,  // Use image's 960x540 dimensions
      centered: true,       // Center in viewport
    },
  ],

  // Transitions
  transitions: [
    {
      fromPosition: { x: 6, y: 15 }, // Door at bottom (where D is in grid)
      tileType: TileType.DOOR,
      toMapId: 'home_interior',
      toPosition: { x: 5, y: 3 }, // Back to home interior
      label: 'To Hallway',
    },
  ],

  // NPCs - Mum is in the image reading in armchair (roughly position 12, 5)
  npcs: [
    createMumNPC('mum_kitchen', { x: 12, y: 5 }, 'Mum'),
  ],
};
