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
 * Generate custom sprite path (for when assets are added)
 *
 * Future implementation will composite multiple sprite layers:
 * - /assets/player/base/{direction}_{frame}.png (body outline)
 * - /assets/player/skin/{skinTone}/{direction}_{frame}.png
 * - /assets/player/hair/{hairStyle}_{hairColor}/{direction}_{frame}.png
 * - /assets/player/clothes/{clothesStyle}_{clothesColor}/{direction}_{frame}.png
 * - /assets/player/shoes/{shoesStyle}_{shoesColor}/{direction}_{frame}.png
 * - /assets/player/glasses/{glassesType}/{direction}_{frame}.png (if not 'none')
 *
 * The game will render these as stacked div backgrounds or use canvas compositing.
 */
function generateCustomSprite(
  character: CharacterCustomization,
  direction: Direction,
  frame: number
): { layers: string[], fallbackUrl: string } {
  const directionName = ['up', 'down', 'left', 'right'][direction];

  // Build layer paths (these would be actual sprite files)
  const layers = [
    `/assets/player/base/${directionName}_${frame}.png`,
    `/assets/player/skin/${character.skin}/${directionName}_${frame}.png`,
  ];

  // Only add hair if not bald
  if (character.hairStyle !== 'bald') {
    layers.push(`/assets/player/hair/${character.hairStyle}_${character.hairColor}/${directionName}_${frame}.png`);
  }

  layers.push(
    `/assets/player/clothes/${character.clothesStyle}_${character.clothesColor}/${directionName}_${frame}.png`,
    `/assets/player/shoes/${character.shoesStyle}_${character.shoesColor}/${directionName}_${frame}.png`
  );

  // Add glasses if equipped
  if (character.glasses !== 'none') {
    layers.push(`/assets/player/glasses/${character.glasses}/${directionName}_${frame}.png`);
  }

  // Fallback to placeholder
  const fallbackUrl = generatePlaceholderSprite(character, direction, frame);

  return { layers, fallbackUrl };
}

/**
 * Generate all sprite URLs for a character (all directions and frames)
 *
 * Returns a Record<Direction, string[]> matching the PLAYER_SPRITES structure.
 * Each direction has 4 frames (0 = idle, 1-3 = walking animation)
 */
export function generateCharacterSprites(character: CharacterCustomization): Record<Direction, string[]> {
  try {
    // Ensure character has all required fields
    if (!character || !character.name) {
      console.warn('[CharacterSprites] Invalid character data, using default');
      return generateSVGPlaceholders(DEFAULT_CHARACTER);
    }

    // Use SVG placeholders for now
    // When custom sprites are ready, check hasCustomSprites() and use generateCustomSprite()
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
 * Returns false for now (using placeholders), but can check for actual files later.
 */
export function hasCustomSprites(): boolean {
  // TODO: Implement asset detection when sprites are added
  // Could check if /assets/player/base/down_0.png exists
  return false;
}

/**
 * Default character for fallback
 */
export const DEFAULT_CHARACTER: CharacterCustomization = {
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
