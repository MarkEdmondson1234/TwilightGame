import { MapDefinition, TileType } from '../../types';
import { parseGrid } from '../gridParser';
import {
  createCatNPC,
  createOldWomanKnittingNPC,
  createDogNPC,
  createVillageElderNPC,
  createShopkeeperNPC,
  createVillageChildNPC,
} from '../../utils/npcFactories';

// Note: All NPCs now use factory functions from npcFactories.ts
// This keeps the map file clean and makes NPCs reusable across maps

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
 * L = Wall boundary (trees for map edges)
 * R = Rock (in-map decorative obstacles)
 * P = Path
 * W = Water (old, use lake tiles below instead)
 * Lake tiles: w = center, < = left edge, > = right edge, ^ = top edge, v = bottom edge
 * D = Door (back to home)
 * S = Shop Door
 * s = TileType.COTTAGE_STONE,
 * k = TileType.COTTAGE_FLOWERS,
 * % = TileType.SHOP (seasonal shop building)
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
 * = = Well (stone well, 2x2 sprite with winter variation)
 */

const gridString = `
ZLULYZLLULYLLULUUULLUYLLYULJL
LZGGGGGZGGGPGGZGGGGGGGZGGG^^L
YGGGGGGGGGGPGGGGkGGGXXXGG<WWW
LGGGGGGGGGGPGGGGGGGGXXXGG<WWW
YGZGGGGKGGGPGGGGsGGGGGGGG<WWW
YYGGGGGPPPPPPPPPPPPGGGGGG<WWW
YGGGGGGPGGGGGGGPGGGGGGGGGGvvv
LGGGGGGPGGGGGGGPGGGGGGGGUGGGL
YGGGGGGPGGGGGGGPGGGGGGGGRGRGL
LGGGGGGPGGGGGGPGGGGGGGGGGGGGL
JGGGGGGPGGGGGGPGGGGGMGRGRGGRGJ
LZGGGGGGPG%GGGPGGGGGGRXXXGGGL
YGGGGGGPGGGGGGPGGGGGGGGGGGGP
LGGGGGGPPPPPPPPPGGGGGGGGGGGPZ
LGGGGGGGGGGPGGGGGGGGGGGUUGGPU
LPPPPPPPPPPPPPPPPPPPPPPPPPPPL
ZGGGGGGGGGGPGGGGGGGGGGGGGGGGY
UZGGGGGGUGPPGGGGGGGG=GGGGGGGL
LGGGGGXGGGPGGGGGGGGGGGGGGGGL
ZGzGGGXGGGPGGGGGGGGGGGGGGGGZ
LGGGGGXGGGPGGGGGGGGGGGGGGGGL
LGGGGGGGGGGPGGGGGJGGGGGGGGGGZ
ZGGGGGGGGGGPGGGGGGGGGGGGGGGGU
UGGGGGGGGGGPGGGGGGGGKGGGGGGUL
YGGGGGGkGGGPGGGGGGGGGGGGGGGUJ
LGGGGGGGGGGPGGGGGGGGGGGGGGGGL
JGGGGGGGGGGPGGGGGGGGGGGGGGGGL
LGGGGGGGGGGPGGGGGGGXXXXXGGGGU
ZGYGGGGGGGGPPPPPPPPPPPPPPPPPP
YLYLJLZLYLUULULJLYLULULUYLLUUU
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
      fromPosition: { x: 8.2, y: 26 }, // Home building door (N tile)
      tileType: TileType.BUILDING_DOOR,
      toMapId: 'home_interior',
      toPosition: { x: 5, y: 6 },
      label: 'To Home',
    },
    {
      fromPosition: { x: 6.5, y: 4.2 }, // North-west house
      tileType: TileType.BUILDING_DOOR,
      toMapId: 'house1',
      toPosition: { x: 3, y: 4 },
      label: 'To House',
    },
    {
      fromPosition: { x: 17.2, y: 4 }, // North-east house
      tileType: TileType.BUILDING_DOOR,
      toMapId: 'house2',
      toPosition: { x: 3, y: 4 },
      label: 'To House',
    },
    {
      fromPosition: { x: 11.5, y: 12.5 }, // Shop building (next to fox)
      tileType: TileType.SHOP,
      toMapId: 'shop',
      toPosition: { x: 7, y: 8 },
      label: 'To Shop',
    },
    {
      fromPosition: { x: 3.3, y: 20 }, // South-west house
      tileType: TileType.BUILDING_DOOR,
      toMapId: 'house3',
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
      fromPosition: { x: 20, y: 11 }, // Mine entrance (M tile)
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
    // Village Elder - wise NPC near cherry tree
    createVillageElderNPC('village_elder', { x: 15, y: 22 }),
    // Shopkeeper - fox merchant near shop entrance
    createShopkeeperNPC('shopkeeper', { x: 8, y: 12 }),
    // Village Child - wandering little girl
    createVillageChildNPC('child', { x: 15, y: 17 }),
    // Add cat NPC using factory function
    createCatNPC('village_cat', { x: 25, y: 23 }, 'Sleepy Cat'),
    // Add old woman knitting near the cat
    createOldWomanKnittingNPC('old_woman_knitting', { x: 23, y: 23 }, 'Old Woman'),
    // Add dog that follows the little girl
    createDogNPC('village_dog', { x: 16, y: 17 }, 'child', 'Friendly Dog'),
  ],
};
