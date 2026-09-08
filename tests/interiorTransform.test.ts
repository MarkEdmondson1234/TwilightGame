import { describe, expect, it } from 'vitest';
import {
  getRoomTransform,
  getRoomArtworkSize,
  getRoomCoverScale,
} from '../utils/backgroundRoomLayout';
import { screenToTile } from '../utils/screenToTile';
import { mumsKitchen } from '../maps/definitions/mumsKitchen';
import { homeUpstairs } from '../maps/definitions/homeUpstairs';

// A screen-space artwork origin must be centered or camera-clamped, and taps
// must return the same authored tile across resizing, panning and stage zoom.
for (const map of [mumsKitchen, homeUpstairs]) {
  describe(map.id, () => {
    for (const [width, height] of [
      [390, 844],
      [844, 390],
      [1280, 720],
      [1920, 1080],
    ]) {
      for (const zoom of [0.75, 1, 1.5, 2]) {
        it(`${width}x${height} at ${zoom}x keeps artwork and taps aligned`, () => {
          const artwork = getRoomArtworkSize(map)!;
          const scale = Math.max(
            1,
            getRoomCoverScale(artwork.width, artwork.height, width, height)
          );
          const player = { x: 4.5, y: 7 };
          const layout = getRoomTransform(map, player, { width, height }, scale, zoom);
          // Independent expected camera: follow player, clamp at painted edges.
          const expected = (size: number, view: number, playerPixel: number) =>
            size <= view
              ? (view - size) / 2
              : -Math.max(0, Math.min(size - view, playerPixel - view / 2));
          expect(layout.gridOffset!.x * zoom).toBeCloseTo(
            expected(artwork.width * scale * zoom, width, player.x * layout.tileSize * zoom)
          );
          expect(layout.gridOffset!.y * zoom).toBeCloseTo(
            expected(artwork.height * scale * zoom, height, player.y * layout.tileSize * zoom)
          );
          for (const transition of map.transitions) {
            const point = {
              x: transition.fromPosition.x + 0.5,
              y: transition.fromPosition.y + 0.5,
            };
            const tap = screenToTile(
              (layout.gridOffset!.x + point.x * layout.tileSize) * zoom,
              (layout.gridOffset!.y + point.y * layout.tileSize) * zoom,
              zoom,
              999,
              999,
              layout.gridOffset,
              layout.tileSize
            );
            expect(tap.worldX).toBeCloseTo(point.x);
            expect(tap.worldY).toBeCloseTo(point.y);
          }
        });
      }
    }
  });
}
