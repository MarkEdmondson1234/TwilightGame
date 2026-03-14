import { MapDefinition, TileType } from '../../types';
import { parseGrid } from '../gridParser';
import { createKingLavaFrogNPC } from '../../utils/npcFactories';

/**
 * King Lava Frog's Lair
 *
 * A rare hidden chamber deep within the lava caverns, only accessible
 * 20% of the time when travelling deeper between lava levels.
 * Home to the King Lava Frog — future content to be added.
 *
 * Grid Legend:
 * # = Cave Rock (wall)
 * V = Lava Floor (walkable)
 * M = Mine Entrance (transition tile)
 */

// 30x30 map — clean chamber ready for future decorations and boss content
const gridString = `
##############################
#VVVVVVVVVVVVVVVVVVVVVVVVVVVV#
#VVVVVVVVVVVVVVVVVVVVVVVVVVVV#
#VVVVVVVVVVVVVVVVVVVVVVVVVVVV#
#VVVVVVVVVVVVVVVVVVVVVVVVVVVV#
#VVVVVVVVVVVVVVVVVVVVVVVVVVVV#
#VVVVVVVVVVVVVVVVVVVVVVVVVVVV#
#VVVVVVVVVVVVVVVVVVVVVVVVVVVV#
#VVVVVVVVVVVVVVVVVVVVVVVVVVVV#
#VVVVVVVVVVVVVVVVVVVVVVVVVVVV#
#VVVVVVVVVVVVVVVVVVVVVVVVVVVV#
#VVVVVVVVVVVVVVVVVVVVVVVVVVVV#
#VVVVVVVVVVVVVVVVVVVVVVVVVVVV#
#VVVVVVVVVVVVVVVVVVVVVVVVVVVV#
#VVVVVVVVVVVVVVVVVVVVVVVVVVVV#
#MVVVVVVVVVVVVVVVVVVVVVVVVVVM#
#VVVVVVVVVVVVVVVVVVVVVVVVVVVV#
#VVVVVVVVVVVVVVVVVVVVVVVVVVVV#
#VVVVVVVVVVVVVVVVVVVVVVVVVVVV#
#VVVVVVVVVVVVVVVVVVVVVVVVVVVV#
#VVVVVVVVVVVVVVVVVVVVVVVVVVVV#
#VVVVVVVVVVVVVVVVVVVVVVVVVVVV#
#VVVVVVVVVVVVVVVVVVVVVVVVVVVV#
#VVVVVVVVVVVVVVVVVVVVVVVVVVVV#
#VVVVVVVVVVVVVVVVVVVVVVVVVVVV#
#VVVVVVVVVVVVVVVVVVVVVVVVVVVV#
#VVVVVVVVVVVVVVVVVVVVVVVVVVVV#
#VVVVVVVVVVVVVVVVVVVVVVVVVVVV#
#VVVVVVVVVVVVVVVVVVVVVVVVVVVV#
##############################
`;

export const kingLavaFrogLair: MapDefinition = {
  id: 'king_lava_frog_lair',
  name: "King Lava Frog's Lair",
  width: 30,
  height: 30,
  grid: parseGrid(gridString, {
    '#': TileType.CAVE_ROCK,
    V: TileType.LAVA_FLOOR,
  }),
  colorScheme: 'lava',
  isRandom: false,
  spawnPoint: { x: 3, y: 15 },
  transitions: [
    {
      fromPosition: { x: 1, y: 15 },
      tileType: TileType.MINE_ENTRANCE,
      toMapId: 'RANDOM_LAVA',
      toPosition: { x: 27, y: 15 },
      label: 'Exit Lair',
    },
    {
      fromPosition: { x: 28, y: 15 },
      tileType: TileType.MINE_ENTRANCE,
      toMapId: 'RANDOM_LAVA',
      toPosition: { x: 3, y: 15 },
      label: 'Deeper into Lava',
    },
  ],
  npcs: [
    createKingLavaFrogNPC('king_lava_frog', { x: 22, y: 12 }),
  ],
};
