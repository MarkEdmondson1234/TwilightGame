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
 * Grid is 15x9 tiles to match observed image coverage at 100% zoom.
 *
 * Walkmesh Grid Legend:
 * . = Floor (walkable)
 * # = Wall/Obstacle (solid - walls, outside image area)
 * D = Door (transition)
 *
 * The grid is invisible - only used for collision!
 */

// 15 columns x 9 rows - matches observed tile coverage of 960x540 image
// Walkmesh designed to match furniture layout in kitchen image
const gridString = `
###############
###############
###############
###############
###############
##...........##
##...........##
#D...........##
###############
`;

export const mumsKitchen: MapDefinition = {
  id: 'mums_kitchen',
  name: "Mum's Kitchen",
  width: 15,
  height: 9,  // 15x9 tiles to match observed image coverage
  grid: parseGrid(gridString),
  colorScheme: 'indoor',
  isRandom: false,
  spawnPoint: { x: 7, y: 6 }, // Center of walkable area
  renderMode: 'background-image',
  characterScale: 1.5, // Make player/NPCs larger to fit the room scale

  // Background layers
  backgroundLayers: [
    {
      image: '/TwilightGame/assets/rooms/home/mums_kitchen.jpeg',
      zIndex: -100,
      parallaxFactor: 1.0,
      opacity: 1.0,
      width: 960,           // Explicit image dimensions for accurate centering
      height: 540,
      centered: true,       // Center in viewport
    },
  ],

  // Transitions
  transitions: [
    {
      fromPosition: { x: 1, y: 7 }, // Door at left side (where D is in grid)
      tileType: TileType.DOOR,
      toMapId: 'home_interior',
      toPosition: { x: 5, y: 3 }, // Back to home interior
      label: 'To Hallway',
    },
  ],

  // NPCs - Mum is in the image reading in armchair
  npcs: [
    createMumNPC('mum_kitchen', { x: 7, y: 5 }, 'Mum'),
  ],
};
