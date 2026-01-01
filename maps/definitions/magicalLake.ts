import { MapDefinition, TileType } from '../../types';
import { parseGrid } from '../gridParser';
import { createMotherSeaNPC, createBunnyflyNPC } from '../../utils/npcFactories';

/**
 * Magical Lake - Sacred waters of Mother Sea
 *
 * A mystical clearing deep within the forest where an ancient
 * magical lake lies. Mother Sea, an ancient water spirit, rises
 * from its depths to share wisdom with those who approach respectfully.
 *
 * This area is a rare and special discovery, accessible from the
 * deeper parts of the forest.
 *
 * Grid Legend:
 * G = Grass
 * L = Wall boundary (dense forest edges)
 * U = Bush (decorative foliage)
 * e = Fern (forest floor plant)
 * o = Oak Tree (seasonal)
 * t = Spruce Tree (evergreen)
 * y = Willow Tree (graceful weeping willow near water)
 * i = Wild Iris (grows near water)
 * P = Path
 * ( = Magical Lake (12x12 multi-tile sprite - SINGLE ANCHOR POINT)
 */

// 30x30 map - large enough for the magical lake and surrounding forest
const gridString = `
LLLLLLLLLLLLLLLLLLLLLLLLLLLLLt
LGGGGGGGGGGGoGGGGGGGGGGGGGGGGL
LGGeGGGGGGGGGGGGGGGGGGGGGGGGtL
LGGGGGGGGGGGGGGGGGGGGGGGGGGGGe
LGGUGGGGGGGGGGGGGGGGGGGGGGGUGy
LGGGGGGGGGGGGGGGGGGGGGGGGGGGtL
LGGGGGGyGGGGGGGGGGGGGGyGGGGGGL
LGoGGGGGGGGiGGGGGGiGGGGGGGGoGy
LGGGGGGGGGGGGGGGGGGGGGGGGGGGtL
LGGGGGGGGGiGGGGGGGGiGGGGGGGGGe
LGGGGGGGGGGGGGGGGGGGGGGGGGGGGL
LGGGGGGGGGGGGGGGGGGGGGGGGGGGoL
LGyGGGGGGGGGGGGGGGGGGGGGGGGyGL
LGGGGGGGGGGGGGGGGGGGGGGGGGGGtL
LGGGGGGGGGGGGGG(GGGGGGGGGGGGGe
LGGGGGGGGGGGGGGGGGGGGGGGGGGGGL
LGoGGGGGGGGGGGGGGGGGGGGGGGGGoL
LGGGGGGyGGGGGGGGGGGGGGyGGGGGtL
LGGGGGGGGGGGGGGGGGGGGGGGGGGGGe
LGGGGGGGGGiGGGGGGGGiGGGGGGGGGL
LGGGGGGGGGGGGGGGGGGGGGGGGGGGtL
LGGGGGGGGGGGiGGGGiGGGGGGGGGGyL
LGyGGGGGGGGGGGGGGGGGGGGGGGGyGL
LGGGGGGGGGGGGGGGGGGGGGGGGGGGtL
LGGUGGGGPPPPPPPPPPPPPGGGGUGGGe
LGGGGGGGPGGGGGGGGGGGGGGGGGGGoL
LGoGGGGGPGGGGGGGGGGGGGGGGGGGtL
LGGGGGGGPGGGGGGGGGGGGGGGGGGGGe
LGGGGGPPPPPPPPPPPPPPPPGGGGGGPL
LLLLLLLLLLLLLLLLLLLLLLLLLLLLLL
`;

export const magicalLake: MapDefinition = {
  id: 'magical_lake',
  name: 'Magical Lake - Waters of Mother Sea',
  width: 30,
  height: 30,
  grid: parseGrid(gridString),
  colorScheme: 'forest',
  hasClouds: true,
  isRandom: false,
  spawnPoint: { x: 14, y: 28 }, // On path near south entrance
  transitions: [
    {
      fromPosition: { x: 29, y: 29 },
      tileType: TileType.PATH,
      toMapId: 'deep_forest',
      toPosition: { x: 7, y: 28 }, // Return to deep forest via path
      label: 'To Sacred Grove',
    },
    {
      fromPosition: { x: 6, y: 28 }, // DEBUG: Quick return to village
      tileType: TileType.PATH,
      toMapId: 'village',
      toPosition: { x: 4, y: 14 }, // Return near the debug entrance
      label: 'To Village (Debug)',
    },
  ],
  npcs: [
    // Mother Sea - ancient water spirit rising from the magical lake
    createMotherSeaNPC(
      'mother_sea',
      { x: 15, y: 13 }, // Center of the magical lake (1 tile up and right from anchor)
      'Mother Sea'
    ),
    // Bunnyflies - magical creatures that flutter around the sacred waters
    createBunnyflyNPC(
      'bunnyfly_lake_1',
      { x: 6, y: 12 }, // West of the lake
      'Bunnyfly'
    ),
    createBunnyflyNPC(
      'bunnyfly_lake_2',
      { x: 23, y: 13 }, // East of the lake
      'Bunnyfly'
    ),
    createBunnyflyNPC(
      'bunnyfly_lake_3',
      { x: 14, y: 6 }, // North of the lake
      'Bunnyfly'
    ),
  ],
};
