import { MapDefinition, TileType } from '../../types';
import { parseGrid } from '../gridParser';

/**
 * Village - Central hub area
 *
 * A small village with:
 * - Path network connecting areas
 * - Entrance to home (door D at bottom-center)
 * - Shop entrance (S)
 * - Mine entrance (M)
 * - Exit to forest areas (paths at edges)
 *
 * Grid Legend:
 * G = Grass
 * R = Rock (borders/decorative)
 * P = Path
 * W = Water
 * D = Door (back to home)
 * S = Shop Door
 * M = Mine Entrance
 */

const gridString = `
RRRRRRRRRRRRRRRRRRRRRRRRRRRRRR
RGGGGGGGGGPGGGGGGGGGGGGGGGGGR
RGGGGGGGGGPGGGGGGGGGGGGGGGGGR
RGGGGGGGGGPGGGGGGGGGGGGGGGGGR
RGGGGGGGGGPGGGGGGGGGGGGGGGGGR
RGGGGGGPPPPPPPPGGGGGGGGGGWWWR
RGGGGGGPGGGGGGGPGGGGGGGGWWWWR
RGGGGGGPGGGGGGGPGGGGGGGGGGGR
RGGGGGGPGGSGGGGPGGGRRRRRRRRRR
RGGGGGGPGGGGGGGPGGGRGGGGGGGGR
RGGGGGGPPPPPPPPPGGGRGGGGGGGGR
RGGGGGGGGGGPGGGGGGGMGGGGGGGGR
RGGGGGGGGGGPGGGGGGGGGGGGGGGGG
RGGGGGGGGGGPGGGGGGGGGGGGGGGGG
RGGGGGGGGGGPGGGGGGGGGGGGGGGGG
RPPPPPPPPPPPPPPPPPPPPPPPPPPPR
RGGGGGGGGGGPGGGGGGGGGGGGGGGGG
RGGGGGGGGGGPGGGGGGGGGGGGGGGGG
RGGGGGGGGGGPGGGGGGGGGGGGGGGGG
RGGGGGGGGGGPGGGGGGGGGGGGGGGGG
RGGGGGGGGGGPGGGGGGGGGGGGGGGGG
RGGGGGGGGGGPGGGGGGGGGGGGGGGGG
RGGGGGGGGGGPGGGGGGGGGGGGGGGGG
RGGGGGGGGGGPGGGGGGGGGGGGGGGGG
RGGGGGGGGGGPGGGGGGGGGGGGGGGGG
RGGGGGGGGGDPGGGGGGGGGGGGGGGGG
RGGGGGGGGGGPGGGGGGGGGGGGGGGGG
RGGGGGGGGGGPGGGGGGGGGGGGGGGGG
RGGGGGGGGGGPGGGGGGGGGGGGGGGGG
RRRRRRRRRRRRRRRRRRRRRRRRRRRRRR
`;

export const village: MapDefinition = {
  id: 'village',
  name: 'Village',
  width: 30,
  height: 30,
  grid: parseGrid(gridString),
  colorScheme: 'village',
  isRandom: false,
  spawnPoint: { x: 15, y: 25 }, // Near the home door
  transitions: [
    {
      fromPosition: { x: 10, y: 25 }, // Door to home (D tile)
      tileType: TileType.DOOR,
      toMapId: 'home_interior',
      toPosition: { x: 5, y: 6 },
      label: 'To Home',
    },
    {
      fromPosition: { x: 10, y: 8 }, // Shop door (S tile)
      tileType: TileType.SHOP_DOOR,
      toMapId: 'shop',
      toPosition: { x: 7, y: 8 },
      label: 'To Shop',
    },
    {
      fromPosition: { x: 19, y: 11 }, // Mine entrance (M tile)
      tileType: TileType.MINE_ENTRANCE,
      toMapId: 'RANDOM_CAVE',
      toPosition: { x: 17, y: 12 },  // Spawn in center of cave (safe zone)
      label: 'To Mine',
    },
    {
      fromPosition: { x: 28, y: 12 }, // East exit to forest (last G before R border)
      tileType: TileType.GRASS,
      toMapId: 'RANDOM_FOREST',
      toPosition: { x: 20, y: 15 },  // Spawn in center of forest (safe zone)
      label: 'To Forest',
    },
  ],
};
