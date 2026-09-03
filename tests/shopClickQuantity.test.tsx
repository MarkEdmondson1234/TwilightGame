/**
 * @vitest-environment jsdom
 *
 * The quantity picker is the confirmation step for a shop trade.
 *
 * Clicking a slot shows what you are buying — the item preview card — and lets
 * you choose how many before any money moves; single-stock items buy one
 * immediately because there is nothing to choose. Right-click / long-press
 * opens the same picker directly.
 *
 * (A previous experiment made left-click buy exactly one instantly and moved
 * the picker to right-click only. It was reverted at the owner's request: real
 * money moving on a single click skipped the "what am I buying, how many"
 * moment entirely.) Both halves are pinned here: a click must never silently
 * buy more than one, and the picker must still be reachable.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

// Shape must match what ShopUI reads back: { gold, inventory, result: { message } }.
const executeBuyTransaction = vi.fn((..._args: unknown[]) => ({
  gold: 90,
  inventory: [],
  result: { message: 'Bought 1x Radish Seeds' },
}));

const maxBuyQuantity = vi.fn((_itemId: string, _gold: number) => 9);

vi.mock('../utils/ShopManager', () => ({
  shopManager: {
    getInventoryForShop: () => [{ itemId: 'seed_radish', buyPrice: 10, stock: 99 }],
    getMaxBuyQuantity: (itemId: string, gold: number) => maxBuyQuantity(itemId, gold),
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

beforeEach(() => {
  vi.clearAllMocks();
  maxBuyQuantity.mockReturnValue(9);
});
afterEach(cleanup);

describe('shop slot: click vs right-click', () => {
  it('opens the item preview + quantity picker on left-click, and buys nothing yet', () => {
    renderShop();
    fireEvent.click(shopSlot());

    expect(executeBuyTransaction).not.toHaveBeenCalled();
    expect(quantityPickerOpen()).toBe(true);
    // The picker names what is being bought.
    expect(screen.getByText('Radish Seeds')).toBeTruthy();
  });

  it('buys exactly one immediately when only one is affordable', () => {
    maxBuyQuantity.mockReturnValue(1);
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
