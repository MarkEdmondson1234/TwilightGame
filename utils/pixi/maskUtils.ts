/**
 * Safe PixiJS mask attach/detach.
 *
 * PixiJS masking has one non-obvious ordering rule that, if broken, causes a hard
 * white-screen crash — `can't access property "measurable", this.mask is null` — from deep
 * inside Pixi's bounds/cull pass (AlphaMask.addLocalBounds). See docs/ARCHITECTURE_GOTCHAS.md §6.
 *
 * Assigning `target.mask = maskSprite` attaches an effect to `target` that holds a reference to
 * `maskSprite`. Destroying `maskSprite` — or overwriting `target` — without first clearing
 * `target.mask` leaves that effect pointing at freed memory.
 *
 * ALWAYS route mask assignment through these helpers. `tests/pixiMaskSafety.test.ts` fails the
 * build if any other file assigns `.mask =` directly.
 */

import type { Container } from 'pixi.js';

/**
 * Attach `mask` to `target` in the order Pixi needs: the mask must be in the display tree (so
 * it can be measured) BEFORE it is assigned. Adds it to `parent`, then sets it as the mask.
 */
export function attachMask(target: Container, mask: Container, parent: Container): void {
  parent.addChild(mask);
  target.mask = mask;
}

/**
 * Detach and destroy a mask safely: clear `target.mask` BEFORE destroying the mask sprite.
 * Both arguments are nullable so callers can pass possibly-cleared state without guards.
 * Returns `null` so the caller can reassign in one line:
 *   `this.maskSprite = disposeMask(this.target, this.maskSprite);`
 */
export function disposeMask(target: Container | null, mask: Container | null): null {
  if (mask) {
    if (target) target.mask = null;
    mask.destroy();
  }
  return null;
}
