/**
 * @vitest-environment jsdom
 *
 * Issue #157: on phones the quick slot bar was a fixed row of 48px slots inside a
 * horizontally scrolling strip, so the last few slots were off screen until swiped.
 * On touch the nine slots now share the bar's width and shrink rather than scroll,
 * and every item icon fills its slot instead of sitting in a fixed 32px box.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import QuickSlotBar, { QUICK_SLOT_COUNT, QUICK_SLOT_MAX_PX } from '../components/QuickSlotBar';

const items = [
  { id: 'food_apple', name: 'Apple', icon: '/apple.png', quantity: 3 },
  { id: 'tool_hoe', name: 'Hoe', icon: '⛏️', quantity: 1 },
];

afterEach(cleanup);

function bar(isTouchDevice: boolean) {
  const view = render(
    <QuickSlotBar
      isTouchDevice={isTouchDevice}
      items={items}
      selectedSlot={null}
      onSlotClick={() => {}}
    />
  );
  return view.container.querySelector<HTMLElement>('[data-quick-slot-bar]')!;
}

describe('quick slot bar on touch devices', () => {
  it('fits all nine slots in shrinking columns instead of a scrolling strip', () => {
    const root = bar(true);
    expect(root.style.overflowX, 'the bar must not scroll sideways').not.toBe('auto');
    expect(screen.getAllByRole('button')).toHaveLength(QUICK_SLOT_COUNT);

    const grid = root.firstElementChild as HTMLElement;
    // minmax(0, …) lets a column shrink below the max slot size on a narrow phone;
    // a fixed width here is what made the row overflow.
    expect(grid.style.gridTemplateColumns).toBe(
      `repeat(${QUICK_SLOT_COUNT}, minmax(0, ${QUICK_SLOT_MAX_PX}px))`
    );
    for (const slot of screen.getAllByRole('button')) {
      expect(slot.className).toContain('w-full');
      expect(slot.className).not.toContain('w-12');
    }
  });

  it('draws item artwork at the size of the slot, not a fixed small box', () => {
    bar(true);
    const icon = screen.getByRole('img', { name: 'Apple' });
    expect(icon.className).toContain('w-full');
    expect(icon.className).toContain('h-full');
  });

  it('keeps the desktop bar at its fixed slot size', () => {
    bar(false);
    for (const slot of screen.getAllByRole('button')) {
      expect(slot.className).toContain('w-12');
    }
  });
});
