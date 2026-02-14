import { MapDefinition, TileType } from '../../types';
import { parseGrid } from '../gridParser';
import { createBunnyflyNPC, createSparrowNPC } from '../../utils/npcFactories';

/**
 * Deep Forest - Sacred grove of the Giant Fairy Oak
 *
 * A mystical clearing deep within the forest where the ancient
 * Fairy Oak stands. Home to the Fairy Queen (inside the tree) and
 * Celestia's flower bugs (glowing spirits represented by mushrooms).
 *
 * Note: Morgan and Stella fairies no longer spawn here permanently.
 * They appear via the fairy attraction manager near mature fairy bluebells.
 *
 * This area is only accessible 20% of the time when going
 * deeper into the forest - making it a rare and special discovery.
 *
 * Grid Legend:
 * G = Grass
 * L = Wall boundary (dense forest edges)
 * U = Bush (decorative foliage)
 * e = Fern (forest floor plant)
 * Y = Tree (regular tree)
 * Z = Big Tree
 * o = Oak Tree (seasonal)
 * t = Spruce Tree (evergreen)
 * y = Willow Tree (graceful weeping willow)
 * 4 = Dead tree with mushrooms (old gnarled tree)
 * ! = Giant Fairy Oak (10x10 enormous ancient tree - SINGLE ANCHOR POINT)
 * P = Path
 * u = Mushroom (representing Celestia's glowing flower bugs)
 * a = Moonpetal (night-blooming magical flower)
 * ' = Addersmeat (night-blooming magical flower, moon magic)
 */

// 35x35 map - large enough for the giant fairy oak and surrounding grove
const gridString = `
LLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLt
LGGGGGGGGGGGGGyGGGGGGGoGGGGGGGGGGGL
LGGeGGGGGZGGGGGGGGGGGGGGGGGZGGGeGGL
LGGGGGGGGGGGGGGaGGGGGGG'GGGGGGGGGtL
LGGUGGGGGGGGGGGGGGGGGGGGGGGGGGUGGGL
LGGG'GGGGGGGGGGGGGGGGGGGGGGGGGGGGeL
LtGGGGGGGGGGGaGGGGGGGGGGGGGGGGGGGGL
LGGGGGGGGGGGGGGGuGuGGGGGGGGGGGGGGyL
LGGGGGtGaGGGGGuGGGGGuGGGGGG'GGGGGeL
LyoGGGGGGGGGGGGGGGGGGGGGGGGGGtGGGtL
LGGGGGGGGGGGGGuGGGGGuGGGGGGGGGGGGGL
LGGGGG'GGGGGGGGGGGGGGGGGGGGGGGGGGoL
LGGUGaGGGGGGuGGGGGGGGuGGGGGGGGUGGGL
LGGGGGGGGGGGGGGGGGGGGGGGGGGGGaGGGGL
LGGGGGaGGGGuGGGGGGGGGGuGGGG4GGGGGtL
LGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGeL
LGGGGGGGGGuGGGGGGGGGGGGuGGGGGGtGGGL
LGGGGGG4GGGGGGGGGGGGGGGGGaGGGGGGGyL
LtGGGGGGGGGuGGGG!GGGGuGGGGGGGGGGGtL
LeGGaGGGGGGGGGGGGGGGGGGGGGGGGGGaGGL
LGGGGGGG'GGGuGGGGGGGGuGGGGGGGaGGGoL
LGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGeL
LGGGGGGGGGGGGuGGGGGGuGGGGGGGGGGGGtL
LGGGGGGGGGaGGGGGGGGGGGGGGGGGaGGGGGL
LGGGGGGGGGGGGGuGGGuGGGGG'GGGGGGaGyL
LyoGGaGG4GGGGGGGGGGGGGGGGGGGGGGGGtL
LeGGGGGGPPPPPPPPPPPPPPPPPPGGG4GGGGL
LGGGGGGGPGGGGGGGGGGGGGGGGPGGGGGGGtL
LGGUGGGGPGGGGGGGGGGGGGGGGPGGGGUGGGL
LGGGGGGGPGGGGGGGGGGGGGGGGPGGGGGGGyL
LtGGGGGGPGGGGGGGGGGGGGGGGPGGGGGGGtL
LeGtGGZGPGGGGGGGGGGGGGGGGPGZGGGGeGL
LGGGGGGGPGGGGGGGGGGGGGGGGPGGGGGGGoL
LGGGGGGPPPPPPPPPPPPPPPPPPPGGGGGGGPL
LLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLL
`;

export const deepForest: MapDefinition = {
  id: 'deep_forest',
  name: 'Deep Forest - Sacred Grove',
  width: 35,
  height: 35,
  grid: parseGrid(gridString),
  colorScheme: 'forest',
  hasClouds: true,
  isRandom: false,
  spawnPoint: { x: 17, y: 33 }, // On path near south entrance
  transitions: [
    {
      fromPosition: { x: 8, y: 29 }, // West path - exit to village
      tileType: TileType.PATH,
      toMapId: 'village',
      toPosition: { x: 15, y: 25 }, // Village center
      label: 'Back to Village',
    },
    {
      fromPosition: { x: 25, y: 29 }, // East path - deeper into forest
      tileType: TileType.PATH,
      toMapId: 'RANDOM_FOREST',
      toPosition: { x: 2, y: 15 }, // Random forest entrance
      label: 'Deeper into Forest',
    },
    {
      fromPosition: { x: 7, y: 27 },
      tileType: TileType.PATH,
      toMapId: 'magical_lake',
      toPosition: { x: 14, y: 28 }, // South entrance of magical lake
      label: 'To Magical Lake',
    },
  ],
  npcs: [
    // Note: Stella no longer spawns here permanently - she appears via
    // the fairy attraction manager near mature fairy bluebells at night

    // Bunnyflies - magical creatures that flutter around the sacred grove
    createBunnyflyNPC(
      'bunnyfly_deep_forest_1',
      { x: 12, y: 22 }, // West of the fairy oak
      'Bunnyfly'
    ),
    createBunnyflyNPC(
      'bunnyfly_deep_forest_2',
      { x: 25, y: 16 }, // East of the fairy oak
      'Bunnyfly'
    ),
    createBunnyflyNPC(
      'bunnyfly_deep_forest_3',
      { x: 17, y: 10 }, // North of the fairy oak
      'Bunnyfly'
    ),
    // Sparrow - small bird hopping and flying around the grove
    createSparrowNPC(
      'sparrow_deep_forest_1',
      { x: 20, y: 12 },
      'Sparrow'
    ),
  ],
};
