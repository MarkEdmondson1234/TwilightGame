import { MapDefinition, TileType, RoomLayer, RoomProp } from '../../types';
import { COMMUNAL_EASEL } from '../../data/communalEasel';
import { parseGrid } from '../gridParser';
import { Z_PARALLAX_FAR } from '../../zIndex';
import { furnitureAssets, itemAssets } from '../../assets';

/**
 * Home Upstairs - Bedroom area (background-image interior)
 *
 * Placeholder background until a unique drawing is complete.
 * Image: /TwilightGame/assets-optimized/rooms/empty_room.png (1920×1080, displayed at 960×540)
 *
 * Walkmesh Grid Legend (invisible — collision only):
 * # = Wall/obstacle (solid)
 * . = Floor (walkable)
 * D = Door (transition tile — stairs down to Mum's Kitchen)
 *
 * Key positions:
 * - mumsKitchen transition spawns player at {x:3, y:6} → walkable row 6
 * - Transition back to kitchen at {x:3, y:7} → door tile at grid[7][3]
 */

// 15 columns × 9 rows — standard background-image room layout
const gridString = `
###############
###############
###############
###############
...............
...............
...............
...D...........
###############
`;

const homeUpstairsLayers: RoomLayer[] = [
  {
    type: 'image',
    image: '/TwilightGame/assets-optimized/rooms/empty_room.png',
    zIndex: Z_PARALLAX_FAR,
    parallaxFactor: 1.0,
    opacity: 1.0,
    width: 960,
    height: 540,
    scale: 1.3,
    centered: true,
  },
  {
    type: 'image',
    image: furnitureAssets.strawberry_wallpaper,
    zIndex: Z_PARALLAX_FAR + 1, // -99, just above base room image
    parallaxFactor: 1.0,
    opacity: 1.0,
    width: 960,
    height: 540,
    scale: 1.3,
    centered: true,
    condition: { type: 'wallpaper', wallpaperId: 'furniture_strawberry_wallpaper' },
  },
  {
    type: 'image',
    image: furnitureAssets.stripey_curtains,
    zIndex: Z_PARALLAX_FAR + 2, // -98, above wallpaper layer
    parallaxFactor: 1.0,
    opacity: 1.0,
    width: 960,
    height: 540,
    scale: 1.3,
    centered: true,
    condition: { type: 'wallpaper', wallpaperId: 'furniture_stripey_curtains' },
  },
];

/**
 * The communal easel (Draw / Craft Workshop), with a blank canvas resting on the
 * ledge, beside Mushra's crafting table. A room prop rather than DOM art so it
 * depth-sorts with the player: standing below its base the player is in front
 * of it (issue #158).
 */
const bedroomEasel: RoomProp = {
  id: 'bedroom_easel',
  // Centred on the easel's tile, standing on the row below it.
  anchor: { x: COMMUNAL_EASEL.x + 0.5, y: COMMUNAL_EASEL.y + 1 },
  width: 2.4,
  height: 2.4,
  parts: [
    { kind: 'image', image: itemAssets.easel, left: 0, top: 0, width: 1, height: 1 },
    // The blank canvas
    {
      kind: 'panel',
      left: 0.35,
      top: 0.21,
      width: 0.31,
      height: 0.34,
      fill: 0xfff8df,
      stroke: 0xc4a47b,
    },
  ],
};

export const homeUpstairs: MapDefinition = {
  id: 'home_upstairs',
  name: 'Home Upstairs',
  width: 15,
  height: 9,
  grid: parseGrid(gridString),
  colorScheme: 'indoor',
  isRandom: false,
  spawnPoint: { x: 7, y: 6 },
  renderMode: 'background-image',
  characterScale: 1.8,
  referenceViewport: { width: 1280, height: 720 },
  layers: homeUpstairsLayers,
  props: [bedroomEasel],
  transitions: [
    {
      fromPosition: { x: 3, y: 7 }, // Stairs down
      tileType: TileType.DOOR,
      toMapId: 'mums_kitchen',
      toPosition: { x: 12.5, y: 4.5 }, // Foot of the kitchen stairs; (12,3) put the player box astride the wall at (11,3)
      label: 'Downstairs',
      hasDoor: true,
    },
  ],
};
