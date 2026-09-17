import { useMemo } from 'react';
import { Position } from '../types';
import { computeCameraPosition, type CameraPosition } from '../utils/viewFrame';

interface CameraConfig {
  playerPos: Position;
  mapWidth: number;
  mapHeight: number;
  viewportWidth?: number;
  viewportHeight?: number;
  /** Zoom level (default 1.0). Affects effective viewport size. */
  zoom?: number;
}

/**
 * React wrapper around computeCameraPosition (utils/viewFrame.ts) for
 * components that need the camera as a memoised value.
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

  return useMemo(
    () =>
      computeCameraPosition(playerPos, mapWidth, mapHeight, viewportWidth, viewportHeight, zoom),
    [playerPos, mapWidth, mapHeight, viewportWidth, viewportHeight, zoom]
  );
}
