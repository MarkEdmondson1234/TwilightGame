import { MapDefinition, TileType } from '../../types';
import { parseGrid } from '../gridParser';

const gridString = `
#######
#fffff#
#f@fff#
#fffffD
#fffff#
#######
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
