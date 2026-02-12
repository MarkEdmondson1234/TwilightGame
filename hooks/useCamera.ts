import { useMemo } from 'react';
import { Position } from '../types';
import { TILE_SIZE } from '../constants';

interface CameraConfig {
  playerPos: Position;
  mapWidth: number;
  mapHeight: number;
  viewportWidth?: number;
  viewportHeight?: number;
  /** Zoom level (default 1.0). Affects effective viewport size. */
  zoom?: number;
}

interface CameraPosition {
  cameraX: number;
  cameraY: number;
}

/**
 * Hook for camera positioning logic
 * Centers small maps, follows player on large maps
 * Accounts for zoom — at zoom 2x the effective viewport is half the screen size
 */
export function useCamera(config: CameraConfig): CameraPosition {
  const {
    playerPos,
    mapWidth,
    mapHeight,
    viewportWidth = window.innerWidth,
    viewportHeight = window.innerHeight,
    zoom = 1.0,
  } = config;

  const camera = useMemo(() => {
    const mapPixelWidth = mapWidth * TILE_SIZE;
    const mapPixelHeight = mapHeight * TILE_SIZE;

    // Effective viewport accounts for zoom — zoomed in means less visible area
    const effectiveWidth = viewportWidth / zoom;
    const effectiveHeight = viewportHeight / zoom;

    let cameraX: number;
    let cameraY: number;

    // If map is smaller than effective viewport, center it
    if (mapPixelWidth < effectiveWidth) {
      cameraX = -(effectiveWidth - mapPixelWidth) / 2;
    } else {
      // Otherwise follow player
      cameraX = Math.min(
        mapPixelWidth - effectiveWidth,
        Math.max(0, playerPos.x * TILE_SIZE - effectiveWidth / 2)
      );
    }

    if (mapPixelHeight < effectiveHeight) {
      cameraY = -(effectiveHeight - mapPixelHeight) / 2;
    } else {
      cameraY = Math.min(
        mapPixelHeight - effectiveHeight,
        Math.max(0, playerPos.y * TILE_SIZE - effectiveHeight / 2)
      );
    }

    return { cameraX, cameraY };
  }, [playerPos, mapWidth, mapHeight, viewportWidth, viewportHeight, zoom]);

  return camera;
}
