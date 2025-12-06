# Adding Forageable Plants to the Game

This guide documents the complete process of adding new forageable plants to the game, using wild strawberries as a reference example.

## Overview

Forageable plants are decorative tiles that players can interact with to collect items (berries, seeds, etc.). They feature seasonal sprite variations and integrate with the game's foraging and farming systems.

## Step-by-Step Process

### 1. Create Seasonal Sprite Assets

**Location:** `/public/assets/tiles/[plant_name]/`

Create a dedicated folder for your plant and add seasonal sprite files:

```
/public/assets/tiles/wild_strawberry/
  ├── wild_strawberry_spring.png
  ├── wild_strawberry_summer.png
  ├── wild_strawberry_autumn.png
  └── wild_strawberry_winter.png  (optional - can be dormant)
```

**Asset Guidelines:**
- Use transparent PNGs (grass background shows through)
- Square dimensions recommended (128x128, 256x256, etc.)
- Name pattern: `[plant_name]_[season].png`
- Winter sprite optional (plant can be dormant with no sprite)

**Example - Wild Strawberry:**
- Spring: White flowers on green leaves
- Summer: Red ripe berries
- Autumn: Brown/dying foliage
- Winter: Dormant (no sprite, empty array)

### 2. Register Assets in `assets.ts`

**File:** `assets.ts`

Add your plant's assets to the `tileAssets` object:

```typescript
// Wild strawberry assets (seasonal variations - forageable in forest)
wild_strawberry_spring: '/TwilightGame/assets-optimized/tiles/wild_strawberry/wild_strawberry_spring.png',
wild_strawberry_summer: '/TwilightGame/assets-optimized/tiles/wild_strawberry/wild_strawberry_summer.png',
wild_strawberry_autumn: '/TwilightGame/assets-optimized/tiles/wild_strawberry/wild_strawberry_autumn.png',
```

**Note:** Always reference the optimized versions (`assets-optimized/`) in the code.

### 3. Add TileType Enum

**File:** `types.ts`

Add your plant to the `TileType` enum in the decorative section:

```typescript
export enum TileType {
  // ... existing types
  WILD_IRIS,  // Flowering plant that grows near water
  BRAMBLES,  // Thorny brambles (seasonal variations, solid obstacle)
  WILD_STRAWBERRY,  // Wild strawberry plants (forageable in forest, seasonal variations)
  // ...
}
```

### 4. Add Tile Definition in `constants.ts`

**File:** `constants.ts`

Add your plant's configuration to the `TILE_LEGEND` Record:

```typescript
[TileType.WILD_STRAWBERRY]: {
  name: 'Wild Strawberry',
  color: 'bg-palette-sage',  // Base grass color for blending
  isSolid: false,  // Walkable - forageable plant
  baseType: TileType.GRASS,  // Render grass underneath the strawberry sprite
  seasonalImages: {
    spring: [tileAssets.wild_strawberry_spring],
    summer: [tileAssets.wild_strawberry_summer],
    autumn: [tileAssets.wild_strawberry_autumn],
    winter: [],  // Dormant in winter - no sprite shown
    default: [tileAssets.wild_strawberry_summer],
  },
  transforms: {
    enableFlip: true,  // Horizontal flipping for variety
    enableScale: true,
    scaleRange: { min: 0.9, max: 1.1 },  // Subtle size variation
  },
},
```

**Key Properties:**
- `isSolid: false` - Players can walk over it
- `baseType: TileType.GRASS` - Grass renders underneath the sprite
- `seasonalImages` - Different sprites per season
- `transforms` - Visual variety (flip, scale, rotate, brightness)

### 5. Add Grid Code in `maps/gridParser.ts`

**File:** `maps/gridParser.ts`

Add a character code to the `GRID_CODES` mapping:

```typescript
export const GRID_CODES: Record<string, TileType> = {
  // ... existing codes
  'i': TileType.WILD_IRIS,   // i = Iris (wild iris flower, grows near water)
  'b': TileType.BRAMBLES,    // b = Brambles (thorny obstacle with seasonal colors)
  's': TileType.WILD_STRAWBERRY, // s = Strawberry (wild forageable strawberry plants)
  // ...
};
```

**Choosing a Grid Code:**
- Use a memorable character (first letter of plant name recommended)
- Check existing codes to avoid conflicts
- Add descriptive comment

### 6. Add to ColorResolver Mapping

**File:** `utils/ColorResolver.ts`

**CRITICAL STEP** - Map your tile type to a color scheme key:

```typescript
const TILE_TYPE_TO_COLOR_KEY: Partial<Record<TileType, TileColorKey>> = {
  // ... existing mappings
  [TileType.WILD_IRIS]: 'grass',
  [TileType.BRAMBLES]: 'grass',
  [TileType.WILD_STRAWBERRY]: 'grass',  // ← Add this line
  [TileType.FERN]: 'grass',
  // ...
};
```

**Common Mistake:** Forgetting this step causes background color mismatches (visible boxes that don't blend with the map).

**Why This Matters:**
- Tile background colors come from the map's color scheme, NOT the TILE_LEGEND `color` property
- ColorResolver maps tile types → color scheme keys (e.g., 'grass', 'water', 'floor')
- Without this mapping, tiles fall back to the default color and don't match the map

### 7. Optimize Assets

**Command:** `npm run optimize-assets`

This optimizes all images using Sharp:

```bash
npm run optimize-assets
```

**Output:**
```
✅ wild_strawberry\wild_strawberry_autumn.png: 716.7KB → 23.5KB (saved 96.7%)
✅ wild_strawberry\wild_strawberry_spring.png: 763.9KB → 24.5KB (saved 96.8%)
✅ wild_strawberry\wild_strawberry_summer.png: 812.6KB → 25.0KB (saved 96.9%)
```

**Asset Optimization Keywords:**

The optimization script uses filename keywords to determine output size/quality:

| Keyword | Size | Use Case |
|---------|------|----------|
| `tree_`, `oak_`, `willow_` | 1024px | Trees |
| `iris`, `rose`, flowers | 768px | Decorative flowers (2x2) |
| *(default)* | 256px | Regular tiles |

To add new keywords, edit `scripts/optimize-assets.js` in the `optimizeTiles()` function.

### 8. Add to Forageable Tiles (Optional)

**File:** `utils/actionHandlers.ts`

If your plant should be forageable, add it to the `FORAGEABLE_TILES` array:

```typescript
const FORAGEABLE_TILES: TileType[] = [
    TileType.FERN,
    TileType.MUSHROOM,
    TileType.GRASS,
    TileType.WILD_STRAWBERRY,  // ← Add new plant
];
```

### 9. Implement Custom Foraging Logic (Optional)

**File:** `utils/actionHandlers.ts`

Add special handling in the `handleForageAction()` function:

```typescript
export function handleForageAction(
    playerPos: Position,
    currentMapId: string
): ForageResult {
    // ... existing code

    // Special handling for wild strawberry plants
    if (tileData.type === TileType.WILD_STRAWBERRY) {
        // 70% chance to find strawberries (more common than seed foraging)
        if (Math.random() < 0.7) {
            // Random yield: 2-5 strawberries
            const berryYield = Math.floor(Math.random() * 4) + 2; // 2-5
            inventoryManager.addItem('crop_strawberry', berryYield);

            // 30% chance to also get seeds when picking berries
            const gotSeeds = Math.random() < 0.3;
            let seedCount = 0;
            if (gotSeeds) {
                seedCount = Math.floor(Math.random() * 2) + 1; // 1-2 seeds
                inventoryManager.addItem('seed_strawberry', seedCount);
            }

            const inventoryData = inventoryManager.getInventoryData();
            gameState.saveInventory(inventoryData.items, inventoryData.tools);

            const message = gotSeeds
                ? `You picked ${berryYield} strawberries and found ${seedCount} seeds!`
                : `You picked ${berryYield} strawberries!`;

            console.log(`[Forage] ${message}`);
            return {
                found: true,
                seedId: gotSeeds ? 'seed_strawberry' : undefined,
                seedName: gotSeeds ? 'Strawberry Seeds' : undefined,
                message,
            };
        } else {
            console.log('[Forage] Strawberry plant had no ripe berries');
            return { found: false, message: 'This strawberry plant has no ripe berries yet.' };
        }
    }

    // ... rest of function
}
```

**Foraging Design Tips:**
- Higher success rate for specific plants (70%) vs general foraging (50%)
- Variable yields (2-5 items)
- Bonus chance for seeds (creates farming loop)
- Failure messages add realism ("no ripe berries yet")

### 10. Create Crop/Item Definitions (Optional)

**File:** `data/items.ts`

If your plant produces harvestable items, add them to the items system:

```typescript
// Strawberry crop item (harvested berry)
crop_strawberry: {
  id: 'crop_strawberry',
  name: 'crop_strawberry',
  displayName: 'Strawberry',
  category: ItemCategory.CROP,
  description: 'Sweet wild strawberries.',
  stackable: true,
  sellPrice: 30,
},

// Strawberry seeds (for farming)
seed_strawberry: {
  id: 'seed_strawberry',
  name: 'seed_strawberry',
  displayName: 'Strawberry Seeds',
  category: ItemCategory.SEED,
  description: 'Wild strawberry seeds. Found whilst foraging.',
  rarity: ItemRarity.RARE,
  stackable: true,
  sellPrice: 15,
  cropId: 'strawberry',
},
```

**File:** `data/crops.ts`

If seeds can be farmed, add a crop definition:

```typescript
strawberry: {
  id: 'strawberry',
  name: 'strawberry',
  displayName: 'Strawberry',
  plantSeasons: [Season.SPRING],
  growthTime: 8 * MINUTE,
  growthTimeWatered: 6 * MINUTE,
  waterNeededInterval: 1.5 * MINUTE,
  wiltingGracePeriod: 1 * MINUTE,
  deathGracePeriod: 30 * 1000,
  harvestYield: 5,
  sellPrice: 30,
  experience: 25,
  seedDropMin: 1,
  seedDropMax: 2,
  description: 'Sweet wild strawberries. Found whilst foraging.',
  seedCost: 0,
  rarity: CropRarity.RARE,
  seedSource: 'forage',
},
```

### 11. Add to Maps

**File:** `maps/definitions/[mapName].ts`

Place your plant in map grids using the grid code:

```typescript
/**
 * Grid Legend:
 * G = Grass
 * s = Wild Strawberry (forageable plant)
 * ...
 */

const gridString = `
YoGGsGGGGGGGGGGGGGGGGGGGGsGGGY
YGGYGGGGGGGsGGGGGGGGGGGGGGYGGY
YGGGGGGGsGGGGGGGGGGGGGGGGGGGGY
`;
```

**Placement Tips:**
- Scatter naturally (avoid perfect grids)
- Cluster in 2-3 areas for variety
- Keep away from paths and structures
- Consider thematic locations (strawberries near clearings, iris near water)

### 12. Validate Changes

Run TypeScript validation to catch any errors:

```bash
npx tsc --noEmit
```

Should complete with no errors.

### 13. Test in Browser

Start the dev server:

```bash
npm run dev
```

**Test Checklist:**
- [ ] Plant sprites render correctly
- [ ] Background color matches map grass
- [ ] Seasonal sprites work (if applicable)
- [ ] Foraging works (press E on plant)
- [ ] Items added to inventory
- [ ] Console messages appear
- [ ] Seeds can be planted (if farming enabled)
- [ ] Farmed plants use correct sprites

### 14. Commit Changes

```bash
git add assets.ts constants.ts types.ts maps/gridParser.ts \
  utils/ColorResolver.ts utils/actionHandlers.ts \
  maps/definitions/[mapName].ts \
  public/assets/tiles/[plant_name]/ \
  public/assets-optimized/tiles/[plant_name]/

git commit -m "Add [plant name] with seasonal sprites and foraging system"
git push
```

## Complete Checklist

Use this checklist when adding a new forageable plant:

- [ ] **Step 1:** Create seasonal sprite assets in `/public/assets/tiles/[plant_name]/`
- [ ] **Step 2:** Register assets in `assets.ts` (use optimized paths)
- [ ] **Step 3:** Add `TileType` enum entry in `types.ts`
- [ ] **Step 4:** Add tile definition in `constants.ts` (TILE_LEGEND)
- [ ] **Step 5:** Add grid code in `maps/gridParser.ts` (GRID_CODES)
- [ ] **Step 6:** Add to ColorResolver mapping in `utils/ColorResolver.ts` ⚠️ CRITICAL
- [ ] **Step 7:** Run `npm run optimize-assets`
- [ ] **Step 8:** Add to FORAGEABLE_TILES in `utils/actionHandlers.ts` (if forageable)
- [ ] **Step 9:** Implement custom foraging logic in `handleForageAction()` (if needed)
- [ ] **Step 10:** Create crop/item definitions in `data/items.ts` and `data/crops.ts` (if harvestable)
- [ ] **Step 11:** Add plants to map grids in `maps/definitions/`
- [ ] **Step 12:** Run `npx tsc --noEmit` (validate TypeScript)
- [ ] **Step 13:** Test in browser (`npm run dev`)
- [ ] **Step 14:** Commit and push changes

## Common Mistakes to Avoid

### ❌ Forgetting ColorResolver Mapping

**Symptom:** Plant has visible colored box that doesn't match map background

**Fix:** Add tile type to `TILE_TYPE_TO_COLOR_KEY` in `utils/ColorResolver.ts`

```typescript
[TileType.WILD_STRAWBERRY]: 'grass',  // ← Don't forget this!
```

### ❌ Using Original Assets Instead of Optimized

**Symptom:** Large file sizes, slow loading

**Fix:** Always reference `assets-optimized/` in `assets.ts`, NOT `assets/`

### ❌ Not Setting baseType

**Symptom:** No grass shows under plant sprite (solid color instead)

**Fix:** Set `baseType: TileType.GRASS` in TILE_LEGEND

### ❌ Making Plant Solid When It Should Be Walkable

**Symptom:** Can't walk over plant

**Fix:** Set `isSolid: false` in TILE_LEGEND

### ❌ Missing Winter Sprite Handling

**Symptom:** Error or wrong sprite in winter

**Fix:** Use empty array for dormant plants:

```typescript
seasonalImages: {
  spring: [tileAssets.plant_spring],
  summer: [tileAssets.plant_summer],
  autumn: [tileAssets.plant_autumn],
  winter: [],  // ← Dormant, no sprite
  default: [tileAssets.plant_summer],
}
```

## Example: Wild Strawberry Implementation

See commit `54cc906` for a complete reference implementation:

**Features:**
- Seasonal sprites (spring/summer/autumn, dormant in winter)
- Forageable (70% success rate)
- Yields 2-5 strawberries per pick
- 30% bonus chance for 1-2 seeds
- Seeds can be farmed for renewable crops
- Placed in witch hut map (18 plants)

**Files Changed:**
- `assets.ts` - Registered 3 seasonal sprites
- `constants.ts` - Added WILD_STRAWBERRY tile definition
- `types.ts` - Added WILD_STRAWBERRY to TileType enum
- `maps/gridParser.ts` - Added 's' grid code
- `utils/ColorResolver.ts` - Added grass color mapping
- `utils/actionHandlers.ts` - Added to FORAGEABLE_TILES, custom foraging logic
- `maps/definitions/witchHut.ts` - Placed 18 plants on map
- `public/assets/tiles/wild_strawberry/` - 3 sprite files (spring/summer/autumn)
- `public/assets-optimized/tiles/wild_strawberry/` - 3 optimized sprites (96.7-96.9% compression)

## Related Documentation

- `docs/MAP_GUIDE.md` - Map creation guide
- `docs/ASSETS.md` - Asset management guidelines
- `docs/FARMING.md` - Farming system documentation
- `scripts/optimize-assets.js` - Asset optimization script

## Questions?

If you encounter issues:
1. Check this guide's checklist
2. Review the wild strawberry implementation (commit `54cc906`)
3. Run TypeScript validation (`npx tsc --noEmit`)
4. Check browser console for errors
5. Verify ColorResolver mapping (most common issue!)
