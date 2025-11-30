import { MapDefinition, TileType } from '../../types';
import { parseGrid } from '../gridParser';
import { createStellaNPC } from '../../utils/npcFactories';

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
 * ! = Giant Fairy Oak (10x10 enormous ancient tree - SINGLE ANCHOR POINT)
 * P = Path
 * M = Mushroom (representing Celestia's glowing flower bugs)
 */

// 35x35 map - large enough for the giant fairy oak and surrounding grove
const gridString = `
LLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLt
LGGGGGGGGGGGGGoGGGGGGGoGGGGGGGGGGGL
LGGeGGGGGZGGGGGGGGGGGGGGGGGZGGGeGGL
LGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGtL
LGGUGGGGGGGGGGGGGGGGGGGGGGGGGGUGGGL
LGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGeL
LtGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGL
LGGGGGGGGGGGGGGGMGMGGGGGGGGGGGGGGoL
LGGGGGGGGGGGGGMGGGGGMGGGGGGGGGGGGeL
LGoGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGtL
LGGGGGGGGGGGGGMGGGGGMGGGGGGGGGGGGGL
LGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGoL
LGGUGGGGGGGGMGGGGGGGGMGGGGGGGGUGGGL
LGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGL
LGGGGGGGGGGMGGGGGGGGGGMGGGGGGGGGGtL
LGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGeL
LGGGGGGGGGMGGGGGGGGGGGGMGGGGGGGGGGL
LGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGoL
LtGGGGGGGGGMGGGG!GGGGGMGGGGGGGGGGtL
LeGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGL
LGGGGGGGGGGGMGGGGGGGGMGGGGGGGGGGGoL
LGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGeL
LGGGGGGGGGGGGMGGGGGGMGGGGGGGGGGGGtL
LGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGL
LGGGGGGGGGGGGGMGGGMGGGGGGGGGGGGGGoL
LGoGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGtL
LeGGGGGGPPPPPPPPPPPPPPPPPPGGGGGGGGL
LGGGGGGGPGGGGGGGGGGGGGGGGPGGGGGGGtL
LGGUGGGGPGGGGGGGGGGGGGGGGPGGGGUGGGL
LGGGGGGGPGGGGGGGGGGGGGGGGPGGGGGGGoL
LtGGGGGGPGGGGGGGGGGGGGGGGPGGGGGGGtL
LeGGGGZGPGGGGGGGGGGGGGGGGPGZGGGGeGL
LGGGGGGGPGGGGGGGGGGGGGGGGPGGGGGGGoL
LGGGGGGPPPPPPPPPPPPPPPPPPPPGGGGGGGPL
LLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLL
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
  ],
  npcs: [
    // Stella - fairy guardian of the grove, positioned near the giant fairy oak
    createStellaNPC(
      'stella_deep_forest',
      { x: 19, y: 19 }, // Just to the right of the fairy oak anchor
      'Stella'
    ),
  ],
};
