import { useCallback, useEffect, useRef, useState } from 'react';

/** Zoom limits */
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2.0;
const DEFAULT_ZOOM = 1.0;

/** Mouse wheel zoom sensitivity (smaller = slower) */
const WHEEL_ZOOM_SPEED = 0.002;

/** Double-tap detection window (ms) */
const DOUBLE_TAP_MS = 300;

interface UsePinchZoomConfig {
  /** Whether zoom is enabled */
  enabled?: boolean;
}

interface UsePinchZoomResult {
  /** Current zoom level (0.5–2.0, default 1.0) */
  zoom: number;
  /** Reset zoom to default */
  resetZoom: () => void;
}

/**
 * Hook for pinch-to-zoom (touch) and mouse wheel zoom (desktop).
 * Double-tap resets zoom to 1.0.
 * Attaches listeners to window (game fills entire screen).
 */
export function usePinchZoom({ enabled = true }: UsePinchZoomConfig = {}): UsePinchZoomResult {
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);

  // Track pinch state via refs (don't need re-renders)
  const initialPinchDistance = useRef<number | null>(null);
  const zoomAtPinchStart = useRef(DEFAULT_ZOOM);

  // Track double-tap
  const lastTapTime = useRef(0);

  // Keep zoom ref in sync for use in touch handlers
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;

  const resetZoom = useCallback(() => {
    setZoom(DEFAULT_ZOOM);
  }, []);

  const clampZoom = useCallback((value: number) => {
    return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
  }, []);

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
