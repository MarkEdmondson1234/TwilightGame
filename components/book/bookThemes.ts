/**
 * Book Theme Definitions
 *
 * Colour palettes and styles for the cottagecore book UI.
 * Uses warm sepia tones from palette.ts for a cozy, handmade feel.
 */

import { uiAssets } from '../../assets';

export type BookTheme = 'cooking' | 'magic' | 'journal';

/**
 * Theme configuration for the cottage book UI
 */
export interface BookThemeConfig {
  name: string;
  // Background image for this book
  backgroundImage: string;
  // Accent colours (from palette.ts)
  accentPrimary: string; // Main accent colour
  accentSecondary: string; // Secondary accent
  ribbonColour: string; // Bookmark ribbon colour
  buttonColour: string; // Action button colour
  buttonHoverColour: string; // Action button hover
  // Text colours
  textPrimary: string; // Main text colour (dark brown)
  textSecondary: string; // Secondary text (medium brown)
  textMuted: string; // Muted text (light brown)
  // Status colours
  lockedColour: string; // Locked items
  masteredColour: string; // Mastered items (gold)
  successColour: string; // Success messages
  errorColour: string; // Error messages
  // Decorative
  headerIcon: string; // Icon for chapter headers
  actionIcon: string; // Icon for action button
}

/**
 * Shared base colours (cottagecore palette)
 */
const baseColours = {
  // Page colours (cream/sepia)
  pageBackground: '#EFE9E1', // cream
  pageBorder: '#D4A373', // tan
  // Text colours (brown spectrum)
  textDark: '#4a3228', // dark chocolate brown
  textMedium: '#7D5A50', // medium brown
  textLight: '#8C7A6B', // taupe
  // Metallic
  gold: '#E6A847',
  // Status
  success: '#5C6B3D', // olive green
  error: '#A4414F', // burgundy
  locked: '#8C7A6B', // taupe
};

/**
 * Cooking book theme - warm browns and burgundy
 */
export const cookingTheme: BookThemeConfig = {
  name: 'Recipe Book',
  backgroundImage: uiAssets.openbook_ui,
  // Warm earth tones
  accentPrimary: '#D4A373', // tan
  accentSecondary: '#8B4513', // rust
  ribbonColour: '#A4414F', // burgundy
  buttonColour: '#C47849', // terracotta
  buttonHoverColour: '#D4A373', // tan (lighter on hover)
  // Text
  textPrimary: baseColours.textDark,
  textSecondary: baseColours.textMedium,
  textMuted: baseColours.textLight,
  // Status
  lockedColour: baseColours.locked,
  masteredColour: baseColours.gold,
  successColour: baseColours.success,
  errorColour: baseColours.error,
  // Icons
  headerIcon: '🍳',
  actionIcon: '🍳',
};

/**
 * Magic book theme - mystical purples
 */
export const magicTheme: BookThemeConfig = {
  name: 'Magic Recipe Book',
  backgroundImage: uiAssets.magicbook_ui,
  // Mystical purples
  accentPrimary: '#6B5B95', // iris
  accentSecondary: '#5C3D5C', // plum
  ribbonColour: '#4B3F72', // purple
  buttonColour: '#A8357D', // magenta
  buttonHoverColour: '#6B5B95', // iris (lighter on hover)
  // Text (same browns for consistency)
  textPrimary: baseColours.textDark,
  textSecondary: baseColours.textMedium,
  textMuted: baseColours.textLight,
  // Status
  lockedColour: baseColours.locked,
  masteredColour: baseColours.gold,
  successColour: baseColours.success,
  errorColour: baseColours.error,
  // Icons
  headerIcon: '✨',
  actionIcon: '🧪',
};

/**
 * Journal theme - warm greens and parchment
 */
export const journalTheme: BookThemeConfig = {
  name: 'Quest Journal',
  backgroundImage: uiAssets.openbook_ui,
  // Earthy greens and warm parchment
  accentPrimary: '#5C6B3D', // olive
  accentSecondary: '#3D5C3D', // forest green
  ribbonColour: '#4A6741', // sage
  buttonColour: '#5C6B3D', // olive
  buttonHoverColour: '#7A8F5D', // lighter olive on hover
  // Text (same browns for consistency)
  textPrimary: baseColours.textDark,
  textSecondary: baseColours.textMedium,
  textMuted: baseColours.textLight,
  // Status
  lockedColour: baseColours.locked,
  masteredColour: baseColours.gold,
  successColour: baseColours.success,
  errorColour: baseColours.error,
  // Icons
  headerIcon: '📖',
  actionIcon: '🗺️',
};

/**
 * Get theme configuration by name
 */
export function getBookTheme(theme: BookTheme): BookThemeConfig {
  switch (theme) {
    case 'cooking':
      return cookingTheme;
    case 'magic':
      return magicTheme;
    case 'journal':
      return journalTheme;
    default:
      return cookingTheme;
  }
}

/**
 * Shared book styling constants
 *
 * These values are calibrated to match the openbook_ui.png image dimensions.
 * The book image has visible binding on left/right edges and a center spine.
 */
export const bookStyles = {
  // Page area positions (percentages relative to the book image 1920x1080)
  // Calibrated to fit within both book backgrounds (avoiding corner decorations)
  page: {
    // Left page boundaries (shifted right to fit magic book)
    left: {
      left: '25%',
      right: '48%',
      top: '14%',
      bottom: '10%',
    },
    // Right page boundaries (shifted left to fit magic book)
    right: {
      left: '51%',
      right: '23%',
      top: '14%',
      bottom: '10%',
    },
    // Inner padding within each page
    padding: '1%',
  },
  // Typography
  fontFamily: {
    heading: '"Palatino Linotype", "Book Antiqua", Palatino, serif',
    body: 'Georgia, "Times New Roman", serif',
  },
  // Animation
  pageTurnDuration: 400, // ms
  pageTurnEasing: 'ease-in-out',
};

/**
 * CSS styles for inline styling (Tailwind can't use dynamic values)
 */
export function getThemeStyles(theme: BookThemeConfig) {
  return {
    // Ribbon bookmark
    ribbon: {
      backgroundColor: theme.ribbonColour,
      color: '#fff',
    },
    // Action button
    button: {
      backgroundColor: theme.buttonColour,
      color: '#fff',
    },
    buttonHover: {
      backgroundColor: theme.buttonHoverColour,
    },
    // Accents
    accent: {
      color: theme.accentPrimary,
    },
    accentBorder: {
      borderColor: theme.accentPrimary,
    },
    // Text
    textPrimary: {
      color: theme.textPrimary,
    },
    textSecondary: {
      color: theme.textSecondary,
    },
    textMuted: {
      color: theme.textMuted,
    },
    // Status
    mastered: {
      color: theme.masteredColour,
    },
    locked: {
      color: theme.lockedColour,
    },
    success: {
      color: theme.successColour,
      backgroundColor: `${theme.successColour}20`,
      borderColor: theme.successColour,
    },
    error: {
      color: theme.errorColour,
      backgroundColor: `${theme.errorColour}20`,
      borderColor: theme.errorColour,
    },
  };
}
