import { MapDefinition, TileType } from '../../types';
import { parseGrid } from '../gridParser';

/**
 * Ancient Ruins - Mysterious overgrown ruins in a forest clearing
 *
 * A forgotten place where magical frost flowers bloom during snowfall.
 * The crumbling stone structures are barely visible through the vegetation.
 *
 * This area is accessible from the village and features weather-conditional
 * flora that only appears when it snows.
 *
 * Grid Legend:
 * G = Grass (outdoor ground)
 * L = Wall boundary (rocky walls)
 * P = Path (well-worn dirt path)
 * D = Door (transition point)
 * ! = Frost flower (weather-conditional, only visible when snowing)
 * t = Spruce tree (evergreen conifer)
 * Y = Tree (deciduous)
 * o = Oak tree
 * b = Brambles (thorny bushes)
 * d = Blueberry bush
 * h = Hazel bush
 * e = Fern
 * j = Small fir tree
 * n = Small spruce tree
 * l = Village flowers
 * § = Ruins entrance (8x8 seasonal ancient archway)
 */

// Ruins-specific grid codes (override globals where needed)
const RUINS_CODES: Record<string, TileType> = {
  '!': TileType.FROST_FLOWER, // Frost flower (weather-conditional)
  '§': TileType.RUINS_ENTRANCE, // Ruins entrance (8x8 seasonal structure)
};

// 30x20 outdoor ruins area with frost flowers and natural forest decorations
const gridString = `
LLLLLLLLLLLLLLLLLLLLLLLLLLLLLL
LGGGGGGGtGGGGGGGGGGGGGGGGGGGGL
LGGYGGhGGGGG!GGlGGYGG!GGGGGGGL
LGGGGenGG!GGGG!GGeGGYGGtGGYGGL
LGGtGGGGGlG!G!GGGGtGGeGejGeGGL
LGGGGtG!G!GlGG!GlGGtGGtGGGbGGL
LtGnGG!GGGG!GGGGlGGGlGGGYGtGGL
LGGYGGGtGlGG!GeGGlGGGGGtGGtGGL
LGGGGGGGGG!G!GlGlG!GGlGG!GtGGL
LGGeGGGGGGlGlGGG!GGGG!!!GGGGtL
LYGG!GGG!GG!lG!lGGGG!G!GGYGGGL
LGGjGYGGG!lG!GlGGlGGGGGGtGGGGL
LGnGeGG!G!GGlGeG!!GG§GGeGGGGtL
tGYGtGnG!G!PGGG!GGPPG!GeGeGGGL
LtGeGGGG!GPGG!l!lG!P!!GGeGeGGL
LGGnG!GyGPGG!l!l!!G!PP!eGeGtGL
tenGeGlGGPGeG!GlG!lG!Pe!GeGGtL
LeeeGjlGPG!GGGlGlGGlP!PteGentL
LetelnGGPlGGGGGGGGeGePGejeGGGG
LLLLLLLLLLLLLLLLLLLLLLLLLLLLLL
`;

export const ruins: MapDefinition = {
  id: 'ruins',
  name: 'Ancient Ruins',
  width: 30,
  height: 20,
  grid: parseGrid(gridString, RUINS_CODES),
  colorScheme: 'bear_cave',
  hasClouds: true,
  isRandom: false,
  spawnPoint: { x: 14, y: 16 },
  transitions: [
    {
      fromPosition: { x: 21, y: 18 },
      tileType: TileType.DOOR,
      toMapId: 'village',
      toPosition: { x: 26, y: 1 },
      label: 'To Village',
    },
    {
      fromPosition: { x: 13, y: 3 },
      tileType: TileType.GRASS,
      toMapId: 'witch_hut',
      toPosition: { x: 11, y: 28 },
      label: "To Juniper's Grove",
      requiresQuest: 'althea_chores',
      requiresQuestStage: 3,
    },
  ],
  npcs: [],
};
