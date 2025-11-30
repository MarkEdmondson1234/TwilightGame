import { MapDefinition, TileType } from '../../types';
import { parseGrid } from '../gridParser';
import {
  createCatNPC,
  createDogNPC,
  createVillageElderNPC,
  createOldWomanKnittingNPC,
  createShopkeeperNPC,
  createVillageChildNPC,
  createMumNPC,
  createUmbraWolfNPC,
  createWitchWolfNPC,
  createChillBearNPC,
  createStellaNPC,
  createMorganNPC,
} from '../../utils/npcFactories';

/**
 * Debug NPC Showcase Map
 *
 * A test area for viewing and debugging all NPCs in one place.
 * Access via F7 key (dev only).
 *
 * Layout:
 * - Large grassy area with NPCs arranged in a grid
 * - Each NPC has a small platform with label
 * - Exit door at bottom to return to village
 *
 * Grid Legend:
 * G = Grass
 * P = Path (stepping stones)
 * L = Wall boundary (trees for map edges)
 * D = Door (exit)
 */

const gridString = `
LLLLLLLLLLLLLLoLLLLLLLLLLLLLLL
LGGGGGGGGGGGGGGGGGGGGGGGGGGGGL
LGGGGGGGGGGGGGGGGGGGGGGGGGGGGL
LGGGPPPPPPPPPPPPPPPPPPPPPPGGGL
LGGGPGGGGGGGGGGGGGGGGGGGGPGGGL
LGGGPGGGGGGGGGGGGGGGGGGGGPGGGL
LGGGPGGGGGGGGGGGGGGGGGGGGPGGGL
LGGGPGGGGGGGGGGGGGGGGGGGGPGGGL
LGGGPGGGGGGGGGGGGGGGGGGGGPGGGL
LGGGPGGGGGGGGGGGGGGGGGGGGPGGGL
LGGGPGGGGGGGGGGGGGGGGGGGGPGGGL
LGGGPGGGGGGGGGGGGGGGGGGGGPGGGL
LGGGPGGGGGGGGGGGGGGGGGGGGPGGGL
LGGGPGGGGGGGGGGGGGGGGGGGGPGGGL
LGGGPGGGGGGGGGGGGGGGGGGGGPGGGL
LGGGPGGGGGGGGGGGGGGGGGGGGPGGGL
LGGGPGGGGGGGGGGGGGGGGGGGGPGGGL
LGGGPGGGGGGGGGGGGGGGGGGGGPGGGL
LGGGPGGGGGGGGGGGGGGGGGGGGPGGGL
LGGGPGGGGGGGGGGGGGGGGGGGGPGGGL
LGGGPGGGGGGGGGGGGGGGGGGGGPGGGL
LGGGPGGGGGGGGGGGGGGGGGGGGPGGGL
LGGGPGGGGGGGGGGGGGGGGGGGGPGGGL
LGGGPPPPPPPPPPPPPPPPPPPPPPGGGL
LGGGGGGGGGGGGGGGGGGGGGGGGGGGGL
LGGGGGGGGGGGGGGGGGGGGGGGGGGGGL
LGGGGGGGGGGGGGDGGGGGGGGGGGGGGL
LGGGGGGGGGGGGGGGGGGGGGGGGGGGGL
LGGGGGGGGGGGGGGGGGGGGGGGGGGGGL
LLLLLLLLLLLLLLLLLLLLLLLLLLLLLL
`;

// Create all NPCs positioned in a grid pattern
const npcs = [
  // Row 1: Small animals
  createCatNPC('debug_cat', { x: 6, y: 6 }, 'Cat'),
  createDogNPC('debug_dog', { x: 10, y: 6 }, 'Dog'),

  // Row 2: Village folk
  createVillageElderNPC('debug_elder', { x: 6, y: 10 }, 'Village Elder'),
  createOldWomanKnittingNPC('debug_old_woman', { x: 10, y: 10 }, 'Granny'),
  createVillageChildNPC('debug_child', { x: 14, y: 10 }, 'Little Girl'),
  createMumNPC('debug_mum', { x: 18, y: 10 }, 'Mum'),

  // Row 3: Shopkeeper
  createShopkeeperNPC('debug_shopkeeper', { x: 6, y: 14 }, 'Shopkeeper Fox'),

  // Row 4: Forest creatures (larger, need more space)
  createUmbraWolfNPC('debug_umbra_wolf', { x: 6, y: 18 }, 'Umbra Wolf'),
  createWitchWolfNPC('debug_witch_wolf', { x: 14, y: 18 }, 'Witch Wolf'),
  createChillBearNPC('debug_chill_bear', { x: 22, y: 18 }, 'Chill Bear'),

  // Row 5: Fairies (tiny)
  createStellaNPC('debug_stella', { x: 6, y: 22 }, 'Stella'),
  createMorganNPC('debug_morgan', { x: 10, y: 22 }, 'Morgan'),
];

export const debugNPCs: MapDefinition = {
  id: 'debug_npcs',
  name: 'NPC Debug Showcase',
  width: 30,
  height: 30,
  grid: parseGrid(gridString),
  colorScheme: 'village',
  isRandom: false,
  spawnPoint: { x: 15, y: 25 }, // Near the exit door
  transitions: [
    {
      fromPosition: { x: 14, y: 26 },
      tileType: TileType.DOOR,
      toMapId: 'village',
      toPosition: { x: 15, y: 15 }, // Center of village
    },
  ],
  npcs,
};
