/**
 * Frame styles for paintings
 *
 * Maps paint colour combinations to decorative frame border styles.
 * Used by both the painting preview UI and the placed item renderer.
 */

import { getPaintColourMap } from '../data/decorationRecipes';

export interface FrameStyle {
  /** Primary border colour (hex) */
  colour: string;
  /** Secondary colour for gradients/patterns (hex, optional) */
  secondaryColour?: string;
  /** Border width in pixels */
  borderWidth: number;
  /** Visual style of the frame */
  pattern: 'solid' | 'gradient' | 'double' | 'filigree' | 'frosted';
  /** Display name for the frame style */
  displayName: string;
}

/** Special frame styles for rare paint combinations */
const SPECIAL_FRAMES: Record<string, Partial<FrameStyle>> = {
  paint_gold: {
    pattern: 'filigree',
    borderWidth: 6,
    displayName: 'Gold Filigree',
  },
  paint_ice: {
    pattern: 'frosted',
    borderWidth: 5,
    displayName: 'Frosted Crystal',
  },
  paint_silver: {
    pattern: 'double',
    borderWidth: 5,
    displayName: 'Silver Double',
  },
};

/**
 * Get frame style from paint IDs used during painting creation
 */
export function getFrameStyle(paintIds: string[]): FrameStyle {
  const colourMap = getPaintColourMap();

  if (paintIds.length === 0) {
    return {
      colour: '#8C7A6B',
      borderWidth: 4,
      pattern: 'solid',
      displayName: 'Plain Wood',
    };
  }

  const primaryId = paintIds[0];
  const primaryColour = colourMap[primaryId] ?? '#8C7A6B';

  // Check for special frame from rare paints
  const special = SPECIAL_FRAMES[primaryId];
  if (special) {
    return {
      colour: primaryColour,
      secondaryColour: paintIds.length > 1 ? colourMap[paintIds[1]] : undefined,
      borderWidth: special.borderWidth ?? 5,
      pattern: special.pattern ?? 'solid',
      displayName: special.displayName ?? 'Special Frame',
    };
  }

  // Two paints → gradient frame
  if (paintIds.length >= 2) {
    const secondaryColour = colourMap[paintIds[1]] ?? '#8C7A6B';
    return {
      colour: primaryColour,
      secondaryColour,
      borderWidth: 5,
      pattern: 'gradient',
      displayName: 'Gradient Frame',
    };
  }

  // Single paint → solid frame
  return {
    colour: primaryColour,
    borderWidth: 4,
    pattern: 'solid',
    displayName: 'Painted Frame',
  };
}

/**
 * Get CSS border style for a frame (used in DOM rendering)
 */
export function getFrameCSS(style: FrameStyle): React.CSSProperties {
  const base: React.CSSProperties = {
    boxSizing: 'border-box' as const,
  };

  switch (style.pattern) {
    case 'solid':
      return {
        ...base,
        border: `${style.borderWidth}px solid ${style.colour}`,
      };
    case 'gradient':
      return {
        ...base,
        border: `${style.borderWidth}px solid ${style.colour}`,
        borderImage: `linear-gradient(135deg, ${style.colour}, ${style.secondaryColour ?? style.colour}) 1`,
      };
    case 'double':
      return {
        ...base,
        border: `${style.borderWidth}px double ${style.colour}`,
      };
    case 'filigree':
      return {
        ...base,
        border: `${style.borderWidth}px solid ${style.colour}`,
        boxShadow: `inset 0 0 3px ${style.colour}, 0 0 3px ${style.colour}`,
      };
    case 'frosted':
      return {
        ...base,
        border: `${style.borderWidth}px solid ${style.colour}`,
        boxShadow: `inset 0 0 6px rgba(168, 216, 234, 0.5), 0 0 4px rgba(168, 216, 234, 0.3)`,
      };
    default:
      return {
        ...base,
        border: `${style.borderWidth}px solid ${style.colour}`,
      };
  }
}
