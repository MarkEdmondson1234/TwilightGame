import { MapDefinition, TileType, RoomLayer } from '../../types';
import { parseGrid } from '../gridParser';
import { Z_PARALLAX_FAR, Z_SPRITE_BACKGROUND, Z_SPRITE_FOREGROUND } from '../../zIndex';
import { createShellaNPC } from '../../utils/npcFactories';

/**
 * Sea Side - Sunny ocean beach (background-image exterior room)
 *
 * Background: ocean_summer_day_background.png / ocean_summer_sunset_background.png /
 * ocean_summer_night_background.png (1920x1080, displayed at 960x540 @ 1.3x). The three
 * are stacked at the same zIndex and toggled via a 'time' layer condition - day 6am-8pm,
 * sunset 8pm-9pm, night 9pm-6am (see TimeManager.getFixedDayPhase).
 * Foreground: ocean_summer_day_layer1.png (rocks, same dimensions) - stacked at
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
    condition: { type: 'time', showWhen: 'day' },
  },
  {
    type: 'image',
    image: '/TwilightGame/assets/rooms/seaSide/ocean_summer_sunset_background.png',
    zIndex: Z_PARALLAX_FAR, // -100: Behind everything, stacked with the day/night layers
    parallaxFactor: 1.0,
    opacity: 1.0,
    width: 960,
    height: 540,
    scale: 1.3,
    centered: true,
    condition: { type: 'time', showWhen: 'sunset' },
  },
  {
    type: 'image',
    image: '/TwilightGame/assets/rooms/seaSide/ocean_summer_night_background.png',
    zIndex: Z_PARALLAX_FAR, // -100: Behind everything, stacked with the day/sunset layers
    parallaxFactor: 1.0,
    opacity: 1.0,
    width: 960,
    height: 540,
    scale: 1.3,
    centered: true,
    condition: { type: 'time', showWhen: 'night' },
  },

  // Shella's food truck - summer only, parked on the sand (see visibilityConditions
  // in createShellaNPC). Clicking her opens a "Talk" / "Buy" pie menu - see
  // utils/interactions/providers/shopCounters.ts.
  {
    type: 'npc',
    npc: createShellaNPC({ x: 10, y: 5 }),
    zIndex: Z_SPRITE_BACKGROUND,
  },

  // Foreground rocks (right-hand corner) - renders in front of the player for depth.
  // Always visible across day/sunset/night; still darkened by the night tint since it
  // sits below Z_WEATHER_TINT.
  {
    type: 'image',
    image: '/TwilightGame/assets/rooms/seaSide/ocean_summer_day_layer1.png',
    zIndex: Z_SPRITE_FOREGROUND, // 200: In front of player
    parallaxFactor: 1.0,
    opacity: 1.0,
    width: 960, // Must match background layers (keeps grid aligned)
    height: 540,
    scale: 1.3,
    centered: true,
  },
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
