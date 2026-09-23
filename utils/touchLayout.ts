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

/** D-pad square: `w-44` normally, `w-36` in compact mode (phones in landscape). */
export const DPAD_SIZE_PX = 176;
export const DPAD_COMPACT_SIZE_PX = 144;

/** Quick bar: slots up to 48px plus 6px padding top and bottom. */
export const QUICK_BAR_HEIGHT_PX = 60;

/** Where the quick bar starts, clear of the D-pad (compact and normal). */
export const QUICK_BAR_LEFT_COMPACT_PX = 176;
export const QUICK_BAR_LEFT_PX = 208;

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

/** Height of the D-pad's footprint from the bottom of the screen. */
export function dpadFootprint(compact: boolean): { width: number; height: number } {
  const size = compact ? DPAD_COMPACT_SIZE_PX : DPAD_SIZE_PX;
  return { width: TOUCH_SIDE_PADDING_PX + size, height: TOUCH_BOTTOM_GAP_PX + size };
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
  compact: boolean
): Rect[] {
  const { width: vw, height: vh } = viewport;
  const dpad = dpadFootprint(compact);
  const right = rightClusterFootprint();
  const barHeight = TOUCH_BOTTOM_GAP_PX + QUICK_BAR_HEIGHT_PX;
  return [
    // D-pad, bottom-left.
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

export function getTouchCameraOverscroll(compact: boolean): CameraOverscroll {
  const dpad = dpadFootprint(compact);
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
  viewportHeight: number
): CameraOverscroll {
  if (!isTouchDevice || renderMode === 'background-image') return NO_OVERSCROLL;
  return getTouchCameraOverscroll(isCompactTouchLayout(viewportHeight));
}

/** Viewport height below which the touch controls use their compact size. */
export const TOUCH_COMPACT_MAX_HEIGHT_PX = 600;

export function isCompactTouchLayout(viewportHeight: number): boolean {
  return viewportHeight < TOUCH_COMPACT_MAX_HEIGHT_PX;
}
