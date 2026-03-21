import { MapDefinition, TileType } from '../../types';
import { parseGrid } from '../gridParser';

/**
 * The Orchard — accessible from the top of the farm (behind Bessie the cow)
 *
 * A peaceful orchard with rows of apple trees. Fruit trees are perennial and
 * harvestable once per year in autumn. Looking after them yields a fuller crop:
 *   - Prune in winter
 *   - Mulch in spring
 * → Abundant harvest (7–10 apples); otherwise sparse (2–5 apples).
 *
 * Grid Legend:
 * G = Grass
 * L = Wall boundary (tree border)
 * P = Path
 * e = Fern (ground decoration)
 * Q = Apple Tree (local code — only valid in this map)
 */

const gridString = `
LLLLLLLLLLLLLLLL
LGGGGeGGGGGGeGGL
LGGGeGGGGGGGGGGL
LGGGGGGGGGGGGGGL
LGGGGGGGGGGGGGGL
LGGGGGGGGGGGGGGL
LGGQGGGGGGGQGeGL
LGGGGGGGGGGGGGGL
LGGGePPPPPPeGGGL
LGGGGGGGGGGGGGGL
LGGQGGGGGGGQGeGL
LGGGGGGGGGGGGGGL
LGGGePPPPPPeGGGL
LGGGGGGGGGGGGGGL
LGGQGGGGGGGQGeGL
LGGGGGGGGGGGGGGL
LGGGePPPPPPeGGGL
LGGQGGGGGGGQGeGL
LGGGGGGGPGGGGGeL
LLLLLLLLLLLLLLLL
`;

export const orchard: MapDefinition = {
  id: 'orchard',
  name: 'Orchard',
  width: 16,
  height: 20,
  grid: parseGrid(gridString, {
    Q: TileType.APPLE_TREE, // Q = apple tree (local to orchard — not a global grid code)
  }),
  colorScheme: 'village',
  hasClouds: true,
  isRandom: false,
  borderTileType: TileType.OAK_TREE, // Surround the clearing with forest
  spawnPoint: { x: 8, y: 17 },
  transitions: [
    {
      fromPosition: { x: 8, y: 18 },
      tileType: TileType.PATH,
      toMapId: 'farm_area',
      toPosition: { x: 8, y: 1 },
      label: 'Back to Farm',
    },
  ],
  npcs: [],
};
