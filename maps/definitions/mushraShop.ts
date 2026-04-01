import { MapDefinition, TileType, RoomLayer } from '../../types';
import { parseGrid } from '../gridParser';
import { Z_PARALLAX_FAR, Z_INTERIOR_FOREGROUND, Z_SPRITE_BACKGROUND } from '../../zIndex';
import { createMushraShopNPC } from '../../utils/npcFactories';

/**
 * Mushra's Shop - Background Image Interior
 *
 * The cosy interior of Mushra's mushroom house in the mushroom forest.
 * A warm, artistic space filled with hand-crafted goods and forest finds.
 *
 * Image dimensions: 1920x1080 pixels (rendered at half dimensions 960x540 with scale 1.3)
 * Grid is 15x10 tiles for collision detection.
 *
 * Walkmesh Grid Legend:
 * . = Floor (walkable)
 * # = Wall/Obstacle (solid - walls, shelves, furniture, outside image area)
 * D = Door (transition out)
 *
 * The grid is invisible - only used for collision!
 *
 * Layer ordering (back to front):
 * 1. Background image (Z_PARALLAX_FAR = -100) - back wall, shelves, room decor
 * 2. Counter foreground (Z_INTERIOR_FOREGROUND = 65) - in front of any NPCs, behind player
 * 3. Player (Z_PLAYER = 100) - in front of everything except UI
 */

// 15 columns x 10 rows - invisible walkmesh for collision
// Walkable floor is in the bottom rows; walls/furniture block the upper area
const gridString = `
###############
###############
###############
###############
###############
###############
###############
...............
...D...........
###############
`;

/**
 * Unified layers array - defines all visual elements in z-order
 */
const mushraShopLayers: RoomLayer[] = [
  // Layer 1: Background image (back wall, shelves, room decor)
  {
    type: 'image',
    image: '/TwilightGame/assets/rooms/mushra_shop/mushra_shop_background.png',
    zIndex: Z_PARALLAX_FAR, // -100: Behind everything
    parallaxFactor: 1.0,
    opacity: 1.0,
    width: 960, // Using half dimensions like cottage interior (actual image is 1920x1080)
    height: 540,
    scale: 1.3, // Match bear den / cottage interior scale
    centered: true,
  },

  // Layer 2: Mushra behind her counter
  {
    type: 'npc',
    npc: createMushraShopNPC('mushra_shop', { x: 8, y: 5 }),
    zIndex: Z_SPRITE_BACKGROUND, // 50: Behind the foreground counter layer
  },

  // Layer 3: Foreground overlay (counter/shelves in front of NPCs, behind player)
  {
    type: 'image',
    image: '/TwilightGame/assets/rooms/mushra_shop/mushra_shop_foreground.png',
    zIndex: Z_INTERIOR_FOREGROUND, // 65: In front of NPCs, behind player
    parallaxFactor: 1.0,
    opacity: 1.0,
    width: 960, // Must match background layer dimensions
    height: 540,
    scale: 1.3, // Must match background scale
    centered: true,
  },

  // Player is implicitly at Z_PLAYER (100) - in front of counter
];

export const mushraShop: MapDefinition = {
  id: 'mushras_shop',
  name: "Mushra's Shop",
  width: 15,
  height: 10,
  grid: parseGrid(gridString),
  colorScheme: 'indoor',
  isRandom: false,
  spawnPoint: { x: 7, y: 8 }, // Centre of walkable floor, just inside the door

  renderMode: 'background-image',
  characterScale: 3.0, // Match grocery shop scale; adjust if player looks too large

  // Reference viewport for responsive scaling
  referenceViewport: { width: 1280, height: 720 },

  // Unified layer system - all visual elements in z-order
  layers: mushraShopLayers,

  // Transitions
  transitions: [
    {
      fromPosition: { x: 3, y: 8 }, // Door tile (D) at row 8 - adjust column to match image
      tileType: TileType.DOOR,
      toMapId: 'mushroom_forest',
      toPosition: { x: 25, y: 7 }, // Just below the mushroom house anchor in the forest
      label: 'Exit',
      hasDoor: true,
    },
  ],
};
