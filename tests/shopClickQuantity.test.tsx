/**
 * @vitest-environment jsdom
 *
 * Buying one thing should cost one click.
 *
 * The shop used to open a quantity slider for any stack of more than one, so buying a
 * single packet of seeds meant a slider, a plus button and a confirm — while buying one
 * of something you could only afford one of went straight through. The common case paid
 * for the rare one.
 *
 * Now left-click trades exactly one and right-click (long-press on touch) opens the
 * picker, matching every other "more options" gesture in the game. This is real money
 * moving on a single click, so both halves are pinned: a click must never silently buy
 * more than one, and the picker must still be reachable.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

// Shape must match what ShopUI reads back: { gold, inventory, result: { message } }.
const executeBuyTransaction = vi.fn((..._args: unknown[]) => ({
  gold: 90,
  inventory: [],
  result: { message: 'Bought 1x Radish Seeds' },
}));

vi.mock('../utils/ShopManager', () => ({
  shopManager: {
    getInventoryForShop: () => [{ itemId: 'seed_radish', buyPrice: 10, stock: 99 }],
    getMaxBuyQuantity: () => 9,
    getItemSellPrice: () => 5,
    executeBuyTransaction: (...args: unknown[]) => executeBuyTransaction(...args),
    executeSellTransaction: () => ({
      gold: 105,
      inventory: [],
      result: { message: 'Sold 1x Radish Seeds' },
    }),
    validateBuyTransaction: () => ({ valid: true }),
    validateSellTransaction: () => ({ valid: true }),
  },
}));
vi.mock('../utils/MagicManager', () => ({ magicManager: { isMagicBookUnlocked: () => false } }));
vi.mock('../utils/AudioManager', () => ({ audioManager: { playSfx: () => {} } }));
vi.mock('../utils/DecorationManager', () => ({
  decorationManager: { getDecorationsForItem: () => [] },
}));
vi.mock('../utils/TimeManager', () => ({
  TimeManager: { getCurrentTime: () => ({ season: 'Spring', day: 1, hour: 12 }) },
}));
vi.mock('../data/items', () => ({
  getItem: (id: string) => ({ id, displayName: 'Radish Seeds', description: '', icon: '🌱' }),
  ItemCategory: { SEED: 'SEED' },
}));

import ShopUI from '../components/ShopUI';

function renderShop() {
  return render(
    <ShopUI
      isOpen
      shopId="shop"
      onClose={() => {}}
      playerGold={100}
      playerInventory={[]}
      onTransaction={() => {}}
    />
  );
}

/** The shop-side slot button for the one stocked item. */
function shopSlot(): HTMLElement {
  const button = screen.getAllByRole('button').find((b) => b.textContent?.includes('10'));
  if (!button) throw new Error('shop slot not found');
  return button;
}

const quantityPickerOpen = () => screen.queryByText(/confirm/i) !== null;

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

describe('shop slot: click vs right-click', () => {
  it('buys exactly one on a left-click, with no picker in the way', () => {
    renderShop();
    fireEvent.click(shopSlot());

    expect(executeBuyTransaction).toHaveBeenCalledTimes(1);
    // Quantity is the second argument — never more than the player asked for.
    expect(executeBuyTransaction.mock.calls[0][1]).toBe(1);
    expect(quantityPickerOpen()).toBe(false);
  });

  it('opens the quantity picker on right-click, and buys nothing yet', () => {
    renderShop();
    fireEvent.contextMenu(shopSlot());

    expect(executeBuyTransaction).not.toHaveBeenCalled();
    expect(quantityPickerOpen()).toBe(true);
  });

  it('suppresses the browser menu on right-click, so ours is what appears', () => {
    renderShop();
    const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
    shopSlot().dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });
});
