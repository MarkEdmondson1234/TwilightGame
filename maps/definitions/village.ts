import { MapDefinition, TileType, Direction, NPCBehavior } from '../../types';
import { parseGrid } from '../gridParser';
import { createCatNPC } from '../../utils/npcFactories';

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
 * K = Cottage (4x4 wooden house)
 * X = Farm plot (fallow soil)
 * U = Bush (decorative foliage)
 * Y = Tree (large decorative tree)
 * Z = Big Tree (extra large tree)
 * J = Cherry Tree (seasonal tree with blossoms/fruit)
 */

const gridString = `
LLLLLLLLLLLLLLLLLLLLLLLLLLLLLL
LZGGGOOOOGGPGGGGOOOOGGGGGWWWL
LGGGGOBVBGGPGGGGOBVBXXXGGWWWL
LGGGGOBVBGGPGGGGOBVBXXXGGWWWL
LGGGGOBNBGGPGGGGOBNBGGGGGWWWL
LGGGGGGPPPPPPPPGGGGGGGGGGWWUL
LGGGGGGPGGGGGGGPGGGGGGGGGGGGL
LGGGGGGPGGGGGGGPGGGGGGGGUGGL
LGGGGGGPOOOOOUGPGGGRRRRRRRRL
LGGGGGGPOBVBOGPGGGLLGGGGGGGGL
LGGGGGGPOBVBOGPGGLLLGRGRRRRGL
LGGGGGGPOBNBOGPGGLMLGRXXXGGGL
LGGGGGGPGGGGGGPGGGGGGGGGGGGP
LGGGGGGPPPPPPPPPGGGGGGGGGGGPL
LGGGGGGGGGGPGGGGGGGGGGGUUGGPL
LPPPPPPPPPPPPPPPPPPPPPPPPPPPL
LGGGGGGGGGGPGGGGGGGGGGGGGGGGL
LZOOOGGGUGPPGGGGGGGGGGGGGGGGL
LGOBVBXGGGPGGGGGGGGGGGGGGGGL
LGOBVBXGGGPGGGGGGGGGGGGGGGGL
LGOBNBXGGGPGGGGGGGGGGGGGGGGL
LGGGGGGGGGGPGGGGGJGGGGGGGGGGL
LGGGGGGGGGGPGGGGGGGGGGGGGGGGL
LGGGGGGOOOOPGGGGGGGGKGGGGGGUL
LGGGGGGOBVBPGGGGGGGGGGGGGGGUL
LGGGGGGOBVBPGGGGGGGGGGGGGGGGL
LGGGGGGOBNBPGGGGGGGGGGGGGGGGL
LGGGGGGGGGGPGGGGGGGXXXXXGGGGL
LGGGGGGGGGGPPPPPPPPPPPPPPPPPP
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
      fromPosition: { x: 7, y: 4 }, // North-west house
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
      fromPosition: { x: 9, y: 26 }, // South-center house door (N tile)
      tileType: TileType.BUILDING_DOOR,
      toMapId: 'house4',
      toPosition: { x: 3, y: 4 },
      label: 'To House',
    },
    {
      fromPosition: { x: 19.4, y: 23 }, // Cottage entrance (K tile)
      tileType: TileType.COTTAGE,
      toMapId: 'cottage_interior',
      toPosition: { x: 5, y: 6 },
      label: 'To Cottage',
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
      behavior: NPCBehavior.WANDER,
      sprite: '/TwilightGame/assets/npcs/elder.svg',
      dialogue: [
        {
          id: 'greeting',
          text: 'Hail and well met, traveller! Hast thou ventured into yon forest yet?',
          responses: [
            {
              text: 'Yes, I explored the forest.',
              nextId: 'forest_explored',
            },
            {
              text: 'Not yet, what should I know?',
              nextId: 'forest_warning',
            },
            {
              text: 'Farewell, elder.',
            },
          ],
        },
        {
          id: 'forest_explored',
          text: 'Ah, a brave soul! The forest holds many secrets. Didst thou find any rare herbs or curious stones?',
          responses: [
            {
              text: 'Tell me more about the forest secrets.',
              nextId: 'forest_secrets',
            },
            {
              text: 'I must be going.',
            },
          ],
        },
        {
          id: 'forest_warning',
          text: 'Be wary, young one! Strange creatures roam betwixt the trees. Take care to avoid the darker groves.',
        },
        {
          id: 'forest_secrets',
          text: 'Legends speak of ancient ruins deep within... but mayhaps that is a tale for another day.',
        },
      ],
    },
    {
      id: 'shopkeeper',
      name: 'Shopkeeper',
      position: { x: 8, y: 12 }, // On path near shop entrance (moved left to not block door)
      direction: Direction.Down,
      behavior: NPCBehavior.STATIC,
      sprite: '/TwilightGame/assets/npcs/shopkeeper.svg',
      dialogue: [
        {
          id: 'greeting',
          text: 'Welcome to my humble shop! I have the finest goods in all the village. What brings thee here today?',
          responses: [
            {
              text: 'What do you sell?',
              nextId: 'shop_wares',
            },
            {
              text: 'Any news from travellers?',
              nextId: 'shop_gossip',
            },
            {
              text: 'Just browsing, thanks.',
            },
          ],
        },
        {
          id: 'shop_wares',
          text: 'I have seeds for farming, tools for crafting, and rare trinkets from distant lands. Come inside and see!',
        },
        {
          id: 'shop_gossip',
          text: 'Ah yes! A merchant from the east spoke of strange lights in the cave. Most peculiar indeed...',
        },
      ],
    },
    {
      id: 'child',
      name: 'Village Child',
      position: { x: 15, y: 17 }, // On main path in village center
      direction: Direction.Right,
      behavior: NPCBehavior.WANDER,
      sprite: '/TwilightGame/assets-optimized/npcs/little_girl.png',
      portraitSprite: '/TwilightGame/assets/npcs/little_girl.png', // High-res for dialogue
      dialogue: [
        {
          id: 'greeting',
          text: 'Hi! Want to play? My mum says I can\'t go to the forest alone. It\'s not fair!',
          responses: [
            {
              text: 'What do you like to play?',
              nextId: 'play_games',
            },
            {
              text: 'Why can\'t you go to the forest?',
              nextId: 'forest_story',
            },
            {
              text: 'Maybe another time!',
            },
          ],
        },
        {
          id: 'play_games',
          text: 'I like hide and seek! And exploring! But mum says the forest is too dangerous...',
        },
        {
          id: 'forest_story',
          text: 'Mum says there are big scary monsters! But I bet they\'re not THAT scary. Are they?',
          responses: [
            {
              text: 'They can be dangerous, listen to your mum.',
              nextId: 'safety_lesson',
            },
            {
              text: 'Maybe when you\'re older.',
            },
          ],
        },
        {
          id: 'safety_lesson',
          text: 'Okay... I guess I\'ll wait till I\'m bigger. Will you tell me about your adventures sometime?',
        },
      ],
    },
    // Add cat NPC using factory function
    createCatNPC('village_cat', { x: 25, y: 23 }, 'Sleepy Cat'),
  ],
};
