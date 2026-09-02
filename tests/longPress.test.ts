/** @vitest-environment node
 *
 * Long press is right-click on touch. Every context menu in the game is reachable on
 * iPad only through this gesture, so the two ways it silently fails are worth pinning:
 *
 *  - **Too strict.** Cancelling on the first `touchmove` — what the inventory used to do
 *    — kills the press on the finger wobble that a child holding still produces anyway.
 *    The menu then opens perhaps two times in three, which reads as a flaky game.
 *  - **Too lax.** Without tap suppression the browser's synthesised click still lands
 *    after the hold, so the gesture both opens a menu and acts on what is underneath it.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createLongPressTracker } from '../utils/longPress';
import { TIMING } from '../constants';

describe('long press tracker', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('fires once the hold outlasts the delay', () => {
    const onLongPress = vi.fn();
    const tracker = createLongPressTracker({ onLongPress });

    tracker.start(100, 100);
    expect(onLongPress).not.toHaveBeenCalled();

    vi.advanceTimersByTime(TIMING.LONG_PRESS_MS);
    expect(onLongPress).toHaveBeenCalledWith(100, 100);
  });

  it('does not fire when the finger lifts early — a tap still means tap', () => {
    const onLongPress = vi.fn();
    const tracker = createLongPressTracker({ onLongPress });

    tracker.start(100, 100);
    vi.advanceTimersByTime(TIMING.LONG_PRESS_MS - 50);
    tracker.cancel();
    vi.advanceTimersByTime(500);

    expect(onLongPress).not.toHaveBeenCalled();
  });

  it('tolerates the drift of a finger trying to hold still', () => {
    const onLongPress = vi.fn();
    const tracker = createLongPressTracker({ onLongPress });

    tracker.start(100, 100);
    // Well inside the slop radius — this is what "holding still" actually looks like.
    tracker.move(103, 98);
    tracker.move(101, 104);
    vi.advanceTimersByTime(TIMING.LONG_PRESS_MS);

    expect(onLongPress).toHaveBeenCalledTimes(1);
  });

  it('cancels once the finger travels beyond the slop radius — that is a drag', () => {
    const onLongPress = vi.fn();
    const tracker = createLongPressTracker({ onLongPress });

    tracker.start(100, 100);
    tracker.move(100 + TIMING.LONG_PRESS_SLOP_PX + 5, 100);
    vi.advanceTimersByTime(TIMING.LONG_PRESS_MS);

    expect(onLongPress).not.toHaveBeenCalled();
  });

  it('reports the origin, not where the finger drifted to', () => {
    const onLongPress = vi.fn();
    const tracker = createLongPressTracker({ onLongPress });

    tracker.start(200, 300);
    tracker.move(205, 305);
    vi.advanceTimersByTime(TIMING.LONG_PRESS_MS);

    // The menu must open on the thing the player aimed at.
    expect(onLongPress).toHaveBeenCalledWith(200, 300);
  });

  it('consumeTap swallows the click the browser synthesises after a hold — exactly once', () => {
    const tracker = createLongPressTracker({ onLongPress: () => {} });

    tracker.start(10, 10);
    vi.advanceTimersByTime(TIMING.LONG_PRESS_MS);

    expect(tracker.consumeTap()).toBe(true);
    // A second read must not swallow the next, unrelated tap.
    expect(tracker.consumeTap()).toBe(false);
  });

  it('leaves an ordinary tap alone', () => {
    const tracker = createLongPressTracker({ onLongPress: () => {} });

    tracker.start(10, 10);
    vi.advanceTimersByTime(50);
    tracker.cancel();

    expect(tracker.consumeTap()).toBe(false);
  });

  it('a cancelled press does not fire later from a stale timer', () => {
    const onLongPress = vi.fn();
    const tracker = createLongPressTracker({ onLongPress });

    tracker.start(10, 10);
    tracker.cancel();
    tracker.start(50, 50);
    vi.advanceTimersByTime(TIMING.LONG_PRESS_MS);

    expect(onLongPress).toHaveBeenCalledTimes(1);
    expect(onLongPress).toHaveBeenCalledWith(50, 50);
  });
});
