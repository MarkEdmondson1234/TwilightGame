import { MapDefinition, TileType } from '../../types';
import { parseGrid } from '../gridParser';
import { createMumNPC } from '../../utils/npcFactories';

/**
 * Home Interior - Starting area
 *
 * A small cozy interior room with:
 * - Stairs up at bottom (D)
 * - Exit door to village at top-right (E)
 * - Sofa and rug
 * - Chimney on right wall
 * - Stove in kitchen area
 *
 * Grid Legend:
 * 2 = Wooden Wall (Regular)
 * F = Floor
 * f = Floor Light
 * C = Carpet
 * r = Rug (cottagecore decorative rug)
 * D = Door (stairs up)
 * E = Exit Door (to village)
 * @ = Sofa (3 tiles wide, 1 tile tall)
 * & = Chimney (2x2)
 * $ = Stove (2 tiles wide, 3 tiles tall)
 */

const gridString = `
2222222E22
2ffffffff2
2$ff@ffff22
2ffffffff&2
2fffrffff2
2ffffffff2
2ffffffff2
222D222222
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
      fromPosition: { x: 7, y: 0 }, // Exit door at top-right
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
  npcs: [
    createMumNPC('mum_home', { x: 3, y: 5 }, 'Mum'),
  ],
};
