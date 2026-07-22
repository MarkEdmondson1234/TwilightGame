/**
 * Wreath Making mini-game — shared types and slot factory.
 */

import { DEFAULT_CROP_ZOOM, DEFAULT_SCALE } from './wreathConstants';

// ---------------------------------------------------------------------------
// Per-slot state
// ---------------------------------------------------------------------------

export interface SlotData {
  itemId: string;
  /** Absolute X position (centre) within the wreath canvas (px). */
  x: number;
  /** Absolute Y position (centre) within the wreath canvas (px). */
  y: number;
  /** Scale multiplier for the flower image. */
  scale: number;
  /** Crop: horizontal pan within image (px from centre). */
  cropX: number;
  /** Crop: vertical pan within image (px from centre). */
  cropY: number;
  /** Crop zoom (1 = full image, >1 = zoomed in / cropped tighter). */
  cropZoom: number;
  /** Rotation in degrees (clockwise). */
  rotation: number;
  /** Mirror horizontally. */
  flipH: boolean;
  /** Mirror vertically. */
  flipV: boolean;
}

/** A flower available in the player's inventory for placing on the wreath. */
export interface AvailableFlower {
  itemId: string;
  displayName: string;
  available: number;
}

/** Create a new SlotData with defaults. */
export function makeSlot(
  itemId: string,
  x: number,
  y: number,
  overrides?: Partial<SlotData>
): SlotData {
  return {
    itemId,
    x,
    y,
    scale: DEFAULT_SCALE,
    cropX: 0,
    cropY: 0,
    cropZoom: DEFAULT_CROP_ZOOM,
    rotation: 0,
    flipH: false,
    flipV: false,
    ...overrides,
  };
}
