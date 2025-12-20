import { MapDefinition, TileType } from '../../types';
import { parseGrid } from '../gridParser';
import { createShopkeeperNPC } from '../../utils/npcFactories';

/**
 * Shop - Village Grocery Shop Interior
 *
 * A cosy grocery shop using background-image rendering mode.
 * The image shows the interior with shelves, counter, and shopping area.
 *
 * Image dimensions: 1920x1080 pixels
 * At TILE_SIZE of 32: 1920/32 = 60 tiles wide, 1080/32 ≈ 33.75 tiles tall
 *
 * Walkmesh Grid Legend:
 * . = Floor (walkable)
 * # = Wall/Obstacle (solid)
 * F = Furniture (solid - shelves, counter, displays)
 * S = Shop Door (transition back to village)
 *
 * The grid is invisible - only used for collision!
 */

const gridString = `
############################################################
#..........................................................#
#..........................................................#
#..........................................................#
#..........................................................#
#..........................................................#
#..........................................................#
#..........................................................#
#..........................................................#
#..........................................................#
#..........................................................#
#..........................................................#
#..........................................................#
#..........................................................#
#..........................................................#
#..........................................................#
###########################S################################
`;

export const shop: MapDefinition = {
  id: 'shop',
  name: 'Village Shop',
  width: 60,
  height: 33,
  grid: parseGrid(gridString),
  colorScheme: 'shop',
  isRandom: false,
  spawnPoint: { x: 30, y: 28 }, // Start near door at bottom center
  renderMode: 'background-image',
  characterScale: 6.0, // Make player/NPCs twice as big to fit the room scale

  // Background layers
  backgroundLayers: [
    {
      image: '/TwilightGame/assets/rooms/home/grocery_shop/grocery_shop_back.png',
      zIndex: -100,
      parallaxFactor: 1.0,
      opacity: 1.0,
      useNativeSize: true,  // Use image's 1920x1080 dimensions
      centered: true,       // Center in viewport
    },
    {
      image: '/TwilightGame/assets/rooms/home/grocery_shop/grocery_shop_front.png',
      zIndex: 100,  // Render above player (player is at z-index ~50)
      parallaxFactor: 1.0,
      opacity: 1.0,
      useNativeSize: true,  // Use image's 1920x1080 dimensions
      centered: true,       // Center in viewport
    },
  ],

  // Transitions
  transitions: [
    {
      fromPosition: { x: 27, y: 32 }, // Shop door at bottom center (where S is in grid)
      tileType: TileType.SHOP_DOOR,
      toMapId: 'village',
      toPosition: { x: 10, y: 14 }, // Back to village
      label: 'Exit Shop',
    },
  ],

  // NPCs - Shopkeeper fox (position to be determined based on shop layout)
  npcs: [
    createShopkeeperNPC('fox_shopkeeper', { x: 30, y: 15 }, 'Fox'),
  ],
};
