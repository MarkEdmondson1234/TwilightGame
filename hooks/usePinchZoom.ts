import { useCallback, useEffect, useRef, useState } from 'react';

/** Default zoom limits */
export const DEFAULT_MIN_ZOOM = 0.5;
export const DEFAULT_MAX_ZOOM = 2.0;
const DEFAULT_ZOOM = 1.0;

/** Mouse wheel zoom sensitivity (smaller = slower) */
const WHEEL_ZOOM_SPEED = 0.002;

/** Double-tap detection window (ms) */
const DOUBLE_TAP_MS = 300;

interface UsePinchZoomConfig {
  /** Whether zoom is enabled */
  enabled?: boolean;
  /** Minimum zoom level (default 0.5) */
  minZoom?: number;
  /** Maximum zoom level (default 2.0) */
  maxZoom?: number;
}

interface UsePinchZoomResult {
  /** Current zoom level */
  zoom: number;
  /** Reset zoom to 1.0 */
  resetZoom: () => void;
}

export interface ZoomLimits {
  minZoom: number;
  maxZoom: number;
  enabled: boolean;
}

/**
 * Minimum zoom needed so a mapPixelWidth x mapPixelHeight tiled room, once
 * scaled, covers the full given viewport in both axes (like CSS
 * `background-size: cover`) — never below 1 (never asks for a zoom-OUT just
 * because the map happens to be huge; that's what the normal zoom-out range
 * is for).
 *
 * Without this, useCamera's "map smaller than viewport" branch centred the
 * map at 1:1 and left the game's own background colour visible in a border
 * around it whenever a map was smaller than the browser window in some axis,
 * or the window's aspect ratio didn't match the map's — issue #26. Feeding
 * this in as the pinch-zoom minimum (see getZoomLimitsForRoom) means the
 * actual rendered scale always covers the viewport, and useCamera's existing
 * follow-the-player logic — unchanged — naturally makes the cropped overflow
 * pan with the player instead of sitting static.
 */
export function getCoverZoom(
  mapPixelWidth: number,
  mapPixelHeight: number,
  viewportWidth: number,
  viewportHeight: number
): number {
  if (mapPixelWidth <= 0 || mapPixelHeight <= 0) return 1;
  return Math.max(1, viewportWidth / mapPixelWidth, viewportHeight / mapPixelHeight);
}

/**
 * Decides the pinch/wheel zoom limits for the current room.
 *
 * Background-image rooms (interiors) already fit the viewport responsively via
 * `viewportScale`. Letting pinch/wheel zoom apply on top of that re-fits the room
 * at a different scale mid-frame, which visibly rearranges furniture, NPCs and the
 * character — so game zoom is pinned to 1.0 (disabled) for these rooms. Tiled
 * rooms keep the normal min/max (raised by `coverZoom` when the map wouldn't
 * otherwise cover the viewport — see getCoverZoom), and are also disabled while a
 * UI overlay is open so scroll/pinch works in menus instead.
 */
export function getZoomLimitsForRoom(
  isBackgroundImageRoom: boolean,
  isAnyOverlayOpen: boolean,
  coverZoom: number = DEFAULT_MIN_ZOOM
): ZoomLimits {
  if (isBackgroundImageRoom) {
    return { minZoom: 1.0, maxZoom: 1.0, enabled: false };
  }
  const minZoom = Math.max(DEFAULT_MIN_ZOOM, coverZoom);
  return {
    minZoom,
    // A very small map could need more zoom to cover than the default max
    // allows — extend the ceiling to match rather than leaving a gap.
    maxZoom: Math.max(DEFAULT_MAX_ZOOM, minZoom),
    enabled: !isAnyOverlayOpen,
  };
}

/**
 * Hook for pinch-to-zoom (touch) and mouse wheel zoom (desktop).
 * Double-tap resets zoom to 1.0.
 * Attaches listeners to window (game fills entire screen).
 *
 * Zoom limits can change dynamically (e.g. per-map).
 * When limits tighten, the current zoom is clamped automatically.
 */
export function usePinchZoom({
  enabled = true,
  minZoom = DEFAULT_MIN_ZOOM,
  maxZoom = DEFAULT_MAX_ZOOM,
}: UsePinchZoomConfig = {}): UsePinchZoomResult {
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);

  // Track pinch state via refs (don't need re-renders)
  const initialPinchDistance = useRef<number | null>(null);
  const zoomAtPinchStart = useRef(DEFAULT_ZOOM);

  // Track double-tap
  const lastTapTime = useRef(0);

  // Keep current values in refs for event handlers
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  const minZoomRef = useRef(minZoom);
  minZoomRef.current = minZoom;
  const maxZoomRef = useRef(maxZoom);
  maxZoomRef.current = maxZoom;

  const resetZoom = useCallback(() => {
    setZoom(DEFAULT_ZOOM);
  }, []);

  const clampZoom = useCallback((value: number) => {
    return Math.min(maxZoomRef.current, Math.max(minZoomRef.current, value));
  }, []);

  // Clamp zoom when limits change (e.g. entering a room that disallows zoom-out)
  useEffect(() => {
    setZoom((prev) => Math.min(maxZoom, Math.max(minZoom, prev)));
  }, [minZoom, maxZoom]);

  // --- Touch: pinch-to-zoom + double-tap reset ---
  useEffect(() => {
    if (!enabled) return;

    const getTouchDistance = (t1: Touch, t2: Touch): number => {
      const dx = t1.clientX - t2.clientX;
      const dy = t1.clientY - t2.clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        initialPinchDistance.current = getTouchDistance(e.touches[0], e.touches[1]);
        zoomAtPinchStart.current = zoomRef.current;
      } else if (e.touches.length === 1) {
        const now = Date.now();
        if (now - lastTapTime.current < DOUBLE_TAP_MS) {
          setZoom(DEFAULT_ZOOM);
          lastTapTime.current = 0;
        } else {
          lastTapTime.current = now;
        }
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && initialPinchDistance.current !== null) {
        e.preventDefault(); // Prevent native browser zoom
        const currentDistance = getTouchDistance(e.touches[0], e.touches[1]);
        const scale = currentDistance / initialPinchDistance.current;
        setZoom(clampZoom(zoomAtPinchStart.current * scale));
      }
    };

    const handleTouchEnd = () => {
      initialPinchDistance.current = null;
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [enabled, clampZoom]);

  // --- Desktop: mouse wheel zoom ---
  useEffect(() => {
    if (!enabled) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = -e.deltaY * WHEEL_ZOOM_SPEED;
      setZoom((prev) => clampZoom(prev + delta));
    };

    window.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      window.removeEventListener('wheel', handleWheel);
    };
  }, [enabled, clampZoom]);

  return { zoom, resetZoom };
}
