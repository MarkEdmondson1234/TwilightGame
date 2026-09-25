/**
 * touchLayout — where the fixed touch controls sit on a phone or tablet.
 *
 * The D-pad, the quick slot bar, the chat and emote buttons and the satchel are
 * fixed to the bottom of the screen on touch devices. Two things need to know
 * where they are without measuring the DOM every frame:
 *
 *   - the touch action menu (components/RadialMenu.tsx), which must never open
 *     underneath them (issue #157: "the popups are hidden behind UI such as chat");
 *   - the camera (utils/viewFrame.ts), which lets the world scroll past the map's
 *     bottom and side edges by these amounts, so a player standing at the edge —
 *     and the exit icon beside them — is drawn above the controls rather than
 *     under the quick bar (issue #157: "we can't transition from some mobile
 *     levels").
 *
 * The components position themselves from these constants, so the footprint and
 * the controls cannot drift apart. The D-pad's size is the one exception: it is a
 * Tailwind class (`w-36`/`w-44`), which must be a literal to be generated, so
 * TouchControls keeps the class and this file keeps the matching number.
 *
 * All values are CSS pixels measured from the viewport edge, excluding the
 * device's safe-area insets (which only ever add space).
 */

import type { Rect } from './touchMenuPlacement';

/** Gap between the bottom of the screen and the D-pad, quick bar and satchel. */
export const TOUCH_BOTTOM_GAP_PX = 8;

/** Horizontal padding the D-pad sits inside. */
export const TOUCH_SIDE_PADDING_PX = 12;

/**
 * D-pad square: `w-44` normally, `w-36` in compact mode (phones in landscape),
 * `w-28` on a tiny screen (a small phone in landscape with the browser's toolbars
 * showing — 568x260 in production, where the 144px pad was 58% of the height).
 */
export const DPAD_SIZE_PX = 176;
export const DPAD_COMPACT_SIZE_PX = 144;
export const DPAD_TINY_SIZE_PX = 112;

/**
 * The button that tucks the D-pad away or brings it back. Tapping the ground
 * already walks the player there, so on a small screen the pad is optional.
 * It sits in the cross's empty top-left corner, overhanging it by
 * DPAD_TOGGLE_OVERHANG_PX, so it costs the screen almost nothing.
 */
export const DPAD_TOGGLE_SIZE_PX = 32;
export const DPAD_TOGGLE_OVERHANG_PX = 8;

/** Quick bar: slots up to 48px plus 6px padding top and bottom. */
export const QUICK_BAR_HEIGHT_PX = 60;

/** Gap between the D-pad (or its toggle) and the start of the quick bar. */
export const QUICK_BAR_DPAD_GAP_PX = 20;

/** Where the quick bar stops, clear of the satchel. */
export const QUICK_BAR_RIGHT_PX = 80;

/** Satchel button in the bottom-right corner. */
export const SATCHEL_SIZE_PX = 60;

/** Chat button, above the satchel. */
export const CHAT_BUTTON_RIGHT_PX = 84;
export const CHAT_BUTTON_BOTTOM_PX = 96;
export const CHAT_BUTTON_WIDTH_PX = 64;
export const CHAT_BUTTON_HEIGHT_PX = 44;

/** Emote button, inside the touch-controls strip (which sits TOUCH_BOTTOM_GAP_PX up). */
export const EMOTE_BUTTON_RIGHT_PX = 24;
export const EMOTE_BUTTON_BOTTOM_PX = 88;
export const EMOTE_BUTTON_SIZE_PX = 48;

/** Viewport heights below which the touch controls use their smaller sizes. */
export const TOUCH_COMPACT_MAX_HEIGHT_PX = 600;
export const TOUCH_TINY_MAX_HEIGHT_PX = 340;

export type TouchLayoutTier = 'regular' | 'compact' | 'tiny';

/** Everything that decides where the touch controls sit. */
export interface TouchLayout {
  tier: TouchLayoutTier;
  /** The player has tucked the D-pad away; only its toggle button remains. */
  dpadHidden: boolean;
}

export function getTouchLayoutTier(viewportHeight: number): TouchLayoutTier {
  if (viewportHeight < TOUCH_TINY_MAX_HEIGHT_PX) return 'tiny';
  if (viewportHeight < TOUCH_COMPACT_MAX_HEIGHT_PX) return 'compact';
  return 'regular';
}

export function isCompactTouchLayout(viewportHeight: number): boolean {
  return getTouchLayoutTier(viewportHeight) !== 'regular';
}

export function getTouchLayout(viewportHeight: number, dpadHidden = false): TouchLayout {
  return { tier: getTouchLayoutTier(viewportHeight), dpadHidden };
}

export function dpadSize(tier: TouchLayoutTier): number {
  if (tier === 'tiny') return DPAD_TINY_SIZE_PX;
  return tier === 'compact' ? DPAD_COMPACT_SIZE_PX : DPAD_SIZE_PX;
}

/**
 * Footprint of the D-pad from the bottom-left corner, including the toggle that
 * overhangs its top-left corner. With the pad hidden, the toggle is all that is left.
 */
export function dpadFootprint(layout: TouchLayout): { width: number; height: number } {
  if (layout.dpadHidden) {
    return {
      width: TOUCH_SIDE_PADDING_PX + DPAD_TOGGLE_SIZE_PX,
      height: TOUCH_BOTTOM_GAP_PX + DPAD_TOGGLE_SIZE_PX,
    };
  }
  const size = dpadSize(layout.tier);
  return {
    width: TOUCH_SIDE_PADDING_PX + size,
    height: TOUCH_BOTTOM_GAP_PX + size + DPAD_TOGGLE_OVERHANG_PX,
  };
}

/** Where the quick bar starts: clear of the D-pad, or of its toggle when the pad is hidden. */
export function quickBarLeft(layout: TouchLayout): number {
  return dpadFootprint(layout).width + QUICK_BAR_DPAD_GAP_PX;
}

/** Footprint of the chat, emote and satchel buttons in the bottom-right corner. */
export function rightClusterFootprint(): { width: number; height: number } {
  return {
    width: Math.max(
      CHAT_BUTTON_RIGHT_PX + CHAT_BUTTON_WIDTH_PX,
      EMOTE_BUTTON_RIGHT_PX + EMOTE_BUTTON_SIZE_PX,
      SATCHEL_SIZE_PX
    ),
    height: Math.max(
      CHAT_BUTTON_BOTTOM_PX + CHAT_BUTTON_HEIGHT_PX,
      TOUCH_BOTTOM_GAP_PX + EMOTE_BUTTON_BOTTOM_PX + EMOTE_BUTTON_SIZE_PX
    ),
  };
}

/**
 * The screen rectangles the touch controls cover, for a viewport of this size.
 * Anything a player needs to tap must stay out of all of them.
 */
export function getTouchControlRects(
  viewport: { width: number; height: number },
  layout: TouchLayout
): Rect[] {
  const { width: vw, height: vh } = viewport;
  const dpad = dpadFootprint(layout);
  const right = rightClusterFootprint();
  const barHeight = TOUCH_BOTTOM_GAP_PX + QUICK_BAR_HEIGHT_PX;
  return [
    // D-pad and its toggle, bottom-left.
    { left: 0, top: vh - dpad.height, right: dpad.width, bottom: vh },
    // Quick bar, treated as the whole bottom strip (it spans D-pad to satchel).
    { left: 0, top: vh - barHeight, right: vw, bottom: vh },
    // Chat, emote and satchel, bottom-right.
    { left: vw - right.width, top: vh - right.height, right: vw, bottom: vh },
  ];
}

/**
 * How far past the map's edges the camera may scroll on a touch device, in
 * screen pixels, so the edge rows and columns can be brought out from under the
 * controls. The bottom clears the tallest control (so an exit anywhere along the
 * bottom edge lands above the D-pad and chat button, not just the quick bar); the
 * sides clear the D-pad on the left and the chat/emote/satchel column on the
 * right, for exits low down on a side edge.
 */
export interface CameraOverscroll {
  left: number;
  right: number;
  bottom: number;
}

export const NO_OVERSCROLL: CameraOverscroll = { left: 0, right: 0, bottom: 0 };

export function getTouchCameraOverscroll(layout: TouchLayout): CameraOverscroll {
  const dpad = dpadFootprint(layout);
  const right = rightClusterFootprint();
  return {
    left: dpad.width,
    right: right.width,
    bottom: Math.max(dpad.height, right.height, TOUCH_BOTTOM_GAP_PX + QUICK_BAR_HEIGHT_PX),
  };
}

/**
 * The camera overscroll for the current device and map. Only tiled maps on a
 * touch device get one: desktop has no controls over the world, and
 * background-image rooms have their own framing (utils/mobileInteriorFraming.ts)
 * and must not show anything past their painted edges.
 */
export function getCameraOverscroll(
  isTouchDevice: boolean,
  renderMode: string | undefined,
  layout: TouchLayout
): CameraOverscroll {
  if (!isTouchDevice || renderMode === 'background-image') return NO_OVERSCROLL;
  return getTouchCameraOverscroll(layout);
}

/**
 * The world height, in unzoomed pixels, a touch player should always be able to
 * see: what an 844x390 phone shows at the old 50% zoom floor (about 12 tiles).
 * A shorter screen may zoom out further to reach it, instead of seeing eight
 * tiles with half of them under the controls. The render cost is the same as
 * that phone's, since the same amount of world is on screen.
 */
export const TOUCH_MIN_VISIBLE_WORLD_HEIGHT_PX = 780;

/** Never zoom out past this, whatever the screen: sprites become unreadable. */
export const TOUCH_ABSOLUTE_MIN_ZOOM = 0.3;

/**
 * The lowest camera zoom on tiled maps. 0.5 everywhere except touch screens too
 * short to show TOUCH_MIN_VISIBLE_WORLD_HEIGHT_PX at 0.5.
 */
export function getWorldMinZoom(
  isTouchDevice: boolean,
  viewportHeight: number,
  defaultMin: number
): number {
  if (!isTouchDevice || viewportHeight <= 0) return defaultMin;
  return Math.min(
    defaultMin,
    Math.max(TOUCH_ABSOLUTE_MIN_ZOOM, viewportHeight / TOUCH_MIN_VISIBLE_WORLD_HEIGHT_PX)
  );
}

/**
 * The smallest on-screen scale for in-world prompts. Phones have always drawn them
 * at the 0.5 camera zoom; below that (tiny screens, getWorldMinZoom) they are
 * scaled back up to that size rather than shrinking with the world.
 */
export const WORLD_UI_MIN_SCALE = 0.5;

/** Counter-scale for `.world-ui` elements inside the zoomed DOM world layer. */
export function getWorldUiScale(zoom: number): number {
  if (!(zoom > 0)) return 1;
  return Math.max(1, WORLD_UI_MIN_SCALE / zoom);
}
