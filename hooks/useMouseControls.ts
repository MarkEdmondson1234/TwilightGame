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
        console.log('[Mouse Controls] Hook initialized, enabled:', enabled);

        const container = containerRef.current;
        if (!container) {
            console.warn('[Mouse Controls] Container ref is null');
            return;
        }

        if (!enabled) {
            console.log('[Mouse Controls] Mouse controls disabled');
            return;
        }

        const handleClick = (e: MouseEvent) => {
            console.log('[Mouse Controls] Click detected!');

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

            console.log(`[Mouse Click] Screen: (${screenX}, ${screenY}), World: (${worldTileX.toFixed(2)}, ${worldTileY.toFixed(2)}), Tile: (${clickInfo.tilePos.x}, ${clickInfo.tilePos.y})`);

            onCanvasClick(clickInfo);
        };

        console.log('[Mouse Controls] Adding click listener to container');
        container.addEventListener('click', handleClick);

        return () => {
            console.log('[Mouse Controls] Removing click listener');
            container.removeEventListener('click', handleClick);
        };
    }, [containerRef, cameraX, cameraY, onCanvasClick, enabled]);
}
