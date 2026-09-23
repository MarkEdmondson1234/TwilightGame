/** @vitest-environment node */
/**
 * Where the touch action menu opens (utils/touchMenuPlacement.ts, issue #157).
 * It sits beside the tap, above the finger, and inside the screen.
 */
import { describe, it, expect } from 'vitest';
import {
  placeTouchMenu,
  TOUCH_MENU_FINGER_GAP_PX,
  TOUCH_MENU_MARGIN_PX,
} from '../utils/touchMenuPlacement';

// An iPhone in landscape, in CSS pixels.
const VIEWPORT = { left: 0, top: 0, width: 844, height: 390 };
const MENU = { width: 160, height: 64 };

describe('placeTouchMenu', () => {
  it('opens just above the finger, centred on the tap', () => {
    const at = { x: 400, y: 250 };
    const { left, top } = placeTouchMenu(at, MENU, VIEWPORT);
    expect(left).toBe(at.x - MENU.width / 2);
    expect(top + MENU.height).toBe(at.y - TOUCH_MENU_FINGER_GAP_PX);
  });

  it('opens below the finger when there is no room above', () => {
    const at = { x: 400, y: 40 };
    const { top } = placeTouchMenu(at, MENU, VIEWPORT);
    expect(top).toBe(at.y + TOUCH_MENU_FINGER_GAP_PX);
  });

  it('stays inside the screen at every edge', () => {
    for (const at of [
      { x: 0, y: 0 },
      { x: VIEWPORT.width, y: 0 },
      { x: 0, y: VIEWPORT.height },
      { x: VIEWPORT.width, y: VIEWPORT.height },
    ]) {
      const { left, top } = placeTouchMenu(at, MENU, VIEWPORT);
      expect(left).toBeGreaterThanOrEqual(TOUCH_MENU_MARGIN_PX);
      expect(top).toBeGreaterThanOrEqual(TOUCH_MENU_MARGIN_PX);
      expect(left + MENU.width).toBeLessThanOrEqual(VIEWPORT.width - TOUCH_MENU_MARGIN_PX);
      expect(top + MENU.height).toBeLessThanOrEqual(VIEWPORT.height - TOUCH_MENU_MARGIN_PX);
    }
  });

  it('pins a menu taller than the screen to the top, so the first option is reachable', () => {
    const { top } = placeTouchMenu({ x: 400, y: 200 }, { width: 160, height: 900 }, VIEWPORT);
    expect(top).toBe(TOUCH_MENU_MARGIN_PX);
  });
});
