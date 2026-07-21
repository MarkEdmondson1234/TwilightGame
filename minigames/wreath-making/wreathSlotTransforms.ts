/**
 * Wreath Making mini-game — pure per-slot transforms.
 *
 * Each function takes a slot and returns a new slot with one property changed,
 * already clamped to its legal range. Keeping these pure and free of React
 * means the placement rules can be read (and tested) on their own.
 */

import {
  DEFAULT_CROP_ZOOM,
  MAX_CROP_PAN,
  MAX_CROP_ZOOM,
  MAX_SCALE,
  MIN_SCALE,
} from './wreathConstants';
import type { SlotData } from './wreathTypes';

/** Resize the flower, clamped between MIN_SCALE and MAX_SCALE. */
export function withScaleDelta(slot: SlotData, delta: number): SlotData {
  return { ...slot, scale: Math.max(MIN_SCALE, Math.min(MAX_SCALE, slot.scale + delta)) };
}

/** Tighten or loosen the circular crop, clamped to the legal zoom range. */
export function withCropZoomDelta(slot: SlotData, delta: number): SlotData {
  return {
    ...slot,
    cropZoom: Math.max(DEFAULT_CROP_ZOOM, Math.min(MAX_CROP_ZOOM, slot.cropZoom + delta)),
  };
}

/** Clear any crop pan and zoom, restoring the full image. */
export function withCropReset(slot: SlotData): SlotData {
  return { ...slot, cropX: 0, cropY: 0, cropZoom: DEFAULT_CROP_ZOOM };
}

/** Rotate by `delta` degrees, normalised into 0–359. */
export function withRotationDelta(slot: SlotData, delta: number): SlotData {
  return { ...slot, rotation: (((slot.rotation + delta) % 360) + 360) % 360 };
}

export function withRotationReset(slot: SlotData): SlotData {
  return { ...slot, rotation: 0 };
}

/** Mirror the flower on the given axis. */
export function withFlip(slot: SlotData, axis: 'h' | 'v'): SlotData {
  return axis === 'h' ? { ...slot, flipH: !slot.flipH } : { ...slot, flipV: !slot.flipV };
}

/** Move the flower to an absolute canvas position. */
export function withPosition(slot: SlotData, x: number, y: number): SlotData {
  return { ...slot, x, y };
}

/** Pan the crop window within the image, clamped to MAX_CROP_PAN in both axes. */
export function withCropPan(slot: SlotData, cropX: number, cropY: number): SlotData {
  return {
    ...slot,
    cropX: Math.max(-MAX_CROP_PAN, Math.min(MAX_CROP_PAN, cropX)),
    cropY: Math.max(-MAX_CROP_PAN, Math.min(MAX_CROP_PAN, cropY)),
  };
}
