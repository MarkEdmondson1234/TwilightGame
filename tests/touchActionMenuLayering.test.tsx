/**
 * The touch action menu must be visible: above the HUD, quick bar, touch
 * controls and chat, and never opened on top of them either (issue #157 —
 * "the popups are also hidden behind UI such as chat").
 *
 * It used Z_RADIAL_MENU (400), under Z_HUD (1000), Z_TOUCH_CONTROLS (1050) and
 * Z_CHAT_PANEL (1055), so a menu opened near the bottom of a phone was half
 * hidden behind the quick bar.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import RadialMenu from '../components/RadialMenu';
import { QUICK_SLOT_MAX_PX } from '../components/QuickSlotBar';
import {
  Z_BATTLE_SPECTATOR,
  Z_CHAT_PANEL,
  Z_DIALOGUE,
  Z_EMOTE_WHEEL,
  Z_HUD,
  Z_INVENTORY,
  Z_INVENTORY_RADIAL_MENU,
  Z_MODAL,
  Z_PRESENCE_INDICATOR,
  Z_QUEST_GUIDANCE,
  Z_TOUCH_ACTION_MENU,
  Z_TOUCH_ACTION_MENU_BACKDROP,
  Z_TOUCH_CONTROLS,
} from '../zIndex';
import {
  dpadFootprint,
  getTouchControlRects,
  getTouchLayout,
  QUICK_BAR_HEIGHT_PX,
  TOUCH_BOTTOM_GAP_PX,
} from '../utils/touchLayout';
import { placeTouchMenu, type Rect } from '../utils/touchMenuPlacement';

vi.mock('../hooks/useTouchDevice', () => ({ useTouchDevice: () => true }));

// An iPhone in landscape, in CSS pixels (the 2532x1170 screenshots in #157).
const PHONE = { width: 844, height: 390 };

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('touch action menu z-order', () => {
  it('sits above every HUD-level control and below modals and dialogue', () => {
    const covered = {
      Z_HUD,
      Z_INVENTORY,
      Z_PRESENCE_INDICATOR,
      Z_QUEST_GUIDANCE,
      Z_TOUCH_CONTROLS,
      Z_CHAT_PANEL,
      Z_BATTLE_SPECTATOR,
      Z_EMOTE_WHEEL,
    };
    const hiddenBehind = Object.entries(covered).filter(
      ([, z]) => z >= Z_TOUCH_ACTION_MENU_BACKDROP
    );
    expect(hiddenBehind, 'the touch action menu would be drawn under these').toEqual([]);
    expect(Z_TOUCH_ACTION_MENU).toBeGreaterThan(Z_TOUCH_ACTION_MENU_BACKDROP);
    expect(Z_TOUCH_ACTION_MENU).toBeLessThan(Z_MODAL);
    expect(Z_TOUCH_ACTION_MENU).toBeLessThan(Z_DIALOGUE);
  });

  it('renders the menu and its backdrop at those layers', () => {
    render(
      <RadialMenu
        position={{ x: 300, y: 200 }}
        onClose={() => {}}
        options={[{ id: 'a', label: 'Talk', onSelect: () => {} }]}
      />
    );
    expect(Number(screen.getByTestId('touch-action-menu-backdrop').style.zIndex)).toBe(
      Z_TOUCH_ACTION_MENU_BACKDROP
    );
    expect(Number(screen.getByRole('dialog', { name: 'Actions' }).style.zIndex)).toBe(
      Z_TOUCH_ACTION_MENU
    );
  });

  it('keeps the inventory override working, above the inventory modal', () => {
    render(
      <RadialMenu
        position={{ x: 300, y: 200 }}
        zIndex={Z_INVENTORY_RADIAL_MENU}
        onClose={() => {}}
        options={[{ id: 'a', label: 'Eat', onSelect: () => {} }]}
      />
    );
    expect(Number(screen.getByTestId('touch-action-menu-backdrop').style.zIndex)).toBe(
      Z_INVENTORY_RADIAL_MENU
    );
    expect(Number(screen.getByRole('dialog', { name: 'Actions' }).style.zIndex)).toBe(
      Z_INVENTORY_RADIAL_MENU + 1
    );
  });
});

describe('touch action menu stays clear of the controls', () => {
  const overlaps = (a: Rect, b: Rect) =>
    a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

  it('the quick-bar footprint covers the tallest slot', () => {
    // Slots up to QUICK_SLOT_MAX_PX plus 6px padding above and below.
    expect(QUICK_BAR_HEIGHT_PX).toBeGreaterThanOrEqual(QUICK_SLOT_MAX_PX + 12);
  });

  it('never opens over the D-pad, quick bar, chat or satchel, wherever the tap', () => {
    const controls = getTouchControlRects(PHONE, getTouchLayout(PHONE.height));
    const menu = { width: 250, height: 70 };
    const bad: string[] = [];
    for (let x = 0; x <= PHONE.width; x += 20) {
      for (let y = 0; y <= PHONE.height; y += 15) {
        const { left, top } = placeTouchMenu({ x, y }, menu, { left: 0, top: 0, ...PHONE }, controls);
        const box = { left, top, right: left + menu.width, bottom: top + menu.height };
        if (controls.some((c) => overlaps(box, c))) bad.push(`tap (${x}, ${y})`);
      }
    }
    expect(bad, 'menu opened on top of a touch control').toEqual([]);
  });

  it('lifts a menu opened from a tap near the D-pad above it', () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: HTMLElement
    ) {
      const isMenu = this.getAttribute('role') === 'dialog';
      const w = isMenu ? 200 : 0;
      const h = isMenu ? 70 : 0;
      return { width: w, height: h, top: 0, left: 0, right: w, bottom: h, x: 0, y: 0, toJSON: () => ({}) } as DOMRect;
    });
    window.innerWidth = PHONE.width;
    window.innerHeight = PHONE.height;
    render(
      <RadialMenu
        position={{ x: 80, y: PHONE.height - 20 }}
        onClose={() => {}}
        options={[{ id: 'a', label: 'Harvest', onSelect: () => {} }]}
      />
    );
    const menu = screen.getByRole('dialog', { name: 'Actions' });
    const bottom = parseFloat(menu.style.top) + 70;
    const dpadTop = PHONE.height - dpadFootprint(getTouchLayout(PHONE.height)).height;
    expect(bottom).toBeLessThanOrEqual(dpadTop);
    expect(bottom).toBeLessThanOrEqual(PHONE.height - TOUCH_BOTTOM_GAP_PX - QUICK_BAR_HEIGHT_PX);
  });
});
