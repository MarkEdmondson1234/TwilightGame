/**
 * The recipe book can be read anywhere, but Cook is only enabled beside a fire (#151/#157).
 * Uses the real station predicate (utils/cookingStations.ts) — only the save and the map
 * are stubbed — so the book and the "Cook here" button cannot disagree about "near".
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
const cook = vi.hoisted(() =>
  vi.fn(() => ({ success: true, message: 'Your tea is in your bag.' }))
);
const state = vi.hoisted(() => ({ placed: [] as unknown[] }));
vi.mock('../utils/CookingManager', () => ({
  cookingManager: {
    isRecipeUnlocked: () => true,
    isRecipeMastered: () => false,
    cook,
    getUnlockedRecipes: () => [],
    getMasteredRecipes: () => [],
    getProgress: () => undefined,
  },
}));
vi.mock('../utils/AudioManager', () => ({ audioManager: { playSfx: vi.fn() } }));
vi.mock('../components/CookingResultPopup', () => ({
  default: ({ result }: { result: { message: string } }) => <p role="status">{result.message}</p>,
}));
vi.mock('../GameState', () => ({ gameState: { getPlacedItems: () => state.placed } }));
vi.mock('../maps', () => ({ mapManager: { getCurrentMap: () => null } }));
import RecipeContent from '../components/book/RecipeContent';
import { cookingTheme } from '../components/book/bookThemes';
import { NO_COOKING_STATION_MESSAGE, TEA_NEEDS_FIREPLACE_MESSAGE } from '../utils/cookingStations';
import { MUMS_KITCHEN_FIREPLACE } from '../utils/kitchenFireplace';

const BY_MUMS_FIRE = { x: MUMS_KITCHEN_FIREPLACE.x + 1, y: MUMS_KITCHEN_FIREPLACE.y + 1 };

const openRecipe = (name: RegExp) => fireEvent.click(screen.getByRole('button', { name }));
const cookButton = () => screen.getByRole('button', { name: /Cook!/ });

beforeEach(() => {
  cleanup();
  cook.mockClear();
  state.placed = [];
});

describe('recipe book cooking needs a fire', () => {
  it("cooks tea beside Mum's fireplace, and explains where the tea went", () => {
    render(
      <RecipeContent
        theme={cookingTheme}
        currentMapId="mums_kitchen"
        playerPosition={BY_MUMS_FIRE}
        nearbyNPCs={['mum_kitchen']}
      />
    );
    openRecipe(/^Tea/);
    expect(cookButton()).toBeEnabled();
    expect(screen.getByRole('note')).toHaveTextContent("beside Mum's fireplace");
    fireEvent.click(cookButton());
    expect(cook).toHaveBeenCalledWith('tea', 0, 'mums_kitchen');
    expect(screen.getByRole('status')).toHaveTextContent('in your bag');
  });

  it('can be read anywhere, but Cook is greyed out away from a fire and says where to go', () => {
    render(
      <RecipeContent theme={cookingTheme} currentMapId="village" playerPosition={{ x: 5, y: 5 }} />
    );
    for (const recipe of [/^Tea/, /^Pickled Onions/]) {
      openRecipe(recipe);
      expect(cookButton()).toBeDisabled();
      expect(screen.getByRole('note')).toHaveTextContent(NO_COOKING_STATION_MESSAGE);
    }
    expect(cook).not.toHaveBeenCalled();
  });

  it("is greyed out across Mum's kitchen, away from the fire", () => {
    render(
      <RecipeContent
        theme={cookingTheme}
        currentMapId="mums_kitchen"
        playerPosition={{ x: 12, y: 7 }}
      />
    );
    openRecipe(/^Pickled Onions/);
    expect(cookButton()).toBeDisabled();
  });

  it('cooks beside a placed campfire, but tea still needs the kettle at home', () => {
    state.placed = [
      { id: 'fire1', itemId: 'furniture_campfire', position: { x: 20, y: 20 }, image: '' },
    ];
    render(
      <RecipeContent
        theme={cookingTheme}
        currentMapId="village"
        playerPosition={{ x: 21, y: 21 }}
      />
    );
    openRecipe(/^Pickled Onions/);
    expect(cookButton()).toBeEnabled();
    fireEvent.click(cookButton());
    expect(cook).toHaveBeenCalledWith('pickled_onions', 0, 'village');

    openRecipe(/^Tea/);
    expect(cookButton()).toBeDisabled();
    expect(screen.getByRole('note')).toHaveTextContent(TEA_NEEDS_FIREPLACE_MESSAGE);
  });
});
