import { MapDefinition, TileType } from '../../types';
import { parseGrid } from '../gridParser';

/**
 * Witch Hut Interior - Cosy magical dwelling
 *
 * A small, mystical interior of the witch's tree-house.
 * Features a simple layout with wooden floors and walls.
 * Eventually will include magical furnishings, potion brewing station,
 * spell books, and other witchy decorations.
 *
 * Grid Legend:
 * F = Floor (wooden floor)
 * 2 = Wooden Wall (regular quality)
 * E = Exit Door (door back outside)
 */

// 10x6 map - small cosy interior
const gridString = `
2222E22222
2FFFFFFFF2
2FFFFFFFF2
2FFFFFFFF2
2FFFFFFFF2
2222222222
`;

export const witchHutInterior: MapDefinition = {
  id: 'witch_hut_interior',
  name: 'Witch Hut - Interior',
  width: 10,
  height: 6,
  grid: parseGrid(gridString),
  colorScheme: 'indoor',
  isRandom: false,
  spawnPoint: { x: 5, y: 3 }, // Center of the room, moved up 1 tile
  transitions: [
    {
      fromPosition: { x: 4, y: 0 },
      tileType: TileType.EXIT_DOOR,
      toMapId: 'witch_hut',
      toPosition: { x: 15, y: 19 }, // Just south of the door outside
      label: 'Exit Witch Hut',
    },
  ],
  npcs: [
    // TODO: Add witch NPC when ready
    // TODO: Add magical decorations and furniture
  ],
};
