/** @vitest-environment node */
import { describe, expect, it } from 'vitest';
import { DpadPointerTracker } from '../utils/dpadPointers';

// Issue #150: the D-pad "stuck" on iPad and walked the player until a wall.
describe('DpadPointerTracker', () => {
  it('releases only for the owning pointer', () => {
    const t = new DpadPointerTracker();
    expect(t.press('up', 1)).toBe(true);
    expect(t.release('up', 2)).toBe(false);
    expect(t.held()).toEqual(['up']);
    expect(t.release('up', 1)).toBe(true);
    expect(t.held()).toEqual([]);
  });

  it('lets a new press take over a direction whose release was lost', () => {
    const t = new DpadPointerTracker();
    t.press('left', 1); // release for pointer 1 never arrives
    expect(t.press('left', 5)).toBe(false); // already held — no second press
    expect(t.release('left', 1)).toBe(false); // the stale owner no longer counts
    expect(t.release('left', 5)).toBe(true);
    expect(t.has('left')).toBe(false);
  });

  it('treats a re-pressed direction as the newest (it is the one lit)', () => {
    const t = new DpadPointerTracker();
    t.press('up', 1);
    t.press('right', 2);
    t.press('up', 3);
    expect(t.held()).toEqual(['right', 'up']);
  });

  it('releases every direction a pointer owns, wherever it ended', () => {
    const t = new DpadPointerTracker();
    t.press('up', 1);
    t.press('right', 2);
    expect(t.releasePointer(1)).toEqual(['up']);
    expect(t.releasePointer(1)).toEqual([]);
    expect(t.held()).toEqual(['right']);
  });

  it('releaseAll empties the tracker and reports what it released', () => {
    const t = new DpadPointerTracker();
    t.press('down', 1);
    t.press('left', 2);
    expect(t.releaseAll()).toEqual(['down', 'left']);
    expect(t.releaseAll()).toEqual([]);
    expect(t.held()).toEqual([]);
  });
});
