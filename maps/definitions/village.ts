import { MapDefinition, TileType } from '../../types';
import { parseGrid } from '../gridParser';
import {
  createCatNPC,
  createOldWomanKnittingNPC,
  createDogNPC,
  createVillageElderNPC,
  createShopkeeperNPC,
  createVillageChildNPC,
  createDuckNPC,
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
 * , = Village Green (decorative ground cover)
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
 * e = Fern (forest floor plant)
 * Y = Tree (large decorative tree)
 * Z = Big Tree (extra large tree)
 * J = Cherry Tree (seasonal tree with blossoms/fruit)
 * o = Oak Tree (seasonal oak tree)
 * t = Spruce Tree (evergreen conifer)
 * y = Willow Tree (graceful weeping willow)
 * i = Wild Iris (flowering plant near water)
 * = = Well (stone well, 2x2 sprite with winter variation)
 */

const gridString = `
oLULYoLtULoLtULUUULLUoLLGULJLG
LoG,G,GeGG,,,,oG,G,,G,eeGiGLGG
tG,G,,G,,,XXX,G,kXXXXXGG,yGGeG
LG,,G,,,G,XXX,,,,XXXXXGeGeGeGG
oGoG,G,GKGGP,G,,sG,,,,G,GG,GGG
YtG,G,,PPPPPPPPPPPGG,G,,,G,,GG
oG,,G,,P,G,,,G,PG,,G,G,,,,GGGG
LG,,G,,P,,G,,G,PG,G,,G,eUGGGLG
tG,G,,,P,G,,,G,PG,,G,,,,RGRGeG
LG,,G,,PG,G,,,PG,,G,,G,,,,,GLG
JG,G,,,PG,,G,,PG,G,,GMGR,RG,Re
LoG,G,,GPe%G,,PG,G,,GPR,,,eGGL
oG,,G,,PG,G,,,PG,,G,,P,,,,PPPP
LG,G,,,PPPPPPPPPPPPPPPPPPPPGte
tG,,G,,,G,,PG,G,,,G,,,,UUG,,UG
LPPPPPPPPPPPP,,,GG,,,eG,,G,,eG
oG,G,,,G,,,PG,,G,,G,,,G,,,,GeY
UoG,,G,,UGPPGGG,G,,Ge=i,G,,G,t
LG,G,GXXGGPG,,G,,G,i,,i,,,,GLG
oGzG,,XXGGPG,G,,G,,,,G,,,G,,oG
LG,G,GXXG,PG,,G,,eG,G,,G,,,GLG
tG,,G,,G,,,PG,G,,GJG,G,,,G,,Ge
oG,G,,,G,,,PG,,G,,G,,,,G,,,GGU
UG,,G,,,G,,PG,G,,,G,,GKG,G,,eU
tG,G,,,kG,,PPPPPPPP,,G,G,,,GUJ
LG,,G,,,,G,,G,GP,,G,,,,,G,eGGL
JG,G,J,G,,U,G,,P,,GXXXXXG,GeGt
LG,,XXXG,,G,G,GP,,GXXXXXeG,,GU
oGoG,,GG,G,,JG,P,,G,G,,G,U,,,,
tLoLG,G,,GGLULG,,L,L,LUoLL,,o,
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
      fromPosition: { x: 8.2, y: 27 }, // Home building door (N tile) - lowered to be level with farm plots
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
      fromPosition: { x: 3.3, y: 21 }, // South-west house (moved down 1 tile for better accessibility)
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
      fromPosition: { x: 15, y: 28 }, // Bottom-center of village
      tileType: TileType.GRASS,
      toMapId: 'farm_area',
      toPosition: { x: 10, y: 24 },
      label: 'To Farm',
    },
    {
      fromPosition: { x: 4, y: 11 }, // Next to shop (hidden path)
      tileType: TileType.GRASS,
      toMapId: 'witch_hut',
      toPosition: { x: 11, y: 28 },  // Spawn at south entrance of witch hut
      label: 'To Hidden Grove',
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
    createCatNPC('village_cat', { x: 25, y: 20 }, 'Sleepy Cat'),
    // Add old woman knitting near the cat
    createOldWomanKnittingNPC('old_woman_knitting', { x: 23, y: 25 }, 'Old Woman'),
    // Add dog that follows the little girl
    createDogNPC('village_dog', { x: 16, y: 17 }, 'child', 'Friendly Dog'),
    // Duck - spring seasonal creature near the well/pond area (TODO: implement seasonal spawning)
    // Currently spawns year-round, but dialogue indicates it should only be present in spring
    // Single duck to make it feel more special and rare
    createDuckNPC('village_duck', { x: 20, y: 17 }, 'Duck'),
  ],
};
