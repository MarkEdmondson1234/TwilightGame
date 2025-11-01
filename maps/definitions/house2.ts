import { MapDefinition, TileType } from '../../types';
import { parseGrid } from '../gridParser';

/**
 * House 2 Interior - Posh house with nice wooden walls
 *
 * Grid Legend:
 * 3 = Wooden Wall (Posh)
 * f = Floor Light
 * @ = Sofa
 * & = Chimney
 * $ = Stove
 * D = Door
 */

const gridString = `
3333333
3$f@ff3
3ffff&3
3fffffD
3fffff3
3333333
`;

export const house2: MapDefinition = {
  id: 'house2',
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
      toPosition: { x: 18, y: 6 }, // Spawn 2 tiles below the door
      label: 'To Village',
    },
  ],
};
