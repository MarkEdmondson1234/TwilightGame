import { MapDefinition, TileType } from '../../types';
import { parseGrid } from '../gridParser';

/**
 * House 4 Interior - Regular house with wooden walls
 *
 * Grid Legend:
 * 2 = Wooden Wall (Regular)
 * Q = Floor Dark
 * @ = Sofa
 * D = Door
 */

const gridString = `
2222222
2@QQQQ2
2QQQQQ2
2QQQQQD
2QQQQQ2
2222222
`;

export const house4: MapDefinition = {
  id: 'house4',
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
      toPosition: { x: 22, y: 23 }, // Spawn 2 tiles below the door
      label: 'To Village',
    },
  ],
};
