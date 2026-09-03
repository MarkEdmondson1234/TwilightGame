import { MapDefinition, TileType } from '../../types';
import { parseGrid } from '../gridParser';

/**
 * Wizard Trials (antechamber)
 *
 * A rare hidden chamber deep within the lava caverns, only accessible
 * 20% of the time when travelling deeper between lava levels (split evenly
 * with King Lava Frog's Lair - see generateLavaMap() in maps/procedural.ts).
 *
 * The floating stone archway at the centre of the room is the entrance to
 * the Wizard Trials mini-game series (starting with "Test of Wits").
 *
 * Grid Legend:
 * Each character below is placed on ONE grid tile, but several render as a much
 * bigger sprite than that (see size/anchor). Space these at least their full
 * width/height apart or their art will overlap and bleed into each other.
 * # = Cave Rock (wall) - single tile
 * V = Mine Floor (walkable) - single tile
 * M = Mine Entrance (transition tile - exit back to the lava levels) - 4x4 tiles, centred on the anchor
 * D = Wizard Trials Entrance (floating door - click to enter the Wizard Trials) - ~3.5x3.5 tiles, centred on the anchor
 * L = Lava Lake (medium) - 5x5 tiles, extends right+down from the anchor (anchor is the top-left corner)
 * C = Mine Crystal (medium) - 4x4 tiles, extends right+down from the anchor (anchor is the top-left corner)
 * T = Torch - single tile
 * S = Stone Column (medium) - 5x5 tiles, extends right+down from the anchor (anchor is the top-left corner)
 * 7 = Luminescent Toadstool (global grid code, also usable here) - 3x3 tiles, centred on the anchor
 */

// 27x15 map
const gridString = `
VVVSVSVSVVVVVSVSVVVVSVSVSVV
SVSVSVVVVCVVVVVVVSVSVSVVSVV
VSVSVVCVVVVVVVVVVVSVSVVSVVV
SVSVVVVVVVVVVVVVVCVVVVVVSVV
VSVVVVVVVVVVVVVVVVVVVCVSVVV
VVVVVVVVCVVVVCVVVVVVVVSVVSV
VMVVVVVVVVVVVVVVVVVVVSVSVVV
VVVVVVVVVVVVDVVVVVVVSVSVVSV
VVVVVVVVVVVVVVVVVVVSVSVVSVV
SVSVVVVVVVVVVVVVVVVVSVVSVSV
VSVSVVTVVVSVVSVSVVVVSVSVSVS
VSVVSVSVSSVVSVVVSVVSVSVSVSV
SVVSVSVSVVSVVSVSVSVVSVSVVVV
VSVVVSVVSVSVSVSVSVVSVSVVSVV
SVVVVVVSVSVSVVVSVSVVVSVVVVV
`;

export const wizardTrials: MapDefinition = {
  id: 'wizard_trials',
  name: 'Wizard Trials',
  width: 27,
  height: 15,
  grid: parseGrid(gridString, {
    '#': TileType.CAVE_ROCK,
    V: TileType.MINE_FLOOR,
    L: TileType.LAVA_LAKE_MD,
    C: TileType.MINE_CRYSTAL_MD,
    T: TileType.WALL_TORCH,
    S: TileType.STONE_COLUMN_MD,
    D: TileType.WIZARD_TRIALS_ENTRANCE,
  }),
  colorScheme: 'lava',
  isRandom: false,
  spawnPoint: { x: 3, y: 7 },
  transitions: [
    {
      fromPosition: { x: 1, y: 6 },
      tileType: TileType.MINE_ENTRANCE,
      toMapId: 'RANDOM_LAVA',
      toPosition: { x: 27, y: 7 },
      label: 'Exit Cavern',
    },
  ],
};
