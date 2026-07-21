/**
 * Wreath Making mini-game — flower image lookup and pointer helpers.
 */

import { WREATH_CANVAS_SIZE } from './wreathConstants';
import { getItem } from '../../data/items';
import { herbAssets } from '../../assets';

// ---------------------------------------------------------------------------
// Flower image helpers
// ---------------------------------------------------------------------------

/** Per-item image overrides for the wreath mini-game (used when the default item image doesn't suit the small slot). */
const WREATH_IMAGE_OVERRIDES: Record<string, string> = {
  crop_lavender: herbAssets.lavender_sprig,
  crop_mint: herbAssets.mint_sprig,
};

export function getFlowerImage(itemId: string): string | null {
  if (WREATH_IMAGE_OVERRIDES[itemId]) return WREATH_IMAGE_OVERRIDES[itemId];
  const item = getItem(itemId);
  return (item?.image as string) ?? null;
}

// ---------------------------------------------------------------------------
// Client-position helper
// ---------------------------------------------------------------------------

export function getClientPos(
  e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent
): { x: number; y: number } | null {
  if ('touches' in e) {
    const touch = e.touches[0] ?? (e as TouchEvent).changedTouches?.[0];
    if (!touch) return null;
    return { x: touch.clientX, y: touch.clientY };
  }
  return { x: (e as MouseEvent).clientX, y: (e as MouseEvent).clientY };
}

/**
 * Effective on-screen scale of the wreath canvas.
 *
 * The workshop shrinks itself with `transform: scale()` on narrow viewports, and
 * `getBoundingClientRect()` reports POST-transform dimensions. Pointer offsets taken from
 * that rect are therefore in screen pixels while slot coordinates are in unscaled canvas
 * pixels — so without dividing by this, clicks and drags drift proportionally to how narrow
 * the window is. Always below 1 on an iPad, always exactly 1 on a wide desktop, which is why
 * it is invisible in normal development.
 *
 * Derived from the rect rather than the scale state so it stays correct no matter what else
 * ends up transforming an ancestor.
 */
export function getCanvasScale(rect: DOMRect): number {
  return rect.width > 0 ? rect.width / WREATH_CANVAS_SIZE : 1;
}

/** Convert a client (screen) point into unscaled wreath-canvas coordinates. */
export function toCanvasCoords(
  clientX: number,
  clientY: number,
  rect: DOMRect
): { x: number; y: number } {
  const scale = getCanvasScale(rect);
  return {
    x: (clientX - rect.left) / scale,
    y: (clientY - rect.top) / scale,
  };
}
