/**
 * Mouse Controls Hook
 * Handles mouse click interactions for the game
 */

import { useEffect, useRef, MutableRefObject } from 'react';
import { Position } from '../types';
import { TILE_SIZE } from '../constants';

export interface MouseClickInfo {
    /** World position in tile coordinates */
    worldPos: Position;
    /** Screen position in pixels */
    screenPos: { x: number; y: number };
    /** Tile coordinates (floored) */
    tilePos: { x: number; y: number };
}

export interface MouseControlsConfig {
    /** Reference to the game container element */
    containerRef: MutableRefObject<HTMLDivElement | null>;
    /** Current camera position (in pixels) */
    cameraX: number;
    cameraY: number;
    /** Callback when canvas is clicked */
    onCanvasClick: (clickInfo: MouseClickInfo) => void;
    /** Whether to enable mouse controls */
    enabled: boolean;
}

export function useMouseControls(config: MouseControlsConfig) {
    const { containerRef, cameraX, cameraY, onCanvasClick, enabled } = config;

    useEffect(() => {
        const container = containerRef.current;
        if (!container || !enabled) {
            return;
        }

        const handleClick = (e: MouseEvent) => {
            // Get click position relative to container
            const rect = container.getBoundingClientRect();
            const screenX = e.clientX - rect.left;
            const screenY = e.clientY - rect.top;

            // Convert screen coordinates to world coordinates (in pixels)
            const worldPixelX = screenX + cameraX;
            const worldPixelY = screenY + cameraY;

            // Convert to tile coordinates
            const worldTileX = worldPixelX / TILE_SIZE;
            const worldTileY = worldPixelY / TILE_SIZE;

            const clickInfo: MouseClickInfo = {
                worldPos: { x: worldTileX, y: worldTileY },
                screenPos: { x: e.clientX, y: e.clientY },
                tilePos: { x: Math.floor(worldTileX), y: Math.floor(worldTileY) },
            };

            onCanvasClick(clickInfo);
        };

        container.addEventListener('click', handleClick);

        return () => {
            container.removeEventListener('click', handleClick);
        };
    }, [containerRef, cameraX, cameraY, onCanvasClick, enabled]);
}
