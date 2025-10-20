---
name: Add Tile Sprite
description: Add a new tile sprite to the game, including placing the asset file, registering it in assets.ts, and running optimization
---

# Add Tile Sprite

This skill helps you add a new tile sprite to the TwilightGame project following the project's asset management guidelines.

## When to Use

Use this skill when you need to:
- Add a new tile graphic to the game (grass, rock, water, floor, furniture, etc.)
- Add variations of existing tiles (e.g., grass_3.png, rock_2.png)
- Register tile assets in the centralized asset system

## Prerequisites

- The tile image file should be ready (PNG format, square dimensions like 32x32 or 64x64)
- Know the tile name and variation number

## Steps

### 1. Place the Asset File

Place the tile sprite in `/public/assets/tiles/` following this naming convention:
- Format: `[tileName]_[variationNumber].png`
- Examples: `grass_0.png`, `rock_1.png`, `water_0.png`
- **Important**: Tiles must be square (32x32, 64x64, etc.)
- Design for seamless tiling (edges should connect smoothly)

### 2. Register in assets.ts

Add the asset to the `tileAssets` object in `assets.ts`:

```typescript
export const tileAssets = {
  // ... existing assets
  [assetKey]: new URL('./public/assets-optimized/tiles/[fileName].png', import.meta.url).href,
};
```

**Note**: Always reference the optimized path (`assets-optimized`) in assets.ts, even though you place the original in `public/assets/`. The optimization script will generate the optimized version.

### 3. Run Asset Optimization

After adding the file, run the optimization script:

```bash
npm run optimize-assets
```

This will:
- Resize the tile to 64x64 pixels (standardized tile size)
- Optimize compression (typically 95-99% size reduction)
- Place optimized version in `/public/assets-optimized/tiles/`

### 4. Verify

Check that:
- Original file exists at `/public/assets/tiles/[fileName].png`
- Optimized file was created at `/public/assets-optimized/tiles/[fileName].png`
- Asset is properly registered in `tileAssets` object
- No TypeScript errors: `npx tsc --noEmit`

## Asset Key Naming Convention

The asset key (used in code) should be descriptive:
- `grass_1`, `grass_2` (for variations)
- `rock_1`, `rock_2`
- `path_horizontal`, `path_vertical`
- `tree_cherry_spring`, `tree_cherry_winter`
- `cottage_wooden`
- `floor_1`

## Example

Adding a new grass variation:

1. Place file: `/public/assets/tiles/grass_3.png`
2. Register in assets.ts:
   ```typescript
   grass_3: new URL('./public/assets-optimized/tiles/grass_3.png', import.meta.url).href,
   ```
3. Run: `npm run optimize-assets`
4. Verify optimization created `/public/assets-optimized/tiles/grass_3.png`

## Important Notes

- **Always use optimized paths** in assets.ts (points to `assets-optimized/`)
- **Always place originals** in `public/assets/` directory
- Run optimization after adding new assets
- Optimization runs automatically before `npm run build`
- All sprites use `imageRendering: 'pixelated'` for pixel art
- Background colors from color schemes show through transparent PNGs

## Multi-Tile Sprites (Furniture, Large Objects)

Some tiles span multiple grid squares (beds, sofas, rugs, trees, etc.). These require special handling:

### Key Rules for Multi-Tile Sprites:

1. **Single Anchor Point**: Use only ONE grid character (e.g., `@`) in the map grid. The sprite will render across multiple tiles automatically.
   - ❌ WRONG: `@@@` (creates 3 duplicate sprites)
   - ✅ CORRECT: `@` (single anchor, sprite spans 3 tiles)

2. **Use Original High-Res Images**: For large sprites, DO NOT use the optimized version if it causes quality issues.
   - The optimization script resizes to 64x64 for single tiles, which distorts multi-tile sprites
   - Use original image path: `new URL('./public/assets/tiles/sofa.png', import.meta.url).href`
   - Add comment: `// Use original high-res`

3. **Sprite Metadata Configuration**:
   - Add entry to `SPRITE_METADATA` array in `constants.ts`
   - Set `spriteWidth` and `spriteHeight` to match the image's natural aspect ratio
   - DO NOT force dimensions that distort the image
   - Example: 2732x2048 image → use 3 tiles wide × 2.25 tiles tall (preserves ~4:3 ratio)

4. **Avoid CSS Transforms**:
   - Set `isForeground: false` to render in background layer (no transforms)
   - Background layer uses clean rendering without scale/rotate transforms
   - Use `isForeground: true` only if the object should render over the player AND you want variation transforms

5. **Collision Boxes**:
   - Set collision dimensions separately from sprite dimensions
   - Collision should match the functional footprint (where player can't walk)
   - Example: Sofa might be 3×2.25 visually but only block 3×1 at the base
   ```typescript
   collisionWidth: 3,
   collisionHeight: 1,
   collisionOffsetX: 0,
   collisionOffsetY: 0,
   ```

### Example Multi-Tile Sprite Setup:

```typescript
// In assets.ts
sofa: new URL('./public/assets/tiles/sofa.png', import.meta.url).href,  // Use original high-res

// In constants.ts SPRITE_METADATA array
{
  tileType: TileType.SOFA,
  spriteWidth: 3,      // Match natural aspect ratio
  spriteHeight: 2.25,  // Don't distort the image
  offsetX: 0,
  offsetY: -1.25,      // Extends upward from anchor
  image: tileAssets.sofa,
  isForeground: false, // No CSS transforms
  collisionWidth: 3,   // Functional collision area
  collisionHeight: 1,
  collisionOffsetX: 0,
  collisionOffsetY: 0,
}
```

### Map Grid Usage:

```typescript
// In map definition gridString
const gridString = `
#######
#@FFFF#  // Single @ anchor - sofa renders 3 tiles wide automatically
#FCTFF#
`;
```

## Related Documentation

- [ASSETS.md](../../../docs/ASSETS.md) - Complete asset guidelines
- [MAP_GUIDE.md](../../../docs/MAP_GUIDE.md) - Using tiles in maps
- [assets.ts](../../../assets.ts) - Centralized asset registry
