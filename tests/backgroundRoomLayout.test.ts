/** @vitest-environment node */
/**
 * Regression for issue #26, reopened: background-image rooms (interiors) still
 * didn't fill the screen, and after the first fix made them fill it, the player
 * could walk off the edge of the screen.
 *
 * Two root causes, both in this file's helpers:
 *
 * 1. **The gap.** The cover scale was computed from the map's declared
 *    `referenceViewport` rather than from the artwork it was supposed to
 *    describe. Mum's Kitchen is 960x540 at `scale: 1.3` = 1248x702, 2.6% short
 *    of its declared 1280x720 — so `cover` dutifully filled 1280x720 worth of
 *    space with 1248x702 worth of room, at every window size, and the game's
 *    background colour showed through the 2.6%. `getRoomCoverScale` measures
 *    the artwork instead, which removes the class of bug rather than the one
 *    bad number: `referenceViewport` can no longer be wrong because it is no
 *    longer consulted. (It also explains why this looked fine on one laptop and
 *    broken on a bigger screen — below 1280x720 the 1.0 floor kicks in and the
 *    artwork is already larger than the window.)
 *
 * 2. **Walking off-screen.** Covering means cropping, and the crop was a static
 *    centre crop with no camera, so the cropped strip was simply never
 *    reachable — walk toward it and the character left the screen. `getRoomPan`
 *    slides the artwork to follow the player, clamped at the artwork's edges so
 *    the crop can never reopen the gap from (1).
 *
 * WHAT BREAKS IF THESE FAIL: the room stops filling the window (a coloured band
 * down one side), or the player walks out of view in an interior. Neither
 * throws; both are only visible by looking at the game at the right window size.
 */
import { describe, it, expect, beforeAll } from 'vitest';

import { mapManager } from '../maps/MapManager';
import { getRoomArtworkSize, getRoomCoverScale, getRoomPan } from '../utils/backgroundRoomLayout';
import { TILE_SIZE, TILE_LEGEND, PLAYER_SIZE } from '../constants';
import { CollisionType, MapDefinition, TileData } from '../types';

/**
 * Real window sizes, chosen to span the aspect ratios that actually break this:
 * 16:9 (where cover and contain agree and nothing crops), 16:10 and 3:2 (common
 * on Windows laptops and Surfaces — this is what the bug was reported on), 4:3,
 * and a 4K screen well past any scale clamp.
 */
const VIEWPORTS: Array<[number, number]> = [
  [1280, 720], // 16:9, exactly the declared reference
  [1366, 768], // 16:9
  [1440, 900], // 16:10
  [1680, 1050], // 16:10
  [1536, 864], // 16:9
  [1920, 1080], // 16:9
  [2256, 1504], // 3:2 (Surface)
  [1024, 768], // 4:3
  [2560, 1440], // 16:9
  [3840, 2160], // 4K
  [900, 1400], // portrait — a narrow window, or a tablet stood up
];

/** Everything App.tsx derives for one room at one window size. */
function layoutFor(map: MapDefinition, viewportWidth: number, viewportHeight: number) {
  const artwork = getRoomArtworkSize(map)!;
  // App.tsx floors the scale at 1.0 — a small window shows the room at its
  // authored size (cropped and panned), rather than shrinking it.
  const viewportScale = Math.max(
    1.0,
    getRoomCoverScale(artwork.width, artwork.height, viewportWidth, viewportHeight)
  );
  return {
    artwork,
    viewportScale,
    artworkWidth: artwork.width * viewportScale,
    artworkHeight: artwork.height * viewportScale,
    tileSize: TILE_SIZE * viewportScale * artwork.layerScale,
  };
}

/** Screen position of a point given in tile units, matching effectiveGridOffset. */
function screenPos(
  map: MapDefinition,
  tilePos: { x: number; y: number },
  viewportWidth: number,
  viewportHeight: number
) {
  const { artworkWidth, artworkHeight, tileSize } = layoutFor(map, viewportWidth, viewportHeight);
  const pan = getRoomPan({
    playerPos: tilePos,
    tileSize,
    artworkWidth,
    artworkHeight,
    viewportWidth,
    viewportHeight,
  });
  return {
    x: (viewportWidth - artworkWidth) / 2 + pan.x + tilePos.x * tileSize,
    y: (viewportHeight - artworkHeight) / 2 + pan.y + tilePos.y * tileSize,
  };
}

let backgroundImageMaps: Array<{ id: string; map: MapDefinition }> = [];

beforeAll(async () => {
  const { initializeMaps } = await import('../maps/index');
  initializeMaps();

  backgroundImageMaps = mapManager
    .getAllMapIds()
    .map((id) => ({ id, map: mapManager.getMap(id) as MapDefinition }))
    .filter(({ map }) => map && map.renderMode === 'background-image' && getRoomArtworkSize(map));
});

describe('getRoomCoverScale', () => {
  it('fills both axes, taking whichever needs more', () => {
    // 16:9 artwork in a 16:10 window: height is the binding constraint.
    const scale = getRoomCoverScale(1248, 702, 1440, 900);
    expect(scale).toBeCloseTo(900 / 702, 6);
    expect(1248 * scale).toBeGreaterThanOrEqual(1440 - 1e-6);
    expect(702 * scale).toBeGreaterThanOrEqual(900 - 1e-6);
  });

  it('is exactly 1 when the artwork already matches the window', () => {
    expect(getRoomCoverScale(1248, 702, 1248, 702)).toBeCloseTo(1, 9);
  });

  it("measures the artwork, not the map's declared reference viewport", () => {
    // The reopened half of #26, with Mum's Kitchen's real numbers. Scaling from
    // the declared 1280x720 reference leaves the 1248x702 artwork 2.6% short of
    // a 1920x1080 window on BOTH axes — a band of background colour all round,
    // at every window size, which is exactly what was reported.
    const fromReference = Math.max(1920 / 1280, 1080 / 720);
    expect(1248 * fromReference).toBeLessThan(1920);
    expect(702 * fromReference).toBeLessThan(1080);

    const fromArtwork = getRoomCoverScale(1248, 702, 1920, 1080);
    expect(1248 * fromArtwork).toBeGreaterThanOrEqual(1920 - 1e-6);
    expect(702 * fromArtwork).toBeGreaterThanOrEqual(1080 - 1e-6);
  });

  it('is not capped, so a big monitor cannot reopen the gap', () => {
    // A 4K window needs >3x. The old code clamped at 2.5, which would leave a
    // 700px band down the side.
    const scale = getRoomCoverScale(1248, 702, 3840, 2160);
    expect(scale).toBeGreaterThan(2.5);
    expect(1248 * scale).toBeGreaterThanOrEqual(3840 - 1e-6);
  });
});

describe('getRoomPan', () => {
  const base = {
    tileSize: 100,
    artworkWidth: 1600,
    artworkHeight: 900,
    viewportWidth: 1440,
    viewportHeight: 900,
  };

  it('does not move an axis that has nothing cropped', () => {
    // Height matches exactly here — a 16:9 room in a 16:9 window must sit still.
    const pan = getRoomPan({ ...base, playerPos: { x: 2, y: 8 } });
    expect(pan.y).toBe(0);
  });

  it('follows the player across the cropped axis', () => {
    const left = getRoomPan({ ...base, playerPos: { x: 1, y: 4 } }).x;
    const right = getRoomPan({ ...base, playerPos: { x: 14, y: 4 } }).x;
    // Player moving right means the artwork slides left.
    expect(right).toBeLessThan(left);
  });

  it('sits dead centre when the player is at the middle of the artwork', () => {
    // Artwork centre is 800px in, i.e. tile 8 at tileSize 100.
    expect(getRoomPan({ ...base, playerPos: { x: 8, y: 4 } }).x).toBeCloseTo(0, 9);
  });

  it('clamps at the artwork edges rather than exposing a gap', () => {
    const crop = base.artworkWidth - base.viewportWidth; // 160
    // Well beyond either end of the room, including outside it entirely.
    for (const x of [-50, -1, 0, 8, 15, 16, 99]) {
      const pan = getRoomPan({ ...base, playerPos: { x, y: 4 } }).x;
      expect(Math.abs(pan)).toBeLessThanOrEqual(crop / 2 + 1e-9);

      const origin = (base.viewportWidth - base.artworkWidth) / 2 + pan;
      expect(origin).toBeLessThanOrEqual(1e-9); // no gap on the left
      expect(origin + base.artworkWidth).toBeGreaterThanOrEqual(base.viewportWidth - 1e-9);
    }
  });

  it('keeps any point inside the artwork on screen', () => {
    // The property that stops the player walking off the edge: if they are
    // within the room's artwork at all, the pan puts them within the window.
    for (let offset = 0; offset <= base.artworkWidth; offset += 25) {
      const pan = getRoomPan({
        ...base,
        playerPos: { x: offset / base.tileSize, y: 4 },
      }).x;
      const screenX = (base.viewportWidth - base.artworkWidth) / 2 + pan + offset;
      expect(screenX).toBeGreaterThanOrEqual(-1e-9);
      expect(screenX).toBeLessThanOrEqual(base.viewportWidth + 1e-9);
    }
  });
});

describe('every background-image room, at real window sizes', () => {
  it('has artwork to measure (otherwise it silently falls back to the reference)', () => {
    expect(backgroundImageMaps.length).toBeGreaterThan(0);
    for (const { id, map } of backgroundImageMaps) {
      expect(getRoomArtworkSize(map), `${id} has no centred image layer`).not.toBeNull();
    }
  });

  it('fills the window with no gap', () => {
    const gaps: string[] = [];
    for (const { id, map } of backgroundImageMaps) {
      for (const [vw, vh] of VIEWPORTS) {
        const { artworkWidth, artworkHeight } = layoutFor(map, vw, vh);
        if (artworkWidth < vw - 1e-6 || artworkHeight < vh - 1e-6) {
          gaps.push(
            `${id} at ${vw}x${vh}: artwork covers only ${artworkWidth.toFixed(0)}x${artworkHeight.toFixed(0)}`
          );
        }
      }
    }
    expect(
      gaps,
      `Background colour shows through around these rooms. Check the centred image layer's ` +
        `width/height/scale in the map definition — getRoomCoverScale sizes from those.\n${gaps.join('\n')}`
    ).toEqual([]);
  });

  it('keeps the player visible on every walkable tile', () => {
    const offScreen: string[] = [];

    for (const { id, map } of backgroundImageMaps) {
      const characterScale = map.characterScale ?? 1.0;

      for (const [vw, vh] of VIEWPORTS) {
        const { tileSize } = layoutFor(map, vw, vh);
        // "Visible" means the sprite is on screen, not that its centre point is.
        // A few of these rooms have a walkable bottom row whose centre sits a
        // pixel or two below the artwork (the walkmesh is 15x10 tiles over 16:9
        // art), and the character there is still plainly in view.
        const margin = (PLAYER_SIZE * characterScale * tileSize) / 2;

        for (let y = 0; y < map.grid.length; y++) {
          for (let x = 0; x < map.grid[y].length; x++) {
            const tile = TILE_LEGEND[map.grid[y][x]] as TileData | undefined;
            if (tile?.collisionType !== CollisionType.WALKABLE) continue;

            const centre = { x: x + 0.5, y: y + 0.5 };
            const pos = screenPos(map, centre, vw, vh);
            if (
              pos.x < -margin ||
              pos.x > vw + margin ||
              pos.y < -margin ||
              pos.y > vh + margin
            ) {
              offScreen.push(
                `${id} at ${vw}x${vh}: tile (${x},${y}) renders at (${pos.x.toFixed(0)},${pos.y.toFixed(0)})`
              );
            }
          }
        }
      }
    }

    expect(
      offScreen,
      `A player standing on these tiles would be off the edge of the screen. Either the ` +
        `room's walkmesh reaches outside its artwork, or the pan stopped following the ` +
        `player (getRoomPan / effectiveGridOffset in App.tsx).\n${offScreen.slice(0, 20).join('\n')}`
    ).toEqual([]);
  });
});
