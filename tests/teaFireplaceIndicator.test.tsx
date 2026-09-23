import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';

const state = vi.hoisted(() => ({
  pending: true,
  listeners: new Map<string, () => void>(),
}));
vi.mock('../utils/CookingManager', () => ({
  cookingManager: { isTeaLessonPending: () => state.pending },
}));
vi.mock('../utils/EventBus', () => ({
  eventBus: {
    on: (event: string, fn: () => void) => {
      state.listeners.set(event, fn);
      return () => state.listeners.delete(event);
    },
  },
  GameEvent: { PLAYER_MILESTONE: 'milestone', RECIPE_BOOK_UNLOCKED: 'book' },
}));
import { TeaLessonFireplaceIndicator } from '../components/MiniGameLocationIndicators';
import { MUMS_KITCHEN_FIREPLACE } from '../utils/kitchenFireplace';

const props = { tileSize: 64, offsetX: 0, offsetY: 0, showKeyHint: false };

beforeEach(() => {
  cleanup();
  state.pending = true;
  state.listeners.clear();
});

describe('tea lesson fireplace indicator', () => {
  it('labels the fireplace when the player is near it during the lesson', () => {
    render(<TeaLessonFireplaceIndicator {...props} playerPos={{ ...MUMS_KITCHEN_FIREPLACE }} />);
    expect(screen.getByText('Make your tea here')).toBeTruthy();
  });

  it('disappears as soon as the first cup is made', () => {
    const { container } = render(
      <TeaLessonFireplaceIndicator {...props} playerPos={{ x: 12, y: 7 }} />
    );
    expect(container.firstChild).not.toBeNull();
    state.pending = false;
    act(() => state.listeners.get('milestone')?.());
    expect(container.firstChild).toBeNull();
  });

  it('is absent before Mum has given the lesson', () => {
    state.pending = false;
    const { container } = render(
      <TeaLessonFireplaceIndicator {...props} playerPos={{ ...MUMS_KITCHEN_FIREPLACE }} />
    );
    expect(container.firstChild).toBeNull();
  });
});
