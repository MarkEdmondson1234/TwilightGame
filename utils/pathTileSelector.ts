import { TileType } from '../types';
import { tileAssets } from '../assets';
import { mapManager } from '../maps/MapManager';

/**
 * Selects the appropriate path tile sprite based on neighboring path tiles.
 * This creates a smart path system that automatically uses curves, ends, and straights.
 * Returns both the image path and optional rotation angle.
 */
export function getPathTileImage(x: number, y: number): { image: string; rotation: number } {

  // Check neighbors (up, down, left, right)
  const hasPathUp = mapManager.getTileAt(x, y - 1) === TileType.PATH;
  const hasPathDown = mapManager.getTileAt(x, y + 1) === TileType.PATH;
  const hasPathLeft = mapManager.getTileAt(x - 1, y) === TileType.PATH;
  const hasPathRight = mapManager.getTileAt(x + 1, y) === TileType.PATH;

  // Count connections
  const connections = [hasPathUp, hasPathDown, hasPathLeft, hasPathRight].filter(Boolean).length;

  // Single tile or isolated path - use horizontal
  if (connections === 0) {
    return { image: tileAssets.path_horizontal, rotation: 0 };
  }

  // Path end tiles
  if (connections === 1) {
    if (hasPathRight) return { image: tileAssets.path_end_left, rotation: 0 };
    if (hasPathLeft) return { image: tileAssets.path_end_right, rotation: 0 };
    if (hasPathDown) return { image: tileAssets.path_end_left, rotation: 90 }; // Rotate end for vertical
    if (hasPathUp) return { image: tileAssets.path_end_right, rotation: 90 }; // Rotate end for vertical
  }

  // Curve tiles (2 connections at 90 degrees)
  if (connections === 2) {
    // Bottom-left corner (path from bottom going right) - use bottom_to_right curve
    if (hasPathDown && hasPathRight) return { image: tileAssets.path_curve_bottom_to_right, rotation: 0 };
    // Top-left corner (path from top going right) - use top_to_right curve
    if (hasPathUp && hasPathRight) return { image: tileAssets.path_curve_top_to_right, rotation: 0 };
    // Top-right corner (path from top going left) - use left_to_top curve
    if (hasPathUp && hasPathLeft) return { image: tileAssets.path_curve_left_to_top, rotation: 0 };
    // Bottom-right corner (path from bottom going left) - use left_to_bottom curve
    if (hasPathDown && hasPathLeft) return { image: tileAssets.path_curve_left_to_bottom, rotation: 0 };

    // Straight paths (opposite sides)
    if (hasPathUp && hasPathDown) return { image: tileAssets.path_horizontal, rotation: 90 }; // Rotate horizontal for vertical
    if (hasPathLeft && hasPathRight) return { image: tileAssets.path_horizontal, rotation: 0 };
  }

  // 3 or 4 connections (T-junction or cross) - use horizontal as default
  return { image: tileAssets.path_horizontal, rotation: 0 };
}
