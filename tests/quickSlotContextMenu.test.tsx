/**
 * @vitest-environment jsdom
 *
 * The quick slot bar is the same nine slots as the top row of the inventory, so it must
 * offer the same actions.
 *
 * Before this it was the one place an item was visible but could not be acted on: eating
 * an apple meant opening the inventory modal to reach a slot already on screen. The bar
 * carries no item knowledge itself — it reports which slot was right-clicked and App
 * decides, using the same `openItemActionMenu` the inventory grid uses — so what is
 * pinned here is that contract.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import QuickSlotBar from '../components/QuickSlotBar';

const items = [
  { id: 'food_apple', name: 'Apple', icon: '🍎', quantity: 3 },
  { id: 'tool_hoe', name: 'Hoe', icon: '⛏️', quantity: 1 },
];

const onSlotClick = vi.fn();
const onSlotContextMenu = vi.fn();

function renderBar() {
  return render(
    <QuickSlotBar
      items={items}
      selectedSlot={null}
      onSlotClick={onSlotClick}
      onSlotContextMenu={onSlotContextMenu}
    />
  );
}

const slots = () => screen.getAllByRole('button');

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

describe('quick slot bar', () => {
  it('selects the slot on a left-click and opens nothing', () => {
    renderBar();
    fireEvent.click(slots()[0]);

    expect(onSlotClick).toHaveBeenCalledWith(0);
    expect(onSlotContextMenu).not.toHaveBeenCalled();
  });

  it('asks for the action menu on a right-click, and does not also select', () => {
    renderBar();
    fireEvent.contextMenu(slots()[0], { clientX: 120, clientY: 640 });

    expect(onSlotContextMenu).toHaveBeenCalledWith(0, { clientX: 120, clientY: 640 });
    expect(onSlotClick).not.toHaveBeenCalled();
  });

  it('reports the slot index, which is what App maps back to the item', () => {
    renderBar();
    fireEvent.contextMenu(slots()[1], { clientX: 0, clientY: 0 });
    expect(onSlotContextMenu.mock.calls[0][0]).toBe(1);
  });

  it('suppresses the browser menu, so ours is what the player sees', () => {
    renderBar();
    const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
    slots()[0].dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it('ignores a right-click on an empty slot', () => {
    renderBar();
    fireEvent.contextMenu(slots()[5], { clientX: 0, clientY: 0 });
    expect(onSlotContextMenu).not.toHaveBeenCalled();
  });

  it('carries no-touch-callout, or iOS answers the long press with its own menu', () => {
    renderBar();
    expect(slots()[0].className).toContain('no-touch-callout');
  });
});
