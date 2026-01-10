import { MapDefinition, TileType, RoomLayer } from '../../types';
import { parseGrid } from '../gridParser';
import { Z_PARALLAX_FAR } from '../../zIndex';

/**
 * Cottage Interior - Background Image Interior
 *
 * The cosy interior of a small cottage in the village.
 * A warm, inviting space with rustic charm.
 *
 * Image dimensions: 1920x1080 pixels
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
 * 1. Background image (Z_PARALLAX_FAR = -100) - cottage interior
 * 2. Player (Z_PLAYER = 100) - in front of background
 */

// 15 columns x 9 rows - matches cottage interior furniture layout
// Walkmesh designed to match the visible furniture and walkable floor area
const gridString = `
###############
###############
###############
###############
###############
##....##.....##
##....##.....##
...............
...............
`;

/**
 * Unified layers array - defines all visual elements in z-order
 */
const cottageInteriorLayers: RoomLayer[] = [
  // Layer 1: Background image (cottage interior)
  {
    type: 'image',
    image: '/TwilightGame/assets/rooms/cottage_small_interior/cottage_small_interior.png',
    zIndex: Z_PARALLAX_FAR, // -100: Behind everything
    parallaxFactor: 1.0,
    opacity: 1.0,
    width: 960, // Using half dimensions like bear den (actual image is 1920x1080)
    height: 540,
    scale: 1.3, // Match bear den scale
    centered: true,
  },

  // Player is implicitly at Z_PLAYER (100)
];

export const cottageInterior: MapDefinition = {
  id: 'cottage_interior',
  name: 'Cottage',
  width: 15,
  height: 9,
  grid: parseGrid(gridString),
  colorScheme: 'indoor',
  isRandom: false,
  spawnPoint: { x: 0, y: 8 }, // Bottom left, second row from bottom
  renderMode: 'background-image',
  characterScale: 1.8, // Make player larger to fit the room scale

  // Reference viewport for responsive scaling
  referenceViewport: { width: 1280, height: 720 },

  // Unified layer system - all visual elements in z-order
  layers: cottageInteriorLayers,

  // Transitions
  transitions: [
    {
      fromPosition: { x: 0, y: 7 }, // Door at left side of second-bottom row
      tileType: TileType.DOOR,
      toMapId: 'village',
      toPosition: { x: 21, y: 25 }, // Back to village exterior (in front of cottage door)
      label: 'Outside',
    },
  ],
};
