import { MapDefinition, TileType } from '../../types';
import { parseGrid } from '../gridParser';

/**
 * Home Upstairs - Bedroom area
 *
 * A cozy upstairs bedroom with:
 * - Stairs down at bottom (D)
 * - Bed and sofa
 * - Chimney on right wall
 *
 * Grid Legend:
 * # = Wall
 * F = Floor
 * C = Carpet
 * D = Door (stairs down)
 * A = Bed (3x3 tiles, anchor at center)
 * @ = Sofa (3 tiles wide)
 * & = Chimney (2x2)
 */

const gridString = `
##########
#ff@fffff#
#ffffffff#
#ffrfffff#
#fffffAf&#
#ffffffff#
#ffffffff#
###D######
`;

export const homeUpstairs: MapDefinition = {
  id: 'home_upstairs',
  name: 'Home Upstairs',
  width: 10,
  height: 8,
  grid: parseGrid(gridString),
  colorScheme: 'indoor',
  isRandom: false,
  spawnPoint: { x: 5, y: 6 }, // Start near stairs
  transitions: [
    {
      fromPosition: { x: 3, y: 7 }, // Stairs down
      tileType: TileType.DOOR,
      toMapId: 'home_interior',
      toPosition: { x: 3, y: 6 }, // Back to downstairs
      label: 'Downstairs',
    },
  ],
};
