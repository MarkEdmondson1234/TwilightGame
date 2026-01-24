---
name: Add Forageable Plant
description: Add a new forageable multi-tile plant to the game. Handles tile type, sprites, foraging logic, inventory items, and UI integration.
---

# Add Forageable Plant

Add new forageable plants (like moonpetal, addersmeat, or luminescent toadstool) to TwilightGame. This skill covers the complete workflow for multi-tile forageable sprites that players can harvest for magical ingredients.

## Quick Start

**CRITICAL FIRST STEP:** Run `npm run optimize-assets` BEFORE coding to optimize uploaded sprites.

**The Eight-Location Pattern (CRITICAL):**

Every forageable plant requires setup in **eight locations**:

1. **`types/core.ts`** - Add TileType enum entry
2. **`maps/gridParser.ts`** - Add grid character code
3. **`assets.ts`** - Register tile sprite AND inventory item sprite
4. **`data/tiles.ts`** - Add TILE_LEGEND entry with collision and rendering info
5. **`data/spriteMetadata.ts`** - Add multi-tile sprite configuration
6. **`utils/ColorResolver.ts`** - Map tile to background colour
7. **`data/items.ts`** - Add foraged item definition with `forageSuccessRate`
8. **`utils/inventoryUIHelper.ts`** - Map sprite for inventory UI (CRITICAL)

**Plus foraging logic in `utils/actionHandlers.ts` (CRITICAL - 3 locations):**
9a. **Add to forageable tiles list** in `getAvailableInteractions()` - Makes radial menu appear
9b. **Add foraging handler** - Handles the actual foraging logic
9c. **Add to cooldown check** - Prevents re-foraging same day

## When to Use This Skill

Invoke this skill when:
- User wants to add a new forageable plant/mushroom/flower
- User mentions "magical ingredient", "forageable", "harvestable plant"
- User uploads a multi-tile plant sprite with an accompanying inventory item
- User asks about adding plants like moonpetal or addersmeat

**Trigger phrases:**
- "Add a new forageable plant"
- "Make this plant harvestable"
- "Add [plant name] that can be foraged"
- "Create a magical ingredient from [plant]"

## Workflow

### Phase 1: Gather Requirements

**Ask the user:**

1. **Plant name** (e.g., "Luminescent Toadstool")
2. **Tile sprite location** - where they uploaded the multi-tile sprite
3. **Inventory sprite location** - where they uploaded the foraged item image
4. **Sprite size** - typically 3×3 tiles for plants (square image assumed)
5. **Foraging restrictions:**
   - Time of day? (day only, night only, any time)
   - Season? (specific seasons, or year-round)
6. **Rarity** - COMMON, UNCOMMON, RARE, LEGENDARY
7. **Sell price** - gold value when sold
8. **Success rate** - percentage chance to successfully forage (0.0-1.0)

### Phase 2: Add TileType Enum

**File:** `types/core.ts`

Add the new tile type in the appropriate section:

```typescript
// Find the section for plants (after ADDERSMEAT)
// Mushroom Forest plants (mushroom forest exclusives)
LUMINESCENT_TOADSTOOL, // Glowing cyan toadstools (3x3, mushroom forest only)
```

**Naming convention:** SCREAMING_SNAKE_CASE (e.g., `LUMINESCENT_TOADSTOOL`)

### Phase 3: Add Grid Code

**File:** `maps/gridParser.ts`

Add a character code for map editing:

```typescript
// Mushroom Forest plants
'7': TileType.LUMINESCENT_TOADSTOOL, // 7 = Luminescent toadstool (glowing cyan mushrooms)
```

**Available codes to use:** Numbers 5-9, special characters not yet used
**Check existing codes:** Search the file to avoid conflicts

### Phase 4: Register Assets

**File:** `assets.ts`

**4a. Tile sprite (in `tileAssets`):**
```typescript
// In tileAssets object
luminescent_toadstool:
  '/TwilightGame/assets-optimized/tiles/mushroomMap/luminecent_toadstool.png',
```

**4b. Inventory sprite (in `magicalAssets`):**
```typescript
// In magicalAssets object
luminescent_toadstool:
  '/TwilightGame/assets-optimized/items/magical/forageable/luminescent_toadstool_ingredient.png',
```

**IMPORTANT:** Always use `/TwilightGame/assets-optimized/` paths.

### Phase 5: Add TILE_LEGEND Entry

**File:** `data/tiles.ts`

```typescript
[TileType.LUMINESCENT_TOADSTOOL]: {
  name: 'Luminescent Toadstool',
  color: 'bg-palette-sage', // Base grass color for blending
  collisionType: CollisionType.WALKABLE, // Walkable - decorative plant
  baseType: TileType.GRASS, // Render grass underneath
  // For non-seasonal plants:
  image: [tileAssets.luminescent_toadstool],
  // OR for seasonal plants, use seasonalImages:
  // seasonalImages: {
  //   spring: [tileAssets.plant_spring],
  //   summer: [tileAssets.plant_summer],
  //   autumn: [tileAssets.plant_autumn],
  //   winter: [], // Empty = dormant/invisible
  //   default: [tileAssets.plant_summer],
  // },
  // OR for time-of-day plants (like moonpetal):
  // timeOfDayImages: {
  //   spring: { day: [closed], night: [open] },
  //   ...
  // },
},
```

**Note:** `image` must be an array `[asset]`, not a bare string.

### Phase 6: Add Sprite Metadata

**File:** `data/spriteMetadata.ts`

```typescript
{
  tileType: TileType.LUMINESCENT_TOADSTOOL,
  spriteWidth: 3, // 3 tiles wide
  spriteHeight: 3, // 3 tiles tall (square image)
  offsetX: -1, // Center horizontally (extend 1 tile left)
  offsetY: -2, // Extend 2 tiles upward
  image: tileAssets.luminescent_toadstool,
  // Collision: walkable (no collision) - decorative plant
  collisionWidth: 0,
  collisionHeight: 0,
  collisionOffsetX: 0,
  collisionOffsetY: 0,
  // Transform controls for variety
  enableFlip: true,
  enableRotation: false,
  enableScale: true,
  enableBrightness: false,
  scaleRange: { min: 0.9, max: 1.1 },
},
```

**Offset calculation for centered 3×3:**
- `offsetX: -1` (extends 1 tile left of anchor)
- `offsetY: -2` (extends 2 tiles up from anchor)

### Phase 7: Add ColorResolver Mapping

**File:** `utils/ColorResolver.ts`

Add to `TILE_TYPE_TO_COLOR_KEY`:

```typescript
// Mushroom Forest plants
[TileType.LUMINESCENT_TOADSTOOL]: 'grass',
```

This ensures the grass background shows through transparent areas.

### Phase 8: Add Foraged Item Definition

**File:** `data/items.ts`

```typescript
luminescent_toadstool: {
  id: 'luminescent_toadstool',
  name: 'luminescent_toadstool',
  displayName: 'Luminescent Toadstool',
  category: ItemCategory.MAGICAL_INGREDIENT,
  description:
    'A cluster of softly glowing cyan mushrooms found only in the darkest parts of the forest. Their light never fades.',
  rarity: ItemRarity.UNCOMMON,
  stackable: true,
  sellPrice: 35,
  image: magicalAssets.luminescent_toadstool,
  forageSuccessRate: 0.75, // 75% success rate
},
```

**CRITICAL:** Include `forageSuccessRate` - this controls the chance of successful foraging.

**Rarity guidelines:**
- COMMON: Basic items, 30% drop in generic foraging
- UNCOMMON: Moderate rarity, 20% drop
- RARE: Hard to find, 10% drop
- LEGENDARY: Extremely rare

### Phase 9: Add Inventory UI Mapping (CRITICAL)

**File:** `utils/inventoryUIHelper.ts`

Add to `ITEM_SPRITE_MAP`:

```typescript
// Magical Ingredients (forageable)
moonpetal: magicalAssets.moonpetal_flower,
addersmeat: magicalAssets.addersmeat_flower,
dragonfly_wings: magicalAssets.dragonfly_wings,
luminescent_toadstool: magicalAssets.luminescent_toadstool, // ← Add this!
```

**Without this step, the item shows as an emoji in inventory!**

### Phase 10: Run Asset Optimization (CRITICAL - DO THIS FIRST)

```bash
npm run optimize-assets
```

This optimizes:
- Tile sprites → `/public/assets-optimized/tiles/`
- Inventory sprites → `/public/assets-optimized/items/magical/forageable/`

**Always run BEFORE adding code references to these assets!**

### Phase 11: Add Foraging Logic

**File:** `utils/actionHandlers.ts`

**CRITICAL:** Three locations must be updated in this file:

**11a. Add to forageable tiles list in `getAvailableInteractions()` (around line 2302):**

Find the `hasTileTypeNearby()` check and add your tile type:

```typescript
// Check for forageable multi-tile sprites (bee hive, toadstool, moonpetal, addersmeat, wolfsbane, mustard flower)
if (!canForage) {
  canForage = hasTileTypeNearby(tileX, tileY, [
    TileType.BEE_HIVE,
    TileType.LUMINESCENT_TOADSTOOL, // ← Add your tile here!
    TileType.MOONPETAL,
    TileType.ADDERSMEAT,
    TileType.WOLFSBANE,
    TileType.MUSTARD_FLOWER,
  ]);
}
```

**WITHOUT THIS STEP, THE RADIAL MENU WON'T APPEAR!** This is the most common bug.

**11b. Add foraging handler (in `handleForageAction`, after addersmeat, before bee hive):**

```typescript
// Luminescent toadstool foraging (mushroom forest exclusive)
// Check if player is within the 3x3 area of any toadstool anchor
let toadstoolAnchor: { x: number; y: number } | null = null;

// Search nearby tiles for anchor (check 1 tile in each direction for 3x3 coverage)
for (let dy = -1; dy <= 1; dy++) {
  for (let dx = -1; dx <= 1; dx++) {
    const checkX = playerTileX + dx;
    const checkY = playerTileY + dy;
    const checkTile = getTileData(checkX, checkY);

    if (checkTile?.type === TileType.LUMINESCENT_TOADSTOOL) {
      toadstoolAnchor = { x: checkX, y: checkY };
      console.log('[Forage] Found luminescent toadstool anchor at (' + checkX + ', ' + checkY + ')');
      break;
    }
  }
  if (toadstoolAnchor) break;
}

if (toadstoolAnchor) {
  // For time/season restricted plants, add checks here:
  // const { season, timeOfDay } = TimeManager.getCurrentTime();
  // if (season !== Season.SPRING && season !== Season.SUMMER) {
  //   return { found: false, message: 'The plant is dormant.' };
  // }
  // if (timeOfDay !== 'Night') {
  //   return { found: false, message: 'The flowers are closed.' };
  // }

  const toadstool = getItem('luminescent_toadstool');
  if (!toadstool) {
    console.error('[Forage] Luminescent toadstool item not found!');
    return { found: false, message: 'Something went wrong.' };
  }

  const successRate = toadstool.forageSuccessRate ?? 0.5;
  const succeeded = Math.random() < successRate;

  if (!succeeded) {
    gameState.recordForage(currentMapId, toadstoolAnchor.x, toadstoolAnchor.y);
    return {
      found: false,
      message: 'You search amongst the glowing toadstools, but find none suitable for harvesting.',
    };
  }

  // Random quantity: 50% → 1, 35% → 2, 15% → 3
  const rand = Math.random();
  const quantityFound = rand < 0.5 ? 1 : rand < 0.85 ? 2 : 3;

  inventoryManager.addItem('luminescent_toadstool', quantityFound);
  console.log('[Forage] Found ' + quantityFound + ' ' + toadstool.displayName);

  const inventoryData = inventoryManager.getInventoryData();
  characterData.saveInventory(inventoryData.items, inventoryData.tools);
  gameState.recordForage(currentMapId, toadstoolAnchor.x, toadstoolAnchor.y);

  return {
    found: true,
    seedId: 'luminescent_toadstool',
    seedName: toadstool.displayName,
    message: 'Found ' + quantityFound + ' ' + toadstool.displayName + '!',
  };
}
```

**11c. Add to cooldown check (around line 782):**

Find the multi-tile cooldown check loop and add your tile type:

```typescript
if (
  checkTile?.type === TileType.MOONPETAL ||
  checkTile?.type === TileType.ADDERSMEAT ||
  checkTile?.type === TileType.LUMINESCENT_TOADSTOOL // ← Add this!
) {
  cooldownCheckPos = { x: checkX, y: checkY };
  break;
}
```

### Phase 12: Validate

```bash
npx tsc --noEmit
```

Fix any TypeScript errors before testing.

### Phase 13: Add to Procedural Generation (Optional)

**File:** `maps/procedural.ts`

If the plant should appear in procedurally generated maps, add spawn logic:

```typescript
// Add luminescent toadstools to mushroom forest
for (let i = 0; i < 8; i++) {
  const x = Math.floor(Math.random() * (width - 2)) + 1;
  const y = Math.floor(Math.random() * (height - 2)) + 1;
  const dx = Math.abs(x - spawnX);
  const dy = Math.abs(y - spawnY);
  if (map[y][x] === TileType.GRASS && (dx > 4 || dy > 4)) {
    map[y][x] = TileType.LUMINESCENT_TOADSTOOL;
  }
}
```

Adjust the loop count (`8`) based on desired rarity.

### Phase 14: Test in Game

1. **Place the plant on a map** using the grid code (e.g., `7`)
2. **Walk to the plant** and click to see "Forage" option
3. **Forage the plant** - check success/failure messages
4. **Open inventory** (I or B) - verify sprite displays correctly
5. **Check cooldown** - plant should not be forageable again same day

## Quick Reference: Foraging Restrictions

**No restrictions (like luminescent toadstool):**
```typescript
// Just get the item and check success rate
const item = getItem('item_id');
const successRate = item.forageSuccessRate ?? 0.5;
```

**Season restricted (like addersmeat - spring/summer only):**
```typescript
const { season } = TimeManager.getCurrentTime();
if (season !== Season.SPRING && season !== Season.SUMMER) {
  return { found: false, message: 'The plant is dormant.' };
}
```

**Time restricted (like moonpetal - night only):**
```typescript
const { timeOfDay } = TimeManager.getCurrentTime();
if (timeOfDay !== 'Night') {
  return { found: false, message: 'The flowers are closed.' };
}
```

**Both season AND time restricted:**
```typescript
const { season, timeOfDay } = TimeManager.getCurrentTime();
if (season !== Season.SPRING && season !== Season.SUMMER) {
  return { found: false, message: 'Dormant in this season.' };
}
if (timeOfDay !== 'Night') {
  return { found: false, message: 'Only blooms at night.' };
}
```

## Common Issues

### Issue: Plant shows wrong background colour
**Cause:** Missing ColorResolver mapping
**Fix:** Add `[TileType.YOUR_PLANT]: 'grass'` to `TILE_TYPE_TO_COLOR_KEY`

### Issue: Item shows as emoji in inventory
**Cause:** Missing `ITEM_SPRITE_MAP` entry in `inventoryUIHelper.ts`
**Fix:** Add `your_item: magicalAssets.your_item` to the map

### Issue: Can't forage the plant / No radial menu appears
**Cause:** Missing from forageable tiles list in `getAvailableInteractions()`
**Fix:** THIS IS THE #1 BUG! Add tile type to the `hasTileTypeNearby()` array around line 2302:
```typescript
canForage = hasTileTypeNearby(tileX, tileY, [
  TileType.BEE_HIVE,
  TileType.YOUR_PLANT, // ← Add here!
  TileType.MOONPETAL,
  // ...
]);
```

Also check all three locations in `actionHandlers.ts`:
1. **Forageable tiles list** in `getAvailableInteractions()` (line ~2302) - MOST CRITICAL
2. **Foraging handler** in `handleForageAction()` (line ~1074+)
3. **Cooldown check** (line ~782)

### Issue: TypeScript error "Type 'string' not assignable to 'string[]'"
**Cause:** `image` property in tiles.ts must be an array
**Fix:** Change `image: tileAssets.plant` to `image: [tileAssets.plant]`

### Issue: Duplicate item error
**Cause:** Item ID already exists in `items.ts`
**Fix:** Search for existing entry and either update it or use unique ID

## Files Modified Summary

| File | Purpose | Line # |
|------|---------|--------|
| `types/core.ts` | TileType enum | ~138 |
| `maps/gridParser.ts` | Grid character code | ~113 |
| `assets.ts` | Tile + inventory sprite paths | ~180, ~327 |
| `data/tiles.ts` | TILE_LEGEND rendering config | ~655 |
| `data/spriteMetadata.ts` | Multi-tile sprite size/offset | ~223 |
| `utils/ColorResolver.ts` | Background colour mapping | ~87 |
| `data/items.ts` | Foraged item definition | ~1332 |
| `utils/inventoryUIHelper.ts` | Inventory sprite mapping | ~107 |
| `utils/actionHandlers.ts` | **Forageable tiles list** (CRITICAL) | **~2302** |
| `utils/actionHandlers.ts` | Foraging handler | ~1323 |
| `utils/actionHandlers.ts` | Cooldown check | ~782 |
| `maps/procedural.ts` | (Optional) Procedural spawning | ~516 |

## Example Plants for Reference

| Plant | Size | Time | Season | Success Rate |
|-------|------|------|--------|--------------|
| Moonpetal | 3×3 | Night | Spring/Summer | 80% |
| Addersmeat | 3×3 | Night | Spring/Summer | 70% |
| Luminescent Toadstool | 3×3 | Any | Any | 75% |
| Bee Hive (honey) | 3×3 | Any | Spring/Summer/Autumn | 85% |

## Checklist

- [ ] **0. Run `npm run optimize-assets` FIRST** - Optimize uploaded sprites
- [ ] 1. Add TileType enum in `types/core.ts`
- [ ] 2. Add grid code in `maps/gridParser.ts`
- [ ] 3. Add tile sprite in `assets.ts` (tileAssets)
- [ ] 4. Add inventory sprite in `assets.ts` (magicalAssets)
- [ ] 5. Add TILE_LEGEND entry in `data/tiles.ts`
- [ ] 6. Add sprite metadata in `data/spriteMetadata.ts`
- [ ] 7. Add ColorResolver mapping in `utils/ColorResolver.ts`
- [ ] 8. Add item definition in `data/items.ts` (with forageSuccessRate)
- [ ] 9. Add inventory UI mapping in `utils/inventoryUIHelper.ts`
- [ ] **10a. Add to forageable tiles list in `getAvailableInteractions()` - CRITICAL!**
- [ ] 10b. Add foraging handler in `handleForageAction()`
- [ ] 10c. Add to cooldown check in `handleForageAction()`
- [ ] 11. (Optional) Add to procedural generation in `maps/procedural.ts`
- [ ] 12. Run `npx tsc --noEmit` to validate
- [ ] 13. Test in game (place on map, forage, check inventory)
