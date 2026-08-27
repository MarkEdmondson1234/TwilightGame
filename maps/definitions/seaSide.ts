import { MapDefinition, TileType, RoomLayer } from '../../types';
import { parseGrid } from '../gridParser';
import { Z_PARALLAX_FAR, Z_SPRITE_BACKGROUND } from '../../zIndex';
import { createShellaNPC } from '../../utils/npcFactories';

/**
 * Sea Side - Sunny ocean beach (background-image exterior room)
 *
 * Background: ocean_summer_day_background.png (1920x1080, displayed at 960x540 @ 1.3x)
 * width=960 = mapWidth(15) x TILE_SIZE(64), which keeps the debug grid aligned with the image
 *
 * Walkmesh Grid Legend (invisible - collision only):
 * # = Wall/obstacle (solid) - the horizon line above the beach
 * . = Floor (walkable)
 * D = Door (transition tile - exit back to the village)
 *
 * Key positions:
 * - Bottom 3 rows (6-8) are the walkable floor band
 * - Spawn point and exit door both at {x:1, y:8}
 */

// 15 columns x 9 rows - standard background-image room layout
const gridString = `
###############
###############
###############
###############
###############
###############
...............
...............
.D.............
`;

const seaSideLayers: RoomLayer[] = [
  {
    type: 'image',
    image: '/TwilightGame/assets/rooms/seaSide/ocean_summer_day_background.png',
    zIndex: Z_PARALLAX_FAR, // -100: Behind everything
    parallaxFactor: 1.0,
    opacity: 1.0,
    width: 960,  // = mapWidth (15) x TILE_SIZE (64) - keeps grid aligned with image
    height: 540, // 16:9 aspect ratio
    scale: 1.3,
    centered: true,
  },

  // Shella's food truck - summer only, parked on the sand (see visibilityConditions
  // in createShellaNPC). Clicking her opens a "Talk" / "Buy" pie menu - see
  // utils/interactions/providers/shopCounters.ts.
  {
    type: 'npc',
    npc: createShellaNPC({ x: 10, y: 5 }),
    zIndex: Z_SPRITE_BACKGROUND,
  },
];

export const seaSide: MapDefinition = {
  id: 'seaSide',
  name: 'Sea Side',
  width: 15,
  height: 9,
  grid: parseGrid(gridString),
  colorScheme: 'indoor',
  isRandom: false,
  spawnPoint: { x: 1, y: 8 },
  renderMode: 'background-image',
  characterScale: 1.8,
  referenceViewport: { width: 1280, height: 720 },
  layers: seaSideLayers,
  // Borrowed from the skiing mini-game's cloud art - drifts very slowly across the top
  // of the screen for a touch of ambient movement.
  ambientClouds: [
    {
      image: '/TwilightGame/assets-optimized/skiing_game/ski_cloud2.png',
      topPercent: 6,
      durationSeconds: 150, // ~2.5 minutes to cross - super slow
      widthPx: 320,
      opacity: 0.9,
    },
  ],
  transitions: [
    {
      fromPosition: { x: 1, y: 8 },
      tileType: TileType.DOOR,
      toMapId: 'village',
      toPosition: { x: 6, y: 14 },
      label: 'Leave the Sea Side',
      hasDoor: true,
    },
  ],
};
