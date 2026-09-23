/**
 * WebGL context-loss recovery policy for the world renderer.
 *
 * iOS drops the page's WebGL context under memory pressure — typically on a
 * map transition that follows something heavy, like a goblin fight (issue
 * #157). The canvas goes blank, so the player sees the page background (the
 * plain green behind the world) with the HUD still drawn over it.
 *
 * Recovery has to rebuild the PixiJS application on a **fresh canvas element**.
 * Re-initialising on the canvas that lost its context cannot work, for two
 * reasons that are both invisible:
 *
 * - `app.destroy(true)` removes the canvas from the DOM, so the new renderer
 *   draws into a detached element nobody can see.
 * - Pixi's `GlContextSystem.destroy()` calls `WEBGL_lose_context.loseContext()`,
 *   so even a canvas left in place hands the next `getContext()` a context that
 *   is already lost.
 *
 * So the caller remounts the `<canvas>` (a React `key` bump) and re-runs its
 * initialisation against the new element. This module decides *when*: as soon
 * as the browser reports the context restored, or after `waitMs` if it never
 * does — which on iOS is the common case.
 *
 * Pure and timer-injectable so the policy can be tested without a GPU.
 */

export interface ContextRecoveryOptions {
  /** Rebuild the renderer on a fresh canvas. Called at most once per loss. */
  onRebuild: () => void;
  /** How long to wait for `webglcontextrestored` before rebuilding anyway. */
  waitMs: number;
  /** Injected for tests; defaults to the global timers. */
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (handle: unknown) => void;
}

export interface ContextRecovery {
  /** Wire to the canvas's `webglcontextlost` event (after `preventDefault()`). */
  handleLost: () => void;
  /** Wire to the canvas's `webglcontextrestored` event. */
  handleRestored: () => void;
  /** Cancel any pending rebuild — call from the renderer's teardown. */
  dispose: () => void;
}

export function createContextRecovery(options: ContextRecoveryOptions): ContextRecovery {
  const setTimer = options.setTimer ?? ((fn: () => void, ms: number) => setTimeout(fn, ms));
  const clearTimer =
    options.clearTimer ?? ((handle: unknown) => clearTimeout(handle as ReturnType<typeof setTimeout>));

  let lost = false;
  let rebuilt = false;
  let timer: unknown = null;

  const cancelTimer = () => {
    if (timer !== null) {
      clearTimer(timer);
      timer = null;
    }
  };

  const rebuild = () => {
    cancelTimer();
    if (rebuilt) return;
    rebuilt = true;
    options.onRebuild();
  };

  return {
    handleLost() {
      // Our own teardown also loses the context (Pixi's destroy calls
      // loseContext), so a second "lost" after the rebuild is expected noise.
      if (lost || rebuilt) return;
      lost = true;
      timer = setTimer(rebuild, options.waitMs);
    },
    handleRestored() {
      // A restore we did not see lost (or one after we rebuilt) needs nothing.
      if (!lost) return;
      rebuild();
    },
    dispose() {
      cancelTimer();
      rebuilt = true;
    },
  };
}
