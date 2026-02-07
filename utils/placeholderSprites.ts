import { CharacterCustomization } from '../GameState';
import { Direction } from '../types';

/**
 * Placeholder Sprite Generator
 *
 * Creates simple SVG-based character sprites as data URLs.
 * These serve as visual placeholders until custom pixel art is added.
 * Designed to be easily replaceable with PNG sprite sheets.
 */

// Color palettes
const SKIN_COLORS: Record<string, string> = {
  pale: '#fef3c7',
  light: '#fde68a',
  medium: '#fcd34d',
  tan: '#f59e0b',
  dark: '#b45309',
  deep: '#78350f',
};

const HAIR_COLORS: Record<string, string> = {
  black: '#1f2937',
  brown: '#92400e',
  blonde: '#fde047',
  red: '#dc2626',
  gray: '#9ca3af',
  white: '#f3f4f6',
  blue: '#3b82f6',
  green: '#22c55e',
  purple: '#a855f7',
};

const CLOTHES_COLORS: Record<string, string> = {
  red: '#dc2626',
  blue: '#2563eb',
  green: '#16a34a',
  yellow: '#eab308',
  purple: '#9333ea',
  orange: '#ea580c',
  pink: '#ec4899',
  black: '#1f2937',
  white: '#f3f4f6',
};

const SHOES_COLORS: Record<string, string> = {
  brown: '#92400e',
  black: '#1f2937',
  white: '#f3f4f6',
  red: '#dc2626',
  blue: '#2563eb',
};

const EYE_COLORS: Record<string, string> = {
  brown: '#92400e',
  blue: '#3b82f6',
  green: '#16a34a',
  hazel: '#d97706',
  gray: '#6b7280',
};

/**
 * Generate a simple SVG character sprite
 */
function generateSVGSprite(
  character: CharacterCustomization,
  direction: Direction,
  frame: number
): string {
  const skinColor = SKIN_COLORS[character.skin] || SKIN_COLORS.medium;
  const hairColor = HAIR_COLORS[character.hairColor] || HAIR_COLORS.brown;
  const clothesColor = CLOTHES_COLORS[character.clothesColor] || CLOTHES_COLORS.blue;
  const shoesColor = SHOES_COLORS[character.shoesColor] || SHOES_COLORS.brown;
  const eyeColor = EYE_COLORS[character.eyeColor] || EYE_COLORS.brown;

  // Calculate animation offset for walk cycle
  const walkOffset = frame === 0 ? 0 : frame % 2 === 1 ? 1 : -1;

  // Hair style variations
  const hairPath = getHairPath(character.hairStyle, direction);

  // Glasses
  const glassesElement =
    character.glasses !== 'none'
      ? `<rect x="6" y="10" width="4" height="3" fill="none" stroke="#333" stroke-width="0.5"/>
       <rect x="14" y="10" width="4" height="3" fill="none" stroke="#333" stroke-width="0.5"/>
       <line x1="10" y1="11.5" x2="14" y2="11.5" stroke="#333" stroke-width="0.5"/>`
      : '';

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32">
      <!-- Shoes -->
      <ellipse cx="8" cy="22" rx="2" ry="1" fill="${shoesColor}"/>
      <ellipse cx="16" cy="22" rx="2" ry="1" fill="${shoesColor}"/>

      <!-- Legs (clothes color) -->
      <rect x="7" y="16" width="3" height="6" fill="${clothesColor}" rx="1"/>
      <rect x="14" y="16" width="3" height="6" fill="${clothesColor}" rx="1"/>

      <!-- Body (clothes) -->
      <rect x="6" y="12" width="12" height="6" fill="${clothesColor}" rx="2"/>

      <!-- Arms -->
      ${
        direction === Direction.Up
          ? `<rect x="4" y="13" width="2" height="5" fill="${skinColor}" rx="1"/>
           <rect x="18" y="13" width="2" height="5" fill="${skinColor}" rx="1"/>`
          : `<rect x="4" y="13" width="2" height="5" fill="${skinColor}" rx="1" transform="rotate(${walkOffset * 10} 5 13)"/>
           <rect x="18" y="13" width="2" height="5" fill="${skinColor}" rx="1" transform="rotate(${-walkOffset * 10} 19 13)"/>`
      }

      <!-- Head (skin) -->
      <circle cx="12" cy="8" r="5" fill="${skinColor}"/>

      <!-- Hair -->
      ${hairPath ? `<path d="${hairPath}" fill="${hairColor}"/>` : ''}

      <!-- Face based on direction -->
      ${
        direction === Direction.Down ||
        direction === Direction.Left ||
        direction === Direction.Right
          ? `<!-- Eyes -->
           <circle cx="9" cy="8" r="1" fill="${eyeColor}"/>
           <circle cx="15" cy="8" r="1" fill="${eyeColor}"/>
           ${glassesElement}
           <!-- Smile -->
           <path d="M 9 10 Q 12 11 15 10" stroke="#333" stroke-width="0.5" fill="none"/>`
          : `<!-- Eyes (back view, just dots) -->
           <circle cx="9" cy="7" r="0.5" fill="#333"/>
           <circle cx="15" cy="7" r="0.5" fill="#333"/>`
      }

      <!-- Weapon indicator (small icon) -->
      ${getWeaponIcon(character.weapon, direction)}
    </svg>
  `;

  // Convert SVG to data URL
  const encoded = encodeURIComponent(svg).replace(/'/g, '%27').replace(/"/g, '%22');

  return `data:image/svg+xml,${encoded}`;
}

function getHairPath(hairStyle: string, direction: Direction): string {
  // Simple hair shapes - can be enhanced later
  switch (hairStyle) {
    case 'short':
      return 'M 7 5 Q 7 3 12 3 Q 17 3 17 5 L 17 8 Q 17 10 12 10 Q 7 10 7 8 Z';
    case 'long':
      return 'M 7 5 Q 7 2 12 2 Q 17 2 17 5 L 17 12 Q 17 14 12 14 Q 7 14 7 12 Z';
    case 'curly':
      return 'M 7 5 Q 6 2 9 2 Q 8 4 10 4 Q 9 6 12 5 Q 11 3 14 3 Q 13 5 15 5 Q 14 3 17 4 Q 18 5 17 7 L 17 9 Q 17 11 12 11 Q 7 11 7 9 Z';
    case 'spiky':
      return 'M 7 6 L 8 2 L 9 6 L 10 1 L 11 6 L 12 2 L 13 6 L 14 1 L 15 6 L 16 2 L 17 6 Q 17 9 12 9 Q 7 9 7 6 Z';
    case 'bald':
      return ''; // No hair
    default:
      return 'M 7 5 Q 7 3 12 3 Q 17 3 17 5 L 17 8 Q 17 10 12 10 Q 7 10 7 8 Z';
  }
}

function getWeaponIcon(weapon: string, direction: Direction): string {
  const rightSide = direction === Direction.Right;
  const x = rightSide ? 19 : 3;

  switch (weapon) {
    case 'sword':
      return `<line x1="${x}" y1="15" x2="${x}" y2="19" stroke="#666" stroke-width="1"/>
              <rect x="${x - 0.5}" y="14" width="1" height="1" fill="#d4af37"/>`;
    case 'axe':
      return `<line x1="${x}" y1="15" x2="${x}" y2="19" stroke="#8b4513" stroke-width="1"/>
              <path d="M ${x - 1} 15 L ${x + 1} 15 L ${x + 1} 16 L ${x - 1} 16 Z" fill="#666"/>`;
    case 'bow':
      return `<path d="M ${x} 14 Q ${x + 2} 17 ${x} 20" stroke="#8b4513" stroke-width="0.5" fill="none"/>
              <line x1="${x}" y1="15" x2="${x}" y2="19" stroke="#ddd" stroke-width="0.3"/>`;
    case 'staff':
      return `<line x1="${x}" y1="13" x2="${x}" y2="20" stroke="#8b4513" stroke-width="1"/>
              <circle cx="${x}" cy="13" r="1" fill="#9333ea"/>`;
    default:
      return '';
  }
}

/**
 * Generate all 4 frames for a direction
 */
export function generatePlaceholderSprites(
  character: CharacterCustomization
): Record<Direction, string[]> {
  const sprites: Record<Direction, string[]> = {
    [Direction.Up]: [],
    [Direction.Down]: [],
    [Direction.Left]: [],
    [Direction.Right]: [],
  };

  for (let direction = Direction.Up; direction <= Direction.Right; direction++) {
    for (let frame = 0; frame < 4; frame++) {
      sprites[direction].push(generateSVGSprite(character, direction, frame));
    }
  }

  return sprites;
}
