import { MapDefinition, TileType } from '../../types';
import { parseGrid } from '../gridParser';

const gridString = `
#######
#@FFFF#
#FFFFF#
#FFFFFD
#FFFFF#
#######
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
