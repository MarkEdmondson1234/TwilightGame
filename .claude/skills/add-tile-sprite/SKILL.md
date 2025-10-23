---
name: Add Tile Sprite
description: Add a new tile sprite to the game, including placing the asset file, registering it in assets.ts, and running optimization
---

# Add Tile Sprite

This skill helps you add a new tile sprite to the TwilightGame project following the project's asset management guidelines.

## When to Use

Use this skill when you need to:
- Add a new tile graphic to the game (grass, rock, water, floor, furniture, etc.)
- Add variations of existing tiles (e.g., grass_3.png, rock_2.png, sofa_01.png, sofa_02.png)
- Register tile assets in the centralized asset system

## Prerequisites

- The tile image file should be ready (PNG format, square dimensions like 32x32 or 64x64)
- Know the tile name and variation number

## Workflow

### 1. Verify Asset Files Exist

First, check that the asset files exist at the expected location:

```bash
ls -lh /Users/mark/dev/TwilightGame/public/assets/tiles/[fileName].png
```

This helps confirm:
- File exists and is accessible
- File size (to understand if optimization is needed)
- Correct file path

### 2. Register in assets.ts

Add the asset to the `tileAssets` object in `assets.ts`:

```typescript
export const tileAssets = {
  // ... existing assets
  [assetKey]: new URL('./public/assets-optimized/tiles/[fileName].png', import.meta.url).href,
};
```

**Important**:
- **ALWAYS use `assets-optimized/` path** for all tiles
- The optimization script handles different sprite types automatically:
  - **Single-tile sprites** (grass, rocks): Resized to 128x128, quality 85%
  - **Multi-tile furniture** (beds, sofas, rugs): Kept at 512x512, quality 95% (less aggressive)
  - **Textures** (bricks, walls): Center-cropped then resized

**If adding a new multi-tile sprite type** (not bed/sofa/rug/cottage), you may need to update the optimization script to recognize it (see Step 4a below).

### 3. Add Variations (Optional)

If adding multiple variations of the same tile type:

1. **Add all variation assets** to `assets.ts` with numbered suffixes:
   ```typescript
   sofa: new URL('./public/assets/tiles/sofa.png', import.meta.url).href,
   sofa_01: new URL('./public/assets/tiles/sofa_01.png', import.meta.url).href,
   sofa_02: new URL('./public/assets/tiles/sofa_02.png', import.meta.url).href,
   ```

2. **Update SPRITE_METADATA or TILE_LEGEND** to use an array:
   - For multi-tile sprites, update `SPRITE_METADATA` in `constants.ts`:
     ```typescript
     {
       tileType: TileType.SOFA,
       // ... other properties
       image: [
         tileAssets.sofa,
         tileAssets.sofa_01,
         tileAssets.sofa_02,
       ],
     }
     ```
   - For single-tile sprites, update `TILE_LEGEND` in `constants.ts`:
     ```typescript
     {
       name: 'Grass',
       // ... other properties
       image: [
         tileAssets.grass_1,
         tileAssets.grass_2,
         tileAssets.grass_3,
       ]
     }
     ```

3. **Random selection happens automatically** - the rendering code will use a deterministic hash to select variations based on tile position.

### 4. Update Optimization Script (Multi-Tile Sprites Only)

**Only needed if adding a NEW type of multi-tile furniture** (e.g., first time adding a wardrobe, table, etc.):

Edit `/scripts/optimize-assets.js` to add your sprite type to the large furniture check (around line 183):

```javascript
// Special handling for large furniture (beds, etc.) - keep higher resolution and quality
if (file.includes('bed') || file.includes('sofa') || file.includes('rug') || file.includes('wardrobe')) {
  await sharp(inputPath)
    .resize(LARGE_FURNITURE_SIZE, LARGE_FURNITURE_SIZE, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .png({ quality: HIGH_QUALITY, compressionLevel: 6 }) // Higher quality, less compression
    .toFile(outputPath);
}
```

**Skip this step if**:
- Adding variations of existing furniture (sofa_01, sofa_02, bed_02, etc.)
- Adding single-tile sprites (grass, rocks, floors)

### 5. Run Asset Optimization

After registering the assets, run the optimization script:

```bash
npm run optimize-assets
```

This will:
- **Single-tile sprites**: Resize to 128x128, quality 85%, high compression
- **Multi-tile furniture**: Resize to 512x512, quality 95%, moderate compression
- **Textures (bricks/walls)**: Center-crop then resize to 128x128
- Place optimized versions in `/public/assets-optimized/tiles/`

**Expected Output:**
Look for your new asset in the optimization output. Size reduction depends on sprite type:
```
🎨 Optimizing tile images...
  ✅ grass_3.png: 66.3KB → 3.9KB (saved 94.0%)       # Single-tile
  ✅ sofa_01.png: 2031.0KB → 32.1KB (saved 98.4%)    # Multi-tile furniture
```

### 6. Verify Optimized Files

Check that optimization created the expected files:

```bash
ls -lh /Users/mark/dev/TwilightGame/public/assets-optimized/tiles/[fileName].png
```

Compare file sizes:
- **Single-tile sprites**: Original 50KB-3MB → Optimized 2-10KB
- **Multi-tile furniture**: Original 1-5MB → Optimized 20-100KB

### 7. Validate TypeScript Compilation

Always run TypeScript validation to catch any type errors:

```bash
npx tsc --noEmit
```

**Common Issues:**
- Missing asset keys in type definitions
- Image property type mismatches (string vs string[])
- Import errors from assets.ts

### 8. Restart Dev Server (IMPORTANT!)

**CRITICAL**: After adding new assets, you MUST restart the dev server for the new sprites to load properly:

```bash
# Kill the dev server (Ctrl+C in terminal)
# Then restart:
npm run dev
```

**Why this is necessary:**
- HMR (Hot Module Replacement) may not properly reload new asset files
- Vite needs a full restart to recognize and bundle new assets added to `assets.ts`
- Without restart, sprites may show as missing or display "Table"/"Chair" text labels instead of images

**Symptoms of not restarting:**
- Text labels ("Table", "Chair") appear instead of sprites
- Sprites don't render at all
- 404 errors in browser console for new assets

### 9. Test in Game (Optional but Recommended)

After restarting the dev server, refresh your browser and verify the sprite renders correctly:

```bash
# Server should be running at:
http://localhost:4000/TwilightGame/
```

Then check:
- Sprite appears at correct size
- No distortion or stretching (especially for multi-tile furniture)
- Variations appear random but consistent per position
- Collision boxes work correctly (for multi-tile sprites)
- Image quality looks good (not overly compressed)
- Player cannot walk through solid furniture (tables, chairs, beds)

## Asset Key Naming Convention

The asset key (used in code) should be descriptive:
- `grass_1`, `grass_2`, `grass_3` (numbered variations)
- `rock_1`, `rock_2`
- `sofa`, `sofa_01`, `sofa_02` (base + numbered variations)
- `path_horizontal`, `path_vertical` (descriptive names)
- `tree_cherry_spring`, `tree_cherry_winter` (seasonal)
- `cottage_wooden` (type + material)
- `floor_1`

**Variation Naming:**
- Use underscores for multi-word names: `stepping_stones_1`
- Number variations consistently: `_1`, `_2`, `_3` OR `_01`, `_02`, `_03`
- Base variant can be unnumbered (e.g., `sofa`) with variants numbered (`sofa_01`, `sofa_02`)

## Complete Examples

### Example 1: Adding a Single-Tile Variation

Adding a new grass variation (`grass_3.png`):

1. **Verify file exists:**
   ```bash
   ls -lh public/assets/tiles/grass_3.png
   ```

2. **Register in assets.ts:**
   ```typescript
   grass_3: new URL('./public/assets-optimized/tiles/grass_3.png', import.meta.url).href,
   ```

3. **Update TILE_LEGEND in constants.ts:**
   ```typescript
   {
     name: 'Grass',
     color: 'bg-palette-sage',
     isSolid: false,
     image: [
       tileAssets.grass_1,
       tileAssets.grass_2,
       tileAssets.grass_3,  // Add new variation
     ]
   },
   ```

4. **Run optimization:**
   ```bash
   npm run optimize-assets
   ```

5. **Verify optimized file:**
   ```bash
   ls -lh public/assets-optimized/tiles/grass_3.png
   ```

6. **Validate TypeScript:**
   ```bash
   npx tsc --noEmit
   ```

### Example 2: Adding Multi-Tile Sprite Variations

Adding sofa variations (`sofa_01.png`, `sofa_02.png`):

1. **Verify files exist:**
   ```bash
   ls -lh public/assets/tiles/sofa_01.png public/assets/tiles/sofa_02.png
   ```

2. **Check if sofa is already in optimization script:**
   ```bash
   grep -n "file.includes('sofa')" scripts/optimize-assets.js
   ```
   If found, skip to step 3. If not, add 'sofa' to the large furniture check (see Step 4 in workflow above).

3. **Register in assets.ts (use optimized paths):**
   ```typescript
   sofa_01: new URL('./public/assets-optimized/tiles/sofa_01.png', import.meta.url).href,
   sofa_02: new URL('./public/assets-optimized/tiles/sofa_02.png', import.meta.url).href,
   ```

4. **Update SPRITE_METADATA in constants.ts:**
   ```typescript
   {
     tileType: TileType.SOFA,
     spriteWidth: 3,
     spriteHeight: 2.25,
     offsetX: 0,
     offsetY: -1.25,
     image: [
       tileAssets.sofa_01,
       tileAssets.sofa_02,
     ],
     isForeground: false,
     collisionWidth: 2.5,
     collisionHeight: 0.5,
     collisionOffsetX: 0.3,
     collisionOffsetY: 0,
   },
   ```

5. **Run optimization (uses 512x512, quality 95%):**
   ```bash
   npm run optimize-assets
   ```

6. **Validate TypeScript:**
   ```bash
   npx tsc --noEmit
   ```

7. **Test in game:**
   ```bash
   npm run dev
   ```

## Important Notes

- **ALWAYS use `assets-optimized/` path** in assets.ts for all tile sprites
- **Always place originals** in `public/assets/tiles/` directory first
- **Optimization is automatic** - the script detects sprite type by filename:
  - Regular tiles → 128x128, quality 85%
  - Furniture (bed/sofa/rug) → 512x512, quality 95%
  - Textures (brick/wall) → center-crop + 128x128
- Run `npm run optimize-assets` after adding new assets
- Optimization runs automatically before `npm run build`
- All sprites use `imageRendering: 'pixelated'` for pixel art (except large multi-tile sprites use 'auto')
- Background colors from color schemes show through transparent PNGs
- **Variations are selected deterministically** based on tile position (same position = same variation every time)

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
