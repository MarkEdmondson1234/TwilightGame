import { MapDefinition, TileType } from '../../types';
import { parseGrid } from '../gridParser';
import { createShopkeeperNPC } from '../../utils/npcFactories';

/**
 * Shop - Village Grocery Shop Interior
 *
 * A cosy grocery shop using background-image rendering mode.
 * Two-layer system: backgroundLayers (back wall) + foregroundLayers (counter).
 *
 * Image dimensions: 1920x1080 pixels (rendered at 1200x675, ~62.5% scale)
 * Grid is 19x11 tiles to match observed image coverage.
 *
 * Walkmesh Grid Legend:
 * . = Floor (walkable - wooden floor area)
 * # = Wall/Obstacle (solid - shelves, counter, walls)
 * S = Shop Door (transition back to village)
 *
 * The grid is invisible - only used for collision!
 *
 * Z-ordering (how layers stack):
 * - backgroundLayers[0]: z-index -100 (back wall, shelves) - behind everything
 * - Fox shopkeeper NPC: z-index 50 (via zIndexOverride) - behind counter
 * - Counter foreground: z-index 65 - in front of fox, behind player
 * - Player: z-index 70-90 (based on Y position 7-9) - in front of counter
 * - UI elements: z-index 1000+ - always on top
 */

// 19 columns x 11 rows - matches observed image coverage at 1200x675
// Walkable floor is in the bottom portion (wooden floor area)
// S = Shop door transition (center of bottom walkable row)
const gridString = `
###################
###################
###################
###################
###################
###################
###################
###################
##...............##
##...............##
#########S#########
`;

export const shop: MapDefinition = {
  id: 'shop',
  name: 'Village Shop',
  width: 19,
  height: 11,
  grid: parseGrid(gridString),
  colorScheme: 'shop',
  isRandom: false,
  spawnPoint: { x: 10, y: 10 }, // Start in center of walkable floor
  renderMode: 'background-image',
  characterScale: 2.5, // Larger characters for this room

  // Background layer - back wall and shelves
  // Images are 1920x1080, rendered at 1200x675 (62.5% scale)
  backgroundLayers: [
    {
      image: '/TwilightGame/assets/rooms/home/grocery_shop/grocery_shop_back.png',
      zIndex: -100,         // Behind everything
      parallaxFactor: 1.0,
      opacity: 1.0,
      width: 1200,
      height: 675,
      centered: true,
    },
  ],

  // Foreground layer - counter (renders in front of fox, behind player)
  foregroundLayers: [
    {
      image: '/TwilightGame/assets/rooms/home/grocery_shop/grocery_shop_front.png',
      zIndex: 65,           // Between fox (50) and player (70+)
      parallaxFactor: 1.0,
      opacity: 1.0,
      width: 1200,
      height: 675,
      centered: true,
    },
  ],

  // Transitions
  transitions: [
    {
      fromPosition: { x: 9, y: 9 }, // Shop door at center bottom (where S is in grid)
      tileType: TileType.SHOP_DOOR,
      toMapId: 'village',
      toPosition: { x: 10, y: 14 }, // Back to village
      label: 'Exit Shop',
    },
  ],

  // NPCs - Fox shopkeeper behind the counter (around y: 5-6 area)
  // zIndexOverride: 50 puts fox between background (-100) and player (100)
  // This means fox appears BEHIND the counter foreground layer (200)
  npcs: [
    {
      ...createShopkeeperNPC('fox_shopkeeper', { x: 6, y: 6 }, 'Fox'),
      zIndexOverride: 50, // Behind player, behind counter
    },
  ],
};
