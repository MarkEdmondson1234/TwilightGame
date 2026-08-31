/**
 * Regression for issue #26 (tiled rooms): once App.tsx feeds getCoverZoom's
 * result in as the pinch-zoom minimum, useCamera should receive a `zoom` that
 * already guarantees the map covers the viewport — so its "centre a too-small
 * map" branch should no longer trigger, and the camera should instead follow
 * the player, panning the (now fully covering, cropped) view with them.
 *
 * Uses jsdom (the project default environment) for renderHook.
 */
import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useCamera } from '../hooks/useCamera';
import { getCoverZoom } from '../hooks/usePinchZoom';
import { TILE_SIZE } from '../constants';

describe('useCamera with a coverZoom-raised zoom (#26)', () => {
  it('follows the player instead of centring, once zoom covers the viewport', () => {
    // A small 10x8 tile map on a 1920x1080 viewport — smaller than the
    // viewport at zoom 1, so without the fix the camera would centre it.
    const mapWidth = 10;
    const mapHeight = 8;
    const viewportWidth = 1920;
    const viewportHeight = 1080;
    const mapPixelWidth = mapWidth * TILE_SIZE;
    const mapPixelHeight = mapHeight * TILE_SIZE;

    const coverZoom = getCoverZoom(mapPixelWidth, mapPixelHeight, viewportWidth, viewportHeight);
    expect(coverZoom).toBeGreaterThan(1); // this map genuinely needs zooming to cover

    // Player near the top-left corner of the map
    const { result } = renderHook(() =>
      useCamera({
        playerPos: { x: 1, y: 1 },
        mapWidth,
        mapHeight,
        viewportWidth,
        viewportHeight,
        zoom: coverZoom,
      })
    );

    // Camera should be clamped to the map's top-left edge (following the
    // player, who is near it) — not centred with a negative offset.
    // (toBeCloseTo rather than toBe: the width axis is an exact tie by
    // construction — it's the one that determined coverZoom — so it can land
    // on -0 depending on float rounding; that's still "no gap", just signed zero.)
    expect(result.current.cameraX).toBeCloseTo(0, 6);
    expect(result.current.cameraY).toBeCloseTo(0, 6);

    // And it should actually cover: the visible viewport (in map pixels) must
    // fit within the map's own pixel bounds — no leftover gap to show
    // background through.
    const effectiveWidth = viewportWidth / coverZoom;
    const effectiveHeight = viewportHeight / coverZoom;
    expect(result.current.cameraX + effectiveWidth).toBeLessThanOrEqual(mapPixelWidth + 1e-6);
    expect(result.current.cameraY + effectiveHeight).toBeLessThanOrEqual(mapPixelHeight + 1e-6);
  });

  it('pans on the axis that has crop room as the player moves, instead of staying static', () => {
    // With these dimensions the WIDTH ratio (1920/640 = 3.0) exceeds the height
    // ratio (1080/512 ≈ 2.11), so width is the exact-tie axis that determines
    // coverZoom (zero pan room there, by definition of "just barely covers") —
    // height is the axis with actual crop/pan room. Move the player along Y.
    const mapWidth = 10;
    const mapHeight = 8;
    const viewportWidth = 1920;
    const viewportHeight = 1080;
    const coverZoom = getCoverZoom(
      mapWidth * TILE_SIZE,
      mapHeight * TILE_SIZE,
      viewportWidth,
      viewportHeight
    );

    const nearTop = renderHook(() =>
      useCamera({
        playerPos: { x: 5, y: 1 },
        mapWidth,
        mapHeight,
        viewportWidth,
        viewportHeight,
        zoom: coverZoom,
      })
    ).result.current;

    const nearBottom = renderHook(() =>
      useCamera({
        playerPos: { x: 5, y: mapHeight - 1 },
        mapWidth,
        mapHeight,
        viewportWidth,
        viewportHeight,
        zoom: coverZoom,
      })
    ).result.current;

    // The camera must have actually moved on the axis with pan room — a
    // static, centred camera would report the same position for both.
    expect(nearBottom.cameraY).toBeGreaterThan(nearTop.cameraY);
  });

  it('without coverZoom (zoom stuck at 1), a small map still gets centred — the pre-fix behaviour', () => {
    // Sanity check that the OLD bug is real and this isn't a vacuous test:
    // at zoom 1 (no cover compensation), the small map is still smaller than
    // the viewport, so the "centre it" branch (still present as a fallback)
    // reports a negative camera offset — i.e. letterboxing.
    const { result } = renderHook(() =>
      useCamera({
        playerPos: { x: 1, y: 1 },
        mapWidth: 10,
        mapHeight: 8,
        viewportWidth: 1920,
        viewportHeight: 1080,
        zoom: 1,
      })
    );
    expect(result.current.cameraX).toBeLessThan(0);
  });
});
