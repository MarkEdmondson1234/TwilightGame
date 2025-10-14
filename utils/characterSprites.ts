import { CharacterCustomization } from '../GameState';
import { Direction } from '../types';
import { generatePlaceholderSprites as generateSVGPlaceholders } from './placeholderSprites';

/**
 * Character Sprite System
 *
 * This system generates player sprites based on character customization.
 * Currently uses SVG-based visual placeholders, but designed to support layered sprite assets.
 *
 * Future Enhancement:
 * When custom sprites are added to /assets/player/, this system will composite
 * multiple sprite layers (base, skin, hair, clothes, etc.) to create the final sprite.
 */

// Color mapping for placeholder sprites
const SKIN_COLOR_MAP: Record<string, string> = {
  pale: 'fef3c7',
  light: 'fde68a',
  medium: 'fcd34d',
  tan: 'f59e0b',
  dark: 'b45309',
  deep: '78350f',
};

const HAIR_COLOR_MAP: Record<string, string> = {
  black: '1f2937',
  brown: '92400e',
  blonde: 'fde047',
  red: 'dc2626',
  gray: '9ca3af',
  white: 'f3f4f6',
  blue: '3b82f6',
  green: '22c55e',
  purple: 'a855f7',
};

const CLOTHES_COLOR_MAP: Record<string, string> = {
  red: 'dc2626',
  blue: '2563eb',
  green: '16a34a',
  yellow: 'eab308',
  purple: '9333ea',
  orange: 'ea580c',
  pink: 'ec4899',
  black: '1f2937',
  white: 'f3f4f6',
};

const SHOES_COLOR_MAP: Record<string, string> = {
  brown: '92400e',
  black: '1f2937',
  white: 'f3f4f6',
  red: 'dc2626',
  blue: '2563eb',
};

const EYE_COLOR_MAP: Record<string, string> = {
  brown: '92400e',
  blue: '3b82f6',
  green: '16a34a',
  hazel: 'd97706',
  gray: '6b7280',
};

/**
 * Generate a placeholder sprite URL for a character
 *
 * This creates a placehold.co URL with the character's primary colors.
 * When ready for custom sprites, replace this with generateCustomSprite().
 */
function generatePlaceholderSprite(
  character: CharacterCustomization,
  direction: Direction,
  frame: number
): string {
  // Use clothes color as background, skin color as foreground
  const bgColor = CLOTHES_COLOR_MAP[character.clothesColor] || '2563eb';
  const fgColor = SKIN_COLOR_MAP[character.skin] || 'fcd34d';

  // Direction symbols
  const dirSymbol = ['↑', '↓', '←', '→'][direction];

  // Add initial for hair color (unless bald)
  const hairInitial = character.hairStyle === 'bald' ? '' : character.hairColor[0].toUpperCase();

  return `https://placehold.co/32x32/${bgColor}/${fgColor}?text=${character.name[0]}${dirSymbol}${frame}${hairInitial}`;
}

/**
 * Generate custom sprite layers for a character
 *
 * Layers system for compositing sprites:
 * - Base character sprite (e.g., /assets/player/character1/default/{direction}_{frame}.png)
 * - Optional variation layers on top (hats, clothes, accessories)
 *
 * Structure:
 * /assets/player/{characterId}/base/{direction}_{frame}.png - Base character
 * /assets/player/{characterId}/variations/{variationName}/{direction}_{frame}.png - Layered variations
 *
 * Example:
 * /assets/player/character1/base/down_0.png
 * /assets/player/character1/variations/winter_hat/down_0.png
 * /assets/player/character1/variations/winter_coat/down_0.png
 */
function generateCustomSprite(
  character: CharacterCustomization,
  direction: Direction,
  frame: number
): { layers: string[], fallbackUrl: string } {
  const directionName = ['up', 'down', 'left', 'right'][direction];

  // Map character customization to character ID
  // For now, use character name as ID (can be more sophisticated later)
  const characterId = character.name.toLowerCase().replace(/\s+/g, '_');

  // Start with base character sprite
  const layers = [
    `/assets/player/${characterId}/base/${directionName}_${frame}.png`,
  ];

  // Add variation layers based on customization
  // These are optional layers that go on top of the base
  if (character.hairStyle && character.hairStyle !== 'bald') {
    layers.push(`/assets/player/${characterId}/variations/hair_${character.hairStyle}/${directionName}_${frame}.png`);
  }

  if (character.clothesStyle && character.clothesStyle !== 'default') {
    layers.push(`/assets/player/${characterId}/variations/clothes_${character.clothesStyle}/${directionName}_${frame}.png`);
  }

  if (character.glasses && character.glasses !== 'none') {
    layers.push(`/assets/player/${characterId}/variations/glasses_${character.glasses}/${directionName}_${frame}.png`);
  }

  // Add any equipped items/accessories
  // Future: iterate through character.equipment array

  // Fallback to placeholder
  const fallbackUrl = generatePlaceholderSprite(character, direction, frame);

  return { layers, fallbackUrl };
}

/**
 * Generate all sprite URLs for a character (all directions and frames)
 *
 * Returns a Record<Direction, string[] | string[][]> matching the PLAYER_SPRITES structure.
 * Each direction has 4 frames (0 = idle, 1-3 = walking animation)
 *
 * Returns:
 * - string[] for simple single-layer sprites (current temporary implementation)
 * - string[][] for layered sprites (future: each frame can have multiple layers)
 */
export function generateCharacterSprites(character: CharacterCustomization): Record<Direction, string[]> {
  try {
    // Ensure character has all required fields
    if (!character || !character.name) {
      console.warn('[CharacterSprites] Invalid character data, using default');
      return generateSVGPlaceholders(DEFAULT_CHARACTER);
    }

    // Use custom sprites if available
    if (hasCustomSprites()) {
      // Use characterId from character customization, fallback to 'character1'
      const characterId = character.characterId || 'character1';

      // Assets in /public/ are served from root with base path
      // Detect if we're in production (GitHub Pages) or local dev
      const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
      const base = isProduction ? '/TwilightGame/' : '/';
      const basePath = `${base}assets/${characterId}/base`;

      // Fallback sprite for directions without custom sprites yet
      const fallbackSprite = `${basePath}/down_0.png`;

      return {
        [Direction.Up]: [
          `${basePath}/up_0.png`,
          `${basePath}/up_1.png`,
          `${basePath}/up_0.png`, // Reuse up_0 for frame 2
          `${basePath}/up_1.png`, // Reuse up_1 for frame 3
        ],
        [Direction.Down]: [
          `${basePath}/down_0.png`,
          `${basePath}/down_1.png`,
          `${basePath}/down_0.png`, // Reuse down_0 for frame 2
          `${basePath}/down_1.png`, // Reuse down_1 for frame 3
        ],
        [Direction.Left]: [fallbackSprite, fallbackSprite, fallbackSprite, fallbackSprite],
        [Direction.Right]: [fallbackSprite, fallbackSprite, fallbackSprite, fallbackSprite],
      };
    }

    // Fallback to SVG placeholders
    return generateSVGPlaceholders(character);
  } catch (error) {
    console.error('[CharacterSprites] Error generating sprites:', error);
    return generateSVGPlaceholders(DEFAULT_CHARACTER);
  }
}

/**
 * Generate sprite layers for custom rendering (future use)
 *
 * When transitioning to custom sprites, use this to get all layer paths.
 * The game can then render these as stacked elements with proper z-ordering.
 */
export function generateCharacterSpriteLayers(
  character: CharacterCustomization,
  direction: Direction,
  frame: number
): { layers: string[], fallbackUrl: string } {
  return generateCustomSprite(character, direction, frame);
}

/**
 * Check if custom sprite assets exist
 *
 * Helper function to detect if custom sprites are available.
 * Returns true now that we have custom artwork in /assets/player/
 */
export function hasCustomSprites(): boolean {
  return true;
}

/**
 * Default character for fallback
 */
export const DEFAULT_CHARACTER: CharacterCustomization = {
  characterId: 'character1',
  name: 'Player',
  skin: 'medium',
  hairStyle: 'short',
  hairColor: 'brown',
  eyeColor: 'brown',
  clothesStyle: 'shirt',
  clothesColor: 'blue',
  shoesStyle: 'boots',
  shoesColor: 'brown',
  glasses: 'none',
  weapon: 'sword',
};
