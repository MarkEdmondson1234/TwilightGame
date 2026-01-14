/**
 * Portrait Sprite Loader
 *
 * Loads high-resolution original sprites for dialogue portraits.
 * Uses original unoptimized sprites for better quality when zoomed in.
 */

import { CharacterCustomization } from '../GameState';
import { Direction } from '../types';
import { fairyAssets } from '../assets';

/**
 * Get high-res portrait sprite URL for dialogue boxes
 * Uses original assets instead of optimized sprites for better quality
 * When in fairy form, uses the fairy sprite instead
 */
export function getPortraitSprite(
  character: CharacterCustomization,
  direction: Direction = Direction.Down,
  isFairyForm: boolean = false
): string {
  // When in fairy form, use the fairy sprite as portrait
  if (isFairyForm) {
    return fairyAssets.down_01; // Always use down-facing for portrait
  }

  const characterId = character.characterId || 'character1';
  const directionName = ['up', 'down', 'left', 'right'][direction];

  // Use original high-res sprites from /assets/ (not optimized)
  const originalPath = `/TwilightGame/assets/${characterId}/base/${directionName}_0.png`;

  return originalPath;
}

/**
 * Get high-res NPC portrait sprite
 */
export function getNPCPortraitSprite(npcSprite: string): string {
  // If using optimized sprite (data URL), try to get original
  if (npcSprite.startsWith('data:image')) {
    // Can't reverse engineer from data URL, use it as-is
    return npcSprite;
  }

  // If already using original high-res sprite, return it
  if (npcSprite.includes('/assets/')) {
    return npcSprite;
  }

  // Default: return as-is
  return npcSprite;
}
