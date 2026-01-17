/**
 * Sprite Metadata Definitions
 *
 * Multi-tile sprite definitions for foreground/background rendering.
 * Each entry defines the visual size, collision box, and rendering properties
 * for sprites that span multiple tiles.
 *
 * Extracted from constants.ts for better organisation.
 */

import { TileType, SpriteMetadata } from '../types';
import { tileAssets } from '../assets';

export const SPRITE_METADATA: SpriteMetadata[] = [
  {
    tileType: TileType.RUG,
    spriteWidth: 3, // 3 tiles wide
    spriteHeight: 3, // 3 tiles tall
    offsetX: -0.5, // Center horizontally (extend 0.5 tiles left)
    offsetY: -0.5, // Center vertically (extend 0.5 tiles up)
    image: tileAssets.rug_cottagecore,
    // No collision - rugs are walkable
    collisionWidth: 0,
    collisionHeight: 0,
    collisionOffsetX: 0,
    collisionOffsetY: 0,
  },
  {
    tileType: TileType.BED,
    spriteWidth: 3, // 3 tiles wide (square bed)
    spriteHeight: 3, // 3 tiles tall (square aspect ratio)
    offsetX: -1, // Center horizontally (extend 1 tile left)
    offsetY: -1, // Center vertically (extend 1 tile up)
    image: tileAssets.cottage_bed,
    // Disable all CSS transforms for clean furniture rendering
    enableFlip: false,
    enableRotation: false,
    enableScale: false,
    enableBrightness: false,
    // Collision: 2x2 centered on the mattress area
    collisionWidth: 1.5,
    collisionHeight: 2,
    collisionOffsetX: -0.2, // Centered
    collisionOffsetY: 0, // Centered
  },
  {
    tileType: TileType.BUSH,
    spriteWidth: 2, // 2 tiles wide
    spriteHeight: 2, // 2 tiles tall
    offsetX: -0.5, // Center horizontally on tile
    offsetY: -1, // Extends 1 tile upward
    image: tileAssets.bush_1,
    // Collision only at the base (1x1)
    collisionWidth: 1,
    collisionHeight: 1,
    collisionOffsetX: 0,
    collisionOffsetY: 0,
    // Transform controls: subtle scaling only, no rotation/brightness for bushes
    enableFlip: true,
    enableRotation: false,
    enableScale: true,
    enableBrightness: false,
    scaleRange: { min: 0.98, max: 1.02 },
  },
  {
    tileType: TileType.BRAMBLES,
    spriteWidth: 2, // 2 tiles wide
    spriteHeight: 2, // 2 tiles tall
    offsetX: -0.5, // Center horizontally on tile
    offsetY: -1, // Extends 1 tile upward
    image: tileAssets.brambles_summer, // Seasonal images handled by TILE_LEGEND
    // Collision at the base (1x1)
    collisionWidth: 1,
    collisionHeight: 1,
    collisionOffsetX: 0,
    collisionOffsetY: 0,
    // Transform controls: subtle scaling, flipping for variety
    enableFlip: true,
    enableRotation: false,
    enableScale: true,
    enableBrightness: false,
    scaleRange: { min: 0.95, max: 1.05 }, // Slight variation: 95% to 105%
  },
  {
    tileType: TileType.HAZEL_BUSH,
    spriteWidth: 4, // 4 tiles wide
    spriteHeight: 4, // 4 tiles tall
    offsetX: -1.5, // Center horizontally on tile
    offsetY: -3, // Extends 3 tiles upward
    image: tileAssets.hazel_bush_summer, // Seasonal images handled by TILE_LEGEND
    // Collision at the base (1x1)
    collisionWidth: 1,
    collisionHeight: 1,
    collisionOffsetX: 0,
    collisionOffsetY: 0,
    // Transform controls: subtle scaling, flipping for variety
    enableFlip: true,
    enableRotation: false,
    enableScale: true,
    enableBrightness: false,
    scaleRange: { min: 0.95, max: 1.05 }, // Slight variation: 95% to 105%
  },
  {
    tileType: TileType.BLUEBERRY_BUSH,
    spriteWidth: 3, // 3 tiles wide
    spriteHeight: 3, // 3 tiles tall
    offsetX: -1, // Center horizontally on tile
    offsetY: -2, // Extends 2 tiles upward
    image: tileAssets.blueberry_bush_summer, // Seasonal images handled by TILE_LEGEND
    // Collision at the base (1x1)
    collisionWidth: 1,
    collisionHeight: 1,
    collisionOffsetX: 0,
    collisionOffsetY: 0,
    // Transform controls: subtle scaling, flipping for variety
    enableFlip: true,
    enableRotation: false,
    enableScale: true,
    enableBrightness: false,
    scaleRange: { min: 0.95, max: 1.05 }, // Slight variation: 95% to 105%
  },
  {
    tileType: TileType.VILLAGE_FLOWERS,
    spriteWidth: 2, // 2 tiles wide
    spriteHeight: 2, // 2 tiles tall
    offsetX: -0.5, // Center horizontally on tile
    offsetY: -1, // Extends 1 tile upward
    image: tileAssets.village_flowers_summer, // Seasonal images handled by TILE_LEGEND
    // Collision: walkable (no collision)
    collisionWidth: 0,
    collisionHeight: 0,
    collisionOffsetX: 0,
    collisionOffsetY: 0,
    // Transform controls: flipping for variety
    enableFlip: true,
    enableRotation: false,
    enableScale: true,
    enableBrightness: false,
    scaleRange: { min: 0.95, max: 1.05 }, // Slight variation
  },
  // ============================================
  // Deep Forest Plants (Sacred Grove)
  // ============================================
  {
    tileType: TileType.MOONPETAL,
    spriteWidth: 3, // 3 tiles wide
    spriteHeight: 3, // 3 tiles tall
    offsetX: -1, // Center horizontally on tile (extend 1 tile left)
    offsetY: -2, // Extends 2 tiles upward
    image: tileAssets.moonpetal_spring_summer_day, // Default image (time-of-day handled by TileLayer)
    // Collision: walkable (no collision) - magical plant
    collisionWidth: 0,
    collisionHeight: 0,
    collisionOffsetX: 0,
    collisionOffsetY: 0,
    // Transform controls: subtle flipping and scaling for variety
    enableFlip: true,
    enableRotation: false,
    enableScale: true,
    enableBrightness: false,
    scaleRange: { min: 0.95, max: 1.05 }, // Slight variation: 95% to 105%
  },
  {
    tileType: TileType.ADDERSMEAT,
    spriteWidth: 3, // 3 tiles wide
    spriteHeight: 3, // 3 tiles tall
    offsetX: -1, // Center horizontally on tile (extend 1 tile left)
    offsetY: -2, // Extends 2 tiles upward
    image: tileAssets.addersmeat_spring_summer_day, // Default image (time-of-day handled by TileLayer)
    // Collision: walkable (no collision) - magical plant
    collisionWidth: 0,
    collisionHeight: 0,
    collisionOffsetX: 0,
    collisionOffsetY: 0,
    // Transform controls: subtle flipping and scaling for variety
    enableFlip: true,
    enableRotation: false,
    enableScale: true,
    enableBrightness: false,
    scaleRange: { min: 0.95, max: 1.05 }, // Slight variation: 95% to 105%
  },
  // ============================================
  // Common Forageable Plants (Multiple Maps)
  // ============================================
  {
    tileType: TileType.MUSTARD_FLOWER,
    spriteWidth: 3, // 3 tiles wide
    spriteHeight: 3, // 3 tiles tall (square image)
    offsetX: -1, // Center horizontally on tile (extend 1 tile left)
    offsetY: -2, // Extends 2 tiles upward
    image: tileAssets.mustard_flower,
    // Collision: walkable (no collision) - forageable plant
    collisionWidth: 0,
    collisionHeight: 0,
    collisionOffsetX: 0,
    collisionOffsetY: 0,
    // Transform controls: subtle flipping and scaling for variety
    enableFlip: true,
    enableRotation: false,
    enableScale: true,
    enableBrightness: false,
    scaleRange: { min: 0.9, max: 1.1 }, // Slight variation: 90% to 110%
  },
  // ============================================
  // Mushroom Forest Plants
  // ============================================
  {
    tileType: TileType.LUMINESCENT_TOADSTOOL,
    spriteWidth: 3, // 3 tiles wide
    spriteHeight: 3, // 3 tiles tall (square image)
    offsetX: -1, // Center horizontally on tile (extend 1 tile left)
    offsetY: -2, // Extends 2 tiles upward
    image: tileAssets.luminescent_toadstool,
    // Collision: walkable (no collision) - decorative glowing mushrooms
    collisionWidth: 0,
    collisionHeight: 0,
    collisionOffsetX: 0,
    collisionOffsetY: 0,
    // Transform controls: subtle flipping and scaling for variety
    enableFlip: true,
    enableRotation: false,
    enableScale: true,
    enableBrightness: false,
    scaleRange: { min: 0.9, max: 1.1 }, // Slight variation: 90% to 110%
    // Luminescent glow effect - soft cyan aura like Mother Sea
    glow: {
      color: 0x66ffff, // Soft cyan (matches toadstool colour)
      radius: 2.5, // Subtle glow radius in tiles
      dayIntensity: 0.08, // Very subtle during day
      nightIntensity: 0.12, // Softly visible at night
    },
  },
  {
    tileType: TileType.FERN,
    spriteWidth: 2, // 2 tiles wide
    spriteHeight: 2, // 2 tiles tall
    offsetX: -0.5, // Center horizontally on tile
    offsetY: -1, // Extends 1 tile upward
    image: tileAssets.forest_fern3,
    // No collision - ferns are walkable ground cover
    collisionWidth: 0,
    collisionHeight: 0,
    collisionOffsetX: 0,
    collisionOffsetY: 0,
    // Transform controls: variety for natural forest floor
    enableFlip: true,
    enableRotation: true,
    enableScale: true,
    enableBrightness: true,
    scaleRange: { min: 0.8, max: 1.2 }, // Size variation
    rotationRange: { min: -15, max: 15 }, // Slight rotation
  },
  {
    tileType: TileType.TREE,
    spriteWidth: 6, // 6 tiles wide
    spriteHeight: 6, // 6 tiles tall (maintains 1:1 aspect ratio of 1000x1000 source image)
    offsetX: -2.5, // Center horizontally on tile
    offsetY: -5, // Extends 5 tiles upward
    image: tileAssets.birch_summer, // Use birch tree (seasonal handled by TILE_LEGEND)
    // Collision only at the base (1x1)
    collisionWidth: 0.2,
    collisionHeight: 0.2,
    collisionOffsetX: 0.3,
    collisionOffsetY: 1,
    // Transform controls: subtle scaling only, no rotation/brightness for trees
    enableFlip: true,
    enableRotation: false, // No rotation for trees
    enableScale: true,
    enableBrightness: false, // No brightness variation for trees
    scaleRange: { min: 0.98, max: 1.02 }, // Very subtle: 98% to 102%
  },
  {
    tileType: TileType.TREE_BIG,
    spriteWidth: 3, // 3 tiles wide
    spriteHeight: 4, // 4 tiles tall
    offsetX: -1, // Center horizontally on tile
    offsetY: -3, // Extends 3 tiles upward
    image: tileAssets.tree_big_1,
    // Collision only at the base (1x1)
    collisionWidth: 0.5,
    collisionHeight: 0.5,
    collisionOffsetX: 0.5,
    collisionOffsetY: 0,
    // Transform controls: subtle scaling only, no rotation/brightness for trees
    enableFlip: true,
    enableRotation: false,
    enableScale: true,
    enableBrightness: false,
    scaleRange: { min: 0.98, max: 1.02 },
  },
  {
    tileType: TileType.COTTAGE,
    spriteWidth: 6, // 6 tiles wide (actual cottage width)
    spriteHeight: 6, // 5 tiles tall (actual cottage height)
    offsetX: -3, // Offset to center cottage
    offsetY: -4, // Extends upward from K tile
    image: tileAssets.cottage_wooden,
    enableFlip: false,
    enableRotation: false,
    enableScale: false,
    enableBrightness: false,
    // Collision at the front wall (full width, but only bottom 2 rows)
    collisionWidth: 4.0,
    collisionHeight: 2.5,
    collisionOffsetX: -1.7,
    collisionOffsetY: -1.2, // Just the bottom 2 rows (player can walk behind roof/chimney)
  },

  {
    tileType: TileType.CHERRY_TREE,
    spriteWidth: 4, // 4 tiles wide (larger than regular tree)
    spriteHeight: 4, // 4 tiles tall
    offsetX: -1.5, // Center horizontally on tile
    offsetY: -3, // Extends 3 tiles upward
    image: tileAssets.tree_cherry_autumn, // Default image (will be overridden by seasonal logic)
    // Collision only at the base trunk (1x1)
    collisionWidth: 0.3,
    collisionHeight: 0.3,
    collisionOffsetX: 0.35,
    collisionOffsetY: 0.35,
    // Transform controls: subtle scaling only, no rotation/brightness for trees
    enableFlip: true,
    enableRotation: false,
    enableScale: true,
    enableBrightness: false,
    scaleRange: { min: 0.98, max: 1.02 },
    // Rounded shadow for cherry tree canopy
    shadowWidthRatio: 0.55,
    shadowHeightRatio: 0.25,
  },

  // Lake edge tiles - need to be foreground sprites so baseType (grass) renders underneath
  {
    tileType: TileType.WATER_LEFT,
    spriteWidth: 1,
    spriteHeight: 1,
    offsetX: 0,
    offsetY: 0,
    image: [
      tileAssets.water_left,
      tileAssets.water_right,
      tileAssets.water_top,
      tileAssets.water_bottom,
    ],
    collisionWidth: 1.0,
    collisionHeight: 1.0,
    enableRotation: true,
    rotationMode: 'lake_edge_left',
  },
  {
    tileType: TileType.WATER_RIGHT,
    spriteWidth: 1,
    spriteHeight: 1,
    offsetX: 0,
    offsetY: 0,
    image: [
      tileAssets.water_left,
      tileAssets.water_right,
      tileAssets.water_top,
      tileAssets.water_bottom,
    ],
    collisionWidth: 1.0,
    collisionHeight: 1.0,
    enableRotation: true,
    rotationMode: 'lake_edge_right',
  },
  {
    tileType: TileType.WATER_TOP,
    spriteWidth: 1,
    spriteHeight: 1,
    offsetX: 0,
    offsetY: 0,
    image: [
      tileAssets.water_left,
      tileAssets.water_right,
      tileAssets.water_top,
      tileAssets.water_bottom,
    ],
    collisionWidth: 1.0,
    collisionHeight: 1.0,
    enableRotation: true,
    rotationMode: 'lake_edge_top',
  },
  {
    tileType: TileType.WATER_BOTTOM,
    spriteWidth: 1,
    spriteHeight: 1,
    offsetX: 0,
    offsetY: 0,
    image: [
      tileAssets.water_left,
      tileAssets.water_right,
      tileAssets.water_top,
      tileAssets.water_bottom,
    ],
    collisionWidth: 1.0,
    collisionHeight: 1.0,
    enableRotation: true,
    rotationMode: 'lake_edge_bottom',
  },
  {
    tileType: TileType.SOFA,
    spriteWidth: 3, // 3 tiles wide
    spriteHeight: 3, // 3 tiles tall (matching bed size)
    offsetX: -0.4, // Start at anchor tile
    offsetY: -1, // Extends 2 tiles upward
    image: [tileAssets.sofa_01, tileAssets.sofa_02],
    // Disable all CSS transforms for clean furniture rendering
    enableFlip: false,
    enableRotation: false,
    enableScale: false,
    enableBrightness: false,
    // Collision covers the sofa seating area (front edge)
    collisionWidth: 2.4,
    collisionHeight: 1.1,
    collisionOffsetX: -0.1,
    collisionOffsetY: 0.4,
  },
  {
    tileType: TileType.TABLE,
    spriteWidth: 2, // 2 tiles wide
    spriteHeight: 2, // 2 tiles tall (square coffee table)
    offsetX: 0, // Start at anchor tile
    offsetY: -1, // Extends 1 tile upward
    image: tileAssets.sofa_table,
    // Collision covers the table surface
    collisionWidth: 1.5,
    collisionHeight: 0.5,
    collisionOffsetX: 0.3,
    collisionOffsetY: -0.4,
  },
  {
    tileType: TileType.CHIMNEY,
    spriteWidth: 2, // 2 tiles wide
    spriteHeight: 2, // 2 tiles tall
    offsetX: -1, // Start at anchor tile
    offsetY: -1, // Extends 1 tile upward
    image: tileAssets.chimney,
    // Disable all CSS transforms for clean furniture rendering
    enableFlip: false,
    enableRotation: false,
    enableScale: false,
    enableBrightness: false,
    // Collision - chimney blocks movement
    collisionWidth: 2,
    collisionHeight: 2,
    collisionOffsetX: 0,
    collisionOffsetY: -1,
  },
  {
    tileType: TileType.STOVE,
    spriteWidth: 3, // 2 tiles wide
    spriteHeight: 3, // 3 tiles tall (includes chimney pipe on top)
    offsetX: -0.8, // Start at anchor tile
    offsetY: -2, // Extends 2 tiles upward
    image: tileAssets.stove,
    // Disable all CSS transforms for clean furniture rendering
    enableFlip: false,
    enableRotation: false,
    enableScale: false,
    enableBrightness: false,
    // Collision - stove blocks movement (full footprint)
    collisionWidth: 1.6,
    collisionHeight: 3, // Only block the base, allow walking behind
    collisionOffsetX: 0,
    collisionOffsetY: -2,
  },
  {
    tileType: TileType.COTTAGE_STONE,
    spriteWidth: 6, // 6 tiles wide (actual cottage width)
    spriteHeight: 6, // 5 tiles tall (actual cottage height)
    offsetX: -1.2, // Offset to center cottage
    offsetY: -1.5, // Extends upward from K tile
    image: tileAssets.cottage_stone,
    enableFlip: false,
    enableRotation: false,
    enableScale: false,
    enableBrightness: false,
    // Collision at the front wall (full width, but only bottom 2 rows)
    collisionWidth: 3.2,
    collisionHeight: 3.8,
    collisionOffsetX: 0,
    collisionOffsetY: 0, // Just the bottom 2 rows (player can walk behind roof/chimney)
  },
  {
    tileType: TileType.COTTAGE_FLOWERS,
    spriteWidth: 6, // 6 tiles wide (actual cottage width)
    spriteHeight: 6, // 5 tiles tall (actual cottage height)
    offsetX: -1, // Offset to center cottage
    offsetY: -4, // Extends upward from K tile
    image: tileAssets.cottage_w_flowers,
    enableFlip: false,
    enableRotation: false,
    enableScale: false,
    enableBrightness: false,
    // Collision at the front wall (full width, but only bottom 2 rows)
    collisionWidth: 3.6,
    collisionHeight: 3.4,
    collisionOffsetX: 0,
    collisionOffsetY: -1.4, // Just the bottom 2 rows (player can walk behind roof/chimney)
  },
  {
    tileType: TileType.SHOP,
    spriteWidth: 6, // 6 tiles wide (shop building width)
    spriteHeight: 6, // 6 tiles tall (shop building height)
    offsetX: -1, // Offset to center shop
    offsetY: -4, // Extends upward from anchor tile
    image: tileAssets.shop_spring, // Default image (overridden by seasonalImages in TILE_LEGEND)
    enableFlip: false,
    enableRotation: false,
    enableScale: false,
    enableBrightness: false,
    // Collision at the front of the shop (player cannot walk through building)
    collisionWidth: 4.8,
    collisionHeight: 4.4,
    collisionOffsetX: -0.3,
    collisionOffsetY: -2.2, // Just the bottom area (player can walk behind roof)
  },
  {
    tileType: TileType.MINE_ENTRANCE,
    spriteWidth: 4, // 4 tiles wide (mine entrance with rocks)
    spriteHeight: 4, // 4 tiles tall
    offsetX: -1.5, // Center the sprite on the anchor tile
    offsetY: -1.5, // Extends 3 tiles upward from anchor
    image: tileAssets.mine_entrance,
    enableFlip: false,
    enableRotation: false,
    enableScale: false,
    enableBrightness: false,
    // Collision only at the entrance opening (center area at bottom)
    collisionWidth: 2,
    collisionHeight: 1,
    collisionOffsetX: -0.5,
    collisionOffsetY: 0,
  },
  {
    tileType: TileType.GARDEN_SHED,
    spriteWidth: 6, // 6 tiles wide (garden shed on stilts with stairs)
    spriteHeight: 6, // 6 tiles tall
    offsetX: -2.5, // Position sprite relative to anchor
    offsetY: -4, // Extends upward from anchor
    image: tileAssets.garden_shed_spring, // Default image (overridden by seasonalImages in TILE_LEGEND)
    enableFlip: false,
    enableRotation: false,
    enableScale: false,
    enableBrightness: false,
    // Collision at the front of the shed (player cannot walk through building or stairs)
    collisionWidth: 3,
    collisionHeight: 1,
    collisionOffsetX: -1,
    collisionOffsetY: 0,
  },
  {
    tileType: TileType.WELL,
    spriteWidth: 2, // 2 tiles wide
    spriteHeight: 2, // 2 tiles tall (stone well with dark opening)
    offsetX: -0.6, // Start at anchor tile
    offsetY: -0.7, // Extends 1 tile upward
    image: tileAssets.well, // Default image (overridden by seasonalImages in TILE_LEGEND)
    enableFlip: false,
    enableRotation: false,
    enableScale: false,
    enableBrightness: false,
    // Collision - well blocks movement (full 2x2 footprint)
    collisionWidth: 1,
    collisionHeight: 1.2,
    collisionOffsetX: 0,
    collisionOffsetY: 0,
  },
  {
    tileType: TileType.CAULDRON,
    spriteWidth: 3, // 3 tiles wide (bubbling cauldron)
    spriteHeight: 3, // 3 tiles tall (square aspect ratio)
    offsetX: -1, // Center horizontally (extend 1 tile left)
    offsetY: -1, // Center vertically (extend 1 tile up)
    image: tileAssets.cauldron_1, // First frame (overridden by animationFrames)
    enableFlip: false,
    enableRotation: false,
    enableScale: false,
    enableBrightness: false,
    // Collision at the base (1x1 centered)
    collisionWidth: 1,
    collisionHeight: 1,
    collisionOffsetX: 0,
    collisionOffsetY: 0,
    // Animation frames (bubbling effect)
    animationFrames: [
      tileAssets.cauldron_1,
      tileAssets.cauldron_2,
      tileAssets.cauldron_3,
      tileAssets.cauldron_4,
      tileAssets.cauldron_5,
      tileAssets.cauldron_6,
      tileAssets.cauldron_7,
      tileAssets.cauldron_8,
      tileAssets.cauldron_9,
    ],
    animationSpeed: 100, // 100ms per frame = 10 FPS gentle bubbling
  },
  {
    tileType: TileType.TREE_STUMP,
    spriteWidth: 2, // 2 tiles wide
    spriteHeight: 2, // 2 tiles tall (square stump)
    offsetX: -0.5, // Center horizontally
    offsetY: -0.5, // Center vertically
    image: tileAssets.stump,
    enableFlip: true, // Horizontal flip for variety
    enableRotation: false, // No rotation - roots go down into the earth!
    enableScale: true, // Slight size variation
    enableBrightness: false,
    scaleRange: { min: 0.95, max: 1.05 }, // Slight variation: 95% to 105%
    // Collision at the stump (1x1 centered)
    collisionWidth: 1,
    collisionHeight: 1,
    collisionOffsetX: 0,
    collisionOffsetY: 0,
  },
  {
    tileType: TileType.STREAM,
    spriteWidth: 5, // 5 tiles wide (flowing stream)
    spriteHeight: 5, // 5 tiles tall (square aspect ratio - preserves uploaded image ratio)
    offsetX: -2, // Center horizontally (extend 2 tiles left)
    offsetY: -2, // Center vertically (extend 2 tiles up)
    image: tileAssets.stream_1, // First frame (overridden by animationFrames)
    enableFlip: false, // No flip - water flows in one direction
    enableRotation: false, // No rotation - stream has directional flow
    enableScale: false, // No scale - keep animation consistent
    enableBrightness: false,
    // Collision - stream is walkable (splashing through water)
    collisionWidth: 5,
    collisionHeight: 5,
    collisionOffsetX: -2,
    collisionOffsetY: -2,
    // Animation frames (flowing water effect)
    animationFrames: [
      tileAssets.stream_1,
      tileAssets.stream_2,
      tileAssets.stream_3,
    ],
    animationSpeed: 200, // 200ms per frame = 5 FPS gentle flowing water
    // Depth sorting - place depth line very high so player always appears above water
    depthLineOffset: -10, // Player walks through/over the stream, not under it
  },
  {
    tileType: TileType.ROCK,
    spriteWidth: 1, // 1 tile wide (standard rock)
    spriteHeight: 1, // 1 tile tall
    offsetX: 0, // No offset - rock centered on tile
    offsetY: 0,
    image: [tileAssets.rock_1, tileAssets.rock_2], // Rock variants
    enableFlip: true, // Horizontal flip for variety
    enableRotation: true, // Rotation for natural placement
    enableScale: true, // Size variation
    enableBrightness: true,
    scaleRange: { min: 0.85, max: 1.15 },
    rotationRange: { min: -5, max: 10 },
    brightnessRange: { min: 0.95, max: 1.05 },
    // Small collision box - rocks are more decorative, less obstructive
    collisionWidth: 0.4,
    collisionHeight: 0.4,
    collisionOffsetX: 0.3, // Center the small collision box
    collisionOffsetY: 0.3,
  },
  {
    tileType: TileType.TUFT,
    spriteWidth: 2, // 2 tiles wide
    spriteHeight: 2, // 2 tiles tall (larger tuft patch)
    offsetX: -0.5, // Center horizontally
    offsetY: -0.5, // Center vertically
    image: tileAssets.tuft_01, // Default image (overridden by seasonalImages in TILE_LEGEND)
    enableFlip: true, // Horizontal flip for variety
    enableRotation: true, // Rotation for natural placement
    enableScale: true, // Size variation
    enableBrightness: true, // Slight brightness variation
    scaleRange: { min: 0.85, max: 1.15 }, // Varied sizes
    rotationRange: { min: -15, max: 15 }, // Slight rotation
    brightnessRange: { min: 0.95, max: 1.05 }, // Subtle brightness variation
    // No collision - tufts are walkable ground cover
    collisionWidth: 0,
    collisionHeight: 0,
    collisionOffsetX: 0,
    collisionOffsetY: 0,
  },
  {
    tileType: TileType.FAIRY_OAK,
    spriteWidth: 5, // 5 tiles wide (magical large tree)
    spriteHeight: 5, // 5 tiles tall
    offsetX: -2, // Center horizontally on tile
    offsetY: -4, // Extends 4 tiles upward
    image: tileAssets.fairy_oak_summer, // Default image (overridden by seasonalImages in TILE_LEGEND)
    // Collision only at the base trunk (small area)
    collisionWidth: 0.5,
    collisionHeight: 0.5,
    collisionOffsetX: 0.25,
    collisionOffsetY: 0.25,
    // Transform controls: subtle scaling only, no rotation for magical trees
    enableFlip: true,
    enableRotation: false,
    enableScale: true,
    enableBrightness: false,
    scaleRange: { min: 0.98, max: 1.02 },
  },
  {
    tileType: TileType.OAK_TREE,
    spriteWidth: 5, // 5 tiles wide (large deciduous tree)
    spriteHeight: 6, // 6 tiles tall (proper forest oak)
    offsetX: -2, // Center horizontally on tile
    offsetY: -5, // Extends 5 tiles upward
    image: tileAssets.oak_tree_summer, // Default image (overridden by seasonalImages in TILE_LEGEND)
    // Collision only at the base trunk (small area)
    collisionWidth: 0.3,
    collisionHeight: 0.3,
    collisionOffsetX: 0.35,
    collisionOffsetY: 0.35,
    // Transform controls: more variation for natural forest feel
    enableFlip: true,
    enableRotation: false,
    enableScale: true,
    enableBrightness: false,
    scaleRange: { min: 0.85, max: 1.15 }, // More size variation
    // Broad shadow for deciduous tree with wide canopy
    shadowWidthRatio: 0.6,
    shadowHeightRatio: 0.25,
  },
  {
    tileType: TileType.SPRUCE_TREE,
    spriteWidth: 8, // 4 tiles wide (towering forest conifer)
    spriteHeight: 8, // 8 tiles tall (proper forest tree)
    offsetX: -1, // Center horizontally on tile
    offsetY: -7, // Extends 7 tiles upward
    image: tileAssets.spruce_tree, // Default image (overridden by seasonalImages in TILE_LEGEND)
    // Collision only at the base trunk (small area)
    collisionWidth: 0.4,
    collisionHeight: 0.3,
    collisionOffsetX: -0.3,
    collisionOffsetY: -1,
    // Transform controls: more variation for natural forest feel
    enableFlip: true,
    enableRotation: false,
    enableScale: true,
    enableBrightness: false,
    scaleRange: { min: 0.85, max: 1.15 }, // More size variation for natural look
    // Narrow elongated shadow for conical tree shape
    shadowWidthRatio: 0.25,
    shadowHeightRatio: 0.12,
  },
  {
    tileType: TileType.WILLOW_TREE,
    spriteWidth: 8, // 3 tiles wide (graceful weeping willow)
    spriteHeight: 8, // 3 tiles tall
    offsetX: -3.5, // Center horizontally on tile
    offsetY: -5.5, // Extends 2 tiles upward
    image: tileAssets.willow_tree, // Default image (overridden by seasonalImages in TILE_LEGEND)
    // Collision only at the base trunk (small area)
    collisionWidth: 0.3,
    collisionHeight: 1.6,
    collisionOffsetX: 0.35,
    collisionOffsetY: 0.35,
    // Transform controls: subtle variation for graceful trees
    enableFlip: true,
    enableRotation: false,
    enableScale: true,
    enableBrightness: false,
    scaleRange: { min: 0.95, max: 1.05 }, // Subtle size variation
    // Wider shadow for weeping willow with drooping branches
    shadowWidthRatio: 0.5,
    shadowHeightRatio: 0.2,
  },
  {
    tileType: TileType.LILAC_TREE,
    spriteWidth: 3, // 3 tiles wide (medium flowering bush)
    spriteHeight: 3, // 3 tiles tall (preserve square aspect ratio)
    offsetX: -1, // Center horizontally on tile
    offsetY: -2, // Extends 2 tiles upward
    image: tileAssets.lilac_tree_summer, // Default image (overridden by seasonalImages in TILE_LEGEND)
    // Collision at the base of the bush
    collisionWidth: 0.8,
    collisionHeight: 1,
    collisionOffsetX: 0.1,
    collisionOffsetY: 0,
    // Transform controls: variation for natural look
    enableFlip: true,
    enableRotation: false,
    enableScale: true,
    enableBrightness: false,
    scaleRange: { min: 0.95, max: 1.05 }, // Slight size variation
  },
  {
    tileType: TileType.GIANT_MUSHROOM,
    spriteWidth: 5, // 5 tiles wide (magical giant mushroom)
    spriteHeight: 5, // 5 tiles tall
    offsetX: -2, // Center horizontally on tile
    offsetY: -4, // Extends 4 tiles upward
    image: tileAssets.giant_mushroom, // Default image (overridden by seasonalImages in TILE_LEGEND)
    // Collision at the mushroom stem base
    collisionWidth: 0.8,
    collisionHeight: 0.8,
    collisionOffsetX: 0.1,
    collisionOffsetY: 0.1,
    // Transform controls: subtle variation for magical mushrooms
    enableFlip: true,
    enableRotation: false,
    enableScale: true,
    enableBrightness: false,
    scaleRange: { min: 0.9, max: 1.1 }, // More variation for magical feel
  },
  {
    tileType: TileType.SAMBUCA_BUSH,
    spriteWidth: 4, // 4 tiles wide (small tree/large bush)
    spriteHeight: 4, // 4 tiles tall
    offsetX: -1.5, // Center horizontally on tile
    offsetY: -3, // Extends 3 tiles upward
    image: tileAssets.sambuca_bush_summer, // Default image (overridden by seasonalImages in TILE_LEGEND)
    // Collision at the trunk/base
    collisionWidth: 0.8,
    collisionHeight: 0.8,
    collisionOffsetX: 0.1,
    collisionOffsetY: 0.1,
    // Transform controls: variation for natural tree-like look
    enableFlip: true,
    enableRotation: false,
    enableScale: true,
    enableBrightness: false,
    scaleRange: { min: 0.9, max: 1.1 }, // Subtle size variation
  },
  {
    tileType: TileType.DEAD_SPRUCE,
    spriteWidth: 4, // 4 tiles wide (tall barren tree)
    spriteHeight: 7, // 7 tiles tall (tall dead conifer)
    offsetX: -1.5, // Center horizontally on tile
    offsetY: -6, // Extends 6 tiles upward
    image: tileAssets.dead_spruce, // Default image (overridden by seasonalImages in TILE_LEGEND)
    // Collision only at the base trunk (small area)
    collisionWidth: 0.3,
    collisionHeight: 0.3,
    collisionOffsetX: 0.35,
    collisionOffsetY: 0.35,
    // Transform controls: variation for natural dead tree look
    enableFlip: true,
    enableRotation: false,
    enableScale: true,
    enableBrightness: false,
    scaleRange: { min: 0.85, max: 1.15 }, // More size variation for organic feel
  },
  {
    tileType: TileType.FIR_TREE_SMALL,
    spriteWidth: 3, // 3 tiles wide (small underbrush tree)
    spriteHeight: 3, // 3 tiles tall
    offsetX: -1, // Center horizontally on tile
    offsetY: -2, // Extends 2 tiles upward
    image: tileAssets.fir_tree_small, // Default image (overridden by seasonalImages in TILE_LEGEND)
    // No collision - walkable underbrush
    collisionWidth: 0,
    collisionHeight: 0,
    collisionOffsetX: 0,
    collisionOffsetY: 0,
    // Transform controls: variation for natural underbrush look
    enableFlip: true,
    enableRotation: false,
    enableScale: true,
    enableBrightness: false,
    scaleRange: { min: 0.9, max: 1.1 }, // Subtle size variation
  },
  {
    tileType: TileType.SPRUCE_TREE_SMALL,
    spriteWidth: 4, // 4 tiles wide (small forest tree)
    spriteHeight: 4, // 4 tiles tall
    offsetX: -1.5, // Center horizontally on tile
    offsetY: -3, // Extends 3 tiles upward
    image: tileAssets.spruce_tree_small, // Default image (overridden by seasonalImages in TILE_LEGEND)
    // Collision at the trunk base
    collisionWidth: 0.6,
    collisionHeight: 0.6,
    collisionOffsetX: 0.2,
    collisionOffsetY: 0.2,
    // Transform controls: variation for natural small tree look
    enableFlip: true,
    enableRotation: false,
    enableScale: true,
    enableBrightness: false,
    scaleRange: { min: 0.9, max: 1.1 }, // Subtle size variation
    // Narrow shadow for small conical tree
    shadowWidthRatio: 0.3,
    shadowHeightRatio: 0.15,
  },
  {
    tileType: TileType.TREE_MUSHROOMS,
    spriteWidth: 5, // 5 tiles wide (square aspect ratio preserved)
    spriteHeight: 5, // 5 tiles tall (old dead tree with mushrooms)
    offsetX: -2, // Center horizontally on tile
    offsetY: -4, // Extends 4 tiles upward
    image: tileAssets.tree_mushrooms_spring_summer_autumn, // Default image (overridden by seasonalImages in TILE_LEGEND)
    // Collision only at the base trunk (small area)
    collisionWidth: 0.4,
    collisionHeight: 0.4,
    collisionOffsetX: 0.3,
    collisionOffsetY: 0.3,
    // Transform controls: variation for natural dead tree look
    enableFlip: true,
    enableRotation: false,
    enableScale: true,
    enableBrightness: false,
    scaleRange: { min: 0.85, max: 1.15 }, // More size variation for organic feel
    // Narrow shadow for dead tree trunk
    shadowWidthRatio: 0.4,
    shadowHeightRatio: 0.2,
  },
  {
    tileType: TileType.WILD_IRIS,
    spriteWidth: 3, // 3 tiles wide (flowering clump near water)
    spriteHeight: 3, // 3 tiles tall
    offsetX: -1, // Center horizontally on tile
    offsetY: -2, // Extends 2 tiles upward
    image: tileAssets.wild_iris_summer, // Default image (overridden by seasonalImages in TILE_LEGEND)
    // No collision - walkable decorative flower
    collisionWidth: 0,
    collisionHeight: 0,
    collisionOffsetX: 0,
    collisionOffsetY: 0,
    // Transform controls: variety for natural waterside look
    enableFlip: true,
    enableRotation: false,
    enableScale: true,
    enableBrightness: false,
    scaleRange: { min: 0.85, max: 1.15 }, // Size variation for natural look
  },
  {
    tileType: TileType.POND_FLOWERS,
    spriteWidth: 2, // 2 tiles wide (floating pond flowers)
    spriteHeight: 2, // 2 tiles tall
    offsetX: -0.5, // Center horizontally on tile
    offsetY: -1, // Extends 1 tile upward
    image: tileAssets.pond_flowers_spring_summer, // Default image (overridden by seasonalImages in TILE_LEGEND)
    // No collision - walkable decorative flower
    collisionWidth: 0,
    collisionHeight: 0,
    collisionOffsetX: 0,
    collisionOffsetY: 0,
    // Transform controls: variety for natural pond look
    enableFlip: true,
    enableRotation: false,
    enableScale: true,
    enableBrightness: false,
    scaleRange: { min: 0.85, max: 1.15 }, // Size variation for natural look
  },
  {
    tileType: TileType.FAIRY_OAK_GIANT,
    spriteWidth: 10,
    spriteHeight: 10,
    offsetX: -4.6,
    offsetY: -5.9,
    image: tileAssets.fairy_oak_summer,
    collisionWidth: 1.5,
    collisionHeight: 1.4,
    collisionOffsetX: -0.2,
    collisionOffsetY: 0.1,
    enableFlip: false,
    enableRotation: false,
    enableScale: false,
    enableBrightness: false,
    depthLineOffset: 1.1,
    shadowWidthRatio: 0.6,
    shadowHeightRatio: 0.25,
  },
  {
    tileType: TileType.WITCH_HUT,
    spriteWidth: 16, // 16 tiles wide
    spriteHeight: 16, // 16 tiles tall
    offsetX: -8, // Center horizontally on anchor tile
    offsetY: -5, // Positions door at anchor point
    image: tileAssets.witch_hut,
    collisionWidth: 11, // Wide base collision
    collisionHeight: 1, // Thin strip at bottom (player walks behind building)
    collisionOffsetX: -5.5,
    collisionOffsetY: 3,
    // No transforms - this is a unique magical structure
    enableFlip: false,
    enableRotation: false,
    enableScale: false,
    enableBrightness: false,
    // Large shadow for building structure
    shadowWidthRatio: 0.4,
    shadowHeightRatio: 0.15,
  },
  {
    tileType: TileType.BEAR_HOUSE,
    spriteWidth: 12, // 12 tiles wide (square 2100x2100 image preserved, doubled size)
    spriteHeight: 12, // 12 tiles tall (preserves 1:1 aspect ratio, doubled size)
    offsetX: -6, // Center horizontally on anchor tile
    offsetY: -6, // Center vertically on anchor tile
    image: tileAssets.bear_house_spring_summer, // Default image (overridden by seasonalImages in TILE_LEGEND)
    collisionWidth: 8, // Most of the house is solid (doubled from 4)
    collisionHeight: 6, // Reduced from 8 to allow walkable area at bottom (bottom edge at y=11 instead of y=13)
    collisionOffsetX: -2, // Center the collision box horizontally (doubled from -1)
    collisionOffsetY: -2, // Center the collision box vertically (doubled from -1)
    // No transforms - this is a cozy structure with detailed artwork
    enableFlip: false,
    enableRotation: false,
    enableScale: false,
    enableBrightness: false,
    // Shadow for building structure
    shadowWidthRatio: 0.3,
    shadowHeightRatio: 0.12,
  },
  {
    tileType: TileType.BEE_HIVE,
    spriteWidth: 3, // 3 tiles wide (square image)
    spriteHeight: 3, // 3 tiles tall (preserves 1:1 aspect ratio)
    offsetX: -1, // Center horizontally on anchor tile
    offsetY: -2, // Position so base is at anchor
    image: tileAssets.bee_hive,
    collisionWidth: 2, // Collision box for the hive structure
    collisionHeight: 1, // Thin collision at base
    collisionOffsetX: -0.5, // Center collision box
    collisionOffsetY: 0, // At anchor level
    // No transforms - unique structure
    enableFlip: false,
    enableRotation: false,
    enableScale: false,
    enableBrightness: false,
    // Shadow for structure
    shadowWidthRatio: 0.5,
    shadowHeightRatio: 0.2,
  },
  {
    tileType: TileType.MAGICAL_LAKE,
    spriteWidth: 12, // 12 tiles wide (large magical lake)
    spriteHeight: 12, // 12 tiles tall (square aspect ratio - source image is 3000x3000)
    offsetX: -6, // Center horizontally on anchor tile
    offsetY: -6, // Center vertically on anchor tile
    image: tileAssets.magical_lake,
    // Collision covers most of the lake (10x10 inner area, leaving 1-tile walkable shore)
    collisionWidth: 10,
    collisionHeight: 2,
    collisionOffsetX: -6,
    collisionOffsetY: 0,
    // No transforms - this is a unique magical feature
    enableFlip: false,
    enableRotation: false,
    enableScale: false,
    enableBrightness: false,
  },
  {
    tileType: TileType.SMALL_LAKE,
    spriteWidth: 4, // 4 tiles wide (smaller pond)
    spriteHeight: 4, // 4 tiles tall (square aspect ratio)
    offsetX: -2, // Center horizontally on anchor tile
    offsetY: -2, // Center vertically on anchor tile
    image: tileAssets.forest_pond_spring_summer, // Default image (overridden by seasonalImages in TILE_LEGEND)
    // Collision covers inner area (3x3), leaving walkable shore
    collisionWidth: 3,
    collisionHeight: 1,
    collisionOffsetX: -1.5,
    collisionOffsetY: 0,
    // No transforms
    enableFlip: false,
    enableRotation: false,
    enableScale: false,
    enableBrightness: false,
  },
];
