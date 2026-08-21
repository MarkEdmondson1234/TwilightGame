/** @vitest-environment node */
import { describe, it, expect, vi } from 'vitest';
import { applyPotionEffect, MagicEffectCallbacks } from '../utils/MagicEffects';
import { getGiftPreferenceReveal } from '../utils/actionHandlers';
import { createStaticNPC } from '../utils/npcs/createNPC';

/**
 * potion_revealing (the Revealing Tonic) used to always report success:false and
 * never consume itself — it just showed a toast telling the player to talk to an
 * NPC, with no actual reveal mechanism wired up anywhere. It is a real, brewable
 * recipe, so drinking it did nothing useful. It now behaves like the other
 * duration-based buff potions (Beast Tongue, Beastward): it sets an active potion
 * effect and reports success so the potion is actually consumed.
 */

function makeCallbacks(overrides: Partial<MagicEffectCallbacks> = {}): MagicEffectCallbacks {
  return {
    setWeather: vi.fn(),
    refreshTime: vi.fn(),
    setPlayerScale: vi.fn(),
    getPlayerScale: () => 1,
    setPlayerSizeTier: vi.fn(),
    getPlayerSizeTier: () => 0 as never,
    teleportPlayer: vi.fn(),
    openCharacterCreator: vi.fn(),
    showToast: vi.fn(),
    refreshFarmPlots: vi.fn(),
    getCurrentMapId: () => 'village',
    getPlayerPosition: () => ({ x: 0, y: 0 }),
    ...overrides,
  };
}

describe('potion_revealing (Revealing Tonic)', () => {
  it('succeeds and activates the reveal_gift_preference effect instead of no-op-ing', () => {
    const setActivePotionEffect = vi.fn();
    const callbacks = makeCallbacks({ setActivePotionEffect });

    const result = applyPotionEffect('potion_revealing', callbacks);

    expect(result.success).toBe(true);
    expect(result.effectType).toBe('reveal_gift_preference');
    expect(setActivePotionEffect).toHaveBeenCalledWith(
      'reveal_gift_preference',
      expect.any(Number)
    );
  });
});

describe('getGiftPreferenceReveal', () => {
  const npcWithPreference = createStaticNPC({
    id: 'test_shopkeeper',
    name: 'Test Shopkeeper',
    position: { x: 0, y: 0 },
    sprite: 'sprite.png',
    dialogue: [],
    friendshipConfig: { canBefriend: true, startingPoints: 0, likedFoodTypes: ['savoury'] },
  });

  const npcWithoutPreference = createStaticNPC({
    id: 'test_stranger',
    name: 'Test Stranger',
    position: { x: 0, y: 0 },
    sprite: 'sprite.png',
    dialogue: [],
  });

  it("reveals a friendly, human-readable label for the NPC's liked food type", () => {
    expect(getGiftPreferenceReveal(npcWithPreference)).toBe(
      'Test Shopkeeper would love a gift of savoury foods!'
    );
  });

  it('returns null for an NPC with no known gift preference', () => {
    expect(getGiftPreferenceReveal(npcWithoutPreference)).toBeNull();
  });

  it('returns null for a null NPC (e.g. NPC not found)', () => {
    expect(getGiftPreferenceReveal(null)).toBeNull();
  });
});
