import { useMemo } from 'react';
import { TILE_SIZE } from '../constants';

interface ViewportCullingConfig {
  cameraX: number;
  cameraY: number;
  mapWidth: number;
  mapHeight: number;
  viewportWidth?: number;
  viewportHeight?: number;
  margin?: number; // Extra tiles to render beyond viewport (for sprites that extend beyond tiles)
  /** User zoom level (default 1.0). Zooming out shows more tiles. */
  zoom?: number;
}

interface VisibleTileRange {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

/**
 * Hook for viewport culling calculations
 * Returns the range of visible tiles to optimize rendering performance
 * Accounts for zoom — zooming out reveals more tiles
 */
export function useViewportCulling(config: ViewportCullingConfig): VisibleTileRange {
  const {
    cameraX,
    cameraY,
    mapWidth,
    mapHeight,
    viewportWidth = window.innerWidth,
    viewportHeight = window.innerHeight,
    margin = 1,
    zoom = 1.0,
  } = config;

  const visibleRange = useMemo(() => {
    // Effective viewport accounts for zoom — zoomed out means more visible area
    const effectiveWidth = viewportWidth / zoom;
    const effectiveHeight = viewportHeight / zoom;

    const minX = Math.max(0, Math.floor(cameraX / TILE_SIZE) - margin);
    const maxX = Math.min(mapWidth - 1, Math.ceil((cameraX + effectiveWidth) / TILE_SIZE) + margin);
    const minY = Math.max(0, Math.floor(cameraY / TILE_SIZE) - margin);
    const maxY = Math.min(
      mapHeight - 1,
      Math.ceil((cameraY + effectiveHeight) / TILE_SIZE) + margin
    );

    return { minX, maxX, minY, maxY };
  }, [cameraX, cameraY, mapWidth, mapHeight, viewportWidth, viewportHeight, margin, zoom]);

  return visibleRange;
}
