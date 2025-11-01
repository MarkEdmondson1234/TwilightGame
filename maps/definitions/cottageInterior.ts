import { MapDefinition, TileType } from '../../types';
import { parseGrid } from '../gridParser';

/**
 * Cottage Interior - Cozy wooden cottage
 *
 * A rustic interior with:
 * - Exit door at bottom center
 * - Bed, sofa, and rug
 *
 * Grid Legend:
 * 3 = Wooden Wall (Posh)
 * F = Floor
 * C = Carpet
 * r = Rug (cottagecore decorative rug)
 * A = Bed (4x4 tiles)
 * E = Exit Door (back to village)
 * @ = Sofa (3 tiles wide, 1 tile tall)
 */

const gridString = `
333333333333
333333333333
FFFFFFFFFFFF
F@FFFFFFFAFF
FrFFFFFFFFFF
FTFFFFFFFFFF
FFFFFFFFFFFF
FFFFFFFFFFFF
`;

export const cottageInterior: MapDefinition = {
  id: 'cottage_interior',
  name: 'Cottage',
  width: 12,
  height: 8,
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
