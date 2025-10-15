import { MapDefinition, TileType } from '../../types';
import { parseGrid } from '../gridParser';

/**
 * Farm Area - Dedicated farming location
 *
 * A peaceful farming area with:
 * - Multiple farming plots organized in fields
 * - Path network for easy access
 * - Small pond for ambiance
 * - Tool shed (building)
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
 * B = Building Wall (tool shed)
 * O = Building Roof
 * N = Building Door
 * V = Building Window
 */

const gridString = `
LLLLLLLLLLLLLLLLLLLL
LGGGGGGGGGGGGGGGGGPL
LZGGWWWGGGGGGGGGUGPL
LGGGWWWGGGGGGGGGGGPL
LGGGWWWGGGGGGGGGGGPL
LGGGGGGGGGGGGGGGGGPL
LPPPPPPPPPPPPPPPPPL
LXXXPXXXXXPXXXXXUGGL
LXXXPXXXXXPXXXXXGGGL
LXXXPXXXXXPXXXXXGGGL
LXXXPXXXXXPXXXXXGGGL
LXXXPXXXXXPXXXXXGGGL
LPPPPPPPPPPPPPPPPGGL
LXXXPXXXXXPXXXXXGGGL
LXXXPXXXXXPXXXXXGGGL
LXXXPXXXXXPXXXXXGGGL
LXXXPXXXXXPXXXXXGGGL
LXXXPXXXXXPXXXXXGGGL
LPPPPPPPPPPPPPPPPGGL
LGGGGGGGOOOBGGGGGZGL
LGGGGGGGOBVBGGGGGGL
LGGGGGGGOBNBGGGGGGL
LGGGGGGGGGGGGGGGGGGL
LGGGGGGPPPPPPGGGUUGL
LGGGGGGPGGGGGGGGGGGL
LLLLLLLLLLLLLLLLLLLL
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
  ],
  npcs: [], // No NPCs yet, but could add a farmer NPC later
};
