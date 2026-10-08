import {
  type MapDefinition,
  TileType,
  type RoomLayer,
  type LayerSeason,
  type TimeLayerCondition,
} from '../../types';
import { parseGrid } from '../gridParser';
import { Z_PARALLAX_FAR, Z_SPRITE_BACKGROUND, Z_SPRITE_FOREGROUND } from '../../zIndex';
import { createShellaNPC } from '../../utils/npcFactories';

/**
 * Sea Side - Sunny ocean beach (background-image exterior room)
 *
 * Background: ocean_<season>_<phase>_background.png (1920x1080, displayed at 960x540 @ 1.3x).
 * They are stacked at the same zIndex and toggled via 'time' layer conditions on the fixed
 * clock phase (day 6am-8pm, sunset 8pm-9pm, night 9pm-6am - see
 * TimeManager.getFixedDayPhase) and the season. Spring, summer and autumn use the summer
 * art; winter has its own day and sunrise art (see the layer list for which shows when).
 * Foreground: ocean_<season>_day_layer1.png (rocks, same dimensions) - stacked at
 * Z_SPRITE_FOREGROUND so it renders in front of the player, for a layered depth feel.
 * width=960 = mapWidth(15) x TILE_SIZE(64), which keeps the debug grid aligned with the image
 *
 * Walkmesh Grid Legend (invisible - collision only):
 * # = Wall/obstacle (solid) - the horizon line above the beach
 * . = Floor (walkable)
 * D = Door (transition tile - exit back to the village)
 *
 * Key positions:
 * - Bottom 3 rows (6-8) are the walkable floor band
 * - Row 6, columns 5-13 are blocked (column 5 is water, 6-13 is Shella's food truck)
 * - Spawn point at {x:1, y:7}, exit door at {x:1, y:8}
 */

// 15 columns x 9 rows - standard background-image room layout
const gridString = `
###############
###############
###############
###############
###############
###############
.....#########.
...............
.D.............
`;

const SEASIDE_ART = '/TwilightGame/assets-optimized/rooms/seaSide';
const NOT_WINTER: LayerSeason[] = ['Spring', 'Summer', 'Autumn'];
const WINTER: LayerSeason[] = ['Winter'];

/**
 * One full-screen ocean image. Every layer shares the same size and centring - width=960
 * = mapWidth(15) x TILE_SIZE(64) keeps the debug grid aligned with the art.
 */
function oceanLayer(file: string, zIndex: number, condition: TimeLayerCondition): RoomLayer {
  return {
    type: 'image',
    image: `${SEASIDE_ART}/${file}`,
    zIndex,
    parallaxFactor: 1.0,
    opacity: 1.0,
    width: 960,
    height: 540, // 16:9 aspect ratio
    scale: 1.3,
    centered: true,
    condition,
  };
}

const seaSideLayers: RoomLayer[] = [
  // Backgrounds - all stacked at Z_PARALLAX_FAR (-100, behind everything). Exactly one is
  // visible for any season x phase; tests/timeLayerCondition.test.ts checks this.
  // Spring, summer and autumn: the summer art.
  oceanLayer('ocean_summer_day_background.png', Z_PARALLAX_FAR, {
    type: 'time',
    showWhen: 'day',
    seasons: NOT_WINTER,
  }),
  oceanLayer('ocean_summer_sunset_background.png', Z_PARALLAX_FAR, {
    type: 'time',
    showWhen: 'sunset',
    seasons: NOT_WINTER,
  }),
  oceanLayer('ocean_summer_night_background.png', Z_PARALLAX_FAR, {
    type: 'time',
    showWhen: 'night',
    seasons: NOT_WINTER,
  }),
  // Winter: no night art yet, so the day art stays up overnight (darkened by the night
  // tint), and the sunrise painting stands in for the 8pm-9pm sunset window.
  oceanLayer('ocean_winter_day_background.png', Z_PARALLAX_FAR, {
    type: 'time',
    showWhen: ['day', 'night'],
    seasons: WINTER,
  }),
  oceanLayer('ocean_winter_sunrise_background.png', Z_PARALLAX_FAR, {
    type: 'time',
    showWhen: 'sunset',
    seasons: WINTER,
  }),

  // Shella's food truck - summer only, parked on the sand (see visibilityConditions
  // in createShellaNPC). Clicking her opens a "Talk" / "Buy" pie menu - see
  // utils/interactions/providers/shopCounters.ts.
  {
    type: 'npc',
    npc: createShellaNPC({ x: 10, y: 5 }),
    zIndex: Z_SPRITE_BACKGROUND,
  },

  // Foreground rocks (right-hand corner) - Z_SPRITE_FOREGROUND (200) renders them in front
  // of the player for depth. Shown at every hour of their season; still darkened by the
  // night tint since they sit below Z_WEATHER_TINT.
  oceanLayer('ocean_summer_day_layer1.png', Z_SPRITE_FOREGROUND, {
    type: 'time',
    seasons: NOT_WINTER,
  }),
  oceanLayer('ocean_winter_day_layer1.png', Z_SPRITE_FOREGROUND, {
    type: 'time',
    seasons: WINTER,
  }),
];

export const seaSide: MapDefinition = {
  id: 'seaSide',
  name: 'Sea Side',
  width: 15,
  height: 9,
  grid: parseGrid(gridString),
  colorScheme: 'indoor',
  // Keeps colorScheme as 'indoor' for tile-colour/decoration-placement rules, but opts
  // into a milder outdoor-style DarknessLayer night tint (see DARKNESS_CONFIG.seaside).
  darknessColorScheme: 'seaside',
  isRandom: false,
  spawnPoint: { x: 1, y: 7 },
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
