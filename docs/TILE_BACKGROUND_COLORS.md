# Tile Background Colours Guide

## Overview

This guide explains how tile background colours work in TwilightGame and how to fix issues where tiles don't display the correct background colour from the map's colour scheme.

## The Problem: Wrong Background Colours

When adding decorative tiles (like mushrooms, flowers, or plants), you might notice they render with an incorrect background colour instead of showing the grass colour from the map's theme.

**Example Issue:**
- Mushrooms appeared with a "mushroom" colour background instead of grass
- This made them look like they were floating on coloured boxes
- The grass colour from the forest theme wasn't showing through

## How Tile Backgrounds Work

TwilightGame uses a **two-layer system** for tiles with transparent sprites:

### Layer 1: Base Tile (Background)
- Defined by `baseType` property in `TILE_LEGEND`
- Renders underneath the tile sprite
- Example: `baseType: TileType.GRASS` renders grass as the background

### Layer 2: Tile Colour (Fallback)
- Mapped in `utils/ColorResolver.ts`
- Used for any non-transparent pixels in the tile
- Must match the visual context (grass, water, rock, etc.)

## The Solution: ColorResolver Mapping

All decorative tiles that sit on grass must be mapped to `'grass'` in `ColorResolver.ts`.

### File Location
```
utils/ColorResolver.ts
```

### The Mapping Object

Look for `TILE_TYPE_TO_COLOR_KEY`:

```typescript
const TILE_TYPE_TO_COLOR_KEY: Partial<Record<TileType, keyof ColorScheme['colors']>> = {
  [TileType.GRASS]: 'grass',
  [TileType.ROCK]: 'rock',
  [TileType.WATER]: 'water',
  // ... more mappings ...

  // Decorative tiles on grass - ALL should map to 'grass'
  [TileType.MUSHROOM]: 'grass',  // ✅ CORRECT
  [TileType.BUSH]: 'grass',
  [TileType.TREE]: 'grass',
  [TileType.FERN]: 'grass',
  [TileType.WILD_IRIS]: 'grass',
  [TileType.GIANT_MUSHROOM]: 'grass',
  // etc.
};
```

## Step-by-Step Fix

### 1. Identify the Issue

Check if your tile has a custom colour mapping:

```bash
grep "TileType.YOUR_TILE" utils/ColorResolver.ts
```

### 2. Verify TILE_LEGEND Configuration

Check that your tile has the correct `baseType`:

```typescript
// In constants.ts - TILE_LEGEND
[TileType.MUSHROOM]: {
  name: 'Mushroom',
  color: 'bg-palette-sage',  // Fallback colour
  isSolid: false,
  baseType: TileType.GRASS,  // ✅ Renders grass underneath
  image: [tileAssets.mushrooms],
  // ... transforms ...
},
```

### 3. Fix ColorResolver Mapping

Update the colour mapping to `'grass'`:

```typescript
// utils/ColorResolver.ts
[TileType.MUSHROOM]: 'grass',  // Changed from 'mushroom' to 'grass'
```

### 4. Test the Fix

1. Save the file (HMR will reload automatically)
2. Navigate to a map with your tile
3. Verify the background now shows grass colour

## Real-World Example: Mushroom Fix

### Before (Incorrect)
```typescript
// utils/ColorResolver.ts
[TileType.MUSHROOM]: 'mushroom',  // ❌ Wrong - creates coloured boxes
```

**Result:** Mushrooms rendered with "mushroom" colour background (not in colour scheme).

### After (Correct)
```typescript
// utils/ColorResolver.ts
[TileType.MUSHROOM]: 'grass',  // ✅ Correct - shows grass underneath
```

**Result:** Mushrooms render with proper grass background from the forest colour scheme.

## Common Patterns

### Decorative Plants/Objects on Grass
```typescript
[TileType.MUSHROOM]: 'grass',
[TileType.FERN]: 'grass',
[TileType.BUSH]: 'grass',
[TileType.TREE]: 'grass',
[TileType.WILD_IRIS]: 'grass',
[TileType.WILD_STRAWBERRY]: 'grass',
```

### Water Features
```typescript
[TileType.LILY_PAD]: 'water',
[TileType.WATER_PLANT]: 'water',
```

### Indoor/Furniture
```typescript
[TileType.TABLE]: 'furniture',
[TileType.CHAIR]: 'furniture',
[TileType.RUG]: 'floor',
```

## When to Add Custom Colour Keys

Only add a custom colour key if:
1. The tile type has a **unique background** that doesn't match existing keys
2. The colour scheme defines that specific key
3. You want **different background colours per map theme**

Example:
```typescript
// If you have a "crystal" colour in all colour schemes
[TileType.MAGIC_CRYSTAL]: 'crystal',
```

## Debugging Tips

### Check What Colour is Being Used

Add a console log in `ColorResolver.ts`:

```typescript
const colorKey = TILE_TYPE_TO_COLOR_KEY[tileType] || 'grass';
console.log(`Tile ${TileType[tileType]} uses colour key: ${colorKey}`);
```

### Verify Colour Scheme Has the Key

Check `maps/colorSchemes.ts`:

```typescript
export const forestScheme: ColorScheme = {
  name: 'Forest',
  colors: {
    grass: 'bg-palette-forest-moss',
    rock: 'bg-palette-slate',
    water: 'bg-palette-pond-blue',
    // ... make sure your key exists here
  }
};
```

### Check Tile Has baseType

In `constants.ts` TILE_LEGEND:

```typescript
[TileType.YOUR_TILE]: {
  baseType: TileType.GRASS,  // ✅ This should be present for transparent sprites
  // ...
}
```

## Quick Reference Checklist

When adding a new decorative tile:

- [ ] Add `baseType: TileType.GRASS` in `TILE_LEGEND` (constants.ts)
- [ ] Add `[TileType.YOUR_TILE]: 'grass'` in `ColorResolver.ts`
- [ ] Ensure sprite image has transparent background (alpha channel)
- [ ] Test on multiple maps to verify grass colour changes correctly

## Related Documentation

- [`MAP_GUIDE.md`](MAP_GUIDE.md) - Creating maps with tiles
- [`ASSETS.md`](ASSETS.md) - Asset requirements and transparency
- [`docs/COORDINATE_GUIDE.md`](COORDINATE_GUIDE.md) - Position system reference

## Further Reading

### ColorResolver Architecture

The `ColorResolver` provides a single source of truth for tile colours:

```typescript
export class ColorResolver {
  static getTileColor(tileType: TileType): string {
    // 1. Look up colour key for this tile type
    const colorKey = TILE_TYPE_TO_COLOR_KEY[tileType] || 'grass';

    // 2. Get current map's colour scheme
    const scheme = MapManager.getCurrentColorScheme();

    // 3. Return the actual colour class
    return scheme.colors[colorKey];
  }
}
```

### Why Not Use TILE_LEGEND Color Directly?

The `color` property in `TILE_LEGEND` is a **fallback** only. It doesn't respect map themes:

```typescript
// This is NOT used for background rendering (it's theme-agnostic)
color: 'bg-palette-sage'

// This IS used (respects map's colour scheme)
ColorResolver.getTileColor(tileType)
```

Using `ColorResolver` ensures tiles adapt to different map themes (forest, village, cave, etc.).

---

**Last Updated:** December 2025
**Related Commit:** `2ec8076` - Fix mushroom tile colour mapping from 'mushroom' to 'grass'
