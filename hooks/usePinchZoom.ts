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
  /** Separate indoor and outdoor choices; the mobile interior default is 75%. */
  preferenceKey?: 'world' | 'interior';
  /** Initial/reset framing, used until this view group has an explicit choice. */
  defaultZoom?: number;
}

interface UsePinchZoomResult {
  /** Current zoom level */
  zoom: number;
  /** Reset to the current view preference default. */
  resetZoom: () => void;
  setZoomLevel: (value: number) => void;
}

export interface ZoomLimits {
  minZoom: number;
  maxZoom: number;
  enabled: boolean;
}

/**
 * Minimum zoom needed so a mapPixelWidth x mapPixelHeight tiled room, once
 * scaled, covers the viewport in both axes. This is a lower bound, not the
 * default camera setting: large maps must still allow the normal 50% zoom-out.
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
  return Math.max(DEFAULT_MIN_ZOOM, viewportWidth / mapPixelWidth, viewportHeight / mapPixelHeight);
}

/**
 * Decides the pinch/wheel zoom limits for the current room.
 *
 * Illustrated rooms keep their existing fitted view unless explicitly opted in
 * for the mobile pilot. Pilot coverage is measured after base viewport fitting,
 * so user zoom never refits the artwork independently from actors and collisions.
 * All gestures are disabled while UI overlays are open.
 */
export function getZoomLimitsForRoom(
  isBackgroundImageRoom: boolean,
  isAnyOverlayOpen: boolean,
  coverZoom: number = DEFAULT_MIN_ZOOM,
  allowInteriorZoom = false
): ZoomLimits {
  if (isBackgroundImageRoom && !allowInteriorZoom) {
    return { minZoom: 1.0, maxZoom: 1.0, enabled: false };
  }
  const minZoom = Math.max(isBackgroundImageRoom ? 0.1 : DEFAULT_MIN_ZOOM, coverZoom);
  return {
    minZoom,
    // A very small map could need more zoom to cover than the default max
    // allows — extend the ceiling to match rather than leaving a gap.
    maxZoom: Math.max(isBackgroundImageRoom ? 1.5 : DEFAULT_MAX_ZOOM, minZoom),
    enabled: !isAnyOverlayOpen,
  };
}

/**
 * Hook for pinch-to-zoom (touch) and mouse wheel zoom (desktop).
 * Double-tap resets to 75% indoors or 100% outdoors, bounded by coverage.
 * Attaches listeners to window (game fills entire screen).
 *
 * Zoom limits can change dynamically (e.g. per-map).
 * When limits tighten, the current zoom is clamped automatically.
 */
export function usePinchZoom({
  enabled = true,
  minZoom = DEFAULT_MIN_ZOOM,
  maxZoom = DEFAULT_MAX_ZOOM,
  preferenceKey = 'world',
  defaultZoom: configuredDefault,
}: UsePinchZoomConfig = {}): UsePinchZoomResult {
  const defaultZoom = configuredDefault ?? (preferenceKey === 'interior' ? 0.75 : DEFAULT_ZOOM);
  const [preferences, setPreferences] = useState<Partial<Record<'world' | 'interior', number>>>({});
  const preferredZoom = preferences[preferenceKey] ?? defaultZoom;
  const setZoom = useCallback(
    (value: number | ((previous: number) => number)) => {
      setPreferences((previous) => ({
        ...previous,
        [preferenceKey]:
          typeof value === 'function' ? value(previous[preferenceKey] ?? defaultZoom) : value,
      }));
    },
    [preferenceKey, defaultZoom]
  );
  const zoom = Math.min(maxZoom, Math.max(minZoom, preferredZoom));

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
    setZoom(defaultZoom);
  }, [defaultZoom, setZoom]);

  const clampZoom = useCallback((value: number) => {
    return Math.min(maxZoomRef.current, Math.max(minZoomRef.current, value));
  }, []);

  const setZoomLevel = useCallback(
    (value: number) => {
      if (Number.isFinite(value)) setZoom(clampZoom(value));
    },
    [clampZoom, setZoom]
  );

  // --- Touch: pinch-to-zoom + double-tap reset ---
  useEffect(() => {
    if (!enabled) return;

    const getTouchDistance = (t1: Touch, t2: Touch): number => {
      const dx = t1.clientX - t2.clientX;
      const dy = t1.clientY - t2.clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const isWorldTouch = (touch: Touch) =>
      touch.target instanceof Element &&
      !!touch.target.closest('[data-game-world]') &&
      !touch.target.closest('button, input, select, textarea, [data-game-ui], .touch-controls');
    const handleTouchStart = (e: TouchEvent) => {
      if (!Array.from(e.touches).every(isWorldTouch)) {
        initialPinchDistance.current = null;
        lastTapTime.current = 0;
        return;
      }
      if (e.touches.length === 2) {
        e.preventDefault();
        initialPinchDistance.current = getTouchDistance(e.touches[0], e.touches[1]) || null;
        lastTapTime.current = 0;
        zoomAtPinchStart.current = zoomRef.current;
      } else if (e.touches.length > 2) {
        initialPinchDistance.current = null;
        lastTapTime.current = 0;
      } else if (e.touches.length === 1) {
        const now = Date.now();
        if (now - lastTapTime.current < DOUBLE_TAP_MS) {
          setZoom(defaultZoom);
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

    window.addEventListener('touchstart', handleTouchStart, { passive: false });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    window.addEventListener('touchcancel', handleTouchEnd, { passive: true });
    window.addEventListener('blur', handleTouchEnd);

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);
      window.removeEventListener('blur', handleTouchEnd);
      initialPinchDistance.current = null;
      lastTapTime.current = 0;
    };
  }, [enabled, clampZoom, setZoom, defaultZoom]);

  // --- Desktop: mouse wheel zoom ---
  useEffect(() => {
    if (!enabled) return;

    const handleWheel = (e: WheelEvent) => {
      if (
        !(e.target instanceof Element) ||
        !e.target.closest('[data-game-world]') ||
        e.target.closest('button, input, select, textarea, [data-game-ui], .touch-controls')
      )
        return;
      e.preventDefault();
      const delta = -e.deltaY * WHEEL_ZOOM_SPEED;
      setZoom((prev) => clampZoom(prev + delta));
    };

    window.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      window.removeEventListener('wheel', handleWheel);
    };
  }, [enabled, clampZoom, setZoom, defaultZoom]);

  return { zoom, resetZoom, setZoomLevel };
}
