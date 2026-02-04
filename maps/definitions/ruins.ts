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
 */

// Ruins-specific grid codes (override globals where needed)
const RUINS_CODES: Record<string, TileType> = {
  '!': TileType.FROST_FLOWER, // Frost flower (weather-conditional)
};

// 30x20 outdoor ruins area with frost flowers and natural forest decorations
const gridString = `
LLLLLLLLLLLLLLLLLLLLLLLLLLLLLL
LGGGGGGGtGGGGGGGGGGGGGGGGGGGGL
LGGYGGhGGGGG!GGGGGYGGhGGGGGGGL
LGGGGenGGdGGGGGGGbGGYGGtGGYGGL
LGGtGGGGGGGGGdGGGGtGGeGYjGeGGL
LGGGGtGGGhGGGGGGGGGtGGtGGGbGGL
LtGnGGYGGGG!GGGGGGGGGGGGYGtGGL
LGGYGGGtGGGGGGGGGGGGGGGtGGtGGL
LGGGGGGGGGGGGGGGGGGGGGGG!GtGGL
LGGeGGGGGGGGGGGGGGGGGGGGGGGGtL
LYGGjGGGGGGGGGGGGnGGYGGGGYGGGL
LGGjGYGGGGGGGGGGGGGGGGGGtGGGGL
LGnGeGGGGdGGPGGGGdGGGGPPPGGGtL
tGYGtGnGdGGPGGGGGGGGGtGePbGGGL
LtGeGGGGGGPGGGGGGGGGGGGGPGeYGL
LGGnGGGhGPGGGGGGdGGGGhYePGGtGL
tenGeGlGGPGeGGGlGdlGGGhtPeGGtL
LeeeGjlGPGGGGGlGlGGlGYGtPPPntL
LetelnGGPlGGGGGGGGjGbGGnjePPPD
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
      fromPosition: { x: 29, y: 18 },
      tileType: TileType.DOOR,
      toMapId: 'village',
      toPosition: { x: 26, y: 1 },
      label: 'To Village',
    },
  ],
  npcs: [],
};
