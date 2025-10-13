import { MapDefinition, TileType, Direction, NPCBehavior } from '../../types';
import { parseGrid } from '../gridParser';

/**
 * Village - Central hub area
 *
 * A small village with:
 * - Path network connecting areas
 * - Multiple buildings (shop, houses, etc.) using building tiles
 * - Entrance to home (door D at bottom-center)
 * - Mine entrance (M)
 * - Exit to forest areas (paths at edges)
 *
 * Grid Legend:
 * G = Grass
 * R = Rock (borders/decorative)
 * P = Path
 * W = Water
 * D = Door (back to home)
 * S = Shop Door
 * M = Mine Entrance
 * B = Building Wall
 * O = Building Roof
 * N = Building Door (eNtrance)
 * V = Building Window
 */

const gridString = `
RRRRRRRRRRRRRRRRRRRRRRRRRRRRRR
RGGGGOOOOGGPGGGGOOOOGGGGGWWWR
RGGGGOBVBGGPGGGGOBVBGGGGGWWWR
RGGGGOBVBGGPGGGGOBVBGGGGGWWWR
RGGGGOBNBGGPGGGGOBNBGGGGGWWWR
RGGGGGGPPPPPPPPGGGGGGGGGGWWWR
RGGGGGGPGGGGGGGPGGGGGGGGGGGGR
RGGGGGGPGGGGGGGPGGGGGGGGGGGGR
RGGGGGGPOOOOOOGPGGGRRRRRRRRRR
RGGGGGGPOBVBOGPGGGRGGGGGGGGR
RGGGGGGPOBVBOGPGGGRGGGGGGGGR
RGGGGGGPOBNBOGPGGGMGGGGGGGGR
RGGGGGGPGGGGGGPGGGGGGGGGGGGGR
RGGGGGGPPPPPPPPPGGGGGGGGGGGGR
RGGGGGGGGGGPGGGGGGGGGGGGGGGGG
RPPPPPPPPPPPPPPPPPPPPPPPPPPPR
RGGGGGGGGGGPGGGGGGGGGGGGGGGGG
RGOOOOGGGGPGGGGGGGGGOOOOGGGR
RGOBVBGGGGPGGGGGGGGGOBVBGGGR
RGOBVBGGGGPGGGGGGGGGOBVBGGGR
RGOBNBGGGGPGGGGGGGGGOBVBGGGR
RGGGGGGGGGGPGGGGGGGGOBNBGGGR
RGGGGGGGGGGPGGGGGGGGGGGGGGGGG
RGGGGGGOOOOGGGGGGGGGGGGGGGGGR
RGGGGGGOBVBGGGGGGGGGGGGGGGGGR
RGGGGGGOBVBGGGGGGGGGGGGGGGGGR
RGGGGGGOBNBPGGGGGGGGGGGGGGGGR
RGGGGGGGGGGPGGGGGGGGGGGGGGGGG
RGGGGGGGGGGPGGGGGGGGGGGGGGGGG
RRRRRRRRRRRRRRRRRRRRRRRRRRRRRR
`;

export const village: MapDefinition = {
  id: 'village',
  name: 'Village',
  width: 30,
  height: 30,
  grid: parseGrid(gridString),
  colorScheme: 'village',
  isRandom: false,
  spawnPoint: { x: 15, y: 27 }, // On the path below the home building
  transitions: [
    {
      fromPosition: { x: 9, y: 26 }, // Home building door (N tile)
      tileType: TileType.BUILDING_DOOR,
      toMapId: 'home_interior',
      toPosition: { x: 5, y: 6 },
      label: 'To Home',
    },
    {
      fromPosition: { x: 6, y: 4 }, // North-west house
      tileType: TileType.BUILDING_DOOR,
      toMapId: 'house1',
      toPosition: { x: 3, y: 4 },
      label: 'To House',
    },
    {
      fromPosition: { x: 18, y: 4 }, // North-east house
      tileType: TileType.BUILDING_DOOR,
      toMapId: 'house2',
      toPosition: { x: 3, y: 4 },
      label: 'To House',
    },
    {
      fromPosition: { x: 10, y: 11 }, // Shop building (middle-left)
      tileType: TileType.BUILDING_DOOR,
      toMapId: 'shop',
      toPosition: { x: 7, y: 8 },
      label: 'To Shop',
    },
    {
      fromPosition: { x: 4, y: 20 }, // South-west house
      tileType: TileType.BUILDING_DOOR,
      toMapId: 'house3',
      toPosition: { x: 3, y: 4 },
      label: 'To House',
    },
    {
      fromPosition: { x: 22, y: 21 }, // South-east house
      tileType: TileType.BUILDING_DOOR,
      toMapId: 'house4',
      toPosition: { x: 3, y: 4 },
      label: 'To House',
    },
    {
      fromPosition: { x: 18, y: 11 }, // Mine entrance (M tile)
      tileType: TileType.MINE_ENTRANCE,
      toMapId: 'RANDOM_CAVE',
      toPosition: { x: 17, y: 12 },  // Spawn in center of cave (safe zone)
      label: 'To Mine',
    },
    {
      fromPosition: { x: 28, y: 12 }, // East exit to forest (last G before R border)
      tileType: TileType.GRASS,
      toMapId: 'RANDOM_FOREST',
      toPosition: { x: 20, y: 15 },  // Spawn in center of forest (safe zone)
      label: 'To Forest',
    },
  ],
  npcs: [
    {
      id: 'village_elder',
      name: 'Village Elder',
      position: { x: 7, y: 9 }, // On path near shop
      direction: Direction.Down,
      behavior: NPCBehavior.STATIC,
      sprite: '/TwilightGame/assets/npcs/elder.svg',
      dialogue: [
        {
          id: 'greeting',
          text: 'Welcome to our village, traveler! Have you explored the forest yet?',
        },
      ],
    },
    {
      id: 'shopkeeper',
      name: 'Shopkeeper',
      position: { x: 11, y: 11 }, // On path near shop entrance
      direction: Direction.Down,
      behavior: NPCBehavior.STATIC,
      sprite: '/TwilightGame/assets/npcs/shopkeeper.svg',
      dialogue: [
        {
          id: 'greeting',
          text: 'Come inside and browse my wares! I have the finest goods in the village.',
        },
      ],
    },
    {
      id: 'child',
      name: 'Village Child',
      position: { x: 15, y: 17 }, // On main path in village center
      direction: Direction.Right,
      behavior: NPCBehavior.STATIC,
      sprite: '/TwilightGame/assets/npcs/child.svg',
      dialogue: [
        {
          id: 'greeting',
          text: 'Hi! Do you want to play? My mom says I can\'t go to the forest alone...',
        },
      ],
    },
  ],
};
