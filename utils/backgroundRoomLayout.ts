/**
 * backgroundRoomLayout - Where a background-image room's artwork sits on screen
 *
 * Background-image rooms (interiors) don't scroll a tile grid; they draw one
 * piece of hand-painted artwork and lay an invisible collision grid over it.
 * Two numbers decide how that looks at an arbitrary window size:
 *
 * 1. **Cover scale** — how much to enlarge the artwork so it fills the window
 *    with no gap. Issue #26: this used to be derived from the map's declared
 *    `referenceViewport` rather than from the artwork itself, on the assumption
 *    that the artwork at its authored `scale` exactly filled that reference.
 *    It usually didn't. Mum's Kitchen is 960x540 at `scale: 1.3` = 1248x702,
 *    2.6% short of its declared 1280x720 reference — so however the window was
 *    resized, the room came out 2.6% too small and the game's own background
 *    colour showed through around it. Measuring the real artwork removes the
 *    class of bug: `referenceViewport` can no longer be wrong, because it is no
 *    longer consulted.
 *
 * 2. **Pan** — covering means cropping whichever axis has the excess, and a
 *    static centre crop lets the player walk into the cropped region and off
 *    the screen entirely. The pan follows the player within the crop, clamped
 *    so the artwork's edge never leaves the window (which would reopen the gap
 *    the cover scale just closed). This is the same follow-and-clamp rule
 *    `useCamera` applies to tiled rooms, expressed in screen pixels.
 *
 * Both are pure functions of sizes, so `tests/backgroundRoomLayout.test.ts` can
 * check them against the real map definitions without a renderer.
 */

import { TILE_SIZE } from '../constants';
import { ImageRoomLayer, MapDefinition, Position } from '../types';

/** On-screen size of a room's artwork before viewport scaling is applied. */
export interface RoomArtworkSize {
  /** Artwork width in px at the layer's authored `scale`, before viewport scaling */
  width: number;
  /** Artwork height in px at the layer's authored `scale`, before viewport scaling */
  height: number;
  /** The layer's authored `scale` (also the multiplier on TILE_SIZE for this room) */
  layerScale: number;
}

/**
 * Measure the centred artwork of a background-image room.
 *
 * Mirrors what BackgroundImageLayer.createImageLayerSprite does when sizing the
 * sprite, so the two cannot drift: explicit width/height wins, then the map's
 * grid dimensions as the fallback (`useNativeSize` has no dimensions available
 * outside the renderer and falls back the same way it always has).
 *
 * Returns null for maps that aren't background-image rooms or have no centred
 * image layer — those keep viewportScale 1.0 and no pan.
 */
export function getRoomArtworkSize(map: MapDefinition | null | undefined): RoomArtworkSize | null {
  if (!map || map.renderMode !== 'background-image' || !map.layers) return null;

  const centredLayer = map.layers.find(
    (layer) => layer.type === 'image' && (layer as ImageRoomLayer).centered
  ) as ImageRoomLayer | undefined;

  if (!centredLayer) return null;

  const hasExplicitSize = centredLayer.width !== undefined && centredLayer.height !== undefined;
  const baseWidth = hasExplicitSize ? centredLayer.width! : map.width * TILE_SIZE;
  const baseHeight = hasExplicitSize ? centredLayer.height! : map.height * TILE_SIZE;
  const layerScale = centredLayer.scale ?? 1.0;

  return {
    width: baseWidth * layerScale,
    height: baseHeight * layerScale,
    layerScale,
  };
}

/**
 * Scale needed for artwork of the given size to cover the viewport completely.
 *
 * Takes the LARGER of the two axis ratios, so both axes are filled and the
 * excess on the other axis is cropped (and then panned — see getRoomPan).
 * Deliberately unclamped at the top: a clamp here reopens issue #26 as a gap on
 * a large monitor, and upscaling a sprite costs no extra GPU memory, only
 * sharpness. Callers apply their own floor (the game never scales a room DOWN
 * below its authored size).
 */
export function getRoomCoverScale(
  artworkWidth: number,
  artworkHeight: number,
  viewportWidth: number,
  viewportHeight: number
): number {
  if (artworkWidth <= 0 || artworkHeight <= 0) return 1;
  return Math.max(viewportWidth / artworkWidth, viewportHeight / artworkHeight);
}

/**
 * How far to slide the (already cover-scaled) artwork from dead centre so the
 * player stays on screen, on one axis.
 *
 * Positive pan moves the artwork right/down, revealing more of its left/top.
 * Zero when there's nothing cropped on this axis — so a 16:9 room in a 16:9
 * window doesn't move at all.
 */
function panAxis(playerOffset: number, artworkSize: number, viewportSize: number): number {
  const crop = artworkSize - viewportSize;
  if (crop <= 0) return 0;

  // Camera measured from the artwork's leading edge, as useCamera does.
  const wanted = playerOffset - viewportSize / 2;
  const camera = Math.max(0, Math.min(crop, wanted));

  // Convert to an offset from the centred position (camera === crop / 2).
  return crop / 2 - camera;
}

export interface RoomPanConfig {
  /** Player position in tile units */
  playerPos: Position;
  /** On-screen size of one tile (TILE_SIZE * viewportScale * layerScale * zoom) */
  tileSize: number;
  /** Final on-screen artwork size, after viewport scaling and zoom */
  artworkWidth: number;
  artworkHeight: number;
  viewportWidth: number;
  viewportHeight: number;
}

/**
 * Offset from centre for a background-image room's artwork, following the
 * player through whatever the cover scale cropped.
 *
 * Returned as an offset from centre rather than an absolute origin so each
 * centred layer keeps being centred by its own size (rooms pair a background
 * and foreground layer, and nothing guarantees they're the same size) while all
 * of them pan together.
 */
export function getRoomPan(config: RoomPanConfig): Position {
  const { playerPos, tileSize, artworkWidth, artworkHeight, viewportWidth, viewportHeight } = config;

  return {
    x: panAxis(playerPos.x * tileSize, artworkWidth, viewportWidth),
    y: panAxis(playerPos.y * tileSize, artworkHeight, viewportHeight),
  };
}
