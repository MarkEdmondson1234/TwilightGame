import { MapDefinition, TileType } from '../../types';
import { parseGrid } from '../gridParser';
import { tileAssets } from '../../assets';
import { createWitchWolfNPC } from '../../utils/npcFactories';

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
 * J = Sakura Tree (seasonal blossoms)
 * t = Spruce Tree (evergreen)
 * y = Willow Tree (graceful weeping willow)
 * e = Fern (forest floor plant)
 * U = Bush (hawthorn - seasonal foliage)
 * i = Wild Iris (flowering plant near water)
 * s = Wild Strawberry (forageable plant)
 * u = Mushroom (regular mushrooms - fairy ring)
 * x = Giant Mushroom (magical witch hut mushrooms)
 * | = Tree Stump (2x2 forest decoration)
 * P = Path
 * ? = Witch Hut (magical dwelling)
 * + = Cauldron (bubbling animated pot)
 * z = Plain grass (no tuft sprite - under witch hut art footprint)
 */

// 30x30 map - witch hut centered at (15, 15)
// Grid cells under the witch hut's 16x16 sprite footprint (rows 9-24, cols 6-21) use
// 'z' (GRASS_PLAIN) instead of 'G' so the random grass-tuft sprite never gets drawn
// there - the hut artwork has organic transparent gaps (canopy hole, moss texture)
// that a tuft sprite would otherwise poke through, looking like it sprouts mid-picture.
const gridString = `
GGGGGGGsGGbssGGGeGGGGGJGGGbYsb
boGeGeGGsessssGGGeuuuGGGesGGeb
beGGGsGeeGssGGGG|GuGGGuGGeGebY
beGeGGxesGGGGGGGGuGGGGuGGGGGGb
bGGoYGGGeGGeGGsGuGG+GGuGueGGeY
eGGGGGGeeGGGGGGGuGGGGuuGeGGGGt
GGGGGGY=xGGXXXGuuuuuuGeeGGGGGG
bGGGeeGGGeGGGGGGGGGGGGGGGGsGGY
btGGGGGGeeGGXXXGGGGGGGGeGGGGGb
eeGGGGzzezzzzzzzzzzzzeeGGGGGGo
JexGGYzzzezsezzzzzzzzzYeGGGGeb
bGGGGGzzezzzzzzzzzzzzzeGGGGGGy
YbGeGGzzyezzzzzzzzzyezGGGGGGGb
bbGGGGzezzzezzzzzzzezzGGGGGGGy
boGyGGzzezzzzz?zzzzzzzGGGGeGGb
beGGGGzzezzzzzPPzzzezzGGGGGGGt
eeGxGGzezgzzizzPzzgzzzpGGGGGGJ
bGGsGGzzeezzzzzPzeeiizpGGxsGGY
bGGGGGzpezzpzzPPzzzzpzGGGGGGGb
bGGGGGzizzzzzPPPzzpzipGGJeGGGt
YGGGGGspipziPPPPPpiipzsiGGGsGo
otGGGGzeizeezzPPieeezzGGGGGssb
bGGGGGzzzzzzzzPzzzezzzGYGGsGGs
tGGGGGzzzzzzzzPzzzzzzzGGGGesGt
YGGGsGzezzzzzzPzzzzezzGGGGxssb
bGGGGGGeGGGGGGGPGGGGGeGGGGGGGY
bGGGGGGGGGbGPPPPPGGeGGGGGGGGGb
boGbGGxGeGGPGGGGGPPeeGGGGGGGGY
bGGGGbbbGGPGGbbGGbPGbbGGbGGGGo
bbbYbbtbbGGGGbbGbbGbbbbxbbbbbb
`;

export const witchHut: MapDefinition = {
  id: 'witch_hut',
  name: 'Witch Hut - Hidden Grove',
  width: 30,
  height: 30,
  grid: parseGrid(gridString, { z: TileType.GRASS_PLAIN }),
  colorScheme: 'forest',
  hasClouds: true,
  isRandom: false,
  backgroundTexture: {
    image: tileAssets.village_ground_texture,
    gridSize: 4,
    seasons: ['spring', 'summer', 'autumn'],
  },
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
      toPosition: { x: 5, y: 3 }, // Center of interior floor (10x6 map)
      label: 'Enter Witch Hut',
    },
  ],
  npcs: [
    // The witch and her wolf familiar, tending to the cauldron
    createWitchWolfNPC('witch', { x: 18, y: 4 }, 'The Witch'),
    // TODO: Add familiar/pet NPCs (black cat, owl, etc.)
  ],
  // Note: Witch hut sprite is placed at center (15, 15) but map uses '?' anchor
  // The 20x20 sprite will render centered on that position
};
