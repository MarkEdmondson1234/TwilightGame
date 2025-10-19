import { MapDefinition, TileType } from '../../types';
import { parseGrid } from '../gridParser';

/**
 * House 1 Interior - Small cozy house
 *
 * Grid Legend:
 * F = Floor
 * # = Wall
 * C = Carpet
 * r = Rug (cottagecore decorative rug)
 * D = Door (exit)
 * T = Table
 * H = Chair
 */

const gridString = `
#######
#FFFFF#
#FCTFF#
#FrHFFD
#FFFFF#
#######
`;

export const house1: MapDefinition = {
  id: 'house1',
  name: 'House',
  width: 7,
  height: 6,
  grid: parseGrid(gridString),
  colorScheme: 'indoor',
  isRandom: false,
  spawnPoint: { x: 3, y: 4 }, // Inside the house
  transitions: [
    {
      fromPosition: { x: 6, y: 3 }, // Door exit
      tileType: TileType.DOOR,
      toMapId: 'village',
      toPosition: { x: 6, y: 6 }, // Spawn 2 tiles below the door
      label: 'To Village',
    },
  ],
};
