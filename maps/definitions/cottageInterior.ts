import { MapDefinition, TileType } from '../../types';
import { parseGrid } from '../gridParser';

/**
 * Cottage Interior - Cozy wooden cottage
 *
 * A rustic interior with:
 * - Exit door at bottom center
 * - Simple furniture layout
 * - Wooden floor
 * - Cozy bed (2x1 tiles)
 *
 * Grid Legend:
 * # = Wall
 * F = Floor
 * C = Carpet
 * r = Rug (cottagecore decorative rug)
 * T = Table
 * H = Chair
 * A = Bed (2x4 tiles - 2 wide, 4 tall)
 * E = Exit Door (back to village)
 */

const gridString = `
############
#FFFFTFFAFF#
#HFFFFFFFFF#
#FFCCCFFFFF#
#FFrFFCCCFF#
#FFCCCFFFFF#
#FFFFETFFFF#
#FFFFEFFF###
######E#####
`;

export const cottageInterior: MapDefinition = {
  id: 'cottage_interior',
  name: 'Cottage',
  width: 12,
  height: 9,
  grid: parseGrid(gridString),
  colorScheme: 'indoor',
  isRandom: false,
  spawnPoint: { x: 6, y: 7 }, // Start near the bottom door
  transitions: [
    {
      fromPosition: { x: 6, y: 8 }, // Exit door at bottom
      tileType: TileType.EXIT_DOOR,
      toMapId: 'village',
      toPosition: { x: 20, y: 24 }, // Spawn below the cottage in village
      label: 'To Village',
    },
  ],
};
