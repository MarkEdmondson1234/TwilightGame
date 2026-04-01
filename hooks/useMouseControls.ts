/**
 * Mouse Controls Hook
 * Handles mouse click and touch interactions for click-to-move and click-to-interact
 *
 * Uses refs for frequently-changing values (camera, zoom) to avoid
 * recreating event listeners on every frame during movement.
 */

import { useEffect, useRef, useState, MutableRefObject } from 'react';
import { Position } from '../types';
import { Z_HUD } from '../zIndex';
import { screenToTile } from '../utils/screenToTile';

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
  /** Current zoom level (CSS scale factor) */
  zoom: number;
  /** Callback when canvas is clicked */
  onCanvasClick: (clickInfo: MouseClickInfo) => void;
  /** Whether to enable mouse controls (touch always enabled for click-to-move) */
  enabled: boolean;
  /** Effective tile size for background-image rooms (includes viewport + layer scale) */
  effectiveTileSize?: number;
  /** Grid offset for background-image rooms (centers grid on viewport) */
  gridOffset?: { x: number; y: number };
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

/**
 * Check if the click position overlaps a UI overlay (above game world).
 *
 * Previous approach only inspected e.target's ancestor chain, which missed
 * HUD containers that use pointer-events:none (clicks fall through to the
 * canvas, so e.target is the canvas — not the HUD).
 *
 * Now uses document.elementsFromPoint to check ALL elements stacked at the
 * click position regardless of pointer-events, catching any UI layer with
 * z-index >= Z_HUD.
 */
function isUIElement(element: EventTarget | null, clientX?: number, clientY?: number): boolean {
  if (!element || !(element instanceof HTMLElement)) return false;

  // Class-based detection on the direct target (fast path)
  if (isTouchControlElement(element)) return true;

  // If we have screen coordinates, check every element at that point
  if (clientX !== undefined && clientY !== undefined) {
    const elementsAtPoint = document.elementsFromPoint(clientX, clientY);
    for (const el of elementsAtPoint) {
      if (!(el instanceof HTMLElement)) continue;

      // Class-based check
      if (
        el.classList.contains('hud-element') ||
        el.classList.contains('inventory-bar') ||
        el.classList.contains('touch-controls') ||
        el.dataset.touchControl === 'true'
      ) {
        return true;
      }

      // z-index check — anything at HUD level or above is UI
      const style = window.getComputedStyle(el);
      const zIndex = parseInt(style.zIndex, 10);
      if (!isNaN(zIndex) && zIndex >= Z_HUD) {
        return true;
      }
    }
    return false;
  }

  // Fallback: walk ancestor chain (no coordinates available)
  let el: HTMLElement | null = element;
  while (el) {
    const style = window.getComputedStyle(el);
    const zIndex = parseInt(style.zIndex, 10);
    if (!isNaN(zIndex) && zIndex >= Z_HUD) {
      return true;
    }
    el = el.parentElement;
  }

  return false;
}

export function useMouseControls(config: MouseControlsConfig) {
  const {
    containerRef,
    cameraX,
    cameraY,
    zoom,
    onCanvasClick,
    enabled,
    effectiveTileSize,
    gridOffset,
  } = config;

  // Store frequently-changing values in refs to avoid re-creating listeners
  // every frame. Event handlers read from refs at call time.
  const cameraXRef = useRef(cameraX);
  const cameraYRef = useRef(cameraY);
  const zoomRef = useRef(zoom);
  const effectiveTileSizeRef = useRef(effectiveTileSize);
  const gridOffsetRef = useRef(gridOffset);
  const onCanvasClickRef = useRef(onCanvasClick);

  // Track when the container DOM element becomes available.
  // On first render the game shows "Loading map..." so the container div
  // doesn't exist yet. This state flips to true once the ref is populated,
  // causing the useEffect to re-run and attach event listeners.
  const [containerReady, setContainerReady] = useState(!!containerRef.current);
  if (!containerReady && containerRef.current) {
    setContainerReady(true);
  }

  // Update refs on every render (cheap assignment, no effect re-run)
  cameraXRef.current = cameraX;
  cameraYRef.current = cameraY;
  zoomRef.current = zoom;
  effectiveTileSizeRef.current = effectiveTileSize;
  gridOffsetRef.current = gridOffset;
  onCanvasClickRef.current = onCanvasClick;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    /**
     * Convert screen coordinates to click info using refs for latest values
     */
    const createClickInfo = (
      screenX: number,
      screenY: number,
      clientX: number,
      clientY: number
    ): MouseClickInfo => {
      const result = screenToTile(
        screenX,
        screenY,
        zoomRef.current,
        cameraXRef.current,
        cameraYRef.current,
        gridOffsetRef.current,
        effectiveTileSizeRef.current
      );

      return {
        worldPos: { x: result.worldX, y: result.worldY },
        screenPos: { x: clientX, y: clientY },
        tilePos: { x: result.tileX, y: result.tileY },
      };
    };

    /**
     * Handle mouse click (for non-touch devices)
     */
    const handleClick = (e: MouseEvent) => {
      if (!enabled) return;

      // Check if click is on a UI element (HUD, modal, etc.)
      if (isUIElement(e.target, e.clientX, e.clientY)) {
        return;
      }

      const rect = container.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;

      const clickInfo = createClickInfo(screenX, screenY, e.clientX, e.clientY);
      onCanvasClickRef.current(clickInfo);
    };

    /**
     * Handle touch end (for touch devices - enables click-to-move on iPad)
     */
    const handleTouchEnd = (e: TouchEvent) => {
      // Ignore touches on UI elements (HUD, modal, etc.)
      const touch = e.changedTouches[0];
      if (!touch) return;
      if (isUIElement(e.target, touch.clientX, touch.clientY)) {
        return;
      }

      const rect = container.getBoundingClientRect();
      const screenX = touch.clientX - rect.left;
      const screenY = touch.clientY - rect.top;

      const clickInfo = createClickInfo(screenX, screenY, touch.clientX, touch.clientY);
      onCanvasClickRef.current(clickInfo);
    };

    // Mouse click only when enabled (non-touch devices)
    if (enabled) {
      container.addEventListener('click', handleClick);
    }

    // Touch always enabled for click-to-move on iPad
    // Use passive: true to avoid blocking scroll/touch for 100-300ms on iOS
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('click', handleClick);
      container.removeEventListener('touchend', handleTouchEnd);
    };
    // Only depend on stable values — camera/zoom/callbacks read from refs
    // containerReady triggers re-run when the game container mounts after loading
  }, [containerRef, enabled, containerReady]);
}
