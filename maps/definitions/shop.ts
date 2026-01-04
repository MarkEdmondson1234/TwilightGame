import { MapDefinition, TileType, RoomLayer } from '../../types';
import { parseGrid } from '../gridParser';
import { createShopkeeperNPC } from '../../utils/npcFactories';
import { Z_PARALLAX_FAR, Z_SPRITE_BACKGROUND, Z_INTERIOR_FOREGROUND } from '../../zIndex';

/**
 * Shop - Village Grocery Shop Interior
 *
 * A cosy grocery shop using background-image rendering mode.
 * Uses the unified layers system for clear z-ordering.
 *
 * Image dimensions: 1920x1080 pixels (rendered at 1200x675, ~62.5% scale)
 * Grid is 19x12 tiles for collision detection.
 *
 * Walkmesh Grid Legend:
 * . = Floor (walkable - wooden floor area)
 * # = Wall/Obstacle (solid - shelves, counter, walls)
 *
 * The grid is invisible - only used for collision!
 *
 * Layer ordering (back to front):
 * 1. Background image (Z_PARALLAX_FAR = -100) - back wall, shelves
 * 2. Fox shopkeeper (Z_SPRITE_BACKGROUND = 50) - behind counter
 * 3. Counter foreground (Z_INTERIOR_FOREGROUND = 65) - in front of fox
 * 4. Player (Z_PLAYER = 100) - in front of everything except UI
 */

// 19 columns x 12 rows - matches observed image coverage at 1200x675
// Walkable floor is in the bottom portion (wooden floor area)
const gridString = `
###################
###################
###################
###################
###################
###################
###################
###################
#########....######
##...............##
##...............##
###################
`;

// Create the fox NPC (will have zIndexOverride set from layer)
const foxShopkeeper = {
  ...createShopkeeperNPC('shop_counter_fox', { x: 9, y: 6 }, 'Fox'),
  interactionRadius: 4, // Larger radius to reach from in front of counter
};

/**
 * Unified layers array - defines all visual elements in z-order
 * Each layer's zIndex determines its depth relative to others
 */
const shopLayers: RoomLayer[] = [
  // Layer 1: Background image (back wall and shelves)
  {
    type: 'image',
    image: '/TwilightGame/assets/rooms/grocery_shop/grocery_shop_back.png',
    zIndex: Z_PARALLAX_FAR, // -100: Behind everything
    parallaxFactor: 1.0,
    opacity: 1.0,
    width: 1200,
    height: 675,
    scale: 1.2, // 20% larger
    centered: true,
  },

  // Layer 2: Fox shopkeeper (behind the counter)
  {
    type: 'npc',
    npc: foxShopkeeper,
    zIndex: Z_SPRITE_BACKGROUND, // 50: Behind counter, behind player
  },

  // Layer 3: Counter foreground (in front of fox, behind player)
  {
    type: 'image',
    image: '/TwilightGame/assets/rooms/grocery_shop/grocery_shop_front.png',
    zIndex: Z_INTERIOR_FOREGROUND, // 65: In front of fox, behind player
    parallaxFactor: 1.0,
    opacity: 1.0,
    width: 1200,
    height: 675,
    scale: 1.2, // 20% larger (must match background)
    centered: true,
  },

  // Player is implicitly at Z_PLAYER (100) - in front of counter
];

export const shop: MapDefinition = {
  id: 'shop',
  name: 'Village Shop',
  width: 19,
  height: 12,
  grid: parseGrid(gridString),
  colorScheme: 'shop',
  isRandom: false,
  spawnPoint: { x: 10, y: 10 }, // Start in center of walkable floor
  renderMode: 'background-image',
  characterScale: 3.0, // Larger characters for this room (20% increase from 2.5)

  // Reference viewport for responsive scaling
  // Use a smaller reference so even laptops get slight scale-up
  // This makes the room fill more of the screen on most devices
  referenceViewport: { width: 1280, height: 720 },

  // Unified layer system - all visual elements in z-order
  layers: shopLayers,

  // Transitions
  transitions: [
    {
      fromPosition: { x: 5, y: 10 }, // Shop door at center bottom
      tileType: TileType.SHOP_DOOR,
      toMapId: 'village',
      toPosition: { x: 12, y: 14 }, // Back to village
      label: 'Exit Shop',
    },
  ],

  // Note: NPCs are defined in the layers array above
  // This ensures proper z-ordering with image layers
};
