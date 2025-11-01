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

## Rendering Architecture Note

**TwilightGame uses PixiJS WebGL rendering** for high performance (10-100x faster than DOM).

**What this means for you:**
- **Asset registration** (in `assets.ts`): Unchanged
- **Configuration** (in `constants.ts`): Unchanged
- **Rendering**: Automatically handled by PixiJS (`TileLayer`, `SpriteLayer`, texture loading)
- **Transforms**: Configured once in constants, applied internally by rendering engine
- **DOM fallback**: Available via `TileRenderer.tsx` for backward compatibility

**You don't need to understand PixiJS internals** - just register your assets and configure tiles/sprites as documented below. The rendering engine handles everything automatically.

## Workflow

### Quick Reference: Files to Update

When adding a **new tile type** (not just a variation), you'll need to update these files:

1. **types.ts** - Add new `TileType` enum entry
2. **assets.ts** - Register the asset file path
3. **constants.ts** - Add to `TILE_LEGEND` array
4. **constants.ts** - Add to `SPRITE_METADATA` array (for multi-tile sprites)
5. **maps/gridParser.ts** - Add character code mapping
6. **map definition files** - Use the new tile in maps

For **variations of existing tiles**, you only need:
1. **assets.ts** - Register the variation asset
2. **constants.ts** - Update existing `TILE_LEGEND` or `SPRITE_METADATA` entry to use array of images

---

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

3. **Random selection happens automatically** - the rendering engine (PixiJS `TileLayer` or DOM `TileRenderer`) uses a deterministic hash to select variations based on tile position.

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
     ],
     transforms: {  // Optional transforms (applied by rendering engine)
       enableFlip: true,      // Horizontal flip variation
       enableScale: true,     // Size variation
       scaleRange: { min: 0.95, max: 1.05 },
     }
   },
   ```

   **Note:** Transforms are configured here but applied automatically by the rendering engine:
   - **PixiJS renderer** (default): Uses `sprite.scale.x`, `sprite.rotation`, `sprite.tint`
   - **DOM renderer** (fallback): Uses CSS `transform` and `filter` properties

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

### Example 3: Adding a Completely New Multi-Tile Sprite (Full Workflow)

Adding a chimney sprite (`chimney.png`) as a new 2x2 tile type:

**Step 1: Verify the asset file**
```bash
ls -lh /Users/mark/dev/TwilightGame/public/assets/tiles/chimney.png
# Output: -rw-r--r--  1.7M chimney.png
```

**Step 2: Add TileType enum to types.ts**
```typescript
// In types.ts, add to the TileType enum
export enum TileType {
  // ... existing types
  BED,
  SOFA,
  CHIMNEY,  // Add new type here
}
```

**Step 3: Register asset in assets.ts**
```typescript
// In assets.ts
export const tileAssets = {
  // ... existing assets
  chimney: new URL('./public/assets-optimized/tiles/chimney.png', import.meta.url).href,
};
```

**Step 4: Add to TILE_LEGEND in constants.ts**
```typescript
// In constants.ts, add after SOFA entry
{
  name: 'Chimney',
  color: 'bg-palette-tan',  // Base floor color (shows through transparent parts)
  isSolid: true,  // Players cannot walk through chimneys
  image: []  // No single-tile image - uses multi-tile sprite from SPRITE_METADATA
}, // CHIMNEY = 35
```

**Step 5: Add to SPRITE_METADATA in constants.ts**
```typescript
// In constants.ts SPRITE_METADATA array, add chimney configuration
{
  tileType: TileType.CHIMNEY,
  spriteWidth: 2,  // 2 tiles wide
  spriteHeight: 2, // 2 tiles tall
  offsetX: 0,      // Start at anchor tile
  offsetY: -1,     // Extends 1 tile upward
  image: tileAssets.chimney,
  isForeground: false,  // Render UNDER player (background wall decoration)
  // Disable all CSS transforms for clean rendering
  enableFlip: false,
  enableRotation: false,
  enableScale: false,
  enableBrightness: false,
  // Collision - chimney blocks movement
  collisionWidth: 2,
  collisionHeight: 2,
  collisionOffsetX: 0,
  collisionOffsetY: -1,
},
```

**Step 6: Add character code to gridParser.ts**
```typescript
// In maps/gridParser.ts, add to GRID_CODES
export const GRID_CODES: Record<string, TileType> = {
  // ... existing codes
  '@': TileType.SOFA,
  '&': TileType.CHIMNEY,  // & = chimney (brick structure)
  'U': TileType.BUSH,
  // ...
};
```

**Step 7: Run asset optimization**
```bash
npm run optimize-assets
# Output: ✅ chimney.png: 1744.1KB → 4.2KB (saved 99.8%)
```

**Step 8: Verify optimized file**
```bash
ls -lh /Users/mark/dev/TwilightGame/public/assets-optimized/tiles/chimney.png
# Output: -rw-r--r--  4.2K chimney.png
```

**Step 9: Add to map definitions**
```typescript
// In maps/definitions/homeInterior.ts
const gridString = `
#######E##
#ffffffff#
#ff@fffff##
#ffffffff&#  // Chimney on right wall
#frffffff#
#ffffffff#
#ffffffff#
###D######
`;
```

**Step 10: Run TypeScript validation**
```bash
npx tsc --noEmit
# Should complete with no errors
```

**Step 11: Test in game**
```bash
npm run dev
# Navigate to the house interiors and verify chimney appears on right wall
```

**Key Takeaways from Chimney Implementation:**
- New tile types require updates to 5 files: `types.ts`, `assets.ts`, `constants.ts` (TILE_LEGEND + SPRITE_METADATA), `gridParser.ts`, and map files
- Grid character codes should be intuitive: `&` for chimney (looks like bricks)
- Multi-tile sprites need `offsetY` to position correctly (negative values extend upward)
- Always use `isForeground: false` for wall decorations (renders under player)
- Collision dimensions can differ from visual dimensions
- Optimization is extremely effective (99.8% reduction in this case!)

## Common Pitfalls and Solutions

### 1. TypeScript Errors After Adding Tile
**Problem:** TypeScript compilation fails with enum errors
**Solution:** Make sure you added the tile type to the `TileType` enum in `types.ts` BEFORE adding it to `constants.ts`

### 2. Sprite Doesn't Appear in Game
**Problem:** Tile shows as blank or text label appears
**Solution:**
- Check that asset optimization ran successfully
- Verify optimized file exists in `assets-optimized/tiles/`
- **Restart the dev server** (critical for new assets!)

### 3. Sprite Appears Distorted
**Problem:** Multi-tile sprite looks stretched or squashed
**Solution:**
- Match `spriteWidth` and `spriteHeight` to image's natural aspect ratio
- Don't force square dimensions on rectangular images
- Consider using original high-res if optimization caused issues

### 4. Player Walks Through Solid Objects
**Problem:** Collision detection doesn't work for furniture
**Solution:**
- Set `isSolid: true` in TILE_LEGEND
- Configure collision box in SPRITE_METADATA
- Ensure `collisionWidth` and `collisionHeight` are set correctly
- Check that `collisionOffsetX/Y` align with visual footprint

### 5. Duplicate Sprites Rendering
**Problem:** Multiple sprites appear overlapping (e.g., sofa appears 3 times wide)
**Solution:** Use only ONE anchor character in map grid (e.g., `@` not `@@@`)

### 6. Chimney/Wall Decoration Renders Wrong Layer
**Problem:** Wall decoration appears over player instead of behind
**Solution:** Set `isForeground: false` in SPRITE_METADATA for wall decorations

### 7. Grid Character Not Recognized
**Problem:** Map shows grass/default tiles instead of new sprite
**Solution:**
- Add character mapping in `maps/gridParser.ts` GRID_CODES
- Choose an intuitive, unused character (e.g., `&` for chimney)
- Update map legend comments to document the character

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
- **CRITICAL:** Always restart dev server after adding new assets for proper loading

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

4. **Transform Configuration**:
   - Set `isForeground: false` to render in background layer (clean rendering)
   - Background layer avoids aggressive scale/rotate transforms for better quality
   - Use `isForeground: true` only if the object should render over the player AND you want variation transforms

   **Rendering Note:**
   Multi-tile sprites are rendered by:
   - **PixiJS** (default): `SpriteLayer.ts` (separate background/foreground layers)
   - **DOM Fallback**: `ForegroundSprites.tsx` + `BackgroundSprites.tsx`

   The `isForeground` flag controls layering in both renderers:
   - `false`: Renders under player (background objects, furniture)
   - `true`: Renders over player (trees, tall objects)

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
  isForeground: false, // Clean rendering (no aggressive transforms)
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

### Asset Guidelines
- [ASSETS.md](../../../docs/ASSETS.MD) - Complete asset guidelines
- [MAP_GUIDE.md](../../../docs/MAP_GUIDE.md) - Using tiles in maps

### Configuration Files
- [assets.ts](../../../assets.ts) - Centralized asset registry
- [constants.ts](../../../constants.ts) - Tile configuration (TILE_LEGEND, SPRITE_METADATA)
- [types.ts](../../../types.ts) - TypeScript type definitions

### Rendering System (PixiJS)
- [utils/pixi/TileLayer.ts](../../../utils/pixi/TileLayer.ts) - PixiJS single-tile renderer
- [utils/pixi/SpriteLayer.ts](../../../utils/pixi/SpriteLayer.ts) - PixiJS multi-tile sprite renderer
- [utils/pixi/TextureManager.ts](../../../utils/pixi/TextureManager.ts) - Asset preloading and texture management

### Rendering System (DOM Fallback)
- [components/TileRenderer.tsx](../../../components/TileRenderer.tsx) - DOM single-tile renderer
- [components/ForegroundSprites.tsx](../../../components/ForegroundSprites.tsx) - DOM foreground sprites
- [components/BackgroundSprites.tsx](../../../components/BackgroundSprites.tsx) - DOM background sprites
