import { MapDefinition, TileType } from '../../types';
import { parseGrid } from '../gridParser';

/**
 * Farm Area - Dedicated farming location
 *
 * A peaceful farming area with:
 * - Multiple farming plots organized in fields
 * - Path network for easy access
 * - Small pond for ambiance
 * - Seed shed (building with door)
 * - Exit back to village
 *
 * Grid Legend:
 * G = Grass
 * L = Wall boundary (brick walls for map edges)
 * R = Rock (in-map decorative obstacles)
 * P = Path
 * W = Water
 * U = Bush (decorative foliage)
 * X = Farm plot (fallow soil)
 * Z = Big Tree (extra large tree)
 * B = Building Wall (seed shed)
 * O = Building Roof
 * N = Building Door
 * V = Building Window
 */

const gridString = `
ULL<WWWWWLZZLLZLLZLL
LG<WWWWWW>ZGGZGGGGPU
UZ<WWWWWW>GGGGGGGUGPU
LGG<wwww>GGGGGGGGGGPL
UGGGvvvvGGGGGGGGGGGPZ
ZGGGGGGGGGGGGGGGGGPL
UPPPPPPPPPPPPPPPPPPL
UXXXPXXXXXPXXXXXUGGZ
UXXXPXXXXXPXXXXXGGGU
UXXXPXXXXXPXXXXXGGGL
UXXXPXXXXXPXXXXXGGGL
UXXXPXXXXXPXXXXXGGGZ
UPPPPPPPPPPPPPPPPGGU
UXXXPXXXXXPXXXXXGGGU
UXXXPXXXXXPXXXXXGGGL
UXXXPXXXXXPXXXXXGGGZ
UXXXPXXXXXPXXXXXGGGL
ZXXXPXXXXXPXXXXXGGGU
LPPPPPPPPPPPPPPPPGGL
LGGGGGGPGGGGGGGGGGZGL
ZGGGGGGPGGGGGGGGGGGZ
LGGGGGGPGGGGG~GGGGGL
ZGGGGGGPGGGGGGGGGGGZ
LGGGGGGPPPPPPGGGUUGU
ZGGZGGGPGGGGGGGGGGGL
LUZZZUUZUZUUZUZUUUZL
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
