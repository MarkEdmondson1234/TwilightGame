import { MapDefinition, TileType } from '../../types';
import { parseGrid } from '../gridParser';

/**
 * Shop - Village shop
 *
 * A cozy shop with:
 * - Counter area with tables
 * - Display items
 * - Exit back to village
 *
 * Grid Legend:
 * # = Wall
 * F = Floor
 * C = Carpet
 * T = Table
 * H = Chair
 * S = Shop Door (exit)
 */

const gridString = `
##############
#FFFFFFFFFFTT#
#FFFFFFFFFFTT#
#FFFFFFFFFFTT#
#FFFFFFFFFFTT#
#CCCCCCCCCCCC#
#CCCCCCCCCCCC#
#CCCCCCCCCCCC#
#FFFFFFFFFFFF#
#FFFFFFFFFFFF#
######S#######
`;

export const shop: MapDefinition = {
  id: 'shop',
  name: 'Village Shop',
  width: 14,
  height: 11,
  grid: parseGrid(gridString),
  colorScheme: 'shop',
  isRandom: false,
  spawnPoint: { x: 7, y: 8 }, // Start near door
  transitions: [
    {
      fromPosition: { x: 6, y: 10 }, // Shop door at bottom
      tileType: TileType.SHOP_DOOR,
      toMapId: 'village',
      toPosition: { x: 10, y: 13 },
      label: 'Exit Shop',
    },
  ],
};
