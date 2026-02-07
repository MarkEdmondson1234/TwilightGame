import { useState, useEffect } from 'react';
import { CharacterCustomization } from '../GameState';
import {
  generateCharacterSprites,
  generateCharacterSpritesAsync,
  generateFairySprites,
  shouldFlipFairySprite,
  getDirectionScale,
  DEFAULT_CHARACTER,
} from '../utils/characterSprites';
import { Direction } from '../types';

/**
 * Hook for managing character sprite loading and updates
 * Handles both synchronous fallback and asynchronous optimized sprite sheets
 * Also handles transformation states (e.g., fairy form)
 */
export function useCharacterSprites(
  characterVersion: number,
  character: CharacterCustomization | null,
  isFairyForm: boolean = false
) {
  // Start with synchronous sprites, then upgrade to sprite sheets if available
  const [playerSprites, setPlayerSprites] = useState(() => {
    // If in fairy form, use fairy sprites
    if (isFairyForm) {
      return generateFairySprites();
    }
    const char = character || DEFAULT_CHARACTER;
    return generateCharacterSprites(char);
  });

  // Load optimized sprite sheets asynchronously (or fairy sprites if transformed)
  useEffect(() => {
    // If in fairy form, use fairy sprites instead of character sprites
    if (isFairyForm) {
      const fairySprites = generateFairySprites();
      setPlayerSprites(fairySprites);
      console.log('[useCharacterSprites] Using fairy transformation sprites');
      return;
    }

    const char = character || DEFAULT_CHARACTER;

    // Try to load sprite sheets (async)
    generateCharacterSpritesAsync(char)
      .then((sprites) => {
        setPlayerSprites(sprites);
        console.log('[useCharacterSprites] Player sprites loaded (optimized)');
      })
      .catch((error) => {
        console.error('[useCharacterSprites] Failed to load sprite sheets, using fallback:', error);
      });
  }, [characterVersion, character, isFairyForm]); // Regenerate when character or fairy form changes

  return playerSprites;
}

/**
 * Calculate player sprite URL and scale based on current animation state
 */
export function getPlayerSpriteInfo(
  playerSprites: Record<Direction, string[]>,
  direction: Direction,
  animationFrame: number,
  isFairyForm: boolean = false,
  characterId: string = 'character1'
) {
  const playerFrames = playerSprites[direction];
  const playerSpriteUrl = playerFrames[animationFrame % playerFrames.length];

  // Scale up custom character sprites (they're higher resolution than placeholders)
  const isCustomSprite =
    playerSpriteUrl.includes('/assets/character') || playerSpriteUrl.startsWith('data:image');
  const baseScale = isCustomSprite ? 3.0 : 1.0; // 3.0x for optimized sprites
  // Apply per-character direction scale (e.g. character2 left/right are 10% smaller)
  const dirScale = getDirectionScale(characterId, direction);
  const spriteScale = baseScale * dirScale;

  // Check if sprite should be horizontally flipped (fairy right-facing uses left sprites flipped)
  const shouldFlip = isFairyForm && shouldFlipFairySprite(direction);

  return { playerSpriteUrl, spriteScale, shouldFlip };
}
