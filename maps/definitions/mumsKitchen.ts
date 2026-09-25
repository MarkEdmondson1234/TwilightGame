import { COMMUNAL_EASEL } from '../../data/communalEasel';
import { MapDefinition, TileType, RoomLayer, RoomProp } from '../../types';
import { itemAssets } from '../../assets';
import { parseGrid } from '../gridParser';
import { createMumNPC } from '../../utils/npcFactories';
import { Z_PARALLAX_FAR, Z_PLAYER } from '../../zIndex';

/**
 * Mum's Kitchen - Background Image Interior
 *
 * A cosy kitchen scene using background-image rendering mode.
 * The image shows: fireplace/stove on left, mum reading in armchair,
 * bookshelf, stairs going up on right, purple rug in centre.
 *
 * Image dimensions: 960x540 pixels
 * Grid is 15x9 tiles to match observed image coverage at 100% zoom.
 *
 * Walkmesh Grid Legend:
 * . = Floor (walkable)
 * # = Wall/Obstacle (solid - walls, outside image area)
 * D = Door (transition)
 *
 * The grid is invisible - only used for collision!
 *
 * Layer ordering (back to front):
 * 1. Background image (Z_PARALLAX_FAR = -100) - kitchen scene
 * 2. Mum NPC (Z_PLAYER = 100) - same level as player
 * 3. Player (Z_PLAYER = 100) - in front of background
 */

// 15 columns x 9 rows - matches observed tile coverage of 960x540 image
// Walkmesh designed to match furniture layout in kitchen image
const gridString = `
###############
###############
###############
############.##
############..#
#####.........#
####...........
###D...........
###############
`;

// Create Mum NPC (will have zIndexOverride set from layer)
const mumNPC = createMumNPC('mum_kitchen', { x: 7, y: 5 }, 'Mum');

/**
 * Unified layers array - defines all visual elements in z-order
 */
const kitchenLayers: RoomLayer[] = [
  // Layer 1: Background image (kitchen scene)
  {
    type: 'image',
    image: '/TwilightGame/assets-optimized/rooms/home/mums_kitchen.png',
    zIndex: Z_PARALLAX_FAR, // -100: Behind everything
    parallaxFactor: 1.0,
    opacity: 1.0,
    width: 960,
    height: 540,
    scale: 1.3, // 30% larger
    centered: true,
  },

  // Layer 2: Mum NPC (same z-level as player - no foreground to hide behind)
  {
    type: 'npc',
    npc: mumNPC,
    zIndex: Z_PLAYER - 1, // 99: just behind player
  },

  // Player is implicitly at Z_PLAYER (100)
];

/**
 * The communal easel (Draw / Craft Workshop start here, at tile 10,5), with a
 * blank canvas resting on the ledge. Mushra's Tiny Wreath workshop used to share
 * it, with a basket and lavender bunch composited against its legs; it is now her
 * hand-drawn crafting table upstairs (utils/tinyWreathLesson.ts, issue #157).
 *
 * A room prop rather than DOM art so it depth-sorts with the player: standing
 * below its base (y = 6) the player is in front of it (issue #158).
 */
const kitchenEasel: RoomProp = {
  id: 'kitchen_easel',
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

export const mumsKitchen: MapDefinition = {
  id: 'mums_kitchen',
  name: "Mum's Kitchen",
  width: 15,
  height: 9,
  grid: parseGrid(gridString),
  colorScheme: 'indoor',
  isRandom: false,
  spawnPoint: { x: 8, y: 6 }, // Safe walkable spawn (verified via F3)
  renderMode: 'background-image',
  characterScale: 1.8, // Make player/NPCs larger to fit the room scale (20% increase from 1.5)

  // Reference viewport for responsive scaling
  // Use a smaller reference so even laptops get slight scale-up
  // This makes the room fill more of the screen on most devices
  referenceViewport: { width: 1280, height: 720 },

  // Unified layer system - all visual elements in z-order
  layers: kitchenLayers,
  props: [kitchenEasel],

  // Transitions
  transitions: [
    {
      fromPosition: { x: 4, y: 8 }, // Door at left side (where D is in grid)
      tileType: TileType.DOOR,
      toMapId: 'village',
      // (10,22) put the player's PLAYER_SIZE=0.8 bounding box astride column 9, which is the
      // PLAYER_HOME anchor tile itself (solid in the base grid) — reported as JAVASCRIPT-REACT-B.
      toPosition: { x: 10.5, y: 22 }, // Spawn just outside home door in village
      label: 'To Village',
      hasDoor: true,
    },
    {
      fromPosition: { x: 12, y: 3 }, // Base of stairs (right side of kitchen; matches new artwork)
      tileType: TileType.DOOR,
      toMapId: 'home_upstairs',
      toPosition: { x: 3, y: 6 }, // Spawn near stairs in upstairs map
      label: 'Upstairs',
      hasDoor: true,
    },
  ],

  // Note: NPCs are defined in the layers array above
};
