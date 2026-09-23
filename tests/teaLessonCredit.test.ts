/**
 * Issue #151: tea made through the recipe book must count for Mum exactly as tea
 * made at the fireplace does, and the lesson must never send a new player off to
 * fetch milk that Mum would have supplied.
 *
 * Uses the real CookingManager and the real Mum acknowledgement, so the credit is
 * followed from the cook through to what Mum says — the two were separately
 * mocked before, which is how "made tea but Mum never noticed" went unseen.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  items: {} as Record<string, number>,
  quests: {} as Record<string, unknown>,
  emit: vi.fn(),
}));
vi.mock('../GameState', () => ({
  gameState: {
    loadCookingState: () => null,
    unlockRecipeBook: vi.fn(),
    startQuest: vi.fn(),
    getQuestData: (_quest: string, key: string) => state.quests[key],
    setQuestData: (_quest: string, key: string, value: unknown) => {
      state.quests[key] = value;
    },
  },
}));
vi.mock('../utils/CharacterData', () => ({
  characterData: { save: vi.fn(), saveInventory: vi.fn() },
}));
vi.mock('../utils/inventoryManager', () => ({
  inventoryManager: {
    hasItem: (id: string, n: number) => (state.items[id] ?? 0) >= n,
    getQuantity: (id: string) => state.items[id] ?? 0,
    removeItem: (id: string, n: number) => {
      state.items[id] = (state.items[id] ?? 0) - n;
    },
    addItem: (id: string, n: number) => {
      state.items[id] = (state.items[id] ?? 0) + n;
      return true;
    },
    getInventoryData: () => ({ items: [], tools: [] }),
  },
}));
vi.mock('../utils/StaminaManager', () => ({
  staminaManager: { performActivity: () => true },
}));
vi.mock('../utils/EventBus', () => ({
  eventBus: { emit: state.emit },
  GameEvent: {
    PLAYER_MILESTONE: 'milestone',
    COOKING_COURSE_COMPLETE: 'course',
    RECIPE_BOOK_UNLOCKED: 'book',
  },
}));
vi.mock('../utils/TimeManager', () => ({
  TimeManager: { getCurrentTime: () => ({ totalDays: 1 }) },
}));
vi.mock('../utils/errorReporting', () => ({ reportMessageOnce: vi.fn() }));

import { cookingManager } from '../utils/CookingManager';
import { getMumTeaAcknowledgement } from '../utils/mumTeaAcknowledgement';

/** What the recipe book's Cook button calls (components/book/RecipeContent.tsx). */
const cookFromBook = () => cookingManager.cook('tea', 0, 'mums_kitchen');

beforeEach(() => {
  state.items = {};
  state.quests = {};
  state.emit.mockClear();
  cookingManager.reset();
});

describe('tea lesson credit (issue #151)', () => {
  it('Mum recognises tea made from the recipe book, with the cup kept in the bag', () => {
    cookingManager.unlockRecipeBook();
    expect(getMumTeaAcknowledgement('greeting')).toBeUndefined();

    expect(cookFromBook().success).toBe(true);
    expect(state.items.food_tea).toBe(1);

    expect(getMumTeaAcknowledgement('greeting')).toBe('tea_success');
    // Once only, and it does not take the cup away.
    expect(getMumTeaAcknowledgement('greeting')).toBeUndefined();
    expect(state.items.food_tea).toBe(1);
  });

  it('a player with no milk finishes the lesson without ever being asked for milk', () => {
    cookingManager.unlockRecipeBook();
    const result = cookFromBook();
    expect(result.success).toBe(true);
    expect(result.message).not.toMatch(/milk/i);
    expect(getMumTeaAcknowledgement('teach_cooking')).toBe('tea_success');
    expect(cookingManager.isFireplaceTutorialComplete()).toBe(true);
  });

  it('a player who brought milk spends it once, and does not need to cook again for Mum', () => {
    cookingManager.unlockRecipeBook();
    state.items = { milk: 1, tea_leaves: 1, water: 1 };
    expect(cookFromBook().success).toBe(true);
    expect(state.items.milk).toBe(0);
    expect(getMumTeaAcknowledgement('greeting')).toBe('tea_success');
    expect(cookingManager.getProgress('tea')?.timesCooked).toBe(1);
  });

  it('trying the kettle before asking Mum points at Mum, not at the shop for milk', () => {
    const early = cookFromBook();
    expect(early.success).toBe(false);
    expect(early.message).toMatch(/Ask Mum/);
    expect(early.message).not.toMatch(/milk/i);

    // Asking Mum then unlocks the practice cup — nothing needed to be fetched.
    cookingManager.unlockRecipeBook();
    expect(cookFromBook().success).toBe(true);
    expect(getMumTeaAcknowledgement('greeting')).toBe('tea_success');
  });

  it('a player who already has the ingredients may brew before the lesson, and it still counts', () => {
    state.items = { milk: 1, tea_leaves: 1, water: 1 };
    expect(cookFromBook().success).toBe(true);
    expect(getMumTeaAcknowledgement('greeting')).toBe('tea_success');
  });

  it('after the practice cup, later cups need their own ingredients as before', () => {
    cookingManager.unlockRecipeBook();
    expect(cookFromBook().success).toBe(true);
    const second = cookFromBook();
    expect(second.success).toBe(false);
    expect(second.message).toMatch(/milk/i);
  });
});

describe('tea lesson highlight window', () => {
  it('is pending only between Mum giving the lesson and the first cup', () => {
    expect(cookingManager.isTeaLessonPending()).toBe(false);
    cookingManager.unlockRecipeBook();
    expect(state.emit).toHaveBeenCalledWith('book', {});
    expect(cookingManager.isTeaLessonPending()).toBe(true);
    cookFromBook();
    expect(cookingManager.isTeaLessonPending()).toBe(false);
  });
});
