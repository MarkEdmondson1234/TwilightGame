import { describe, expect, it } from 'vitest';
import { mumsKitchen } from '../maps/definitions/mumsKitchen';
import { shop } from '../maps/definitions/shop';
import {
  getRoomArtworkSize,
  getRoomCoverScale,
  getRoomTransform,
} from '../utils/backgroundRoomLayout';
import { getZoomLimitsForRoom } from '../hooks/usePinchZoom';
import { screenToTile } from '../utils/screenToTile';

for (const map of [mumsKitchen, shop]) {
  describe(`${map.id} mobile camera`, () => {
    for (const [width, height] of [
      [640, 360],
      [844, 390],
      [640, 240],
      [1024, 768],
    ]) {
      it(`${width}×${height} covers the viewport and keeps taps aligned across zoom and pan`, () => {
        const art = getRoomArtworkSize(map)!;
        const baseScale = Math.max(1, getRoomCoverScale(art.width, art.height, width, height));
        const fit = getRoomCoverScale(art.width * baseScale, art.height * baseScale, width, height);
        const limits = getZoomLimitsForRoom(true, false, fit, true);
        expect(limits.enabled).toBe(true);
        for (const zoom of [limits.minZoom, Math.max(limits.minZoom, 0.75), 1, 1.5]) {
          for (const player of [map.spawnPoint, { x: 3, y: 7 }, { x: 12, y: 6 }]) {
            const layout = getRoomTransform(
              map,
              player,
              { width, height },
              baseScale,
              zoom,
              Math.min(88, height * 0.2)
            );
            const origin = layout.gridOffset!;
            expect(origin.x * zoom).toBeLessThanOrEqual(1e-6);
            expect(origin.y * zoom).toBeLessThanOrEqual(1e-6);
            expect((origin.x + art.width * baseScale) * zoom).toBeGreaterThanOrEqual(width - 1e-6);
            expect((origin.y + art.height * baseScale) * zoom).toBeGreaterThanOrEqual(
              height - 1e-6
            );
            for (const point of [
              player,
              ...map.transitions.map((t) => t.fromPosition),
              { x: 9, y: 6 },
            ]) {
              const tap = screenToTile(
                (origin.x + point.x * layout.tileSize) * zoom,
                (origin.y + point.y * layout.tileSize) * zoom,
                zoom,
                0,
                0,
                origin,
                layout.tileSize
              );
              expect(tap.worldX).toBeCloseTo(point.x);
              expect(tap.worldY).toBeCloseTo(point.y);
            }
          }
        }
        expect(getZoomLimitsForRoom(true, true, fit, true).enabled).toBe(false);
        expect(getZoomLimitsForRoom(true, false, fit)).toEqual({
          minZoom: 1,
          maxZoom: 1,
          enabled: false,
        });
      });
    }
  });
}
