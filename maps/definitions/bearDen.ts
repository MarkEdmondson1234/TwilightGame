import { MapDefinition, TileType, RoomLayer } from '../../types';
import { parseGrid } from '../gridParser';
import { createChillBearAtHomeNPC } from '../../utils/npcFactories';
import { Z_PARALLAX_FAR, Z_PLAYER } from '../../zIndex';

/**
 * Bear Den - Background Image Interior
 *
 * The cosy interior of the Chill Bear's home in the cave clearing.
 * A warm, inviting space where the bear lives peacefully.
 *
 * Image dimensions: 960x540 pixels
 * Grid is 15x9 tiles to match standard room layout at 100% zoom.
 *
 * Walkmesh Grid Legend:
 * . = Floor (walkable)
 * # = Wall/Obstacle (solid - walls, furniture, outside image area)
 * D = Door (transition)
 *
 * The grid is invisible - only used for collision!
 *
 * Layer ordering (back to front):
 * 1. Background image (Z_PARALLAX_FAR = -100) - bear den interior
 * 2. Chill Bear NPC (Z_PLAYER = 100) - same level as player
 * 3. Player (Z_PLAYER = 100) - in front of background
 */

// 15 columns x 9 rows - matches standard room tile coverage
// Bottom 3 rows are fully walkable
const gridString = `
###############
###############
###############
###############
###############
###############
...............
D..............
###############
`;

// Create Chill Bear NPC for interior (relaxing at home) with smaller scale for indoor space
const bearNPC = createChillBearAtHomeNPC('chill_bear_den', { x: 11, y: 6.5 }, 'Chill Bear', 3.5);

/**
 * Unified layers array - defines all visual elements in z-order
 */
const bearDenLayers: RoomLayer[] = [
  // Layer 1: Background image (bear den interior)
  {
    type: 'image',
    image: '/TwilightGame/assets/rooms/bear_den/bear_den.png',
    zIndex: Z_PARALLAX_FAR, // -100: Behind everything
    parallaxFactor: 1.0,
    opacity: 1.0,
    width: 960,
    height: 540,
    scale: 1.3, // 30% larger to match Mum's kitchen
    centered: true,
  },

  // Layer 2: Chill Bear NPC (same z-level as player)
  {
    type: 'npc',
    npc: bearNPC,
    zIndex: Z_PLAYER - 1, // 99: just behind player
  },

  // Player is implicitly at Z_PLAYER (100)
];

export const bearDen: MapDefinition = {
  id: 'bear_den',
  name: "Bear's Den",
  width: 15,
  height: 9,
  grid: parseGrid(gridString),
  colorScheme: 'indoor',
  isRandom: false,
  spawnPoint: { x: 7, y: 7 }, // Bottom middle - centre of walkable area
  renderMode: 'background-image',
  characterScale: 1.8, // Make player/NPCs larger to fit the room scale

  // Reference viewport for responsive scaling
  referenceViewport: { width: 1280, height: 720 },

  // Unified layer system - all visual elements in z-order
  layers: bearDenLayers,

  // Transitions
  transitions: [
    {
      fromPosition: { x: 0, y: 7 }, // Door at left bottom corner (where D is in grid)
      tileType: TileType.DOOR,
      toMapId: 'bear_cave',
      toPosition: { x: 12, y: 13 }, // Back to bear cave exterior (in front of house door)
      label: 'Outside',
      hasDoor: true,
    },
  ],

  // Note: NPCs are defined in the layers array above
};
