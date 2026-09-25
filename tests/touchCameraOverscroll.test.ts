/** @vitest-environment node */
/**
 * Exits at the edge of a map must be reachable on a phone (issue #157: "we
 * can't transition from some mobile levels as the transition icon is behind the
 * item quickbar and controls").
 *
 * The camera was clamped flush to the map, so with the player on the bottom row
 * the bottom of the map sat at the bottom of the screen — under the quick bar,
 * D-pad and chat button, which are above the world. On touch devices the camera
 * may now scroll past the map's bottom and side edges by the controls' footprint
 * (utils/touchLayout.ts), so the edge rows come up into view. Desktop and
 * background-image rooms are unchanged.
 */
import { describe, it, expect } from 'vitest';
import { TILE_SIZE } from '../constants';
import type { MapDefinition, Position } from '../types';
import { computeViewFrame, type ViewFrameInputs } from '../utils/viewFrame';
import {
  getCameraOverscroll,
  getTouchControlRects,
  getTouchLayout,
  NO_OVERSCROLL,
} from '../utils/touchLayout';
import type { Rect } from '../utils/touchMenuPlacement';

// An iPhone in landscape (the #157 screenshots) and an iPad in landscape.
const PHONE = { width: 844, height: 390 };
const IPAD = { width: 1180, height: 820 };

const MAP_W = 40;
const MAP_H = 30;
const tiledMap = { id: 'village', renderMode: undefined } as unknown as MapDefinition;

/** Half the transition icon (a 48px button centred on the tile's top edge). */
const ICON_HALF = 24;

function inputs(
  viewport: { width: number; height: number },
  zoom: number,
  isTouch: boolean,
  map: MapDefinition = tiledMap
): ViewFrameInputs {
  return {
    map,
    mapWidth: MAP_W,
    mapHeight: MAP_H,
    viewport,
    roomViewport: viewport,
    viewportScale: 1,
    zoom,
    cameraAnchorLiftTiles: 0,
    cameraOverscroll: getCameraOverscroll(isTouch, map.renderMode, getTouchLayout(viewport.height)),
  };
}

/** Screen rectangle of the transition icon for an exit on `tile`, as TransitionIndicators draws it. */
function iconRect(tile: Position, frame: { cameraX: number; cameraY: number }, zoom: number): Rect {
  const x = ((tile.x + 0.5) * TILE_SIZE - frame.cameraX) * zoom;
  const y = (tile.y * TILE_SIZE - frame.cameraY) * zoom;
  return { left: x - ICON_HALF, right: x + ICON_HALF, top: y - ICON_HALF, bottom: y + ICON_HALF };
}

const overlaps = (a: Rect, b: Rect) =>
  a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

/** Exits around the bottom and lower sides of the map, with where the player stands to use them. */
function edgeExits(): { exit: Position; player: Position }[] {
  const cases: { exit: Position; player: Position }[] = [];
  for (let x = 0; x < MAP_W; x += 3) {
    cases.push({ exit: { x, y: MAP_H - 1 }, player: { x, y: MAP_H - 1.5 } });
  }
  for (let y = MAP_H - 6; y < MAP_H; y++) {
    cases.push({ exit: { x: 0, y }, player: { x: 1, y } });
    cases.push({ exit: { x: MAP_W - 1, y }, player: { x: MAP_W - 2, y } });
  }
  return cases;
}

describe('touch camera overscroll', () => {
  for (const [name, viewport] of [
    ['phone', PHONE],
    ['iPad', IPAD],
  ] as const) {
    for (const zoom of [1, 1.5]) {
      it(`keeps every edge exit clear of the touch controls (${name}, zoom ${zoom})`, () => {
        const controls = getTouchControlRects(viewport, getTouchLayout(viewport.height));
        const hidden: string[] = [];
        for (const { exit, player } of edgeExits()) {
          const frame = computeViewFrame(inputs(viewport, zoom, true), player);
          const icon = iconRect(exit, frame, zoom);
          const onScreen =
            icon.left >= 0 && icon.right <= viewport.width && icon.top >= 0 && icon.bottom <= viewport.height;
          if (!onScreen || controls.some((c) => overlaps(icon, c))) {
            hidden.push(`exit (${exit.x}, ${exit.y})`);
          }
        }
        expect(hidden, 'these exits would be off screen or under the controls').toEqual([]);
      });
    }
  }

  it('was needed: without it a bottom-edge exit sits under the quick bar', () => {
    const controls = getTouchControlRects(PHONE, getTouchLayout(PHONE.height));
    const noOverscroll = { ...inputs(PHONE, 1, true), cameraOverscroll: NO_OVERSCROLL };
    const frame = computeViewFrame(noOverscroll, { x: 20, y: MAP_H - 1.5 });
    const icon = iconRect({ x: 20, y: MAP_H - 1 }, frame, 1);
    expect(controls.some((c) => overlaps(icon, c))).toBe(true);
  });

  it('leaves the desktop camera clamped flush to the map', () => {
    const frame = computeViewFrame(inputs(PHONE, 1, false), { x: 0, y: MAP_H - 0.5 });
    expect(frame.cameraX).toBe(0);
    expect(frame.cameraY).toBe(MAP_H * TILE_SIZE - PHONE.height);
    expect(getCameraOverscroll(false, undefined, getTouchLayout(PHONE.height))).toEqual(NO_OVERSCROLL);
  });

  it('leaves background-image rooms alone', () => {
    expect(getCameraOverscroll(true, 'background-image', getTouchLayout(PHONE.height))).toEqual(NO_OVERSCROLL);
  });

  it('still follows the player normally away from the edges', () => {
    const player = { x: MAP_W / 2, y: MAP_H / 2 };
    const touch = computeViewFrame(inputs(PHONE, 1, true), player);
    const desktop = computeViewFrame(inputs(PHONE, 1, false), player);
    expect(touch.cameraX).toBe(desktop.cameraX);
    expect(touch.cameraY).toBe(desktop.cameraY);
  });
});
