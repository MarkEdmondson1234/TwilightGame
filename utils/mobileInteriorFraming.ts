/**
 * mobileInteriorFraming — how an illustrated room is framed on a touch device.
 *
 * The mobile interior camera (docs/MOBILE_INTERIOR_CAMERA_PLAN.md) covers two
 * rooms. Both originally reserved a strip of up to 88px above the lower
 * controls: the room was fitted and clipped to the screen above it, and the
 * strip was painted as a solid bar. Mum's Kitchen is 16:9 and a phone in
 * landscape is ~2.2:1, so covering the shortened viewport cropped over a third
 * of the painting's height, and with the player on the floor the camera sat at
 * the bottom of the crop: the top of the kitchen was never visible and a dark
 * bar filled the bottom of the screen (issue #157).
 *
 * Rooms in FULL_HEIGHT_ROOMS now use the whole screen instead. The smallest
 * zoom ("Fit") shows the painting's full height — on a wide phone that leaves
 * narrow margins at the sides rather than cropping the top — and the controls
 * sit over the bottom of the room the way they sit over every outdoor map. The
 * control strip still steers the camera: when zoomed in, the follow anchor is
 * the centre of the screen above the controls (getRoomPan's `bottomInset`).
 *
 * The shop keeps the reserved strip. Its large authored character and counter
 * were framed and reviewed against that strip, so it changes only with its own
 * device review.
 */

import { getRoomCoverScale } from './backgroundRoomLayout';

/** Rooms that use the mobile interior camera at all. */
export const MOBILE_INTERIOR_CAMERA_ROOMS: readonly string[] = ['mums_kitchen', 'shop'];

/** Rooms that fit their whole painted height on screen, controls overlaid. */
export const FULL_HEIGHT_ROOMS: readonly string[] = ['mums_kitchen'];

/** Most of the screen height the lower controls may claim. */
const MAX_CONTROL_INSET_PX = 88;
const MAX_CONTROL_INSET_FRACTION = 0.25;

export interface MobileInteriorFraming {
  /** The mobile interior camera applies (pinch zoom, grounding, anchor lift). */
  enabled: boolean;
  /** Pixels at the bottom the room is clipped out of and painted as a bar. */
  reservedInset: number;
  /** Pixels at the bottom the camera's follow anchor keeps the player above. */
  anchorInset: number;
  /** Fit means the full painted height (not full coverage). */
  fitWholeHeight: boolean;
}

export function getMobileInteriorFraming(
  mapId: string,
  isTouchDevice: boolean,
  viewportHeight: number
): MobileInteriorFraming {
  const enabled = isTouchDevice && MOBILE_INTERIOR_CAMERA_ROOMS.includes(mapId);
  if (!enabled) return { enabled, reservedInset: 0, anchorInset: 0, fitWholeHeight: false };
  const controls = Math.min(MAX_CONTROL_INSET_PX, viewportHeight * MAX_CONTROL_INSET_FRACTION);
  const fitWholeHeight = FULL_HEIGHT_ROOMS.includes(mapId);
  return fitWholeHeight
    ? { enabled, reservedInset: 0, anchorInset: controls, fitWholeHeight }
    : { enabled, reservedInset: controls, anchorInset: 0, fitWholeHeight };
}

/**
 * Smallest zoom at which the artwork's whole height is on screen, never
 * zooming out further than the zoom that covers the viewport.
 *
 * Where the screen is relatively taller than the artwork (an iPad with a 16:9
 * room) this IS the cover zoom — the sides are cropped and panned as before.
 * Where it is wider (a phone in landscape) it is smaller than cover: the full
 * height shows, with margins either side instead of a cropped top and bottom.
 */
export function getRoomHeightFitZoom(
  artworkWidth: number,
  artworkHeight: number,
  viewportWidth: number,
  viewportHeight: number
): number {
  const cover = getRoomCoverScale(artworkWidth, artworkHeight, viewportWidth, viewportHeight);
  if (artworkHeight <= 0) return cover;
  return Math.min(cover, viewportHeight / artworkHeight);
}
