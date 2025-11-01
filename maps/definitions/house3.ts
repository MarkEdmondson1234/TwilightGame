import { MapDefinition, TileType } from '../../types';
import { parseGrid } from '../gridParser';

/**
 * House 3 Interior - Modest house with poor wooden walls
 *
 * Grid Legend:
 * 1 = Wooden Wall (Poor)
 * f = Floor Light
 * @ = Sofa
 * D = Door
 */

const gridString = `
1111111
1fffff1
1f@fff1
1fffffD
1fffff1
1111111
`;

export const house3: MapDefinition = {
  id: 'house3',
  name: 'House',
  width: 7,
  height: 6,
  grid: parseGrid(gridString),
  colorScheme: 'indoor',
  isRandom: false,
  spawnPoint: { x: 3, y: 4 },
  transitions: [
    {
      fromPosition: { x: 6, y: 3 },
      tileType: TileType.DOOR,
      toMapId: 'village',
      toPosition: { x: 4, y: 22 }, // Spawn 2 tiles below the door
      label: 'To Village',
    },
  ],
};
