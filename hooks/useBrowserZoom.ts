import { useEffect, useRef, useState } from 'react';

/**
 * Tracks the browser's page-zoom factor relative to the zoom level the app was
 * first loaded at (1.0 = same as load, 2.0 = zoomed in to 200%, 0.5 = 50%).
 *
 * Browser (page) zoom multiplies `window.devicePixelRatio` by the zoom factor
 * while dividing `window.innerWidth`/`innerHeight` by the same factor. We capture
 * DPR once at load as the baseline (assumed to be the user's normal zoom) and
 * report the live ratio.
 *
 * WHY THIS EXISTS — background-image rooms (interiors) scale their artwork with
 * `viewportScale`, which is derived from `window.innerWidth`/`innerHeight`. Under
 * browser zoom those CSS dimensions shrink, so on any monitor larger than the
 * reference viewport `viewportScale` drops back toward its 1.0 floor and silently
 * *cancels out* the zoom: the room image and character stay the same physical
 * size while tiled rooms magnify normally. Dividing this factor back out of the
 * viewport dimensions before computing `viewportScale` makes it
 * browser-zoom-invariant, so interiors magnify with the browser like everything
 * else. See docs/ARCHITECTURE_GOTCHAS.md (background-image room rendering).
 *
 * Note: browser zoom always changes `innerWidth`, so a `resize` listener (the
 * same signal the rest of the app already uses) reliably catches zoom changes.
 */
export function useBrowserZoom(): number {
  const baselineDprRef = useRef(
    typeof window !== 'undefined' && window.devicePixelRatio ? window.devicePixelRatio : 1
  );
  const [zoomFactor, setZoomFactor] = useState(1);

  useEffect(() => {
    const update = () => {
      const dpr = window.devicePixelRatio || 1;
      setZoomFactor(dpr / baselineDprRef.current);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return zoomFactor;
}
