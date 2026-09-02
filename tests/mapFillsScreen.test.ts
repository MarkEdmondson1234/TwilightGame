/** @vitest-environment node */
/**
 * Regression for issue #26: maps didn't always fill the screen at certain
 * aspect ratios, leaving the game's own background colour visible where the
 * map didn't cover.
 *
 * Two separate root causes, one per room type:
 *
 * - Tiled rooms: useCamera's "map smaller than effective viewport" branch
 *   centred the map with empty space on the sides instead of scaling up to
 *   cover. getCoverZoom (this file) computes the minimum zoom needed to
 *   guarantee coverage; App.tsx feeds it in as the pinch-zoom minimum, so the
 *   same `zoom` value used for the camera's math is also what's actually
 *   rendered — and useCamera's existing follow-the-player logic (unchanged)
 *   makes the cropped overflow pan with the player instead of sitting static.
 *
 * - Background-image rooms: calculateViewportScale used 'contain' fitting
 *   (picks the SMALLER of scaleX/scaleY), which fits the room fully on
 *   screen but leaves a letterboxed gap on whichever axis has room to spare
 *   at a mismatched aspect ratio. 'cover' mode (new) picks the LARGER scale
 *   instead, filling both axes and cropping the overflow.
 *
 * NOTE: 'cover' fixed the fit but not the *input* — App.tsx was feeding it the
 * map's declared `referenceViewport`, which drifts from the artwork it claims
 * to describe, so interiors were still short by a couple of percent at every
 * window size. Interiors now size and pan from the artwork itself; see
 * tests/backgroundRoomLayout.test.ts. What is left here for that half is the
 * contract of calculateViewportScale's fitMode param, which other callers
 * still rely on.
 */
import { describe, it, expect } from 'vitest';
import {
  getCoverZoom,
  DEFAULT_MIN_ZOOM,
  DEFAULT_MAX_ZOOM,
  getZoomLimitsForRoom,
} from '../hooks/usePinchZoom';
import { calculateViewportScale } from '../hooks/useViewportScale';

describe('getCoverZoom (#26 — tiled rooms)', () => {
  it('returns 1 when the map already covers the viewport at 1:1', () => {
    // Map bigger than viewport in both axes — no zoom needed to cover.
    expect(getCoverZoom(4000, 3000, 1920, 1080)).toBe(1);
  });

  it('returns >1 when the map is smaller than the viewport in one axis', () => {
    // Map is 1600 wide, viewport is 1920 — needs 1920/1600 = 1.2x to cover width.
    const zoom = getCoverZoom(1600, 3000, 1920, 1080);
    expect(zoom).toBeCloseTo(1.2, 5);
  });

  it('picks whichever axis needs MORE zoom (guarantees both axes covered)', () => {
    // Width needs 1920/1000=1.92x, height needs 1080/900=1.2x — must use the larger.
    const zoom = getCoverZoom(1000, 900, 1920, 1080);
    expect(zoom).toBeCloseTo(1.92, 5);
    // Confirm this genuinely covers both axes
    expect(1000 * zoom).toBeGreaterThanOrEqual(1920 - 1e-6);
    expect(900 * zoom).toBeGreaterThanOrEqual(1080 - 1e-6);
  });

  it('never returns below 1 (never forces a zoom-out just because the map is huge)', () => {
    expect(getCoverZoom(100, 100, 1920, 1080)).toBeGreaterThanOrEqual(1);
    expect(getCoverZoom(10000, 10000, 1920, 1080)).toBe(1);
  });
});

describe('getZoomLimitsForRoom respects coverZoom for tiled rooms (#26)', () => {
  it('raises minZoom above the default floor when the map needs it to cover', () => {
    const limits = getZoomLimitsForRoom(false, false, 1.5);
    expect(limits.minZoom).toBe(1.5);
    expect(limits.maxZoom).toBeGreaterThanOrEqual(1.5);
  });

  it('keeps the normal default floor when coverZoom is below it', () => {
    const limits = getZoomLimitsForRoom(false, false, 0.2);
    expect(limits.minZoom).toBe(DEFAULT_MIN_ZOOM);
    expect(limits.maxZoom).toBe(DEFAULT_MAX_ZOOM);
  });

  it('still disables zoom entirely for background-image rooms regardless of coverZoom', () => {
    const limits = getZoomLimitsForRoom(true, false, 3.0);
    expect(limits.enabled).toBe(false);
    expect(limits.minZoom).toBe(1.0);
    expect(limits.maxZoom).toBe(1.0);
  });
});

describe('calculateViewportScale cover mode (#26 — background-image rooms)', () => {
  it('contain (default) picks the smaller ratio, potentially leaving a gap', () => {
    // Reference 1920x1080. Viewport 2000x1080 (wider than reference) —
    // contain uses the height ratio (1.0), so width scales to 1920 < 2000: a gap.
    const scale = calculateViewportScale(2000, 1080, 1920, 1080, 0.5, 2.5, 'contain');
    expect(scale).toBeCloseTo(1.0, 5);
  });

  it('cover picks the larger ratio, filling both axes', () => {
    const scale = calculateViewportScale(2000, 1080, 1920, 1080, 0.5, 2.5, 'cover');
    const expected = 2000 / 1920; // width is the binding constraint under cover
    expect(scale).toBeCloseTo(expected, 5);
    // Confirm this genuinely covers both axes of the viewport
    expect(1920 * scale).toBeGreaterThanOrEqual(2000 - 1e-6);
    expect(1080 * scale).toBeGreaterThanOrEqual(1080 - 1e-6);
  });

  it('defaults to contain when fitMode is omitted (no behaviour change for other callers)', () => {
    const withDefault = calculateViewportScale(2000, 1080, 1920, 1080, 0.5, 2.5);
    const withExplicitContain = calculateViewportScale(2000, 1080, 1920, 1080, 0.5, 2.5, 'contain');
    expect(withDefault).toBe(withExplicitContain);
  });
});
