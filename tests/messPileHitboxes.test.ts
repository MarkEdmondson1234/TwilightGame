/** @vitest-environment node */
/**
 * Regression test for the mess-pile hit-detection bug in the seed shed
 * (Mr Fox's Picnic quest): clicking the pile that's visually on the right
 * was clearing the pile drawn on the left, and vice versa.
 *
 * Root cause: pile 0's artwork (shed_interior_mess1.png) is actually painted
 * on the right of the shed backdrop, and pile 2's artwork
 * (shed_interior_mess3.png) on the left — the opposite of what
 * MESS_PILE_POSITIONS' relativeX/description said. checkMessPileClick()
 * itself was always correct; only the position data was wrong.
 */
import { describe, it, expect } from 'vitest';
import { checkMessPileClick } from '../utils/messInteractions';
import { MESS_PILE_POSITIONS } from '../data/questHandlers/mrFoxPicnicHandler';

// Simple 1x1 image bounds so screen coords equal relative coords.
const IMAGE_LEFT = 0;
const IMAGE_TOP = 0;
const IMAGE_WIDTH = 1;
const IMAGE_HEIGHT = 1;

describe('mess pile hitboxes', () => {
  it('pile 0 (shed_interior_mess1.png) is hit on the right of the image', () => {
    const result = checkMessPileClick(0.8, 0.47, IMAGE_LEFT, IMAGE_TOP, IMAGE_WIDTH, IMAGE_HEIGHT);
    expect(result.hit).toBe(true);
    expect(result.pileIndex).toBe(0);
  });

  it('pile 2 (shed_interior_mess3.png) is hit on the left of the image', () => {
    const result = checkMessPileClick(0.2, 0.47, IMAGE_LEFT, IMAGE_TOP, IMAGE_WIDTH, IMAGE_HEIGHT);
    expect(result.hit).toBe(true);
    expect(result.pileIndex).toBe(2);
  });

  it('pile 1 (shed_interior_mess2.png) stays centred', () => {
    const result = checkMessPileClick(0.49, 0.47, IMAGE_LEFT, IMAGE_TOP, IMAGE_WIDTH, IMAGE_HEIGHT);
    expect(result.hit).toBe(true);
    expect(result.pileIndex).toBe(1);
  });

  it('every pile position is unique so hitboxes cannot silently overlap', () => {
    const xs = MESS_PILE_POSITIONS.map((p) => p.relativeX);
    expect(new Set(xs).size).toBe(xs.length);
  });
});
