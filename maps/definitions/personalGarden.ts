import { MapDefinition, TileType } from '../../types';
import { parseGrid } from '../gridParser';
import { tileAssets } from '../../assets';
import { GREENHOUSE_MAP_ID } from '../../constants';

/**
 * Personal Garden - A private farming area for the player
 *
 * A peaceful walled garden with personal farm plots.
 * Unlike village and farm_area plots (which are globally shared),
 * this garden is saved per-player via personal cloud saves.
 *
 * Layout: 16x26 map with farm plots in two field sections
 *
 * Grid Legend:
 * G = Grass
 * L = Wall boundary (trees for map edges)
 * P = Path
 * X = Farm plot (fallow soil)
 * U = Bush (decorative foliage)
 * e = Fern (forest floor plant)
 * Y = Tree (large decorative tree)
 * o = Oak Tree
 * t = Spruce Tree
 * J = Sakura Tree
 * ) = Small Lake (6x6 pond sprite)
 * , = Village Green (decorative ground cover)
 * z = Greenhouse (leads to the all-season greenhouse interior)
 */

const gridString = `
ULLYoLLJoLLYLLLU
LG,,G,,G,,G,,GeL
tG,G,,G,,G,,G,Go
LG,,,,,,,,,,,,GL
oGe,XXXXXXXXX,GL
LG,,XXXXXXXXX,,t
UG,,XXXXXXXXX,GL
LG,,XXXXXXXXX,,o
UG,,XXXXXXXXX,GL
LGe,XXXXXXXXX,eL
LP=PPPPPPPPPPPPL
LG,,XXXXXXXXX,GL
oG,,XXXXXXXXX,,L
LG,,XXXXXXXXX,GL
UGe,XXXXXXXXX,eU
LG,,XXXXXXXXX,,L
)G,,XXXXXXXXX,Go
LPPPPPPPPPPPPPPL
LG,,G,,,,,G,,GeL
tG,G,,G,,G,,,,,L
LG,,G,,G,,G,,,,L
oGe,G,,G,,G,,,,L
LG,,G,,G,,G,,z,t
LPPPPPPPPPPPPPPL
LGG,G,lPG,G,,GeL
ULLtUULtULLoULLU
`;

export const personalGarden: MapDefinition = {
  id: 'personal_garden',
  name: 'Personal Garden',
  width: 16,
  height: 26,
  grid: parseGrid(gridString),
  colorScheme: 'village',
  hasClouds: true,
  isRandom: false,
  backgroundTexture: {
    image: tileAssets.village_ground_texture,
    gridSize: 4,
    seasons: ['spring', 'summer', 'autumn'],
  },
  spawnPoint: { x: 8, y: 24 },
  transitions: [
    {
      fromPosition: { x: 8, y: 24 },
      tileType: TileType.PATH,
      toMapId: 'village',
      toPosition: { x: 6, y: 22 }, // Return to village
      label: 'Back to Village',
    },
    {
      // Greenhouse door — the z anchor sits at (12, 21); the walkable door
      // tile is in front of its centre door, on the row above the path.
      fromPosition: { x: 12, y: 22 },
      tileType: TileType.GREENHOUSE,
      toMapId: GREENHOUSE_MAP_ID,
      toPosition: { x: 7, y: 6 }, // Just inside the greenhouse door
      label: 'Enter the Greenhouse',
      hasDoor: true,
    },
  ],
  npcs: [],
};
