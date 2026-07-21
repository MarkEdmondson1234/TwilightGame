/**
 * Wreath Making mini-game — offscreen image capture.
 *
 * Renders the finished arrangement to a detached canvas so the wreath can be
 * stored as a decoration image (like paintings) and shown in the inventory.
 */

import { tileAssets } from '../../assets';
import {
  FLOWER_BASE_SIZE,
  WREATH_CANVAS_SIZE,
  WREATH_RING_OFFSET,
  WREATH_RING_SIZE,
} from './wreathConstants';
import { getFlowerImage } from './wreathHelpers';
import type { SlotData } from './wreathTypes';

/** Size of the capture canvas (px). */
export const CAPTURE_SIZE = 512;

/**
 * Where the ring sprite goes on the capture canvas, in capture pixels.
 *
 * Exported so the geometry can be asserted without a canvas — it regressed once already:
 * the ring was drawn full-bleed while flowers used canvas-space coords, which scaled the
 * ring ~1.7x relative to them.
 */
export function ringDrawRect(scale: number): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  return {
    x: WREATH_RING_OFFSET * scale,
    y: WREATH_RING_OFFSET * scale,
    width: WREATH_RING_SIZE * scale,
    height: WREATH_RING_SIZE * scale,
  };
}

/**
 * Render the wreath to an offscreen canvas and return a base64 PNG data URL.
 * Draws the ring + all placed flowers at their scaled positions.
 */
export async function captureWreathImage(slots: SlotData[]): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = CAPTURE_SIZE;
  canvas.height = CAPTURE_SIZE;
  const ctx = canvas.getContext('2d')!;

  // Scale factor from wreath-area coords → capture canvas
  const scale = CAPTURE_SIZE / WREATH_CANVAS_SIZE;

  // Load all flower images first
  const loadImage = (src: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });

  // Draw the wreath base sprite
  try {
    const baseImg = await loadImage(tileAssets.wreath_base);
    // The ring occupies the centred WREATH_RING_SIZE box, NOT the whole canvas — the canvas
    // is larger so flowers can sit outside the ring. Drawing it full-bleed here (which it
    // did until this fix) makes the ring ~1.7x too large relative to the flowers, so a
    // wreath decorated ON the ring came out with its flowers floating inside it.
    const ring = ringDrawRect(scale);
    ctx.drawImage(baseImg, ring.x, ring.y, ring.width, ring.height);
  } catch {
    // Fallback: draw a plain ring if the sprite fails to load
    ctx.beginPath();
    ctx.arc(
      (WREATH_CANVAS_SIZE / 2) * scale,
      (WREATH_CANVAS_SIZE / 2) * scale,
      (WREATH_RING_SIZE / 2) * 0.7 * scale,
      0,
      Math.PI * 2
    );
    ctx.lineWidth = 14 * scale;
    ctx.strokeStyle = '#3a5a2a';
    ctx.stroke();
  }

  // Draw each placed flower
  for (const slot of slots) {
    const imageUrl = getFlowerImage(slot.itemId);
    if (!imageUrl) continue;

    try {
      const img = await loadImage(imageUrl);
      const flowerSize = FLOWER_BASE_SIZE * slot.scale;
      const cx = slot.x * scale;
      const cy = slot.y * scale;
      const size = flowerSize * scale;
      ctx.save();
      // Apply rotation + flip transforms around the flower centre
      ctx.translate(cx, cy);
      ctx.rotate((slot.rotation * Math.PI) / 180);
      ctx.scale(slot.flipH ? -1 : 1, slot.flipV ? -1 : 1);
      ctx.translate(-cx, -cy);

      if (slot.cropZoom > 1) {
        // Draw with circular clip — mirrors the CSS transform approach:
        // scale(cropZoom) translate(cropX, cropY) from image centre
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
        ctx.clip();
        const cropScale = slot.cropZoom;
        const drawSize = size * cropScale;
        const drawX = cx - drawSize / 2 + slot.cropX * cropScale * scale;
        const drawY = cy - drawSize / 2 + slot.cropY * cropScale * scale;
        ctx.drawImage(img, drawX, drawY, drawSize, drawSize);
        ctx.restore();
      } else {
        ctx.drawImage(img, cx - size / 2, cy - size / 2, size, size);
      }

      ctx.restore();
    } catch {
      // Skip flowers that fail to load
    }
  }

  return canvas.toDataURL('image/webp', 0.85);
}
