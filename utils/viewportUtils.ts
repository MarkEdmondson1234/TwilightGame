/**
 * Viewport Utilities
 *
 * Provides common viewport calculations for PixiJS layers.
 * Used for viewport culling and scan area determination.
 */

/**
 * Visible range from camera system
 */
export interface VisibleRange {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

/**
 * Calculated scan bounds for rendering
 */
export interface ScanBounds {
  startX: number;
  endX: number;
  startY: number;
  endY: number;
}

/**
 * Calculate the tile scan area with margin for large sprites.
 * Large sprites (like witch hut 16x16) need extra search area so their anchor
 * tiles are found even when the anchor is outside visible range but sprite extends into it.
 *
 * @param visibleRange - Camera visible range in tile coordinates
 * @param mapWidth - Map width in tiles
 * @param mapHeight - Map height in tiles
 * @param margin - Extra tiles to scan beyond visible range (default 0)
 * @returns Clamped scan bounds
 */
export function calculateScanBounds(
  visibleRange: VisibleRange,
  mapWidth: number,
  mapHeight: number,
  margin: number = 0
): ScanBounds {
  return {
    startX: Math.max(0, visibleRange.minX - margin),
    endX: Math.min(mapWidth - 1, visibleRange.maxX + margin),
    startY: Math.max(0, visibleRange.minY - margin),
    endY: Math.min(mapHeight - 1, visibleRange.maxY + margin),
  };
}

/**
 * Calculate margin needed for multi-tile sprites based on max sprite size.
 *
 * @param maxSpriteSize - Maximum sprite dimension in tiles
 * @param buffer - Additional buffer tiles (default 2)
 * @returns Margin in tiles
 */
export function calculateSpriteMargin(maxSpriteSize: number, buffer: number = 2): number {
  return Math.ceil(maxSpriteSize / 2) + buffer;
}

/**
 * Check if a tile position is within visible range.
 *
 * @param x - Tile X coordinate
 * @param y - Tile Y coordinate
 * @param visibleRange - Camera visible range
 * @returns True if position is visible
 */
export function isInViewport(x: number, y: number, visibleRange: VisibleRange): boolean {
  return x >= visibleRange.minX &&
         x <= visibleRange.maxX &&
         y >= visibleRange.minY &&
         y <= visibleRange.maxY;
}
