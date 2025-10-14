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
 * L = Wall boundary (brick walls for map edges)
 * R = Rock (in-map decorative obstacles)
 * P = Path
 * W = Water
 * D = Door (back to home)
 * S = Shop Door
 * M = Mine Entrance
 * B = Building Wall
 * O = Building Roof
 * N = Building Door (eNtrance)
 * V = Building Window
 * X = Farm plot (fallow soil)
 * U = Bush (decorative foliage)
 */

const gridString = `
LLLLLLLLLLLLLLLLLLLLLLLLLLLLLL
LUGGGOOOOGGPGGGGOOOOGGGGGWWWL
LGGGGOBVBGGPGGGGOBVBXXXGGWWWL
LGGGGOBVBGGPGGGGOBVBXXXGGWWWL
LGGGGOBNBGGPGGGGOBNBGGGGGWWWL
LGGGGGGPPPPPPPPGGGGGGGGGGWWUL
LGGGGGGPGGGGGGGPGGGGGGGGGGGGL
LGGGGGGPGGGGGGGPGGGGGGGGUGGL
LGGGGGGPOOOOOUGPGGGRRRRRRRRL
LGGGGGGPOBVBOGPGGGRGGGGGGGGGL
LGGGGGGPOBVBOGPGGGRGGRGRRRRGG
LGGGGGGPOBNBOGPGGGMGGRXXXXRGG
LGGGGGGPGGGGGGPGGGGGGGGGGGGP
LGGGGGGPPPPPPPPPGGGGGGGGGGGPL
LGGGGGGGGGGPGGGGGGGGGGGUUGGPL
LPPPPPPPPPPPPPPPPPPPPPPPPPPPL
LGGGGGGGGGGPGGGGGGGGGGGGGGGGL
LGOOOOGGUGGPGGGGGGGGGOOOOGGL
LGOBVBXGGGPGGGGGGGGGOBVBGGGL
LGOBVBXGGGPGGGGGGGGGOBVBGGGL
LGOBNBXGGGPGGGGGGGGGOBVBGGGL
LGGGGGGGGGGPGGGGGGGGOBNBGGGL
LGGGGGGGGGGPGGGGGGGGGGGGGGGGL
LGGGGGGOOOOGGGGGGGGGGGGGGGUL
LGGGGGGOBVBGGGGGGGGGGGGGGGGGL
LGGGGGGOBVBGGGGGGGGGGGGGGGGGL
LGGGGGGOBNBPGGGGGGGXXXXXGGGGL
LGGGGGGGGGGPGGGGGGGXXXXXGGGGL
LGGGGGGGGGGPPPPPPPPPPPPPPPPG
LLLLLLLLLLLLLLLLLLLLLLLLLLLLLL
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
    {
      fromPosition: { x: 28, y: 28 }, // Bottom-right corner of village
      tileType: TileType.GRASS,
      toMapId: 'farm_area',
      toPosition: { x: 10, y: 24 },
      label: 'To Farm',
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
          text: 'Hail and well met, traveller! Hast thou ventured into yon forest yet?',
        },
      ],
    },
    {
      id: 'shopkeeper',
      name: 'Shopkeeper',
      position: { x: 10, y: 12 }, // On path near shop entrance (moved from wall to path)
      direction: Direction.Down,
      behavior: NPCBehavior.STATIC,
      sprite: '/TwilightGame/assets/npcs/shopkeeper.svg',
      dialogue: [
        {
          id: 'greeting',
          text: 'Pray, come within and peruse mine wares! I possess the finest goods in all the village.',
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
          text: 'Well met! Wouldst thou care to play? My mum sayeth I mayn\'t venture to the forest alone...',
        },
      ],
    },
  ],
};
