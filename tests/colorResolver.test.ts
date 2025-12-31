/**
 * @vitest-environment happy-dom
 *
 * ColorResolver Tests
 *
 * Tests color resolution logic to prevent regressions during refactoring.
 * Uses happy-dom instead of jsdom to avoid webidl-conversions compatibility issues.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ColorResolver } from '../utils/ColorResolver';
import { TileType } from '../types';
import { resetPalette, getColorHex } from '../palette';

// Mock mapManager to avoid loading actual maps
vi.mock('../maps', () => ({
  mapManager: {
    getCurrentColorScheme: vi.fn(() => ({
      name: 'test',
      colors: {
        grass: 'bg-palette-sage',
        water: 'bg-palette-teal',
        floor: 'bg-palette-tan',
        wall: 'bg-palette-charcoal',
        carpet: 'bg-palette-burgundy',
        door: 'bg-palette-brown',
        furniture: 'bg-palette-chocolate',
        special: 'bg-palette-gold',
      },
    })),
  },
}));

// Mock TimeManager to provide consistent test values
vi.mock('../utils/TimeManager', () => ({
  TimeManager: {
    getCurrentTime: vi.fn(() => ({
      season: 'Spring',
      timeOfDay: 'day',
      hour: 12,
      minute: 0,
    })),
  },
  Season: {
    SPRING: 'Spring',
    SUMMER: 'Summer',
    AUTUMN: 'Autumn',
    WINTER: 'Winter',
  },
}));

beforeEach(() => {
  resetPalette();
  vi.clearAllMocks();
});

describe('ColorResolver', () => {
  describe('getTileColor()', () => {
    it('returns palette color for grass tiles', () => {
      const color = ColorResolver.getTileColor(TileType.GRASS);
      expect(color).toBe('bg-palette-sage');
    });

    it('returns palette color for water tiles', () => {
      const color = ColorResolver.getTileColor(TileType.WATER);
      expect(color).toBe('bg-palette-teal');
    });

    it('returns palette color for floor tiles', () => {
      const color = ColorResolver.getTileColor(TileType.FLOOR);
      expect(color).toBe('bg-palette-tan');
    });

    it('returns palette color for wall tiles', () => {
      const color = ColorResolver.getTileColor(TileType.WALL);
      expect(color).toBe('bg-palette-charcoal');
    });

    it('uses grass background for decorative tiles on grass', () => {
      // Trees, bushes, etc. should use grass background
      expect(ColorResolver.getTileColor(TileType.TREE)).toBe('bg-palette-sage');
      expect(ColorResolver.getTileColor(TileType.BUSH)).toBe('bg-palette-sage');
      expect(ColorResolver.getTileColor(TileType.ROCK)).toBe('bg-palette-sage');
    });
  });

  describe('paletteToHex()', () => {
    it('converts palette color string to hex number', () => {
      const hex = ColorResolver.paletteToHex('bg-palette-sage');
      // sage is #87AE73 = 0x87AE73 = 8891507
      expect(hex).toBe(0x87AE73);
    });

    it('converts different palette colors correctly', () => {
      // teal is #1F4B5F
      expect(ColorResolver.paletteToHex('bg-palette-teal')).toBe(0x1F4B5F);

      // brown is #7D5A50
      expect(ColorResolver.paletteToHex('bg-palette-brown')).toBe(0x7D5A50);
    });

    it('returns 0 for invalid format', () => {
      const hex = ColorResolver.paletteToHex('invalid-color');
      expect(hex).toBe(0x000000);
    });

    it('returns 0 for unknown palette color', () => {
      const hex = ColorResolver.paletteToHex('bg-palette-nonexistent');
      expect(hex).toBe(0x000000);
    });
  });

  describe('getTileColorBoth()', () => {
    it('returns both palette string and hex number', () => {
      const result = ColorResolver.getTileColorBoth(TileType.GRASS);

      expect(result.paletteColor).toBe('bg-palette-sage');
      expect(result.hexColor).toBe(0x87AE73);
    });

    it('hex matches palette color', () => {
      const result = ColorResolver.getTileColorBoth(TileType.WATER);

      // Verify consistency
      const directHex = ColorResolver.paletteToHex(result.paletteColor);
      expect(result.hexColor).toBe(directHex);
    });
  });

  describe('TILE_TYPE_TO_COLOR_KEY mapping', () => {
    it('is accessible via static getter', () => {
      const mapping = ColorResolver.TILE_TYPE_TO_COLOR_KEY;
      expect(mapping).toBeDefined();
      expect(typeof mapping).toBe('object');
    });

    it('maps grass tile to grass key', () => {
      const mapping = ColorResolver.TILE_TYPE_TO_COLOR_KEY;
      expect(mapping[TileType.GRASS]).toBe('grass');
    });

    it('maps water tiles to water key', () => {
      const mapping = ColorResolver.TILE_TYPE_TO_COLOR_KEY;
      expect(mapping[TileType.WATER]).toBe('water');
      expect(mapping[TileType.WATER_CENTER]).toBe('water');
    });

    it('maps floor tiles to floor key', () => {
      const mapping = ColorResolver.TILE_TYPE_TO_COLOR_KEY;
      expect(mapping[TileType.FLOOR]).toBe('floor');
      expect(mapping[TileType.FLOOR_LIGHT]).toBe('floor');
      expect(mapping[TileType.FLOOR_DARK]).toBe('floor');
    });

    it('maps decorative tiles to grass for natural blending', () => {
      const mapping = ColorResolver.TILE_TYPE_TO_COLOR_KEY;

      // Trees should blend with grass
      expect(mapping[TileType.TREE]).toBe('grass');
      expect(mapping[TileType.CHERRY_TREE]).toBe('grass');
      expect(mapping[TileType.OAK_TREE]).toBe('grass');

      // Other decorative elements
      expect(mapping[TileType.BUSH]).toBe('grass');
      expect(mapping[TileType.FERN]).toBe('grass');
      expect(mapping[TileType.MUSHROOM]).toBe('grass');
    });

    it('maps door tiles to door key', () => {
      const mapping = ColorResolver.TILE_TYPE_TO_COLOR_KEY;
      expect(mapping[TileType.DOOR]).toBe('door');
      expect(mapping[TileType.EXIT_DOOR]).toBe('door');
      expect(mapping[TileType.SHOP_DOOR]).toBe('door');
    });
  });

  describe('palette integration', () => {
    it('uses current palette colors', () => {
      // Get hex for sage from palette directly
      const sageHex = getColorHex('sage');
      const expectedHex = parseInt(sageHex.replace('#', ''), 16);

      // ColorResolver should use same value
      const resolvedHex = ColorResolver.paletteToHex('bg-palette-sage');
      expect(resolvedHex).toBe(expectedHex);
    });
  });
});
