/**
 * ViewFrame — where the world sits on screen this frame.
 *
 * One pure computation for the camera of a tiled map and the transform of a
 * background-image room (pan, grid offset, tile size), derived from the player
 * position. It is called from two places that must agree:
 *
 *   - the game loop, every frame, from the live `playerPosRef` — this is what
 *     moves the PixiJS containers, the DOM world layer and the pointer maths;
 *   - React, from its throttled player-position snapshot — this positions the
 *     DOM overlays (indicators, stamina bar) that only need ~10 Hz.
 *
 * Before this existed the camera was a React memo on `playerPos`, which meant
 * the 3,400-line App had to re-render on every moving frame just to scroll the
 * world (design_docs/planned/PERFORMANCE_MOBILE_PLAN.md §6A).
 */

import { MapDefinition, Position } from '../types';
import { TILE_SIZE } from '../constants';
import { getRoomTransform } from './backgroundRoomLayout';
import { NO_OVERSCROLL, type CameraOverscroll } from './touchLayout';

export interface CameraPosition {
  cameraX: number;
  cameraY: number;
}

/**
 * Camera position for a tiled map: centres small maps, follows the player on
 * large ones, accounting for zoom (at zoom 2x the effective viewport is half
 * the screen size).
 *
 * Pure so the game loop can call it every frame from the live player position
 * (`utils/viewFrame.ts`) while React calls it from its throttled snapshot;
 * both must agree, so there is one implementation.
 *
 * `zoom` is expected to already be at least whatever getCoverZoom
 * (hooks/usePinchZoom.ts) requires for the current map/viewport — App.tsx
 * enforces that as the pinch-zoom minimum. Given that, mapPixelWidth/Height
 * should never actually be smaller than the effective viewport below; the
 * "centre it" branches are a defensive fallback only (issue #26).
 *
 * `overscroll` (screen pixels) lets the camera run past the map's left, right
 * and bottom edges. On a touch device the D-pad, quick bar and chat button sit
 * over the bottom of the screen, so a camera clamped flush to the map put the
 * bottom rows — and the exit icons on them — underneath the controls, where
 * they could not be tapped (issue #157). The overscroll lets the player walk
 * those rows up into view; the canvas shows the map's background colour
 * beyond the edge, behind the controls. Zero everywhere else.
 */
export function computeCameraPosition(
  playerPos: Position,
  mapWidth: number,
  mapHeight: number,
  viewportWidth: number,
  viewportHeight: number,
  zoom: number,
  overscroll: CameraOverscroll = NO_OVERSCROLL
): CameraPosition {
  const mapPixelWidth = mapWidth * TILE_SIZE;
  const mapPixelHeight = mapHeight * TILE_SIZE;

  // Effective viewport accounts for zoom — zoomed in means less visible area
  const effectiveWidth = viewportWidth / zoom;
  const effectiveHeight = viewportHeight / zoom;

  let cameraX: number;
  let cameraY: number;

  // If map is smaller than effective viewport, center it
  if (mapPixelWidth <= effectiveWidth) {
    cameraX = -(effectiveWidth - mapPixelWidth) / 2;
  } else {
    // Otherwise follow player
    cameraX = Math.min(
      mapPixelWidth - effectiveWidth + overscroll.right / zoom,
      // 0 - x, not -x: no overscroll must give +0, exactly the old clamp.
      Math.max(0 - overscroll.left / zoom, playerPos.x * TILE_SIZE - effectiveWidth / 2)
    );
  }

  if (mapPixelHeight <= effectiveHeight) {
    cameraY = -(effectiveHeight - mapPixelHeight) / 2;
  } else {
    cameraY = Math.min(
      mapPixelHeight - effectiveHeight + overscroll.bottom / zoom,
      Math.max(0, playerPos.y * TILE_SIZE - effectiveHeight / 2)
    );
  }

  return { cameraX, cameraY };
}

export interface ViewFrame {
  /** Tiled maps: camera origin in world pixels. Zero-ish for background rooms. */
  cameraX: number;
  cameraY: number;
  /** True when the map is drawn as pre-rendered artwork rather than tiles. */
  backgroundRoom: boolean;
  /**
   * Background rooms: pre-zoom stage offset of the grid origin, pan folded in
   * (docs/ARCHITECTURE_GOTCHAS.md §1). Undefined on tiled maps.
   */
  gridOffset: Position | undefined;
  /** Background rooms: on-screen size of one tile. TILE_SIZE on tiled maps. */
  tileSize: number;
  /** Background rooms: artwork offset from centre that follows the player. */
  pan: Position;
}

export interface ViewFrameInputs {
  map: MapDefinition | null;
  mapWidth: number;
  mapHeight: number;
  /** Window size (what the camera fills). */
  viewport: { width: number; height: number };
  /** Window minus any reserved control strip (what a background room fills). */
  roomViewport: { width: number; height: number };
  viewportScale: number;
  zoom: number;
  /**
   * Tiles to lift the room camera's anchor above the player's feet so the
   * mobile interior camera frames the body rather than the floor. Zero
   * otherwise.
   */
  cameraAnchorLiftTiles: number;
  /**
   * Pixels at the bottom of `roomViewport` covered by the lower controls. The
   * room camera centres the player in the space above them; clamping still uses
   * the whole viewport, so the artwork runs underneath. Zero otherwise.
   */
  bottomInset?: number;
  /**
   * Tiled maps: how far past the map's edges the camera may scroll, so edge
   * rows can be brought out from under the touch controls. See
   * computeCameraPosition. Omitted (zero) on desktop and in background rooms.
   */
  cameraOverscroll?: CameraOverscroll;
}

export function computeViewFrame(inputs: ViewFrameInputs, playerPos: Position): ViewFrame {
  const { map, mapWidth, mapHeight, viewport, roomViewport, viewportScale, zoom } = inputs;
  const anchor =
    inputs.cameraAnchorLiftTiles !== 0
      ? { x: playerPos.x, y: playerPos.y - inputs.cameraAnchorLiftTiles }
      : playerPos;
  const room = getRoomTransform(
    map,
    anchor,
    roomViewport,
    viewportScale,
    zoom,
    inputs.bottomInset ?? 0
  );
  const camera = computeCameraPosition(
    playerPos,
    mapWidth,
    mapHeight,
    viewport.width,
    viewport.height,
    zoom,
    inputs.cameraOverscroll
  );
  return {
    cameraX: camera.cameraX,
    cameraY: camera.cameraY,
    backgroundRoom: map?.renderMode === 'background-image',
    gridOffset: room.gridOffset,
    tileSize: room.tileSize,
    pan: room.pan,
  };
}

/** Value equality, so per-frame consumers can skip work when nothing moved. */
export function isSameViewFrame(a: ViewFrame | null, b: ViewFrame): boolean {
  if (!a) return false;
  return (
    a.cameraX === b.cameraX &&
    a.cameraY === b.cameraY &&
    a.backgroundRoom === b.backgroundRoom &&
    a.tileSize === b.tileSize &&
    a.pan.x === b.pan.x &&
    a.pan.y === b.pan.y &&
    (a.gridOffset === b.gridOffset ||
      (!!a.gridOffset &&
        !!b.gridOffset &&
        a.gridOffset.x === b.gridOffset.x &&
        a.gridOffset.y === b.gridOffset.y))
  );
}
