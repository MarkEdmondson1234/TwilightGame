import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  items: {} as Record<string, number>,
  saved: null as unknown,
  spend: vi.fn(() => true),
  emit: vi.fn(),
  save: vi.fn(),
}));
vi.mock('../GameState', () => ({
  gameState: {
    loadCookingState: () => state.saved,
    unlockRecipeBook: vi.fn(),
  },
}));
vi.mock('../utils/CharacterData', () => ({
  characterData: {
    save: state.save,
    saveInventory: vi.fn(),
  },
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
vi.mock('../utils/StaminaManager', () => ({ staminaManager: { performActivity: state.spend } }));
vi.mock('../utils/EventBus', () => ({
  eventBus: { emit: state.emit },
  GameEvent: {
    PLAYER_MILESTONE: 'milestone',
    COOKING_COURSE_COMPLETE: 'course',
  },
}));
vi.mock('../utils/TimeManager', () => ({
  TimeManager: { getCurrentTime: () => ({ totalDays: 1 }) },
}));
vi.mock('../utils/errorReporting', () => ({ reportMessageOnce: vi.fn() }));
import { cookingManager } from '../utils/CookingManager';
import { getActivityCandidates } from '../utils/activityDiscovery';

beforeEach(() => {
  state.items = {};
  state.saved = null;
  state.spend.mockReset().mockReturnValue(true);
  state.emit.mockClear();
  state.save.mockClear();
  cookingManager.reset();
});

describe('first tea lesson', () => {
  it('rejects the wrong room without spending anything or completing the lesson', () => {
    cookingManager.unlockRecipeBook();
    state.items = { milk: 1, tea_leaves: 1, water: 1 };
    expect(cookingManager.cook('tea', 0, 'village').success).toBe(false);
    expect(state.items.milk).toBe(1);
    expect(state.spend).not.toHaveBeenCalled();
    expect(cookingManager.isFireplaceTutorialComplete()).toBe(false);
  });
  it('supplies one practice cup, records success, and preserves credit after reload', () => {
    cookingManager.unlockRecipeBook();
    state.items = { milk: 1 };
    const result = cookingManager.cook('tea', 0, 'mums_kitchen');
    expect(result.success).toBe(true);
    expect(result.message).toContain('in your bag');
    expect(state.items.milk).toBe(0);
    expect(state.items.food_tea).toBe(1);
    expect(cookingManager.isFireplaceTutorialComplete()).toBe(true);
    expect(state.emit).toHaveBeenCalledWith('milestone', { milestoneId: 'cooking' });
    state.saved = cookingManager.getCookingState();
    cookingManager.reset();
    cookingManager.initialise();
    expect(cookingManager.isFireplaceTutorialComplete()).toBe(true);
    expect(cookingManager.cook('tea', 0, 'mums_kitchen').success).toBe(false);
    expect(state.items.food_tea).toBe(1);
    expect(state.spend).toHaveBeenCalledTimes(1);
  });
  it('a tired attempt neither consumes ingredients nor uses up the practice cup', () => {
    cookingManager.unlockRecipeBook();
    state.items = { milk: 1 };
    state.spend.mockReturnValue(false);
    expect(cookingManager.cook('tea', 0, 'mums_kitchen').success).toBe(false);
    expect(state.items.milk).toBe(1);
    expect(cookingManager.isFireplaceTutorialComplete()).toBe(false);
    state.spend.mockReturnValue(true);
    expect(cookingManager.cook('tea', 0, 'mums_kitchen').success).toBe(true);
  });
  it('normal tea requires ingredients, but a failed attempt spends no stamina', () => {
    expect(cookingManager.cook('tea', 0, 'mums_kitchen').success).toBe(false);
    expect(state.spend).not.toHaveBeenCalled();
    state.items = { milk: 1, tea_leaves: 1, water: 1 };
    expect(cookingManager.cook('tea', 0, 'mums_kitchen').success).toBe(true);
    expect(state.items).toEqual({ milk: 0, tea_leaves: 0, water: 0, food_tea: 1 });
    expect(cookingManager.isFireplaceTutorialComplete()).toBe(true);
  });
  it.each([true, false])(
    'preserves old unlocks and repairs actual tea history (legacy flag %s)',
    (flag) => {
      state.saved = {
        recipeBookUnlocked: true,
        fireplaceTutorialComplete: flag,
        unlockedRecipes: ['tea'],
        recipeProgress: flag
          ? {}
          : {
              tea: { recipeId: 'tea', timesCooked: 1, isMastered: false, unlockedAt: 1 },
            },
      };
      cookingManager.initialise();
      expect(cookingManager.isFireplaceTutorialComplete()).toBe(true);
    }
  );
  it('offers the cooking lead only when Mum is present in her kitchen', () => {
    const ctx = {
      mapId: 'mums_kitchen',
      season: 'spring',
      nearbyNpcs: [{ id: 'mum_kitchen', name: 'Mum' }],
    };
    expect(getActivityCandidates(ctx)).toContainEqual({ id: 'cooking', npcId: 'mum_kitchen' });
    expect(getActivityCandidates({ ...ctx, nearbyNpcs: [] })).toEqual([]);
    expect(getActivityCandidates({ ...ctx, mapId: 'village' })).toEqual([]);
  });
});
