import { useState, useEffect } from 'react';
import { CharacterCustomization } from '../GameState';
import { generateCharacterSprites, generateCharacterSpritesAsync, DEFAULT_CHARACTER } from '../utils/characterSprites';
import { Direction } from '../types';

/**
 * Hook for managing character sprite loading and updates
 * Handles both synchronous fallback and asynchronous optimized sprite sheets
 */
export function useCharacterSprites(characterVersion: number, character: CharacterCustomization | null) {
    // Start with synchronous sprites, then upgrade to sprite sheets if available
    const [playerSprites, setPlayerSprites] = useState(() => {
        const char = character || DEFAULT_CHARACTER;
        return generateCharacterSprites(char);
    });

    // Load optimized sprite sheets asynchronously
    useEffect(() => {
        const char = character || DEFAULT_CHARACTER;

        // Try to load sprite sheets (async)
        generateCharacterSpritesAsync(char).then(sprites => {
            setPlayerSprites(sprites);
            console.log('[useCharacterSprites] Player sprites loaded (optimized)');
        }).catch(error => {
            console.error('[useCharacterSprites] Failed to load sprite sheets, using fallback:', error);
        });
    }, [characterVersion, character]); // Regenerate when character changes

    return playerSprites;
}

/**
 * Calculate player sprite URL and scale based on current animation state
 */
export function getPlayerSpriteInfo(
    playerSprites: Record<Direction, string[]>,
    direction: Direction,
    animationFrame: number
) {
    const playerFrames = playerSprites[direction];
    const playerSpriteUrl = playerFrames[animationFrame % playerFrames.length];

    // Scale up custom character sprites (they're higher resolution than placeholders)
    const isCustomSprite = playerSpriteUrl.includes('/assets/character') || playerSpriteUrl.startsWith('data:image');
    const spriteScale = isCustomSprite ? 3.0 : 1.0; // 3.0x for optimized sprites

    return { playerSpriteUrl, spriteScale };
}
