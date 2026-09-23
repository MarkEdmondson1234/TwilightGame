/**
 * Which finger (pointer) is holding which D-pad direction.
 *
 * Pure bookkeeping, kept out of the component so the rules that stop a
 * direction "sticking" on iPad (issue #150) are testable without a DOM:
 *
 * 1. **A new press takes ownership.** If a release was ever missed (iOS drops
 *    `pointerup` on system gestures, the magnifier, callouts), the stale owner
 *    used to make the button ignore every later press *and* release — the only
 *    way out was switching apps. Pressing the stuck arrow again now adopts the
 *    new finger, so lifting it releases the direction.
 * 2. **A release is matched by pointer, not by where it lands.** A finger that
 *    slides off the arm still ends its own direction, wherever `pointerup` is
 *    delivered.
 * 3. **No fingers on the screen means nothing is held.** `releaseAll()` backs
 *    the window-level `touchend` safety net.
 */

export type DpadDirection = 'up' | 'down' | 'left' | 'right';

export class DpadPointerTracker {
  private readonly owners = new Map<DpadDirection, number>();

  /**
   * Record `pointerId` as the owner of `direction`. Returns true when the
   * direction was not already held (the caller should emit a press). Taking
   * over a held direction returns false: it is still held, only by a new owner.
   */
  press(direction: DpadDirection, pointerId: number): boolean {
    const wasHeld = this.owners.delete(direction); // re-insert so it counts as newest
    this.owners.set(direction, pointerId);
    return !wasHeld;
  }

  /** Release `direction` if `pointerId` owns it. Returns true if it was released. */
  release(direction: DpadDirection, pointerId: number): boolean {
    if (this.owners.get(direction) !== pointerId) return false;
    this.owners.delete(direction);
    return true;
  }

  /** Release every direction owned by `pointerId`, wherever its release landed. */
  releasePointer(pointerId: number): DpadDirection[] {
    const released: DpadDirection[] = [];
    for (const [direction, owner] of this.owners) {
      if (owner === pointerId) released.push(direction);
    }
    for (const direction of released) this.owners.delete(direction);
    return released;
  }

  /** Release everything (blur, backgrounding, no touches left on the screen). */
  releaseAll(): DpadDirection[] {
    const released = [...this.owners.keys()];
    this.owners.clear();
    return released;
  }

  /** Held directions, oldest press first (a re-press counts as newest). */
  held(): DpadDirection[] {
    return [...this.owners.keys()];
  }

  has(direction: DpadDirection): boolean {
    return this.owners.has(direction);
  }
}
