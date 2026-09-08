/**
 * @vitest-environment node
 *
 * The persistence-failure reports: the sites where player progress can be
 * silently lost (CharacterData save/load) or quietly self-healed over
 * (CookingManager's progress-without-unlock re-add) must actually reach
 * errorReporting — the whole point of the 'persistence' category is that
 * "a save failed in production" becomes a countable issue instead of a
 * console.error nobody reads. GameState is mocked as the failure seam;
 * errorReporting is mocked so these tests assert the WIRING, not the dedupe
 * (which lives in tests/errorReporting.test.ts).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { reportErrorOnce, reportMessageOnce } = vi.hoisted(() => ({
  reportErrorOnce: vi.fn(),
  reportMessageOnce: vi.fn(),
}));

vi.mock('../utils/errorReporting', () => ({ reportErrorOnce, reportMessageOnce }));

vi.mock('../GameState', () => ({
  gameState: {
    loadCookingState: vi.fn(),
    saveCookingState: vi.fn(),
  },
}));

import { gameState } from '../GameState';
import { characterData, type CookingData } from '../utils/CharacterData';
import { cookingManager } from '../utils/CookingManager';

const cookingState: CookingData = {
  recipeBookUnlocked: true,
  unlockedRecipes: ['bread'],
  recipeProgress: {},
};

beforeEach(() => {
  reportErrorOnce.mockClear();
  reportMessageOnce.mockClear();
  vi.mocked(gameState.loadCookingState).mockReset();
  vi.mocked(gameState.saveCookingState).mockReset();
});

describe('CharacterData persistence failure reporting', () => {
  it('reports a failed domain save once, tagged with domain and operation', () => {
    vi.mocked(gameState.saveCookingState).mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    const result = characterData.save('cooking', cookingState);

    expect(result).toBe(false);
    expect(reportErrorOnce).toHaveBeenCalledTimes(1);
    expect(reportErrorOnce).toHaveBeenCalledWith(
      expect.any(Error),
      'persistence',
      { domain: 'cooking', operation: 'save' }
    );
  });

  it('reports a failed domain load once', () => {
    vi.mocked(gameState.loadCookingState).mockImplementation(() => {
      throw new Error('corrupt JSON');
    });

    expect(characterData.load('cooking')).toBeNull();
    expect(reportErrorOnce).toHaveBeenCalledTimes(1);
    expect(reportErrorOnce).toHaveBeenCalledWith(
      expect.any(Error),
      'persistence',
      { domain: 'cooking', operation: 'load' }
    );
  });

  it('reports a domain name that no longer exists rather than silently doing nothing', () => {
    // An unknown domain is a programming error — the save "succeeds" at
    // nothing, which is data loss with a straight face.
    characterData.save('nonexistent' as 'cooking', {} as never);

    expect(reportMessageOnce).toHaveBeenCalledTimes(1);
    expect(reportMessageOnce).toHaveBeenCalledWith(
      'Unknown save domain: nonexistent',
      'persistence',
      { domain: 'nonexistent', operation: 'save' },
      'unknown_domain:save:nonexistent'
    );
  });
});

describe('CookingManager self-heal reporting', () => {
  it('reports the progress-without-unlock re-add exactly once per recipe', () => {
    // Save-data drift: bread has progress but was never unlocked. The
    // self-heal re-adds it silently in play — the report makes the drift
    // countable in production.
    vi.mocked(gameState.loadCookingState).mockReturnValue({
      recipeBookUnlocked: true,
      fireplaceTutorialComplete: false,
      cookingCourseCongratsShown: false,
      cookbookShopUnlocked: false,
      unlockedRecipes: [],
      recipeProgress: {
        bread: { recipeId: 'bread', timesCooked: 2, isMastered: false, unlockedAt: 1 },
      },
    });

    cookingManager.initialise();

    expect(reportMessageOnce).toHaveBeenCalledTimes(1);
    expect(reportMessageOnce).toHaveBeenCalledWith(
      'Cooking self-heal: recipe has progress but was not unlocked',
      'persistence',
      { recipeId: 'bread', reason: 'progress_without_unlock' },
      'cooking:self_heal:bread'
    );
  });
});