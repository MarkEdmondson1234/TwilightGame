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
 * 2 = Wooden Wall (Regular)
 * F = Floor
 * C = Carpet
 * D = Door (stairs down)
 * A = Bed (3x3 tiles, anchor at center)
 * @ = Sofa (3 tiles wide)
 * & = Chimney (2x2)
 * _ = Desk (surface for placing items)
 */

const gridString = `
2222222222
2ff@fffff2
2ffffffff2
2ffrfffff2
2fffffAf&2
2_fffffff2
2ffffffff2
222D222222
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
      hasDoor: true,
    },
  ],
};
