import { MapDefinition, TileType } from '../../types';
import { parseGrid } from '../gridParser';
import { createStellaNPC, createBunnyflyNPC } from '../../utils/npcFactories';

/**
 * Deep Forest - Sacred grove of the Giant Fairy Oak
 *
 * A mystical clearing deep within the forest where the ancient
 * Fairy Oak stands. Home to Stella, the fairy guardian, and
 * Celestia's flower bugs (glowing spirits represented by mushrooms).
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
 * ! = Giant Fairy Oak (10x10 enormous ancient tree - SINGLE ANCHOR POINT)
 * P = Path
 * u = Mushroom (representing Celestia's glowing flower bugs)
 */

// 35x35 map - large enough for the giant fairy oak and surrounding grove
const gridString = `
LLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLt
LGGGGGGGGGGGGGyGGGGGGGoGGGGGGGGGGGL
LGGeGGGGGZGGGGGGGGGGGGGGGGGZGGGeGGL
LGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGtL
LGGUGGGGGGGGGGGGGGGGGGGGGGGGGGUGGGL
LGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGeL
LtGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGL
LGGGGGGGGGGGGGGGuGuGGGGGGGGGGGGGGyL
LGGGGGGGGGGGGGuGGGGGuGGGGGGGGGGGGeL
LyoGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGtL
LGGGGGGGGGGGGGuGGGGGuGGGGGGGGGGGGGL
LGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGoL
LGGUGGGGGGGGuGGGGGGGGuGGGGGGGGUGGGL
LGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGL
LGGGGGGGGGGuGGGGGGGGGGuGGGGGGGGGGtL
LGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGeL
LGGGGGGGGGuGGGGGGGGGGGGuGGGGGGGGGGL
LGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGyL
LtGGGGGGGGGuGGGG!GGGGuGGGGGGGGGGGtL
LeGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGL
LGGGGGGGGGGGuGGGGGGGGuGGGGGGGGGGGoL
LGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGeL
LGGGGGGGGGGGGuGGGGGGuGGGGGGGGGGGGtL
LGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGL
LGGGGGGGGGGGGGuGGGuGGGGGGGGGGGGGGyL
LyoGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGtL
LeGGGGGGPPPPPPPPPPPPPPPPPPGGGGGGGGL
LGGGGGGGPGGGGGGGGGGGGGGGGPGGGGGGGtL
LGGUGGGGPGGGGGGGGGGGGGGGGPGGGGUGGGL
LGGGGGGGPGGGGGGGGGGGGGGGGPGGGGGGGyL
LtGGGGGGPGGGGGGGGGGGGGGGGPGGGGGGGtL
LeGGGGZGPGGGGGGGGGGGGGGGGPGZGGGGeGL
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
  isRandom: false,
  spawnPoint: { x: 17, y: 33 }, // On path near south entrance
  transitions: [
    {
      fromPosition: { x: 34, y: 34 },
      tileType: TileType.PATH,
      toMapId: 'RANDOM_FOREST',
      toPosition: { x: 2, y: 15 }, // Return to random forest
      label: 'Leave Sacred Grove',
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
    // Stella - fairy guardian of the grove, positioned near the giant fairy oak
    createStellaNPC(
      'stella_deep_forest',
      { x: 19, y: 19 }, // Just to the right of the fairy oak anchor
      'Stella'
    ),
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
  ],
};
