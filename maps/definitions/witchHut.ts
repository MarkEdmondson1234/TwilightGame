import { MapDefinition, TileType } from '../../types';
import { parseGrid } from '../gridParser';

/**
 * Witch Hut - Mysterious magical dwelling in the deep forest
 *
 * A secret clearing hidden deep within the forest, containing
 * a massive tree-house built into an ancient magical tree.
 * The witch's hut is surrounded by a mystical pond with lily pads,
 * and the entire area is enclosed by dense forest.
 *
 * This map will eventually be accessible only through a special quest,
 * but for now it's reachable from the village for testing.
 *
 * Grid Legend:
 * G = Grass
 * Y = Tree (regular tree)
 * o = Oak Tree (seasonal)
 * t = Spruce Tree (evergreen)
 * y = Willow Tree (graceful weeping willow)
 * e = Fern (forest floor plant)
 * U = Bush (hawthorn - seasonal foliage)
 * i = Wild Iris (flowering plant near water)
 * s = Wild Strawberry (forageable plant)
 * x = Giant Mushroom (magical witch hut mushrooms)
 * P = Path
 * ? = Witch Hut (magical dwelling)
 * + = Cauldron (bubbling animated pot)
 */

// 30x30 map - witch hut centered at (15, 15)
const gridString = `
YYYYYYYYYYYYYYYYYYYYYYYYYYYYYY
YoGeseGGxeGGGGGGGGGGGGGesGGeY
YeGYGGGeeGGsGGGGGGGGGGGeGYGeGY
YGGeGGGesGGGGGGGGGGGGGGGegGGGY
YGGGYGGGeGGeGGsGGGGGGGGGYeGGeY
YGGGGGGeeGGGGGGGGGGGGGGGeGGGGt
YGGGGGGYeGGGGGGGGGGGGGYeGGGGGY
YGGGseGGGeGxGGGGGGGGGGGeGGsGGY
YtGGGGGGeeGGGGGGGGGGGGGeGGGGGY
YGGGGGGGeGGGGGGGGGGGGGeGGGGGGo
YGGGGYGGGeGseGGGGGGGGGYeGGGGeY
YGGGGGGGeGGGGGGGGGGGGGeGGGGGGy
YGGeGGGGyeGGGGGGGGGyeGGGGGGGGY
YGGGGGGeGGxeGGGGGGGeGGGGGGGGGy
YoGGGGGGeGGGGG?GG+GeGGGGGGeGGY
YGGGGGGGeGGGGGPPGGGeGGGGGGGGGt
YGGGGGGeGgGGiGGPGGGeGGGGGGGGGY
YGGsGGGGYeGGGGGPGGGeYGGGGxsGGY
YGGGGGGGeGGGGGPPGGGeGGGGGGGGGY
YGGGYGGxeGGGGGPPGGGeGGGGYeGGGY
YGGGGGGseGGiGPPPPGiiGGseGGGGGo
YtGGGGGGeGGeGGGPieeeGGGGGGGGGY
YGGGGGGYGGGGGGPGGGeGGGGYGGGGGY
tGGGGGGGeGGsGGPGGsGGGGGGGGeGGt
YGGGYGGeeGGGGGPGGGGeGGGGGGYGGY
YGGGGGGsGGGGGGGPGGGGGsGGGGGGGY
YGGYGGGGeGbGPPPPPGGeGGGGGGxGGY
YoGxGGGGeGGPGGGGGPPeeGGGGGGGGY
YGGGGbbbGGPGGGGGGGPGbbGGbGGGGo
YYbYbbtbbbYGGGGGGGGbbbbxbbYbYY
`;

export const witchHut: MapDefinition = {
  id: 'witch_hut',
  name: 'Witch Hut - Hidden Grove',
  width: 30,
  height: 30,
  grid: parseGrid(gridString),
  colorScheme: 'forest',
  isRandom: false,
  spawnPoint: { x: 11, y: 28 }, // On path at south entrance
  transitions: [
    {
      fromPosition: { x: 11, y: 29 },
      tileType: TileType.PATH,
      toMapId: 'village',
      toPosition: { x: 9, y: 11 },
      label: 'Return to Village',
    },
    {
      fromPosition: { x: 15, y: 18 },
      tileType: TileType.GRASS,
      toMapId: 'witch_hut_interior',
      toPosition: { x: 7, y: 14 },
      label: 'Enter Witch Hut',
    },
  ],
  npcs: [
    // TODO: Add witch NPC when ready
    // TODO: Add familiar/pet NPCs (black cat, owl, etc.)
  ],
  // Note: Witch hut sprite is placed at center (15, 15) but map uses '?' anchor
  // The 20x20 sprite will render centered on that position
};
