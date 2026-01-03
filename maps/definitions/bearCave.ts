import { MapDefinition, TileType } from '../../types';
import { parseGrid } from '../gridParser';
import { createChillBearNPC } from '../../utils/npcFactories';

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
 * t = Spruce tree (evergreen conifer)
 * b = Brambles (thorny bushes)
 * s = Wild strawberry (forageable plants)
 */

// 30x20 outdoor cave area with bear's house and natural forest decorations
const gridString = `
LLLLLLLLLLLLLLLLLLLLLLLLLLLLLG
LGGGGGGGtGGGGGGGGGGGGGGGGGGGGG
LGGYGGhGGGGGGGGGGGYGGhGeGGGGGG
LGGGGenGGGGGGGGGGGbGGYGGtGGYGL
LGGtGGGGGGGGGGGGGGtGGeGYjGeGGL
LGGGGtGGGhGGGGGGGGGtGGtGGGbGGL
LtGnGGYGGGGGGGGGGGGGGGGGYGtGGL
LGGYGGGtGGGGGGGGGGGGGGGtGGtGGL
LGGGGGGGGGGG{GGGGGGGGGGGbGtGGL
LGGeGGGGGGGGGGGGGGGGGGGGGGGGtL
LYGGjGGGGGGGGGGGGGGGGYGGGGYGLG
LGGjGYGGGGGGGGGGGGGGGGGGtGGGGL
LGnGeGGGGGGGPGGGGGGGGGGGeGGGtG
tGYGtGnGGGGPGGGGGGGGGtGtGbGGGL
LtGeGGGGGGPGGGGGGGGGGGGGGGeYGL
LGGnGGGhGPGGGGGGGGGGGhYeGGGGGL
tenGeGlGGPGeGGGlGGlGGGhtGeGGtL
LeeeGjlGPGGGGGlGlGGlGYGtYetnGL
LetelnGGPlGGGGGGGGjGbGGnjeGetG
LLLLLLLLLLLLLLLLLLLLLLLLLLLLLL
`;

export const bearCave: MapDefinition = {
  id: 'bear_cave',
  name: "Bear's Cave Clearing",
  width: 30,
  height: 20,
  grid: parseGrid(gridString),
  colorScheme: 'bear_cave', // Cozy outdoor clearing without darkness overlay
  hasClouds: true, // Outdoor area with sky
  isRandom: false,
  spawnPoint: { x: 15, y: 15 }, // On path near south entrance (moved up 3 tiles)
  transitions: [
    {
      fromPosition: { x: 28, y: 18 }, // East path exit
      tileType: TileType.PATH,
      toMapId: 'village',
      toPosition: { x: 4, y: 15 }, // Return to village (next to magical lake entrance)
      label: 'To Village',
    },
  ],
  npcs: [
    // Chill Bear - peaceful bear enjoying tea, positioned to the right of the house
    createChillBearNPC(
      'chill_bear_cave',
      { x: 20, y: 13 }, // Right side of the cave, next to the house (moved down 5 tiles)
      'Chill Bear'
    ),
  ],
};
