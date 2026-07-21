/**
 * Wreath Making mini-game — shared constants.
 *
 * Sizing, stepping, materials and palette values used across the workshop
 * component, its sub-panels and the offscreen image capture.
 */

import type { CSSProperties } from 'react';

/** Minimum number of placed flowers before a wreath can be created. */
export const MIN_FLOWERS = 4;

/** Base size for flower images before scaling (px). */
export const FLOWER_BASE_SIZE = 80;

export const DEFAULT_SCALE = 2.2;
export const MIN_SCALE = 0.5;
export const MAX_SCALE = 3.0;
export const SCALE_STEP = 0.15;
export const ROTATION_STEP = 15;

/** Minimum drag distance (px) before treating as a drag instead of a click. */
export const DRAG_THRESHOLD = 4;

/** Default crop zoom (1 = full image, no crop). */
export const DEFAULT_CROP_ZOOM = 1;
/** Max crop zoom (higher = more zoomed in / tighter crop). */
export const MAX_CROP_ZOOM = 3.0;
export const CROP_ZOOM_STEP = 0.2;
/** Max crop pan offset (px, relative to image centre). */
export const MAX_CROP_PAN = 60;

/** Gallery preview image size. */
export const GALLERY_PREVIEW_SIZE = 200;

// ---------------------------------------------------------------------------
// Wreath canvas dimensions
// ---------------------------------------------------------------------------

/** Visual size of the wreath ring sprite (unchanged). */
export const WREATH_RING_SIZE = 280;

/** Full placement canvas size — ring is centred inside with 100px breathing room. */
export const WREATH_CANVAS_SIZE = 480;

/** Pixel offset to centre the ring inside the canvas. */
export const WREATH_RING_OFFSET = (WREATH_CANVAS_SIZE - WREATH_RING_SIZE) / 2;

/** Target outer width of the workshop modal. */
export const TARGET_WORKSHOP_WIDTH = 1100;

// ---------------------------------------------------------------------------
// Materials & palette
// ---------------------------------------------------------------------------

/** All item IDs that can be used as wreath materials. */
export const WREATH_MATERIALS = [
  'moonpetal',
  'addersmeat',
  'frost_flower',
  'sakura_petal',
  'shrinking_violet',
  'wolfsbane',
  'crop_sunflower',
  'crop_strawberry',
  'crop_blackberry',
  'crop_blueberry',
  'rose_red_crop',
  'rose_crop',
  'feather',
  'crop_chili',
  'crop_onion',
  'vanilla',
  'dragonfly_wings',
  'ghost_lichen',
  'crop_lavender',
  'heather_sprig',
  'straw',
  'red_berries',
  'crop_mint',
  'spruce_sprig',
  'maple_leaf',
  'decoration_velvet_bow',
] as const;

/** Visual colour associated with each flower for the slot border. */
export const FLOWER_COLOURS: Record<string, string> = {
  moonpetal: '#c4b5fd',
  addersmeat: '#f87171',
  frost_flower: '#a5f3fc',
  sakura_petal: '#fda4af',
  shrinking_violet: '#a78bfa',
  wolfsbane: '#818cf8',
  crop_sunflower: '#fbbf24',
  crop_strawberry: '#f43f5e',
  crop_blackberry: '#7c3aed',
  crop_blueberry: '#3b82f6',
  rose_red_crop: '#ef4444',
  rose_crop: '#f9a8d4',
  feather: '#e2e8f0',
  crop_chili: '#dc2626',
  crop_onion: '#d97706',
  vanilla: '#d4b896',
  dragonfly_wings: '#22d3ee',
  ghost_lichen: '#94a3b8',
  crop_lavender: '#b19cd9',
  heather_sprig: '#9b6dbd',
  straw: '#d4a843',
  red_berries: '#c0392b',
  crop_mint: '#6ee7b7',
  spruce_sprig: '#4d8a52',
  maple_leaf: '#d97706',
  decoration_velvet_bow: '#9b2335',
};

/** Shared style for the round zoom/size buttons. */
export const ZOOM_BTN: CSSProperties = {
  width: 26,
  height: 26,
  borderRadius: '50%',
  border: '1px solid #5a7a4a',
  background: '#2a3a22',
  color: '#e0e8d0',
  cursor: 'pointer',
  fontSize: 16,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0,
};
