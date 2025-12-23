/**
 * Palette System Tests
 *
 * Tests critical palette functions to prevent regressions during refactoring.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getPalette,
  getColorHex,
  updatePaletteColor,
  resetPalette,
  exportPalette,
  initializePalette,
  DEFAULT_PALETTE,
  GamePalette,
} from '../palette';

// Mock DOM for applyPaletteToDOM
beforeEach(() => {
  // Reset document.head for style injection tests
  document.head.innerHTML = '';
  // Reset palette to defaults before each test
  resetPalette();
});

describe('palette.ts', () => {
  describe('getPalette()', () => {
    it('returns the current palette object', () => {
      const palette = getPalette();
      expect(palette).toBeDefined();
      expect(palette.sage).toBeDefined();
      expect(palette.sage.hex).toBe('#87AE73');
    });

    it('palette has all expected color groups', () => {
      const palette = getPalette();

      // Neutral colors
      expect(palette.tan).toBeDefined();
      expect(palette.lavender).toBeDefined();
      expect(palette.cream).toBeDefined();

      // Earth tones
      expect(palette.brown).toBeDefined();
      expect(palette.chocolate).toBeDefined();

      // Greens
      expect(palette.sage).toBeDefined();
      expect(palette.moss).toBeDefined();
      expect(palette.olive).toBeDefined();

      // Blues/Purples
      expect(palette.navy).toBeDefined();
      expect(palette.teal).toBeDefined();

      // Grays
      expect(palette.charcoal).toBeDefined();
      expect(palette.gray).toBeDefined();
      expect(palette.black).toBeDefined();
    });
  });

  describe('getColorHex()', () => {
    it('returns correct hex for known colors', () => {
      expect(getColorHex('sage')).toBe('#87AE73');
      expect(getColorHex('brown')).toBe('#7D5A50');
      expect(getColorHex('navy')).toBe('#3E3F5E');
      expect(getColorHex('chocolate')).toBe('#6B4423');
    });

    it('returns fallback for unknown color', () => {
      // Unknown color should return #000000
      expect(getColorHex('nonexistent' as any)).toBe('#000000');
    });

    it('returns hex in correct format (#XXXXXX)', () => {
      const hex = getColorHex('sage');
      expect(hex).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });

  describe('updatePaletteColor()', () => {
    it('updates a color in the palette', () => {
      const originalHex = getColorHex('sage');
      const newHex = '#FF0000';

      updatePaletteColor('sage', newHex);

      expect(getColorHex('sage')).toBe(newHex);
      expect(getColorHex('sage')).not.toBe(originalHex);
    });

    it('does not affect other colors', () => {
      const originalBrown = getColorHex('brown');

      updatePaletteColor('sage', '#FF0000');

      expect(getColorHex('brown')).toBe(originalBrown);
    });

    it('injects CSS into DOM', () => {
      updatePaletteColor('sage', '#FF0000');

      const styleTag = document.getElementById('game-palette-styles');
      expect(styleTag).not.toBeNull();
      expect(styleTag?.textContent).toContain('.bg-palette-sage');
    });
  });

  describe('resetPalette()', () => {
    it('restores all colors to defaults', () => {
      // Modify some colors
      updatePaletteColor('sage', '#FF0000');
      updatePaletteColor('brown', '#00FF00');

      // Reset
      resetPalette();

      // Check they're back to defaults
      expect(getColorHex('sage')).toBe(DEFAULT_PALETTE.sage.hex);
      expect(getColorHex('brown')).toBe(DEFAULT_PALETTE.brown.hex);
    });

    it('re-applies CSS to DOM', () => {
      resetPalette();

      const styleTag = document.getElementById('game-palette-styles');
      expect(styleTag).not.toBeNull();
    });
  });

  describe('exportPalette()', () => {
    it('returns valid JSON string', () => {
      const json = exportPalette();

      expect(() => JSON.parse(json)).not.toThrow();
    });

    it('exported JSON contains all palette colors', () => {
      const json = exportPalette();
      const data = JSON.parse(json);

      expect(data.sage).toBe('#87AE73');
      expect(data.brown).toBe('#7D5A50');
      expect(data.navy).toBe('#3E3F5E');
    });

    it('exported JSON reflects current state', () => {
      updatePaletteColor('sage', '#AABBCC');

      const json = exportPalette();
      const data = JSON.parse(json);

      expect(data.sage).toBe('#AABBCC');
    });
  });

  describe('initializePalette()', () => {
    it('initializes with default palette', () => {
      initializePalette();

      expect(getColorHex('sage')).toBe(DEFAULT_PALETTE.sage.hex);
    });

    it('applies CSS to DOM', () => {
      initializePalette();

      const styleTag = document.getElementById('game-palette-styles');
      expect(styleTag).not.toBeNull();
    });
  });

  describe('DEFAULT_PALETTE', () => {
    it('has correct structure for all colors', () => {
      Object.entries(DEFAULT_PALETTE).forEach(([name, color]) => {
        expect(color.name).toBe(name);
        expect(color.hex).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(color.description).toBeDefined();
        expect(typeof color.description).toBe('string');
      });
    });

    it('contains essential game colors', () => {
      // Colors used frequently in tile rendering
      expect(DEFAULT_PALETTE.sage).toBeDefined(); // Grass
      expect(DEFAULT_PALETTE.chocolate).toBeDefined(); // Soil
      expect(DEFAULT_PALETTE.teal).toBeDefined(); // Water
      expect(DEFAULT_PALETTE.tan).toBeDefined(); // Floor
      expect(DEFAULT_PALETTE.charcoal).toBeDefined(); // Walls
    });
  });
});
