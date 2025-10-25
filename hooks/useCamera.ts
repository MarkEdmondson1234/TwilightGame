import { useMemo } from 'react';
import { Position } from '../types';
import { TILE_SIZE } from '../constants';

interface CameraConfig {
    playerPos: Position;
    mapWidth: number;
    mapHeight: number;
    viewportWidth?: number;
    viewportHeight?: number;
}

interface CameraPosition {
    cameraX: number;
    cameraY: number;
}

/**
 * Hook for camera positioning logic
 * Centers small maps, follows player on large maps
 */
export function useCamera(config: CameraConfig): CameraPosition {
    const {
        playerPos,
        mapWidth,
        mapHeight,
        viewportWidth = window.innerWidth,
        viewportHeight = window.innerHeight,
    } = config;

    const camera = useMemo(() => {
        const mapPixelWidth = mapWidth * TILE_SIZE;
        const mapPixelHeight = mapHeight * TILE_SIZE;

        let cameraX: number;
        let cameraY: number;

        // If map is smaller than viewport, center it
        if (mapPixelWidth < viewportWidth) {
            cameraX = -(viewportWidth - mapPixelWidth) / 2;
        } else {
            // Otherwise follow player
            cameraX = Math.min(
                mapPixelWidth - viewportWidth,
                Math.max(0, playerPos.x * TILE_SIZE - viewportWidth / 2)
            );
        }

        if (mapPixelHeight < viewportHeight) {
            cameraY = -(viewportHeight - mapPixelHeight) / 2;
        } else {
            cameraY = Math.min(
                mapPixelHeight - viewportHeight,
                Math.max(0, playerPos.y * TILE_SIZE - viewportHeight / 2)
            );
        }

        return { cameraX, cameraY };
    }, [playerPos, mapWidth, mapHeight, viewportWidth, viewportHeight]);

    return camera;
}
