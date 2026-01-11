/**
 * Mouse Controls Hook
 * Handles mouse click and touch interactions for click-to-move and click-to-interact
 */

import { useEffect, MutableRefObject } from 'react';
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
  /** Whether to enable mouse controls (touch always enabled for click-to-move) */
  enabled: boolean;
}

/**
 * Check if an element is part of the touch controls UI
 * (d-pad, action buttons, etc. that should not trigger click-to-move)
 */
function isTouchControlElement(element: EventTarget | null): boolean {
  if (!element || !(element instanceof HTMLElement)) return false;

  // Check if element or any parent has touch-controls class or data attribute
  let el: HTMLElement | null = element;
  while (el) {
    if (
      el.classList.contains('touch-controls') ||
      el.dataset.touchControl === 'true' ||
      el.classList.contains('hud-element') ||
      el.classList.contains('inventory-bar') ||
      el.closest('[data-touch-control="true"]') ||
      el.closest('.touch-controls') ||
      el.closest('.hud-element') ||
      el.closest('.inventory-bar')
    ) {
      return true;
    }
    el = el.parentElement;
  }
  return false;
}

export function useMouseControls(config: MouseControlsConfig) {
  const { containerRef, cameraX, cameraY, onCanvasClick, enabled } = config;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    /**
     * Convert screen coordinates to click info
     */
    const createClickInfo = (
      screenX: number,
      screenY: number,
      clientX: number,
      clientY: number
    ): MouseClickInfo => {
      // Convert screen coordinates to world coordinates (in pixels)
      const worldPixelX = screenX + cameraX;
      const worldPixelY = screenY + cameraY;

      // Convert to tile coordinates
      const worldTileX = worldPixelX / TILE_SIZE;
      const worldTileY = worldPixelY / TILE_SIZE;

      return {
        worldPos: { x: worldTileX, y: worldTileY },
        screenPos: { x: clientX, y: clientY },
        tilePos: { x: Math.floor(worldTileX), y: Math.floor(worldTileY) },
      };
    };

    /**
     * Handle mouse click (for non-touch devices)
     */
    const handleClick = (e: MouseEvent) => {
      if (!enabled) return;

      const rect = container.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;

      const clickInfo = createClickInfo(screenX, screenY, e.clientX, e.clientY);
      onCanvasClick(clickInfo);
    };

    /**
     * Handle touch end (for touch devices - enables click-to-move on iPad)
     */
    const handleTouchEnd = (e: TouchEvent) => {
      // Ignore touches on UI control elements
      if (isTouchControlElement(e.target)) {
        return;
      }

      // Get the last touch point
      const touch = e.changedTouches[0];
      if (!touch) return;

      const rect = container.getBoundingClientRect();
      const screenX = touch.clientX - rect.left;
      const screenY = touch.clientY - rect.top;

      const clickInfo = createClickInfo(screenX, screenY, touch.clientX, touch.clientY);
      onCanvasClick(clickInfo);
    };

    // Mouse click only when enabled (non-touch devices)
    if (enabled) {
      container.addEventListener('click', handleClick);
    }

    // Touch always enabled for click-to-move on iPad
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('click', handleClick);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [containerRef, cameraX, cameraY, onCanvasClick, enabled]);
}
