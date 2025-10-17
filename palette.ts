/**
 * Game Color Palette
 *
 * Centralized color definitions that can be modified at runtime.
 * These colors replace the Tailwind classes defined in index.html.
 *
 * To modify colors in-game, update the hex values in this file and
 * call `applyPaletteToDOM()` to regenerate CSS classes.
 */

export interface PaletteColor {
  name: string;
  hex: string;
  description: string;
}

export interface GamePalette {
  // Neutral Colors
  tan: PaletteColor;
  lavender: PaletteColor;
  cream: PaletteColor;
  slate: PaletteColor;
  periwinkle: PaletteColor;
  ivory: PaletteColor;

  // Earth Tones
  brown: PaletteColor;
  chocolate: PaletteColor;
  rust: PaletteColor;
  maroon: PaletteColor;
  terracotta: PaletteColor;
  peach: PaletteColor;
  taupe: PaletteColor;
  khaki: PaletteColor;
  beige: PaletteColor;

  // Greens
  olive: PaletteColor;
  sage: PaletteColor;
  moss: PaletteColor;

  // Blues/Purples
  navy: PaletteColor;
  purple: PaletteColor;
  plum: PaletteColor;
  iris: PaletteColor;
  mauve: PaletteColor;
  violet: PaletteColor;
  magenta: PaletteColor;
  teal: PaletteColor;
  sky: PaletteColor;

  // Accent Colors
  orange: PaletteColor;
  gold: PaletteColor;
  mustard: PaletteColor;
  burgundy: PaletteColor;
  rose: PaletteColor;
  coral: PaletteColor;

  // Grays
  charcoal: PaletteColor;
  gray: PaletteColor;
  black: PaletteColor;
}

/**
 * Default color palette
 * Can be modified at runtime for customization or accessibility
 */
export const DEFAULT_PALETTE: GamePalette = {
  // Neutral Colors
  tan: { name: 'tan', hex: '#D4A373', description: 'Light brown' },
  lavender: { name: 'lavender', hex: '#C5C6D0', description: 'Light purple-gray' },
  cream: { name: 'cream', hex: '#EFE9E1', description: 'Very light tan' },
  slate: { name: 'slate', hex: '#6B7A8F', description: 'Blue-gray' },
  periwinkle: { name: 'periwinkle', hex: '#A5B3D9', description: 'Light purple-blue' },
  ivory: { name: 'ivory', hex: '#F5E6D3', description: 'Off-white' },

  // Earth Tones
  brown: { name: 'brown', hex: '#7D5A50', description: 'Medium brown' },
  chocolate: { name: 'chocolate', hex: '#6B4423', description: 'Dark brown' },
  rust: { name: 'rust', hex: '#8B4513', description: 'Reddish brown' },
  maroon: { name: 'maroon', hex: '#8B3A3A', description: 'Dark red-brown' },
  terracotta: { name: 'terracotta', hex: '#C47849', description: 'Orange-brown' },
  peach: { name: 'peach', hex: '#E0956A', description: 'Light orange' },
  taupe: { name: 'taupe', hex: '#8C7A6B', description: 'Gray-brown' },
  khaki: { name: 'khaki', hex: '#B8997E', description: 'Greenish tan' },
  beige: { name: 'beige', hex: '#C4A882', description: 'Pale tan' },

  // Greens
  olive: { name: 'olive', hex: '#6B8E23', description: 'Yellow-green' },
  sage: { name: 'sage', hex: '#87AE73', description: 'Muted green' },
  moss: { name: 'moss', hex: '#5A7247', description: 'Dark green' },

  // Blues/Purples
  navy: { name: 'navy', hex: '#3E3F5E', description: 'Dark blue' },
  purple: { name: 'purple', hex: '#4B3F72', description: 'Medium purple' },
  plum: { name: 'plum', hex: '#5C3D5C', description: 'Dark purple' },
  iris: { name: 'iris', hex: '#6B5B95', description: 'Blue-purple' },
  mauve: { name: 'mauve', hex: '#B5A3C4', description: 'Light purple' },
  violet: { name: 'violet', hex: '#6B1D5C', description: 'Deep purple' },
  magenta: { name: 'magenta', hex: '#A8357D', description: 'Bright pink-purple' },
  teal: { name: 'teal', hex: '#1F4B5F', description: 'Dark blue-green' },
  sky: { name: 'sky', hex: '#A8D8EA', description: 'Light blue' },

  // Accent Colors
  orange: { name: 'orange', hex: '#D4763C', description: 'Bright orange' },
  gold: { name: 'gold', hex: '#E6A847', description: 'Metallic gold' },
  mustard: { name: 'mustard', hex: '#D4B85B', description: 'Yellow-brown' },
  burgundy: { name: 'burgundy', hex: '#A4414F', description: 'Deep red' },
  rose: { name: 'rose', hex: '#E05D6F', description: 'Pink-red' },
  coral: { name: 'coral', hex: '#FF8552', description: 'Orange-pink' },

  // Grays
  charcoal: { name: 'charcoal', hex: '#3B3B4A', description: 'Dark gray' },
  gray: { name: 'gray', hex: '#6B6B6B', description: 'Medium gray' },
  black: { name: 'black', hex: '#1A1A1A', description: 'Near black' },
};

/**
 * Current active palette (can be modified at runtime)
 */
let currentPalette: GamePalette = { ...DEFAULT_PALETTE };

/**
 * Get the current palette
 */
export function getPalette(): GamePalette {
  return currentPalette;
}

/**
 * Update a specific color in the palette
 */
export function updatePaletteColor(colorName: keyof GamePalette, hex: string): void {
  if (currentPalette[colorName]) {
    currentPalette[colorName] = {
      ...currentPalette[colorName],
      hex,
    };
    applyPaletteToDOM();
    saveCurrentPaletteToGameState(); // Auto-save on change
  } else {
    console.warn(`[Palette] Color '${colorName}' not found in palette`);
  }
}

/**
 * Update multiple colors at once
 */
export function updatePaletteColors(colors: Partial<Record<keyof GamePalette, string>>): void {
  Object.entries(colors).forEach(([name, hex]) => {
    if (currentPalette[name as keyof GamePalette] && hex) {
      currentPalette[name as keyof GamePalette].hex = hex;
    }
  });
  applyPaletteToDOM();
}

/**
 * Reset palette to defaults
 */
export function resetPalette(): void {
  currentPalette = { ...DEFAULT_PALETTE };
  applyPaletteToDOM();
}

/**
 * Apply palette colors to DOM as CSS classes
 * Generates bg-palette-* classes dynamically
 */
export function applyPaletteToDOM(): void {
  // Remove existing palette style tag if present
  const existingStyle = document.getElementById('game-palette-styles');
  if (existingStyle) {
    existingStyle.remove();
  }

  // Generate CSS for all palette colors
  const css = Object.values(currentPalette)
    .map(color => `.bg-palette-${color.name} { background-color: ${color.hex}; }`)
    .join('\n');

  // Inject CSS into document
  const styleTag = document.createElement('style');
  styleTag.id = 'game-palette-styles';
  styleTag.textContent = css;
  document.head.appendChild(styleTag);

  console.log('[Palette] Applied palette to DOM');
}

/**
 * Get color hex value by name (for direct use)
 */
export function getColorHex(colorName: keyof GamePalette): string {
  return currentPalette[colorName]?.hex || '#000000';
}

/**
 * Get Tailwind class name for a palette color
 */
export function getPaletteClass(colorName: keyof GamePalette): string {
  return `bg-palette-${colorName}`;
}

/**
 * Initialize palette on app startup
 * Call this early in your app initialization
 * Optionally load saved custom colors from GameState
 */
export function initializePalette(savedColors?: Record<string, string>): void {
  if (savedColors && Object.keys(savedColors).length > 0) {
    // Apply saved custom colors
    Object.entries(savedColors).forEach(([name, hex]) => {
      if (currentPalette[name as keyof GamePalette]) {
        currentPalette[name as keyof GamePalette].hex = hex;
      }
    });
    console.log('[Palette] Loaded', Object.keys(savedColors).length, 'custom colors');
  }

  applyPaletteToDOM();
  console.log('[Palette] Initialized with', Object.keys(currentPalette).length, 'colors');
}

/**
 * Save current palette to GameState
 */
export function saveCurrentPaletteToGameState(): void {
  if (typeof window !== 'undefined' && (window as any).gameState) {
    const allColors: Record<string, string> = {};
    Object.entries(currentPalette).forEach(([name, color]) => {
      allColors[name] = color.hex;
    });
    (window as any).gameState.saveCustomColors(allColors);
  }
}

/**
 * Export palette as JSON (for saving/loading custom palettes)
 */
export function exportPalette(): string {
  const exportData: Record<string, string> = {};
  Object.entries(currentPalette).forEach(([name, color]) => {
    exportData[name] = color.hex;
  });
  return JSON.stringify(exportData, null, 2);
}

/**
 * Import palette from JSON
 */
export function importPalette(json: string): void {
  try {
    const data = JSON.parse(json);
    updatePaletteColors(data);
    console.log('[Palette] Imported custom palette');
  } catch (error) {
    console.error('[Palette] Failed to import palette:', error);
  }
}
