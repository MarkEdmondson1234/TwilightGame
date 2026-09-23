/**
 * The visible half of #151/#157: every cooking station glows while the player is on its
 * map, and standing beside one brings up a big tappable "Cook here" button. Replaces the
 * tea-lesson-only kettle marker, which it generalises — during the first lesson the
 * fireplace still says "Make your tea here".
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';

const state = vi.hoisted(() => ({
  bookUnlocked: true,
  teaPending: false,
  placed: [] as unknown[],
  listeners: new Map<string, (payload?: unknown) => void>(),
}));
vi.mock('../utils/CookingManager', () => ({
  cookingManager: {
    isRecipeBookUnlocked: () => state.bookUnlocked,
    isTeaLessonPending: () => state.teaPending,
  },
}));
vi.mock('../utils/EventBus', () => ({
  eventBus: {
    on: (event: string, fn: (payload?: unknown) => void) => {
      state.listeners.set(event, fn);
      return () => state.listeners.delete(event);
    },
  },
  GameEvent: {
    PLAYER_MILESTONE: 'milestone',
    RECIPE_BOOK_UNLOCKED: 'book',
    PLACED_ITEMS_CHANGED: 'placed',
  },
}));
vi.mock('../hooks/useTouchDevice', () => ({ useTouchDevice: () => true }));
vi.mock('../GameState', () => ({ gameState: { getPlacedItems: () => state.placed } }));
vi.mock('../maps', () => ({ mapManager: { getCurrentMap: () => null } }));
import CookingStationIndicators from '../components/CookingStationIndicators';
import { MUMS_KITCHEN_FIREPLACE } from '../utils/kitchenFireplace';

const BY_THE_FIRE = { x: MUMS_KITCHEN_FIREPLACE.x + 1, y: MUMS_KITCHEN_FIREPLACE.y + 1 };
const ACROSS_THE_ROOM = { x: 12, y: 7 };
const glows = (container: HTMLElement) =>
  container.querySelectorAll('.cooking-station-glow').length;

function renderAt(playerPos: { x: number; y: number }, mapId = 'mums_kitchen', onCook = vi.fn()) {
  const view = render(
    <CookingStationIndicators
      currentMapId={mapId}
      playerPos={playerPos}
      tileSize={64}
      onCook={onCook}
    />
  );
  return { ...view, onCook };
}

beforeEach(() => {
  cleanup();
  state.bookUnlocked = true;
  state.teaPending = false;
  state.placed = [];
  state.listeners.clear();
});

describe('cooking station indicators', () => {
  it("glows at Mum's fireplace from anywhere in the kitchen, without a button far away", () => {
    const { container } = renderAt(ACROSS_THE_ROOM);
    expect(glows(container)).toBe(1);
    expect(screen.queryByRole('button', { name: /Cook here/ })).toBeNull();
  });

  it('shows a big tappable Cook here button beside the fire that opens cooking', () => {
    const { onCook } = renderAt(BY_THE_FIRE);
    const button = screen.getByRole('button', { name: 'Cook here' });
    expect(button.closest('[data-game-ui]')).not.toBeNull(); // the world click handler ignores it
    fireEvent.click(button);
    expect(onCook).toHaveBeenCalledOnce();
  });

  it('marks the fireplace for the tea lesson, and stops once the first cup is made', () => {
    state.teaPending = true;
    renderAt(BY_THE_FIRE);
    expect(screen.getByText('Make your tea here')).toBeTruthy();
    state.teaPending = false;
    act(() => state.listeners.get('milestone')?.());
    expect(screen.queryByText('Make your tea here')).toBeNull();
    expect(screen.getByRole('button', { name: 'Cook here' })).toBeTruthy();
  });

  it('shows nothing before Mum has given the recipe book', () => {
    state.bookUnlocked = false;
    const { container } = renderAt(BY_THE_FIRE);
    expect(container.firstChild).toBeNull();
  });

  it('glows at a placed campfire and picks it up when one is placed', () => {
    const { container } = renderAt({ x: 21, y: 21 }, 'village');
    expect(glows(container)).toBe(0);
    state.placed = [
      { id: 'fire1', itemId: 'furniture_campfire', position: { x: 20, y: 20 }, image: '' },
    ];
    act(() => state.listeners.get('placed')?.({ mapId: 'village' }));
    expect(glows(container)).toBe(1);
    expect(screen.getByRole('button', { name: 'Cook here' })).toBeTruthy();
  });
});
