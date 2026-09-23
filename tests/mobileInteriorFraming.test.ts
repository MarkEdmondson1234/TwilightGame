/** @vitest-environment node */
/**
 * Issue #157: on a phone, Mum's Kitchen was fitted to the screen *above* a
 * reserved 88px control strip and covered it, so a 16:9 painting on a ~2.2:1
 * screen lost over a third of its height — the top of the kitchen was never
 * visible — and the strip was painted as a dark bar under the controls.
 *
 * The kitchen now fits its whole painted height on the whole screen at the
 * smallest zoom, the controls overlay the bottom of the room, and the strip
 * only steers the camera. These checks drive the real map definition through
 * the same transform the renderer and the tap inversion use.
 */
import { describe, expect, it } from 'vitest';
import { mumsKitchen } from '../maps/definitions/mumsKitchen';
import {
  getRoomArtworkSize,
  getRoomCoverScale,
  getRoomTransform,
} from '../utils/backgroundRoomLayout';
import { getMobileInteriorFraming, getRoomHeightFitZoom } from '../utils/mobileInteriorFraming';
import { getZoomLimitsForRoom } from '../hooks/usePinchZoom';
import { computeViewFrame } from '../utils/viewFrame';
import { screenToTile } from '../utils/screenToTile';

const EPS = 1e-6;
const art = getRoomArtworkSize(mumsKitchen)!;

/** What App.tsx computes for the kitchen on a touch device at this size. */
function kitchenAt(width: number, height: number) {
  const framing = getMobileInteriorFraming('mums_kitchen', true, height);
  const viewportScale = Math.max(1, getRoomCoverScale(art.width, art.height, width, height));
  const fit = getRoomHeightFitZoom(
    art.width * viewportScale,
    art.height * viewportScale,
    width,
    height
  );
  const limits = getZoomLimitsForRoom(true, false, fit, framing.enabled);
  return { framing, viewportScale, limits };
}

describe('mobile interior framing policy', () => {
  it('fits the kitchen to the whole screen and keeps the shop’s reviewed control strip', () => {
    const kitchen = getMobileInteriorFraming('mums_kitchen', true, 390);
    expect(kitchen).toMatchObject({ enabled: true, reservedInset: 0, fitWholeHeight: true });
    expect(kitchen.anchorInset).toBeGreaterThan(0);

    const shop = getMobileInteriorFraming('shop', true, 390);
    expect(shop).toMatchObject({ enabled: true, anchorInset: 0, fitWholeHeight: false });
    expect(shop.reservedInset).toBeGreaterThan(0);
  });

  it('leaves desktop and every other room alone', () => {
    const off = { enabled: false, reservedInset: 0, anchorInset: 0, fitWholeHeight: false };
    expect(getMobileInteriorFraming('mums_kitchen', false, 390)).toEqual(off);
    expect(getMobileInteriorFraming('village', true, 390)).toEqual(off);
    expect(getMobileInteriorFraming('home_upstairs', true, 390)).toEqual(off);
  });
});

describe("Mum's Kitchen on a touch screen", () => {
  for (const [width, height] of [
    [844, 390],
    [932, 430],
    [667, 375],
    [640, 360],
  ]) {
    it(`${width}×${height}: Fit shows the whole painted height, top included, with no bar`, () => {
      const { framing, viewportScale, limits } = kitchenAt(width, height);
      const zoom = limits.minZoom;
      for (const player of [mumsKitchen.spawnPoint, { x: 5, y: 7 }, { x: 12, y: 3 }]) {
        const frame = computeViewFrame(
          {
            map: mumsKitchen,
            mapWidth: mumsKitchen.width,
            mapHeight: mumsKitchen.height,
            viewport: { width, height },
            roomViewport: { width, height },
            viewportScale,
            zoom,
            cameraAnchorLiftTiles: 1,
            bottomInset: framing.anchorInset,
          },
          player
        );
        const origin = frame.gridOffset!;
        const top = origin.y * zoom;
        const bottom = (origin.y + art.height * viewportScale) * zoom;
        expect(top, 'top of the kitchen is cropped').toBeGreaterThanOrEqual(-EPS);
        expect(bottom, 'bottom of the kitchen is cropped').toBeLessThanOrEqual(height + EPS);
        // Full height: no strip above or below the painting either.
        expect(top).toBeCloseTo(0);
        expect(bottom).toBeCloseTo(height);
        // Centred, inside the screen, on the one axis a wide phone leaves spare.
        const left = origin.x * zoom;
        const right = (origin.x + art.width * viewportScale) * zoom;
        expect(left).toBeGreaterThanOrEqual(-EPS);
        expect(right).toBeLessThanOrEqual(width + EPS);
        expect(left).toBeCloseTo(width - right);

        // Taps on the doors still land on their tiles.
        for (const point of mumsKitchen.transitions.map((t) => t.fromPosition)) {
          const tap = screenToTile(
            (origin.x + point.x * frame.tileSize) * zoom,
            (origin.y + point.y * frame.tileSize) * zoom,
            zoom,
            0,
            0,
            origin,
            frame.tileSize
          );
          expect(tap.worldX).toBeCloseTo(point.x);
          expect(tap.worldY).toBeCloseTo(point.y);
        }
      }
    });
  }

  for (const [width, height] of [
    [1024, 768],
    [1180, 820],
  ]) {
    it(`${width}×${height}: a tablet still fills the screen edge to edge`, () => {
      const { viewportScale, limits } = kitchenAt(width, height);
      const cover = getRoomCoverScale(
        art.width * viewportScale,
        art.height * viewportScale,
        width,
        height
      );
      expect(limits.minZoom).toBeCloseTo(cover);
    });
  }

  it('zoomed in, the painting runs under the controls instead of stopping above a bar', () => {
    const [width, height] = [844, 390];
    const { framing, viewportScale } = kitchenAt(width, height);
    const zoom = 1;
    // Standing at the front of the room pulls the camera to the bottom clamp.
    const layout = getRoomTransform(
      mumsKitchen,
      { x: 8, y: 7.5 },
      { width, height },
      viewportScale,
      zoom,
      framing.anchorInset
    );
    const bottom = (layout.gridOffset!.y + art.height * viewportScale) * zoom;
    expect(bottom).toBeGreaterThanOrEqual(height - EPS);
    expect(layout.gridOffset!.y * zoom).toBeLessThanOrEqual(EPS);
  });
});
