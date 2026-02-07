import { CharacterCustomization } from '../GameState';
import { Direction } from '../types';
import { generatePlaceholderSprites as generateSVGPlaceholders } from './placeholderSprites';
import { fairyAssets } from '../assets';

/**
 * Character Sprite System
 *
 * Generates player sprite URLs based on character selection (boy/girl).
 * Each character has directional sprites with per-character frame counts.
 */

/**
 * Per-character sprite frame configuration.
 * Maps direction → number of walk frames (frame 0 is always idle).
 * Blink frames (left_3, right_3) are excluded from the walk cycle.
 */
interface CharacterSpriteConfig {
  frameCounts: Record<string, number>;
  /** Per-direction scale multipliers (applied on top of base sprite scale). Defaults to 1.0. */
  directionScales?: Partial<Record<string, number>>;
}

export const CHARACTER_SPRITE_CONFIGS: Record<string, CharacterSpriteConfig> = {
  character1: {
    frameCounts: { up: 3, down: 3, left: 3, right: 3 },
  },
  character2: {
    frameCounts: { up: 2, down: 2, left: 3, right: 3 },
    directionScales: { left: 0.9, right: 0.9 },
  },
};

/**
 * Get the sprite config for a character, falling back to character1 defaults.
 */
export function getSpriteConfig(characterId: string): CharacterSpriteConfig {
  return CHARACTER_SPRITE_CONFIGS[characterId] || CHARACTER_SPRITE_CONFIGS.character1;
}

const DIRECTION_KEYS: Record<Direction, string> = {
  [Direction.Up]: 'up',
  [Direction.Down]: 'down',
  [Direction.Left]: 'left',
  [Direction.Right]: 'right',
};

/**
 * Get per-direction scale multiplier for a character (defaults to 1.0).
 */
export function getDirectionScale(characterId: string, direction: Direction): number {
  const config = getSpriteConfig(characterId);
  return config.directionScales?.[DIRECTION_KEYS[direction]] ?? 1.0;
}

/**
 * Generate all sprite URLs for a character (all directions and frames)
 *
 * Returns a Record<Direction, string[]> where each direction has frames:
 * - Frame 0 = idle/standing pose
 * - Frame 1+ = walking animation
 */
export function generateCharacterSprites(
  character: CharacterCustomization
): Record<Direction, string[]> {
  try {
    if (!character || !character.name) {
      console.warn('[CharacterSprites] Invalid character data, using default');
      return generateSVGPlaceholders(DEFAULT_CHARACTER);
    }

    if (hasCustomSprites()) {
      const characterId = character.characterId || 'character1';
      const basePath = `/TwilightGame/assets/${characterId}/base`;
      const config = getSpriteConfig(characterId);

      const buildFrames = (dir: string): string[] => {
        const count = config.frameCounts[dir] || 3;
        return Array.from({ length: count }, (_, i) => `${basePath}/${dir}_${i}.png`);
      };

      return {
        [Direction.Up]: buildFrames('up'),
        [Direction.Down]: buildFrames('down'),
        [Direction.Left]: buildFrames('left'),
        [Direction.Right]: buildFrames('right'),
      };
    }

    return generateSVGPlaceholders(character);
  } catch (error) {
    console.error('[CharacterSprites] Error generating sprites:', error);
    return generateSVGPlaceholders(DEFAULT_CHARACTER);
  }
}

/**
 * Async version kept for API compatibility.
 * Returns the same result as the sync version.
 */
export async function generateCharacterSpritesAsync(
  character: CharacterCustomization
): Promise<Record<Direction, string[]>> {
  return generateCharacterSprites(character);
}

/**
 * Check if custom sprite assets exist.
 * Returns true now that we have custom artwork in /assets/character{1,2}/
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

/**
 * Generate fairy transformation sprites
 *
 * When the player is transformed into a fairy, we use directional sprites
 * with a 2-frame animation per direction. Right-facing uses the left sprites
 * with a horizontal flip applied at render time.
 */
export function generateFairySprites(): Record<Direction, string[]> {
  const downFrames = [fairyAssets.down_01, fairyAssets.down_02];
  const upFrames = [fairyAssets.up_01, fairyAssets.up_02];
  const leftFrames = [fairyAssets.left_01, fairyAssets.left_02];
  // Right uses left sprites - flip is handled by shouldFlipFairySprite()
  const rightFrames = [fairyAssets.left_01, fairyAssets.left_02];

  return {
    [Direction.Up]: upFrames,
    [Direction.Down]: downFrames,
    [Direction.Left]: leftFrames,
    [Direction.Right]: rightFrames,
  };
}

/**
 * Check if a fairy sprite should be horizontally flipped
 * Right-facing fairy sprites reuse the left sprites with a flip
 */
export function shouldFlipFairySprite(direction: Direction): boolean {
  return direction === Direction.Right;
}
