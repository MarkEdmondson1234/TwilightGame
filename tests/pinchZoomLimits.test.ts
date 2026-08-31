/** @vitest-environment node */
/**
 * getZoomLimitsForRoom — guards issue #25: pinch/wheel zoom must be disabled in
 * background-image rooms (interiors), because they already fit the viewport via
 * `viewportScale` and letting game zoom apply on top rearranges the room layout.
 */
import { describe, it, expect } from 'vitest';
import { getZoomLimitsForRoom, DEFAULT_MIN_ZOOM, DEFAULT_MAX_ZOOM } from '../hooks/usePinchZoom';

describe('getZoomLimitsForRoom', () => {
  it('disables zoom entirely in background-image rooms, even with no overlay open', () => {
    const limits = getZoomLimitsForRoom(true, false);
    expect(limits.enabled).toBe(false);
    expect(limits.minZoom).toBe(1.0);
    expect(limits.maxZoom).toBe(1.0);
  });

  it('stays disabled in background-image rooms with an overlay open too', () => {
    const limits = getZoomLimitsForRoom(true, true);
    expect(limits.enabled).toBe(false);
    expect(limits.minZoom).toBe(1.0);
    expect(limits.maxZoom).toBe(1.0);
  });

  it('allows the normal zoom range in tiled rooms when no overlay is open', () => {
    const limits = getZoomLimitsForRoom(false, false);
    expect(limits.enabled).toBe(true);
    expect(limits.minZoom).toBe(DEFAULT_MIN_ZOOM);
    expect(limits.maxZoom).toBe(DEFAULT_MAX_ZOOM);
  });

  it('disables zoom in tiled rooms while a UI overlay is open', () => {
    const limits = getZoomLimitsForRoom(false, true);
    expect(limits.enabled).toBe(false);
    // Limits stay at the normal range — only listener attachment is gated by `enabled`.
    expect(limits.minZoom).toBe(DEFAULT_MIN_ZOOM);
    expect(limits.maxZoom).toBe(DEFAULT_MAX_ZOOM);
  });
});
