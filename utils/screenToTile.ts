/**
 * Screen-to-Tile Coordinate Conversion
 *
 * Single source of truth for converting screen (pixel) coordinates
 * to game world tile coordinates. Used by both useMouseControls (click)
 * and useMouseHover (hover highlight).
 */

import { TILE_SIZE } from '../constants';

export interface TileCoordResult {
  /** World position in tile units (float precision) */
  worldX: number;
  worldY: number;
  /** Floored tile coordinates */
  tileX: number;
  tileY: number;
}

/**
 * Convert screen-relative pixel coordinates to tile coordinates.
 *
 * For standard tiled rooms: reverses scale(zoom) * translate(-cameraX, -cameraY)
 * For background-image rooms: reverses zoom and grid centering offset
 *
 * @param screenX - X position relative to game container (pixels)
 * @param screenY - Y position relative to game container (pixels)
 * @param zoom - Current zoom level (CSS / PixiJS scale factor)
 * @param cameraX - Camera X offset in world pixels (standard rooms)
 * @param cameraY - Camera Y offset in world pixels (standard rooms)
 * @param gridOffset - Grid centering offset for background-image rooms
 * @param effectiveTileSize - Scaled tile size for background-image rooms
 */
export function screenToTile(
  screenX: number,
  screenY: number,
  zoom: number,
  cameraX: number,
  cameraY: number,
  gridOffset?: { x: number; y: number },
  effectiveTileSize?: number
): TileCoordResult {
  let worldX: number;
  let worldY: number;

  if (gridOffset && effectiveTileSize) {
    // Background-image rooms: grid rendered at effectiveTileSize with gridOffset centering
    worldX = (screenX / zoom - gridOffset.x) / effectiveTileSize;
    worldY = (screenY / zoom - gridOffset.y) / effectiveTileSize;
  } else {
    // Standard tiled rooms: camera scrolling, standard TILE_SIZE
    const worldPixelX = screenX / zoom + cameraX;
    const worldPixelY = screenY / zoom + cameraY;
    worldX = worldPixelX / TILE_SIZE;
    worldY = worldPixelY / TILE_SIZE;
  }

  return {
    worldX,
    worldY,
    tileX: Math.floor(worldX),
    tileY: Math.floor(worldY),
  };
}
