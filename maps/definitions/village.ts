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
 * ( = Magical Lake (12x12 lake sprite)
 * ) = Small Lake (6x6 pond sprite)
 * D = Door (back to home)
 * S = Shop Door
 * s = TileType.COTTAGE_STONE,
 * k = TileType.COTTAGE_STONE,
 * % = TileType.SHOP (seasonal shop building)
 * M = Mine Entrance
 * B = Building Wall
 * O = Building Roof
 * N = Building Door (eNtrance)
 * V = Building Window
 * K = Cottage (4x4 wooden house)
 * A = Old Cottage (weathered cottage, spring/summer/autumn + winter variant)
 * H = Player Home (15x15 seasonal building, entrance to Mum's kitchen)
 * X = Farm plot (fallow soil)
 * U = Bush (decorative foliage)
 * e = Fern (forest floor plant)
 * Y = Tree (large decorative tree)
 * Z = Big Tree (extra large tree)
 * J = Sakura Tree (seasonal)
 * o = Oak Tree (seasonal oak tree)
 * t = Spruce Tree (evergreen conifer)
 * y = Willow Tree (graceful weeping willow)
 * i = Wild Iris (flowering plant near water)
 * = = Well (stone well, 2x2 sprite with winter variation)
 * ; = Pink Rosebush (2x2, local code, dormant in winter)
 * " = Red Rosebush (2x2, local code, dormant in winter)
 */

const gridString = `
oLULYoLtULoLtULUUULLUoLLGULJLG
oe,eJlL,,L:lel:,,,,,loLL,l:l:G
LoG,G,GeGG,,l,oG,G,,l:eeGGGLGG
tG,G,,G,,,XXX,G,G,,,MlGG,yGGeG
LG,,c,,,G,XXX,c,,,e,P,GeGeGeGG
oGol,;,GAGGP,l,,sG,;P,G,Gl,lGG
Ytl,,,,PPPPPPPPPPPPPPGG,,,,cGG
LG,,G,,P,,Gl,G,,G,G",,,e,GlGLG
tG,G,,,P,G,,,G,,J,,G,,,,eG,GeG
Lc,,G,,PG,G,,,PG,,G,,l,,,,,GLG
JG,G,,,PG,,G,,PG,l,,lGGR,RG,,e
LoG,Gc,GPe%G,,PG,:,,GPR,,,eGGL
oGc,l,,PG,G,,GP,c,G,lP,,,,PPPP
LG,G,,,PPPPPPPPPPPPP,,,,k,,Gte
tG,,G,,,G,.PG,l,,lGPPPPPP;;,eG
LPPPPPPPPPPPP,,,G8,,,,G,,G,,,G
oG,G,l,G,,,PG,cG,,Gl,lG,,l,GeY
UoG,cG,,PPPPGGG,G,,Ge=i,G,,G,t
LG,G,GGGGGPG,,G,,G,i,,i,,l,GLG
oGGG,,GGGGPG,G,,G,,,,G,,,G,,oG
LG,G,GGGGPPG,,G,,eG,G,,G,,,GLG
,G,,;",G,PPPG,,,,GJG,G,,5G,,Ge
oG,G,,,8,HPPG;,G,,5,,,,,,l,GGU
UG,cGl,,,G,PG,G,,c"",GK,5,,,eU
GG,G,XXXX,,PPPPPPPPG,G,,,,c,UJ
LG,,GXXXXG,,G,lP,,l,,,,,G,e,GL
JG,GGXXXX,;;G,,P,,GXXXXXG,5eGt
LG,,,G,G,,G,G,,PG,GXXXXXeG,,GU
oGoc,,;;,G,,,G,P,,G,G,,l,U,,,,
tLoGG,l,,lGL,´GLG,,L,L,LUoLL,,
`;

export const village: MapDefinition = {
  id: 'village',
  name: 'Village',
  width: 30,
  height: 30,
  grid: parseGrid(gridString, {
    ':': TileType.MEADOW_GRASS, // : = Meadow grass (seasonal ground cover)
    ';': TileType.ROSEBUSH_PINK, // ; = Pink rosebush (village only, 2x2)
    '"': TileType.ROSEBUSH_RED, // " = Red rosebush (village only, 2x2)
    'H': TileType.PLAYER_HOME, // H = Player home (15x15 seasonal building)
    'A': TileType.OLD_COTTAGE, // A = Old Cottage (village only, weathered cottage)
  }),
  colorScheme: 'village',
  hasClouds: true,
  isRandom: false,
  spawnPoint: { x: 15, y: 27 }, // On the path below the home building
  transitions: [
    {
      fromPosition: { x: 9.5, y: 21 }, // Player home door (bottom of 13x13 sprite, anchor H at y=22)
      tileType: TileType.PLAYER_HOME,
      toMapId: 'mums_kitchen',
      toPosition: { x: 7, y: 6 },
      label: 'To Home',
      hasDoor: true,
    },
    {
      fromPosition: { x: 6.5, y: 4.2 }, // North-west house
      tileType: TileType.BUILDING_DOOR,
      toMapId: 'house1',
      toPosition: { x: 3, y: 4 },
      label: 'To House',
      hasDoor: true,
    },
    {
      fromPosition: { x: 23.5, y: 13 }, // Cottage medium (Little Girl's house)
      tileType: TileType.COTTAGE_STONE,
      toMapId: 'house2',
      toPosition: { x: 3, y: 4 },
      label: "To Little Girl's House",
      hasDoor: true,
    },
    {
      fromPosition: { x: 11.5, y: 12.5 }, // Shop building (next to fox)
      tileType: TileType.SHOP,
      toMapId: 'shop',
      toPosition: { x: 10, y: 8 }, // Center of walkable floor in shop (19x11 grid)
      label: 'To Shop',
      hasDoor: true,
    },
    {
      fromPosition: { x: 21.4, y: 24 }, // Cottage entrance (K tile)
      tileType: TileType.COTTAGE,
      toMapId: 'cottage_interior',
      toPosition: { x: 0, y: 8 }, // Bottom left near door
      label: 'To Cottage',
      hasDoor: true,
    },
    {
      fromPosition: { x: 20, y: 3 }, // Mine entrance (M tile)
      tileType: TileType.MINE_ENTRANCE,
      toMapId: 'RANDOM_CAVE',
      toPosition: { x: 17, y: 12 }, // Spawn in center of cave (safe zone)
      label: 'To Mine',
    },
    {
      fromPosition: { x: 28, y: 12 }, // East exit to forest (last G before R border)
      tileType: TileType.GRASS,
      toMapId: 'RANDOM_FOREST',
      toPosition: { x: 20, y: 15 }, // Spawn in center of forest (safe zone)
      label: 'To Forest',
    },
    {
      fromPosition: { x: 15, y: 28 }, // Bottom-center of village
      tileType: TileType.GRASS,
      toMapId: 'farm_area',
      toPosition: { x: 8, y: 24 }, // Use farm's spawnPoint, not the return transition tile
      label: 'To Farm',
    },
    {
      fromPosition: { x: 4, y: 14 }, // DEBUG: Quick access to magical lake (3 down from Hidden Grove)
      tileType: TileType.GRASS,
      toMapId: 'magical_lake',
      toPosition: { x: 14, y: 28 }, // Spawn at south entrance of magical lake
      label: 'To Magical Lake (Debug)',
    },
    {
      fromPosition: { x: 4, y: 15 }, // Bear cave entrance (1 down from Magical Lake)
      tileType: TileType.GRASS,
      toMapId: 'bear_cave',
      toPosition: { x: 8, y: 17 }, // Spawn on path near entrance (safe from bear house collision)
      label: "To Bear's Cave",
    },
    {
      fromPosition: { x: 26, y: 1 }, // North-east corner to ruins
      tileType: TileType.GRASS,
      toMapId: 'ruins',
      toPosition: { x: 14, y: 16 }, // Spawn at ruins spawn point
      label: 'To Ancient Ruins',
    },
    {
      fromPosition: { x: 29, y: 6 }, // East side path exit to personal garden
      tileType: TileType.PATH,
      toMapId: 'personal_garden',
      toPosition: { x: 8, y: 24 }, // Spawn at garden entrance
      label: 'To Personal Garden',
    },
  ],
  npcs: [
    // Village Elder - wise NPC near cherry tree
    createVillageElderNPC('village_elder', { x: 15, y: 22 }),
    // Shopkeeper - fox merchant near shop entrance
    createShopkeeperNPC('shopkeeper', { x: 8, y: 12 }),
    // Village Child - wandering little girl (moved to open area near path)
    createVillageChildNPC('child', { x: 12, y: 8 }),
    // Add cat NPC using factory function - positioned left of old woman
    createCatNPC('village_cat', { x: 17, y: 26 }, 'Sleepy Cat'),
    // Add old woman knitting near the farm plots (row 4 from bottom)
    createOldWomanKnittingNPC('old_woman_knitting', { x: 18, y: 27 }, 'Old Woman'),
    // Add dog that follows the little girl
    createDogNPC('village_dog', { x: 13, y: 8 }, 'child', 'Friendly Dog'),
    // Duck - spring seasonal creature near the well/pond area
    // Only appears in spring (uses visibilityConditions to hide during other seasons)
    // Single duck to make it feel more special and rare
    createDuckNPC('village_duck', { x: 20, y: 17 }, 'Duck'),
  ],
};
