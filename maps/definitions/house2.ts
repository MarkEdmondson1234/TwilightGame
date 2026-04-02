import { MapDefinition, TileType, RoomLayer } from '../../types';
import { parseGrid } from '../gridParser';
import { Z_PARALLAX_FAR, Z_SPRITE_FOREGROUND } from '../../zIndex';

/**
 * House 2 Interior - Little girl's house (background-image interior)
 *
 * Background: celias_room_background.png (1920×1080, displayed at 960×540 @ 1.3×)
 * Foreground: celias_room_foreground.png (1920×1080, displayed at 960×540 @ 1.3×) — renders in front of player
 * width=960 = mapWidth(15) × TILE_SIZE(64), which keeps the debug grid aligned with the image
 *
 * Walkmesh Grid Legend (invisible — collision only):
 * # = Wall/obstacle (solid)
 * . = Floor (walkable)
 * D = Door (transition tile — exit to village)
 *
 * Key positions:
 * - Village transition spawns player (PC) at {x:7.6, y:6} → walkable row 6
 * - Little girl at {x:10, y:6}, Periwinkle at {x:6, y:6} → walkable row 6
 * - Exit door at {x:7, y:7} → bottom-centre door tile
 */

// 15 columns × 9 rows — standard background-image room layout
const gridString = `
###############
###############
###############
###############
###############
...............
.###...........
.###.........#.
.###...D....###
###############
`;

const house2Layers: RoomLayer[] = [
  // Layer 1: Background (walls, furniture, room decor — behind everything)
  {
    type: 'image',
    image: '/TwilightGame/assets/rooms/little_girls_house/celias_room_background.png',
    zIndex: Z_PARALLAX_FAR, // -100: Behind everything
    parallaxFactor: 1.0,
    opacity: 1.0,
    width: 960,  // = mapWidth (15) × TILE_SIZE (64) — keeps grid aligned with image
    height: 540, // 16:9 aspect ratio
    scale: 1.3,
    centered: true,
  },

  // Layer 2: Foreground (objects that appear in front of the player)
  {
    type: 'image',
    image: '/TwilightGame/assets/rooms/little_girls_house/celias_room_foreground.png',
    zIndex: Z_SPRITE_FOREGROUND, // 200: In front of player
    parallaxFactor: 1.0,
    opacity: 1.0,
    width: 960,  // Must match background (keeps grid aligned)
    height: 540,
    scale: 1.3,
    centered: true,
  },

  // Player is implicitly at Z_PLAYER (100) — between background and foreground
];

export const house2: MapDefinition = {
  id: 'house2',
  name: 'House',
  width: 15,
  height: 10,
  grid: parseGrid(gridString),
  colorScheme: 'indoor',
  isRandom: false,
  spawnPoint: { x: 2, y: 6 },
  renderMode: 'background-image',
  characterScale: 1.8,
  referenceViewport: { width: 1280, height: 720 },
  layers: house2Layers,
  transitions: [
    {
      fromPosition: { x: 7, y: 8 }, // Door exit (bottom centre)
      tileType: TileType.DOOR,
      toMapId: 'village',
      toPosition: { x: 18, y: 6 },
      label: 'To Village',
      hasDoor: true,
    },
  ],
};
