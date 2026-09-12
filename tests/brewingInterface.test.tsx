/**
 * BrewingInterface tests — the cauldron UI over MagicManager.
 *
 * The cauldron interaction previously opened a "brewing coming soon" placeholder
 * while MagicManager already implemented the whole system (recipes, ingredients,
 * mastery, apprentice levels) and the magic book already brewed from PotionContent.
 * These tests lock the station UI contract: it lists the player's unlocked
 * recipes, brews through MagicManager (single source of truth), surfaces its
 * player-ready result message (including the missing-ingredients failure), and
 * celebrates apprentice level-ups.
 */
/** @vitest-environment jsdom */
import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import BrewingInterface from '../components/BrewingInterface';
import { eventBus, GameEvent } from '../utils/EventBus';
import type { PotionRecipeDefinition } from '../data/potionRecipes';

const recipe: PotionRecipeDefinition = {
  id: 'friendship_elixir',
  name: 'friendship_elixir',
  displayName: 'Friendship Elixir',
  level: 'novice',
  description: 'A warm, rose-pink potion.',
  ingredients: [{ itemId: 'honey', quantity: 1 }],
  brewingTime: 15,
  difficulty: 1,
  resultItemId: 'potion_friendship',
  resultQuantity: 1,
  effectDescription: 'Give to an NPC for +300 friendship',
};

const brew = vi.fn();
const getUnlockedRecipes = vi.fn(() => [recipe]);
const playSfx = vi.fn();
const getQuantity = vi.fn((_itemId: string) => 2);

vi.mock('../utils/MagicManager', () => ({
  magicManager: {
    getUnlockedRecipes: () => getUnlockedRecipes(),
    getProgress: () => ({ recipeId: recipe.id, timesBrewed: 2, isMastered: true, unlockedAt: 1 }),
    hasIngredients: () => true,
    isLevelUnlocked: () => true,
    brew: (id: string) => brew(id),
  },
}));
vi.mock('../utils/AudioManager', () => ({ audioManager: { playSfx: (k: string) => playSfx(k) } }));
vi.mock('../utils/inventoryManager', () => ({
  inventoryManager: { getQuantity: (id: string) => getQuantity(id) },
}));
const device = vi.hoisted(() => ({ mobile: false }));
vi.mock('../hooks/useTouchDevice', () => ({ useTouchDevice: () => device.mobile }));

function renderInterface() {
  return render(<BrewingInterface isOpen onClose={vi.fn()} />);
}

beforeEach(() => {
  device.mobile = false;
  brew.mockReset().mockReturnValue({ success: true, message: 'Brewed 1x Friendship Elixir!' });
  getUnlockedRecipes.mockClear().mockImplementation(() => [recipe]);
  playSfx.mockClear();
  getQuantity.mockClear().mockImplementation(() => 5);
});

afterEach(() => cleanup());

describe('BrewingInterface', () => {
  it('lists unlocked recipes with mastery and brewing time', () => {
    renderInterface();
    expect(screen.getByText('Friendship Elixir')).toBeInTheDocument();
    expect(screen.getByText(/novice • 15s/i)).toBeInTheDocument();
    // Mastered marker from getProgress
    expect(screen.getByText('⭐')).toBeInTheDocument();
  });

  it('shows recipe details and brews through MagicManager', async () => {
    renderInterface();
    fireEvent.click(screen.getByText('Friendship Elixir'));

    // Effect description and ingredient status render
    expect(screen.getByText(/\+300 friendship/)).toBeInTheDocument();
    expect(screen.getByText('5/1')).toBeInTheDocument();

    fireEvent.click(screen.getByText('🧪 Brew!'));

    expect(playSfx).toHaveBeenCalledWith('sfx_potion_making');
    expect(brew).toHaveBeenCalledWith('friendship_elixir');
    await waitFor(() =>
      expect(screen.getByText(/Brewed 1x Friendship Elixir!/)).toBeInTheDocument()
    );
  });

  it('surfaces MagicManager failure messages (missing ingredients)', async () => {
    brew.mockReturnValue({
      success: false,
      message: 'You are missing these ingredients: honey',
    });
    renderInterface();
    fireEvent.click(screen.getByText('Friendship Elixir'));
    fireEvent.click(screen.getByText('🧪 Brew!'));

    // On failure the popup swaps the message for an ingredient checklist
    await waitFor(() => expect(screen.getByText(/missing a few ingredients/i)).toBeInTheDocument());
  });

  it('shows the teach-me empty state when no recipes are unlocked', () => {
    getUnlockedRecipes.mockImplementation(() => []);
    renderInterface();
    expect(screen.getByText(/you don't know any potion recipes yet/i)).toBeInTheDocument();
  });

  it('celebrates apprentice level-ups', () => {
    renderInterface();
    expect(screen.queryByText(/journeyman witch/i)).not.toBeInTheDocument();

    act(() => {
      eventBus.emit(GameEvent.MAGIC_LEVEL_UP, {
        previousLevel: 'novice',
        newLevel: 'journeyman',
      });
    });

    expect(screen.getByText(/journeyman witch/i)).toBeInTheDocument();
  });
});

it('mobile switches between the recipe list and details without brewing on selection', () => {
  device.mobile = true;
  renderInterface();
  expect(screen.queryByRole('button', { name: '🧪 Brew!' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: /Friendship Elixir/ }));
  expect(screen.getByRole('button', { name: '🧪 Brew!' })).toBeTruthy();
  expect(brew).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Back to recipes' }));
  expect(screen.queryByRole('button', { name: '🧪 Brew!' })).toBeNull();
  expect(screen.getByRole('button', { name: /Friendship Elixir/ })).toBeTruthy();
});
