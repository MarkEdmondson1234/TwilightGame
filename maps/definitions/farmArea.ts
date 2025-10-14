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
 * R = Rock (borders/decorative)
 * P = Path
 * W = Water
 * X = Farm plot (fallow soil)
 * B = Building Wall (tool shed)
 * O = Building Roof
 * N = Building Door
 * V = Building Window
 */

const gridString = `
RRRRRRRRRRRRRRRRRRRR
RGGGGGGGGGGGGGGGGGPR
RGGGWWWGGGGGGGGGGGPR
RGGGWWWGGGGGGGGGGGPR
RGGGWWWGGGGGGGGGGGPR
RGGGGGGGGGGGGGGGGGPR
RPPPPPPPPPPPPPPPPPR
RXXXPXXXXXPXXXXXGGGR
RXXXPXXXXXPXXXXXGGGR
RXXXPXXXXXPXXXXXGGGR
RXXXPXXXXXPXXXXXGGGR
RXXXPXXXXXPXXXXXGGGR
RPPPPPPPPPPPPPPPPGGR
RXXXPXXXXXPXXXXXGGGR
RXXXPXXXXXPXXXXXGGGR
RXXXPXXXXXPXXXXXGGGR
RXXXPXXXXXPXXXXXGGGR
RXXXPXXXXXPXXXXXGGGR
RPPPPPPPPPPPPPPPPGGR
RGGGGGGGOOOBGGGGGGGR
RGGGGGGGOBVBGGGGGGGR
RGGGGGGGOBNBGGGGGGGR
RGGGGGGGGGGGGGGGGGGR
RGGGGGGPPPPPPGGGGGGR
RGGGGGGPGGGGGGGGGGGR
RRRRRRRRRRRRRRRRRRRR
`;

export const farmArea: MapDefinition = {
  id: 'farm_area',
  name: 'Farm',
  width: 20,
  height: 26,
  grid: parseGrid(gridString),
  colorScheme: 'village',
  isRandom: false,
  spawnPoint: { x: 10, y: 24 }, // On path near entrance
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
