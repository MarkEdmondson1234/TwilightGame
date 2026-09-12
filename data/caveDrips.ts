import { TileType } from '../types';

/** Already rendered at game resolution; do not run the general image resizer on this atlas. */
export const CAVE_DRIP = {
  frameWidth: 128,
  frameHeight: 256,
  columns: 8,
  frames: 24,
  frameMs: 1000 / 12,
  cycleMs: 6700,
  cycleVariationMs: 2700,
  opacity: 0.55,
} as const;

/** Effect rectangle in fractions of the unchanged, square painted sprite. */
const COLUMN_DRIP = { centreX: 0.72, top: 0.61, height: 0.3 };
const POOL_DRIP = { centreX: 0.53, top: 0.13, height: 0.6 };
export const CAVE_DRIP_PLACEMENTS = new Map([
  [TileType.STONE_COLUMN_SM, COLUMN_DRIP],
  [TileType.STONE_COLUMN_MD, COLUMN_DRIP],
  [TileType.STONE_COLUMN_LG, COLUMN_DRIP],
  [TileType.CAVE_LAKE_SM, POOL_DRIP],
  [TileType.CAVE_LAKE_MD, POOL_DRIP],
  [TileType.CAVE_LAKE_LG, POOL_DRIP],
]);

/** A long quiet interval between drops; phase depends on the map and anchor, not render order. */
export function caveDripFrame(now: number, seed: number): number | null {
  const cycle = CAVE_DRIP.cycleMs + seed % CAVE_DRIP.cycleVariationMs;
  const elapsed = (now + seed % cycle) % cycle;
  const frame = Math.floor(elapsed / CAVE_DRIP.frameMs);
  return frame < CAVE_DRIP.frames ? frame : null;
}
