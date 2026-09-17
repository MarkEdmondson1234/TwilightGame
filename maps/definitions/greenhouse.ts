import { MapDefinition, TileType } from '../../types';
import { parseGrid } from '../gridParser';
import { GREENHOUSE_MAP_ID } from '../../constants';

/**
 * Greenhouse - grow any vegetable, all year round
 *
 * A glass greenhouse in the private garden. The plots here ignore the season —
 * farmManager exempts this map from seasonal planting checks and winter herb
 * dormancy — and rain never reaches inside (hasClouds is unset, so the map is
 * 'indoor' for the weather system, same as the seed shed).
 *
 * A tiled room rather than a background-image interior: there is no interior
 * artwork yet, so the glass comes from the sky-coloured window band and the
 * warmth from the crops themselves. Swap to a drawn interior later if wanted.
 *
 * The floor overrides '.' (normally seasonal grass tufts) to GRASS_PLAIN:
 * flat colour only, so the greenhouse reads the same in every season — the
 * winter tuft sprites carry snow piles, which have no business inside glass.
 *
 * Grid Legend:
 * V = Building window (glass roof band — solid, sky-coloured)
 * # = Wall/obstacle
 * . = Floor (walkable — flat GRASS_PLAIN, no seasonal tufts or snow)
 * X = Farm plot (fallow soil)
 * D = Door (transition back to the personal garden)
 */

const gridString = `
VVVVVVVVVVVVVVV
#.............#
#..XXXXXXXXX..#
#.............#
#..XXXXXXXXX..#
#.............#
#.............#
#.............#
#######D#######
`;

export const greenhouse: MapDefinition = {
  id: GREENHOUSE_MAP_ID,
  name: 'Greenhouse',
  width: 15,
  height: 9,
  // '.' is TUFT in the global legend (seasonal grass, snow piles in winter) —
  // the greenhouse floor overrides it to flat GRASS_PLAIN: inside glass, the
  // season never arrives.
  grid: parseGrid(gridString, { '.': TileType.GRASS_PLAIN }),
  colorScheme: 'indoor',
  hasClouds: false, // Indoor — weather and rain never reach the plots
  isRandom: false,
  spawnPoint: { x: 7, y: 6 }, // Just inside the door
  transitions: [
    {
      fromPosition: { x: 7, y: 8 },
      tileType: TileType.DOOR,
      toMapId: 'personal_garden',
      toPosition: { x: 12, y: 23.5 }, // Path in front of the greenhouse; (12,23) clipped a wall tile
      label: 'Back to the Garden',
    },
  ],
  npcs: [],
};
