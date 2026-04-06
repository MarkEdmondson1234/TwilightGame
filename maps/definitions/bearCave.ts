import { MapDefinition, TileType } from '../../types';
import { parseGrid } from '../gridParser';

/**
 * Bear Cave - Outdoor cave clearing with the Chill Bear's house
 *
 * An outdoor rocky cave area where the Chill Bear has built their cozy house.
 * The bear's dwelling sits in this sheltered clearing, surrounded by forest
 * vegetation that grows around the cave entrance.
 *
 * This is the OUTDOOR area - the bear house sprite is the actual dwelling.
 *
 * This area is accessible from the village (near the magical lake entrance)
 * and provides a safe, peaceful respite.
 *
 * Grid Legend:
 * G = Grass (outdoor ground)
 * L = Wall boundary (rocky cave walls)
 * P = Path (well-worn dirt path)
 * { = Bear house (12x12 cozy dwelling structure - SINGLE ANCHOR POINT)
 * } = Bee hive (3x3 wooden hive structure - SINGLE ANCHOR POINT)
 * t = Spruce tree (evergreen conifer)
 * b = Brambles (thorny bushes)
 * s = Wild strawberry (forageable plants)
 */

// 30x20 outdoor cave area with bear's house and natural forest decorations
const gridString = `
LLLLLLLLLLLLLLLLLLLLLLLLLLLLLG
LGGGGGGGtGGGGGGGGGGGGGGGGGGGGG
LGGYGGhGGGGG}Gd}GGYGGhGGGGGGGG
LGGGGenGGdGGGGGGGGbGGYGGtGGYGL
LGGtGGGGGGGGGdGGGGtGGeGYjGeGGL
LGGGGtGGGhGGGGGGGGGtGGtGGGbGGL
LtGnGGYGGGGGGGGGGGGGGGGGYGtGGL
LGGY]GGtGGGGGGGGGGGGGGGtGGtGGL
LGGGGGGGGGGG{GGGGGGGGGGGbGtGGL
LGGe]GGGGGGGGGGGGGGGGGGGGGGGtL
LYGGjGGGGGGGGGGGGGnGGYGGGGYGLG
LGGjGYGGGGGGGGGGGGGGGGGGtGGGGL
LGnGeG]GGdGGPGGGGdGGGGPPPGGGtG
tGYGtGnGdGGPGGGGGGGGGtGePbGGGL
LtGeGGGGGGPGGGGGGGGGGGGGPGeYGL
LGGnGGGhGPGGGGGGdGGGGhYePGGtGL
tenGeGlGGPGeGGGlGdlGGGhtPeGGtL
LeeeGjlGPGGGGGlGlGGlGYGtPPPntL
LetelnGGPlGGGGGGGGjGbGGnjePPPG
LLLLLLLLLLLLLLLLLLLLLLLLLLLLLL
`;

export const bearCave: MapDefinition = {
  id: 'bear_cave',
  name: "Bear's Cave Clearing",
  width: 30,
  height: 20,
  grid: parseGrid(gridString, {
    ']': TileType.PILE_OF_LEAVES, // ] = Pile of leaves (autumn-only, walkable)
  }),
  colorScheme: 'bear_cave', // Cozy outdoor clearing without darkness overlay
  hasClouds: true, // Outdoor area with sky
  isRandom: false,
  spawnPoint: { x: 15, y: 15 }, // On path near south entrance (moved up 3 tiles)
  transitions: [
    {
      fromPosition: { x: 2, y: 18 }, // West path exit
      tileType: TileType.PATH,
      toMapId: 'farm_area',
      toPosition: { x: 17, y: 20 }, // Return to farm area
      label: 'To Farm Area',
    },
    {
      fromPosition: { x: 12, y: 11 }, // Bear house entrance (accessible position in front of house)
      tileType: TileType.BEAR_HOUSE,
      toMapId: 'bear_den',
      toPosition: { x: 7, y: 7 }, // Inside the den (centre of walkable area)
      label: 'Enter Bear\'s Den',
      hasDoor: true,
    },
  ],
  npcs: [
    // Chill Bear is inside his den, not outside - meet him indoors!
  ],
};
