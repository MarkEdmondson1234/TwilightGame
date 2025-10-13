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
      fromPosition: { x: 11, y: 25 }, // Door to home
      tileType: TileType.DOOR,
      toMapId: 'home_interior',
      toPosition: { x: 5, y: 6 },
      label: 'To Home',
    },
    {
      fromPosition: { x: 12, y: 8 }, // Shop door
      tileType: TileType.SHOP_DOOR,
      toMapId: 'RANDOM_SHOP',
      toPosition: { x: 5, y: 8 },
      label: 'To Shop',
    },
    {
      fromPosition: { x: 20, y: 11 }, // Mine entrance
      tileType: TileType.MINE_ENTRANCE,
      toMapId: 'RANDOM_CAVE',
      toPosition: { x: 5, y: 5 },
      label: 'To Mine',
    },
    {
      fromPosition: { x: 29, y: 12 }, // East exit to forest
      tileType: TileType.PATH,
      toMapId: 'RANDOM_FOREST',
      toPosition: { x: 2, y: 15 },
      label: 'To Forest',
    },
  ],
};
