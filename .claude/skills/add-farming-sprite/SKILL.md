---
name: Add Farming Sprite
description: Add farming-related sprites (crops, soil states, plants) to the game's farming system
---

# Add Farming Sprite

This skill helps you add farming-related sprites to the TwilightGame project, including soil states, plant growth stages, and crop graphics.

## When to Use

Use this skill when you need to:
- Add sprites for soil states (fallow, tilled, watered)
- Add plant growth stages (young, adult, ready to harvest)
- Add new crop types with their growth stages
- Update farming visuals

## Prerequisites

- Farming sprite file ready (PNG format, square dimensions like 32x32 or 64x64)
- Know what the sprite represents (soil state, plant stage, crop type)
- Understand which farm state or crop this sprite is for

## Rendering Architecture Note

**TwilightGame uses PixiJS WebGL rendering** for high performance (10-100x faster than DOM).

**What this means for you:**
- **Asset registration** (in `assets.ts`): Unchanged
- **Rendering**: Farm plot sprites are automatically rendered by the tile system
  - **PixiJS** (default): `TileLayer.ts` handles all tile rendering including farm plots
  - **DOM Fallback**: `TileRenderer.tsx` with farm plot override logic
- **You don't need PixiJS knowledge** - just register your assets as documented below

The rendering engine automatically selects the appropriate sprite based on farm plot state, crop type, growth stage, and current season

## Farming Sprite Categories

### Soil States
- `fallow_soil_[variation]` - Untilled brown soil (can have variations)
- `tilled` - Dark brown tilled soil ready for planting
- `watered` - Tilled soil that's been watered (optional visual)

### Plant States (Generic)
- Planted (dark green) - Seeds just planted
- Watered (green) - Recently watered plant
- Wilting (yellow) - Needs water
- Dead (gray) - Died from lack of water

### Crop-Specific Sprites
Each crop can have multiple growth stages:
- `plant_[cropName]_young` - Early growth stage
- `plant_[cropName]_adult` - Mid growth stage
- `plant_[cropName]_ready` - Ready to harvest

Current crop types:
- Pea (example: `plant_pea_young.png`, `plant_pea_adult.png`)
- Radish (2 minutes to grow)
- Tomato (5 minutes to grow)
- Wheat (10 minutes to grow)
- Corn (15 minutes to grow)
- Pumpkin (20 minutes to grow)

## Steps

### 1. Place the Asset File

Place farming sprites in `/public/assets/farming/`:
- Format: `[category]_[name]_[stage/variation].png`
- Examples:
  - `fallow_soil_1.png`, `fallow_soil_2.png` (variations)
  - `tilled.png`
  - `plant_pea_young.png`, `plant_pea_adult.png`
  - `plant_tomato_ready.png`
- **Important**: Sprites must be square (32x32, 64x64, etc.)
- Use transparent backgrounds for plants (soil shows through)

### 2. Register in assets.ts

Add the asset to the `farmingAssets` object in `assets.ts`:

```typescript
export const farmingAssets = {
  // ... existing assets
  [assetKey]: new URL('./public/assets-optimized/farming/[fileName].png', import.meta.url).href,
};
```

**Note**: Always reference the optimized path (`assets-optimized`) in assets.ts.

### 3. Run Asset Optimization

After adding the file, run the optimization script:

```bash
npm run optimize-assets
```

This will:
- Resize to standard tile size (64x64 pixels)
- Optimize compression
- Place optimized version in `/public/assets-optimized/farming/`

### 4. Update Farming System (If Adding New Crop)

If adding a new crop type, you'll also need to update the farming system code:
- Add crop definition to farming constants
- Map growth stages to sprite keys
- See `docs/FARMING.md` for farming system details

### 5. Verify

Check that:
- Original file exists at `/public/assets/farming/[fileName].png`
- Optimized file created at `/public/assets-optimized/farming/[fileName].png`
- Asset properly registered in `farmingAssets` object
- No TypeScript errors: `npx tsc --noEmit`

## Asset Key Naming Convention

Use descriptive names following these patterns:

**Soil states:**
- `fallow_soil_1`, `fallow_soil_2` (variations)
- `tilled`
- `watered_soil`

**Plant growth stages:**
- `plant_[crop]_young`
- `plant_[crop]_adult`
- `plant_[crop]_ready`
- `plant_[crop]_wilting`
- `plant_[crop]_dead`

## Example: Adding Soil Variation

1. Place file: `/public/assets/farming/fallow_soil_3.png`
2. Register in assets.ts:
   ```typescript
   export const farmingAssets = {
     fallow_soil_1: new URL('./public/assets-optimized/farming/fallow_soil_1.png', import.meta.url).href,
     fallow_soil_2: new URL('./public/assets-optimized/farming/fallow_soil_2.png', import.meta.url).href,
     fallow_soil_3: new URL('./public/assets-optimized/farming/fallow_soil_3.png', import.meta.url).href,
     // ... other assets
   };
   ```
3. Run: `npm run optimize-assets`
4. Verify optimization created the file

## Example: Adding New Crop Sprites

Adding tomato plant sprites:

1. Create three files:
   - `/public/assets/farming/plant_tomato_young.png`
   - `/public/assets/farming/plant_tomato_adult.png`
   - `/public/assets/farming/plant_tomato_ready.png`

2. Register all in assets.ts:
   ```typescript
   export const farmingAssets = {
     // ... existing assets
     plant_tomato_young: new URL('./public/assets-optimized/farming/plant_tomato_young.png', import.meta.url).href,
     plant_tomato_adult: new URL('./public/assets-optimized/farming/plant_tomato_adult.png', import.meta.url).href,
     plant_tomato_ready: new URL('./public/assets-optimized/farming/plant_tomato_ready.png', import.meta.url).href,
   };
   ```

3. Run: `npm run optimize-assets`

4. Update farming system to use tomato sprites (see farming system code)

## Farm States Visual Reference

The farming system has these visual states:
- **Fallow** (brown) - Untilled ground
- **Tilled** (dark brown) - Ready for planting
- **Planted** (dark green) - Seeds growing
- **Watered** (green) - Recently watered
- **Ready** (bright green) - Ready to harvest!
- **Wilting** (yellow) - Needs water
- **Dead** (gray) - Plant died

Design sprites to match these color themes or create custom visuals.

## Important Notes

- **Always use optimized paths** in assets.ts (points to `assets-optimized/`)
- **Always place originals** in `public/assets/farming/` directory
- Farming sprites should be same size as tiles (64x64 after optimization)
- Use transparent backgrounds for plants (soil shows through)
- Can create multiple growth stages for visual progression
- All sprites use `imageRendering: 'pixelated'` for pixel art
- Color schemes may affect how sprites display

## Related Documentation

- [FARMING.md](../../../docs/FARMING.md) - Complete farming system guide
- [ASSETS.md](../../../docs/ASSETS.md) - General asset guidelines
- [assets.ts](../../../assets.ts) - Centralized asset registry
- **Rendering:**
  - [utils/pixi/TileLayer.ts](../../../utils/pixi/TileLayer.ts) - PixiJS tile renderer (includes farm plots)
  - [components/TileRenderer.tsx](../../../components/TileRenderer.tsx) - DOM fallback renderer
