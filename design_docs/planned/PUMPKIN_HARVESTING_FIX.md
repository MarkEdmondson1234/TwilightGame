# Pumpkin Harvesting Fix - Design Document

## Summary

The pumpkin crop is not harvestable despite being properly configured in the farming system. Investigation revealed the root cause: **pumpkin crop sprite assets are missing from the assets definition file**. While tomato has both `plant_tomato_young` and `plant_tomato_adult` sprites defined, pumpkin has no corresponding `plant_pumpkin_young` and `plant_pumpkin_adult` sprites defined in `assets.ts`. This causes the TileLayer to fail silently when trying to render pumpkin crops, preventing them from transitioning to the visible SOIL_READY state needed for harvesting.

## Problem Analysis

### What Works
- **Crop Definition**: Pumpkin is fully defined in `data/crops.ts` with proper growth times, water requirements, and yields
- **Seed System**: Pumpkin seeds (`seed_pumpkin`) are properly defined and can be planted
- **Farm Manager**: The farming system correctly tracks pumpkin plots through growth states
- **Harvesting Logic**: The action handler has full support for harvesting SOIL_READY crops
- **Visual Config**: TileLayer has proper size configuration for pumpkin crops at line 67

### What's Missing
The assets definition in `assets.ts` is missing:
- `plant_pumpkin_young` - Young pumpkin growth stage sprite
- `plant_pumpkin_adult` - Mature pumpkin harvest-ready sprite

### Why This Breaks Harvesting
1. Player plants pumpkin seeds on a farm plot
2. FarmManager correctly tracks the plot as it grows through PLANTED → WATERED → READY states
3. When TileLayer tries to render the crop visually, it looks up `farmingAssets.plant_pumpkin_young` and `farmingAssets.plant_pumpkin_adult`
4. These assets are undefined, so the rendering fails silently
5. The player sees no visual feedback that the crop is growing
6. Even when the crop reaches SOIL_READY state, the player cannot see it to interact with it
7. The interaction system requires a visible plot tile to offer the "Harvest Crop" option (via `getAvailableInteractions`)

### Console Evidence
User reported: "When looking in the console, I don't see either the word harvest or plot" - indicating the crop is either not being tracked as SOIL_READY or the rendering is failing silently without error messages.

## Design

### Asset Architecture

The farming assets follow a consistent pattern for crop sprites:

```typescript
// Each harvestable crop has two growth stage sprites:
plant_[cropname]_young: '/TwilightGame/assets-optimized/farming/[cropname]_young.png',
plant_[cropname]_adult: '/TwilightGame/assets-optimized/farming/[cropname]_adult.png',
```

**Crop Sprites Already Defined** (for reference):
- `plant_tomato_young` and `plant_tomato_adult` ✅
- `plant_corn_young` and `plant_corn_adult` ✅
- `plant_radish_young` and `plant_radish_adult` ✅
- `plant_spinach_young` and `plant_spinach_adult` ✅
- `plant_carrot_young` and `plant_carrot_adult` ✅
- `plant_cucumber_young` and `plant_cucumber_adult` ✅
- `plant_onion_young` and `plant_onion_adult` ✅
- `plant_sunflower_young` and `plant_sunflower_adult` ✅
- `plant_potato_young` and `plant_potato_adult` ✅
- `plant_chili_young` and `plant_chili_adult` ✅
- `plant_broccoli_young` and `plant_broccoli_adult` ✅
- `plant_cauliflower_young` and `plant_cauliflower_adult` ✅
- `plant_melon_young` and `plant_melon_adult` ✅
- `plant_pea_young` and `plant_pea_adult` ✅
- `plant_salad_young` and `plant_salad_adult` ✅
- `plant_strawberry_young` and `plant_strawberry_adult` ✅

**Missing Sprites**:
- `plant_pumpkin_young` ❌
- `plant_pumpkin_adult` ❌

### Data Flow

```
Planting → FarmManager Tracking → Growth Time → READY State →
  ↓
Render Attempt → TileLayer looks up farmingAssets.plant_pumpkin_adult →
  ↓
Asset Undefined → Silent Render Failure → Player can't see crop →
  ↓
getAvailableInteractions doesn't detect visible plot → No Harvest option
```

### Required Changes

#### 1. Asset Definition (`assets.ts`)

Add pumpkin crop sprite definitions to the `farmingAssets` object:

```typescript
// In farmingAssets object, add:
plant_pumpkin_young: '/TwilightGame/assets-optimized/farming/pumpkin_young.png',
plant_pumpkin_adult: '/TwilightGame/assets-optimized/farming/pumpkin_adult.png',
```

**Location**: `assets.ts` - within the `farmingAssets` object definition, alphabetically near other crop sprites.

#### 2. File Location References

The image files must exist at:
- `/public/assets-optimized/farming/pumpkin_young.png`
- `/public/assets-optimized/farming/pumpkin_adult.png`

These should be the hand-drawn pumpkin artwork files at 512×512px (per CLAUDE.md asset optimization guidelines).

### Rendering Integration

The TileLayer rendering already has all necessary logic in place:
- Line 67: Pumpkin adult size configuration (`{ width: 2, height: 2, offsetX: -0.5, offsetY: -2 }`)
- Lines 240-260: `renderCrop()` method that looks up `farmingAssets['plant_' + cropType + '_young']` and `farmingAssets['plant_' + cropType + '_adult']`

Once assets are added, pumpkin crops will:
1. Render as young seedling sprite (early growth stage)
2. Render as adult 2×2 tile pumpkin sprite (mature, harvest-ready)
3. Become detectable by `getAvailableInteractions()`
4. Show harvest option in radial menu
5. Allow harvesting with full gold rewards

## Implementation Steps

1. **Verify asset files exist** in `/public/assets-optimized/farming/`:
   - Check if `pumpkin_young.png` exists
   - Check if `pumpkin_adult.png` exists
   - If not, they must be created or sourced

2. **Update `assets.ts`**:
   - Add `plant_pumpkin_young` asset definition in `farmingAssets` object
   - Add `plant_pumpkin_adult` asset definition in `farmingAssets` object
   - Ensure correct URL paths point to optimized assets

3. **No changes needed to**:
   - `data/crops.ts` - Already properly configured
   - `data/items.ts` - Seed and crop items already defined
   - `utils/farmManager.ts` - Already handles all states correctly
   - `utils/actionHandlers.ts` - Already supports harvesting
   - `utils/pixi/TileLayer.ts` - Already has rendering logic and size config

4. **Verify** by testing:
   - Plant pumpkin seeds on a farm plot
   - Wait for growth (20 minutes game time, or faster if watered)
   - Confirm pumpkin sprite appears and grows visually
   - Click on mature pumpkin plot
   - Confirm "Harvest Crop" option appears in radial menu
   - Harvest and collect pumpkins + gold

## Testing

### Manual Testing Checklist

- [ ] **Asset Loading**
  - Open browser DevTools Network tab
  - Load game
  - Verify `pumpkin_young.png` and `pumpkin_adult.png` load successfully
  - No 404 errors for these assets

- [ ] **Planting**
  - Acquire pumpkin seeds from shop or inventory
  - Select hoe tool and till soil
  - Select pumpkin seeds and plant
  - Plot transitions to SOIL_PLANTED state

- [ ] **Growth Visualization**
  - Observe plot shows pumpkin_young sprite (seedling)
  - Water the crop
  - After ~14 minutes (watered growth time), plot should show pumpkin_adult sprite
  - Plot state transitions to SOIL_READY

- [ ] **Harvesting**
  - Click on mature pumpkin plot
  - Radial menu appears with "Harvest Crop" option
  - Click harvest
  - "Harvested 1x Pumpkin (150 gold)" message in console
  - Inventory gains 1x crop_pumpkin
  - Player gains 150 gold

- [ ] **Adjacent Interaction**
  - Plant new pumpkin
  - Wait for maturity
  - Click on adjacent tile (not directly on pumpkin)
  - Should still show harvest option
  - Harvest succeeds

### Automated Testing

If visual inspection is needed, update `tests/cropGrowth.test.ts`:
- Pumpkin tests already exist (lines with `CROPS.pumpkin`)
- No changes needed - tests verify crop definition, not rendering

## Risk Assessment

**Risk Level**: Very Low

- ✅ Only affects asset definitions, no logic changes
- ✅ All supporting systems already fully implemented
- ✅ Follows established pattern used by 15+ other crops
- ✅ No circular dependencies or SSoT violations
- ✅ Assets are external files - no code compilation needed
- ✅ No changes to GameState or core game loop

**Failure Mode**: If assets not found, TileLayer will fail silently (no visual render). User would see empty plot. No crashes or errors - graceful degradation. Harvest system would still work if debugging.

## Related Issues

- Similar to tomato setup (which works correctly)
- Part of farming system expansion
- Pumpkin data was added in recent commits but asset integration was incomplete

## Future Considerations

- Consider adding validation in `assets.ts` to warn if crop asset is missing
- Add test to verify all crops in `CROPS` have corresponding rendering assets
- Document asset requirements for new crops in CLAUDE.md
