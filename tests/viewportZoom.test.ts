/** @vitest-environment node */
/**
 * viewportZoom — guards the browser-zoom fix for background-image (interior) rooms.
 *
 * Background: interior artwork + the player are sized by `viewportScale`, derived
 * from `window.innerWidth/innerHeight`. Browser page zoom shrinks those CSS
 * dimensions, so on monitors larger than the reference viewport `viewportScale`
 * used to drop toward its 1.0 floor and cancel the zoom — the room and character
 * were the ONLY things that didn't magnify. The fix divides the browser-zoom
 * factor back out (see hooks/useBrowserZoom.ts + the viewportScale memo in App.tsx).
 *
 * Invariant under test: for a FIXED physical monitor, `viewportScale` must be the
 * same at every browser-zoom level, so the browser's own magnification passes
 * through to interiors exactly as it does for tiled rooms.
 */
import { describe, it, expect } from 'vitest';
import { calculateViewportScale, DEFAULT_REFERENCE_VIEWPORT } from '../hooks/useViewportScale';

/**
 * Mirrors the App.tsx viewportScale computation for a background-image room.
 * Browser zoom `z` (relative to load) multiplies devicePixelRatio and divides
 * innerWidth/innerHeight by the same factor, so at zoom z the CSS viewport is
 * physical/z. `browserZoom` (= dpr/baselineDpr) is z, and we normalise it out.
 */
function interiorViewportScale(
  physicalWidth: number,
  physicalHeight: number,
  browserZoom: number,
  ref = DEFAULT_REFERENCE_VIEWPORT
): number {
  const cssWidth = physicalWidth / browserZoom; // window.innerWidth at this zoom
  const cssHeight = physicalHeight / browserZoom; // window.innerHeight at this zoom
  const rawScale = calculateViewportScale(
    cssWidth * browserZoom, // normalise the zoom back out
    cssHeight * browserZoom,
    ref.width,
    ref.height,
    0.5,
    2.5
  );
  return Math.max(1.0, rawScale);
}

describe('interior viewportScale vs browser zoom', () => {
  const monitors = [
    { name: '1080p', w: 1920, h: 1080 },
    { name: '1440p', w: 2560, h: 1440 },
    { name: '4K', w: 3840, h: 2160 },
    { name: 'ultrawide 3440x1440', w: 3440, h: 1440 },
  ];
  const zoomLevels = [0.9, 1.0, 1.1, 1.25, 1.5, 1.75, 2.0, 2.5];

  for (const m of monitors) {
    it(`${m.name}: viewportScale is invariant across browser zoom`, () => {
      const baseline = interiorViewportScale(m.w, m.h, 1.0);
      for (const z of zoomLevels) {
        const scale = interiorViewportScale(m.w, m.h, z);
        expect(scale).toBeCloseTo(baseline, 6);
      }
    });
  }

  it('large monitors still scale up at load (fix preserves default appearance)', () => {
    // 4K at 100% should scale up (this is the responsive behaviour we keep).
    expect(interiorViewportScale(3840, 2160, 1.0)).toBeGreaterThan(1.0);
    // 1080p at 100% stays at the 1.0 floor.
    expect(interiorViewportScale(1920, 1080, 1.0)).toBe(1.0);
  });

  it('regression: without normalisation, zoom cancels on large monitors', () => {
    // The OLD (buggy) behaviour = fitting the raw CSS viewport with no zoom
    // compensation. On 4K, zooming to 200% dropped the scale from 2.0 to 1.0,
    // exactly cancelling the browser magnification. This asserts the bug existed
    // so the invariant test above is meaningful.
    const buggy = (physW: number, physH: number, z: number) =>
      Math.max(1.0, calculateViewportScale(physW / z, physH / z, 1920, 1080, 0.5, 2.5));
    expect(buggy(3840, 2160, 1.0)).toBeCloseTo(2.0, 6);
    expect(buggy(3840, 2160, 2.0)).toBeCloseTo(1.0, 6); // zoom cancelled → the bug
  });
});
