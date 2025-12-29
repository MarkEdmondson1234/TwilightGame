import { MapDefinition, TileType } from '../../types';
import { parseGrid } from '../gridParser';

/**
 * Farm Area - Dedicated farming location
 *
 * A peaceful farming area with:
 * - Multiple farming plots organized in fields
 * - Path network for easy access
 * - Small pond for ambiance (6x6 lake sprite)
 * - Seed shed (building with door)
 * - Exit back to village
 *
 * Grid Legend:
 * G = Grass
 * L = Wall boundary (brick walls for map edges)
 * R = Rock (in-map decorative obstacles)
 * P = Path
 * ) = Small Lake (6x6 pond sprite)
 * U = Bush (decorative foliage)
 * e = Fern (forest floor plant)
 * X = Farm plot (fallow soil)
 * Z = Big Tree (extra large tree)
 * o = Oak Tree (seasonal oak tree)
 * t = Spruce Tree (evergreen conifer)
 * B = Building Wall (seed shed)
 * O = Building Roof
 * N = Building Door
 * V = Building Window
 */

const gridString = `
ULLGGGGGGLoZLLoLLoLL
LGGGGGGGGGoGGoGGGePU
UtGGGGGGGGGGGGGGUGPU
LGeGG)GGGGGGGGGGGGPL
UGGGGGGGGGGGGGGGGGPt
oGGeGGGGGGGGGGGGGGPL
UPPPPPPPPPPPPPPPPPPL
UXXXPXXXXXPXXXXXUGeo
UXXXPXXXXXPXXXXXGGGU
UXXXPXXXXXPXXXXXGGGL
UXXXPXXXXXPXXXXXGGeL
UXXXPXXXXXPXXXXXGGGt
UPPPPPPPPPPPPPPPPGGU
UXXXPXXXXXPXXXXXGGeU
UXXXPXXXXXPXXXXXGGGL
UXXXPXXXXXPXXXXXGGGo
UXXXPXXXXXPXXXXXeGGL
tXXXPXXXXXPXXXXXGGGU
LPPPPPPPPPPPPPPPPGGL
LGGGGGGPGGGGGGGGGoGL
tGG=GGGPGGGGGGGGGeGo
LGGGGGGPGGGGG~GGGGGL
oGGGGGGPGGGGGGGGGeGt
LGGGGGGPPPPPPGGGUUGU
oGeoGGGPGGGGGGGGeGGL
LUotoUUtUtUUtUUUUUtL
`;

export const farmArea: MapDefinition = {
  id: 'farm_area',
  name: 'Farm',
  width: 20,
  height: 26,
  grid: parseGrid(gridString),
  colorScheme: 'village',
  isRandom: false,
  spawnPoint: { x: 8, y: 24 }, // On path near entrance (changed from 10 to 8 - on the P tile)
  transitions: [
    {
      fromPosition: { x: 10, y: 24 },
      tileType: TileType.PATH,
      toMapId: 'village',
      toPosition: { x: 27, y: 27 }, // Return to village bottom-right corner
      label: 'Back to Village',
    },
    {
      fromPosition: { x: 13, y: 22 }, // Garden shed door
      tileType: TileType.GARDEN_SHED,
      toMapId: 'seed_shed',
      toPosition: { x: 5, y: 4 },
      label: 'To Seed Shed',
    },
  ],
  npcs: [], // No NPCs yet, but could add a farmer NPC later
};
