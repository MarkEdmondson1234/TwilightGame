import { MapDefinition, TileType } from '../../types';
import { parseGrid } from '../gridParser';

/**
 * Home Interior - Starting area
 *
 * A small cozy interior room with:
 * - Stairs up at bottom (D)
 * - Exit door to village at top-right (E)
 * - Sofa and rug
 *
 * Grid Legend:
 * # = Wall
 * F = Floor
 * C = Carpet
 * r = Rug (cottagecore decorative rug)
 * D = Door (stairs up)
 * E = Exit Door (to village)
 * @ = Sofa (3 tiles wide, 1 tile tall)
 */

const gridString = `
#######E##
#ffffffff#
#ff@fffff##
#ffffffff##
#frffffff#
#ffffffff#
#ffffffff#
###D######
`;

export const homeInterior: MapDefinition = {
  id: 'home_interior',
  name: 'Home',
  width: 10,
  height: 8,
  grid: parseGrid(gridString),
  colorScheme: 'indoor',
  isRandom: false,
  spawnPoint: { x: 5, y: 6 }, // Start near the bottom door
  transitions: [
    {
      fromPosition: { x: 6, y: 1 }, // Exit door at top-right
      tileType: TileType.EXIT_DOOR,
      toMapId: 'village',
      toPosition: { x: 9, y: 28 }, // Spawn below the home building in village
      label: 'To Village',
    },
    {
      fromPosition: { x: 3, y: 7 }, // Stairs up at bottom
      tileType: TileType.DOOR,
      toMapId: 'home_upstairs',
      toPosition: { x: 3, y: 6 }, // Spawn upstairs
      label: 'Upstairs',
    },
  ],
};
