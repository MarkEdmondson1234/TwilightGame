import { MapDefinition, TileType, RoomLayer } from '../../types';
import { parseGrid } from '../gridParser';
import { createMumNPC } from '../../utils/npcFactories';
import { Z_PARALLAX_FAR, Z_PLAYER } from '../../zIndex';

/**
 * Mum's Kitchen - Background Image Interior
 *
 * A cosy kitchen scene using background-image rendering mode.
 * The image shows: fireplace/stove on left, mum reading in armchair,
 * bookshelf, stairs going up on right, purple rug in centre.
 *
 * Image dimensions: 960x540 pixels
 * Grid is 15x9 tiles to match observed image coverage at 100% zoom.
 *
 * Walkmesh Grid Legend:
 * . = Floor (walkable)
 * # = Wall/Obstacle (solid - walls, outside image area)
 * D = Door (transition)
 * _ = Desk (surface for placing items)
 *
 * The grid is invisible - only used for collision!
 *
 * Layer ordering (back to front):
 * 1. Background image (Z_PARALLAX_FAR = -100) - kitchen scene
 * 2. Mum NPC (Z_PLAYER = 100) - same level as player
 * 3. Player (Z_PLAYER = 100) - in front of background
 */

// 15 columns x 9 rows - matches observed tile coverage of 960x540 image
// Walkmesh designed to match furniture layout in kitchen image
const gridString = `
###############
###############
###############
###########.###
###########..##
#####_.......##
####.........##
###D.........##
###############
`;

// Create Mum NPC (will have zIndexOverride set from layer)
const mumNPC = createMumNPC('mum_kitchen', { x: 7, y: 5 }, 'Mum');

/**
 * Unified layers array - defines all visual elements in z-order
 */
const kitchenLayers: RoomLayer[] = [
  // Layer 1: Background image (kitchen scene)
  {
    type: 'image',
    image: '/TwilightGame/assets/rooms/home/mums_kitchen.jpeg',
    zIndex: Z_PARALLAX_FAR, // -100: Behind everything
    parallaxFactor: 1.0,
    opacity: 1.0,
    width: 960,
    height: 540,
    scale: 1.3, // 30% larger
    centered: true,
  },

  // Layer 2: Mum NPC (same z-level as player - no foreground to hide behind)
  {
    type: 'npc',
    npc: mumNPC,
    zIndex: Z_PLAYER - 1, // 99: just behind player
  },

  // Player is implicitly at Z_PLAYER (100)
];

export const mumsKitchen: MapDefinition = {
  id: 'mums_kitchen',
  name: "Mum's Kitchen",
  width: 15,
  height: 9,
  grid: parseGrid(gridString),
  colorScheme: 'indoor',
  isRandom: false,
  spawnPoint: { x: 7, y: 6 }, // Centre of walkable area
  renderMode: 'background-image',
  characterScale: 1.8, // Make player/NPCs larger to fit the room scale (20% increase from 1.5)

  // Reference viewport for responsive scaling
  // Use a smaller reference so even laptops get slight scale-up
  // This makes the room fill more of the screen on most devices
  referenceViewport: { width: 1280, height: 720 },

  // Unified layer system - all visual elements in z-order
  layers: kitchenLayers,

  // Transitions
  transitions: [
    {
      fromPosition: { x: 4, y: 8 }, // Door at left side (where D is in grid)
      tileType: TileType.DOOR,
      toMapId: 'home_interior',
      toPosition: { x: 5, y: 5 }, // Back to home interior
      label: 'To Hallway',
      hasDoor: true,
    },
  ],

  // Note: NPCs are defined in the layers array above
};
