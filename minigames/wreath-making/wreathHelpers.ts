/**
 * Wreath Making mini-game — flower image lookup and pointer helpers.
 */

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
