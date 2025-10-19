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

## Related Documentation

- [ASSETS.md](../../../docs/ASSETS.md) - Complete asset guidelines
- [MAP_GUIDE.md](../../../docs/MAP_GUIDE.md) - Using tiles in maps
- [assets.ts](../../../assets.ts) - Centralized asset registry
