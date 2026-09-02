/**
 * Long-press tracking — the touch stand-in for a right-click.
 *
 * Pure and framework-free so the two very different callers can share one definition of
 * "what counts as a long press": `hooks/useLongPress.ts` (React props, for HUD surfaces
 * like the inventory grid) and `hooks/useMouseControls.ts` (native listeners on the game
 * container, which must stay `passive: true` for iOS scroll performance).
 *
 * Two behaviours that are easy to get wrong and are the whole reason this is shared:
 *
 * 1. **Drift tolerance.** Cancelling on the first `touchmove` is wrong. A fingertip
 *    wobbles a few pixels over a 500ms hold, and iOS reports that. The press only dies
 *    once the finger travels further than `TIMING.LONG_PRESS_SLOP_PX` from where it began.
 *
 * 2. **Tap suppression.** A long press is followed by `touchend`, which the browser turns
 *    into a click. Without `consumeTap()` the gesture fires twice — opening a menu and
 *    then immediately acting on whatever is underneath it.
 */

import { TIMING } from '../constants';

export interface LongPressOptions {
  /** Fires once the hold survives `delayMs` without drifting past the slop radius. */
  onLongPress: (x: number, y: number) => void;
  /** Hold duration. Defaults to TIMING.LONG_PRESS_MS. */
  delayMs?: number;
  /** Drift tolerance in CSS pixels. Defaults to TIMING.LONG_PRESS_SLOP_PX. */
  slopPx?: number;
}

export interface LongPressTracker {
  /** A finger went down at these client coordinates. */
  start: (x: number, y: number) => void;
  /** The finger moved. Cancels the pending press once it drifts beyond the slop radius. */
  move: (x: number, y: number) => void;
  /** The finger lifted, or the gesture was interrupted. Never fires the callback. */
  cancel: () => void;
  /**
   * True when the last gesture fired a long press. Reading it CLEARS the flag, so the
   * click that the browser synthesises after `touchend` can be swallowed exactly once.
   */
  consumeTap: () => boolean;
  /** Non-destructive peek, for callers that need to decide before the click arrives. */
  didFire: () => boolean;
}

export function createLongPressTracker(options: LongPressOptions): LongPressTracker {
  const delayMs = options.delayMs ?? TIMING.LONG_PRESS_MS;
  const slopPx = options.slopPx ?? TIMING.LONG_PRESS_SLOP_PX;

  let timer: ReturnType<typeof setTimeout> | null = null;
  let originX = 0;
  let originY = 0;
  let fired = false;

  const clearTimer = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };

  return {
    start(x: number, y: number) {
      clearTimer();
      fired = false;
      originX = x;
      originY = y;
      timer = setTimeout(() => {
        timer = null;
        fired = true;
        options.onLongPress(x, y);
      }, delayMs);
    },

    move(x: number, y: number) {
      if (timer === null) return;
      if (Math.hypot(x - originX, y - originY) > slopPx) clearTimer();
    },

    cancel() {
      clearTimer();
    },

    consumeTap() {
      const wasFired = fired;
      fired = false;
      return wasFired;
    },

    didFire() {
      return fired;
    },
  };
}
