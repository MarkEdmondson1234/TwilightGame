/**
 * Sprite Variant Selection Utilities
 *
 * Provides deterministic hash-based selection for sprite variants.
 * Ensures the same position always gets the same variant (no flickering).
 *
 * Used by:
 * - TileLayer: Selecting tile image variants
 * - SpriteLayer: Selecting multi-tile sprite variants
 */

/**
 * Select a variant index using deterministic position-based hash.
 * Same (x, y) position always returns same index.
 *
 * @param x - X coordinate
 * @param y - Y coordinate
 * @param variantCount - Number of variants to choose from
 * @returns Index from 0 to variantCount-1
 */
export function selectVariant(x: number, y: number, variantCount: number): number {
  if (variantCount <= 1) return 0;
  const hash = Math.abs(Math.sin(x * 99.123 + y * 45.678) * 12345.6789);
  return Math.floor((hash % 1) * variantCount);
}

/**
 * Get a deterministic hash value for a position (0 to 1).
 * Useful for probability checks (e.g., "show grass tuft 30% of tiles").
 *
 * @param x - X coordinate
 * @param y - Y coordinate
 * @returns Value between 0 and 1 (exclusive)
 */
export function getPositionHash(x: number, y: number): number {
  const hash = Math.abs(Math.sin(x * 12.9898 + y * 78.233) * 43758.5453);
  return hash % 1;
}

/**
 * Select from an array using deterministic position-based hash.
 * Convenience wrapper that handles empty arrays safely.
 *
 * @param x - X coordinate
 * @param y - Y coordinate
 * @param array - Array of items to select from
 * @returns Selected item, or undefined if array is empty
 */
export function selectFromArray<T>(x: number, y: number, array: T[]): T | undefined {
  if (!array || array.length === 0) return undefined;
  if (array.length === 1) return array[0];
  return array[selectVariant(x, y, array.length)];
}
