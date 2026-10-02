---
name: Add Forageable Plant
description: Add a new forageable multi-tile plant to the game. Handles tile type, sprites, foraging logic, inventory items, and UI integration.
---

# Add Forageable Plant

Add new forageable plants (like moonpetal, addersmeat, or luminescent toadstool) to TwilightGame. This skill covers the complete workflow for multi-tile forageable sprites that players can harvest for magical ingredients.

## Quick Start

**CRITICAL FIRST STEP:** Run `npm run optimize-assets` BEFORE coding to optimize uploaded sprites.

**The Seven-Location Pattern (CRITICAL):**

Every forageable plant requires setup in **seven locations**:

1. **`types/core.ts`** - Add TileType enum entry
2. **`maps/gridParser.ts`** - Add grid character code
3. **`assets.ts`** - Register tile sprite AND inventory item sprite
4. **`data/tiles.ts`** - Add TILE_LEGEND entry with collision and rendering info
5. **`data/spriteMetadata.ts`** - Add multi-tile sprite configuration
6. **`utils/ColorResolver.ts`** - Map tile to background colour
7. **`data/items/magicalIngredients.ts`** - Add foraged item definition with `forageSuccessRate` and `image` (the inventory reads `image` directly)

**Plus foraging logic (CRITICAL - 2 locations):**
8a. **`utils/interactions/providers/forage.ts`** - Add the tile type to the multi-tile `hasTileTypeNearby()` list so the "Forage" option appears
8b. **`utils/forage/sources.ts`** - Add a `FORAGE_SOURCES` entry (item, success rate, season/time gates, cooldown, messages)

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

**File:** `data/items/magicalIngredients.ts` (add to the `MAGICAL_INGREDIENT_ITEMS` object)

Most forageables are magical ingredients. Seasonal decorative forageables (e.g. `maple_leaf`, `spruce_sprig`) live in `data/items/decorations.ts` instead — see the category → module table in the `data/items.ts` header.

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

### Phase 9: Inventory Sprite (no extra step)

There is no inventory sprite map. `getItemIcon()` in `utils/inventoryUIHelper.ts` reads `item.image` from the definition you wrote in Phase 8, so `image: magicalAssets.your_item` is all the inventory needs.

### Phase 10: Run Asset Optimization (CRITICAL - DO THIS FIRST)

```bash
npm run optimize-assets
```

This optimizes:
- Tile sprites → `/public/assets-optimized/tiles/`
- Inventory sprites → `/public/assets-optimized/items/magical/forageable/`

**Always run BEFORE adding code references to these assets!**

### Phase 11: Add Foraging Logic

Foraging is split between a click **provider** (is "Forage" offered here?) and a declarative **source table** (what happens when it runs). Read `utils/interactions/README.md` first. You should not need to touch `utils/actionHandlers.ts`.

**11a. Offer the interaction — `utils/interactions/providers/forage.ts`**

`forageProvider()` adds a "Forage" radial option when a forageable is near the clicked tile. Add your tile type to the multi-tile `hasTileTypeNearby(tileX, tileY, [...], 1)` list:

```typescript
canForage = hasTileTypeNearby(
  tileX,
  tileY,
  [
    TileType.BEE_HIVE,
    TileType.LUMINESCENT_TOADSTOOL,
    // ...
    TileType.YOUR_PLANT, // ← Add your tile here!
  ],
  1
);
```

**Without this step the "Forage" option never appears.** Radius 1 covers 3×3 sprites with a centred anchor; larger sprites need a bigger radius or a separate check.

**11b. Describe the harvest — `utils/forage/sources.ts`**

`handleForageAction()` (`utils/forageHandlers.ts`) walks `FORAGE_SOURCES` top to bottom and the first source whose anchor is near the player owns the forage; `utils/forage/anchorForage.ts` then runs the gates, the success roll (`item.forageSuccessRate`, else `fallbackSuccessRate`), the quantity roll, the inventory save and the cooldown. Add one entry (see `ForageSource` in `utils/forage/types.ts`):

```typescript
// ── Luminescent toadstool (mushroom forest exclusive) — any season, any time ──
{
  label: 'luminescent toadstool',              // unique; used in debug logs
  tileTypes: [TileType.LUMINESCENT_TOADSTOOL],
  itemId: 'luminescent_toadstool',
  fallbackSuccessRate: 0.5,                     // only if the item has no forageSuccessRate
  gates: [                                      // optional; helpers in utils/forage/helpers.ts
    // seasonGate([Season.SPRING, Season.SUMMER], 'The plant is dormant.'),
    // nightGate('The flowers are closed. They only bloom at night.'),
    // weatherGate('snow', 'It only blooms in the snow.'),
  ],
  cooldownMessage: "You've already gathered from this plant today.",
  failureMessage: 'You search amongst the glowing toadstools, but find none suitable for harvesting.',
  // rollQuantity / successMessage / findAnchor are optional overrides
},
```

**Order matters** — when two forageables are near each other, the earlier entry wins.

**Cooldown (once per day per plant):** give new sources a `cooldownMessage`, which checks the cooldown against the plant's anchor tile so the whole sprite shares one cooldown. Then add the source's `label` to the expected set in `tests/forageSources.test.ts` ("declares cooldownMessage exactly for the sources that self-check cooldown"). The older sources without one rely on the early scan over `EARLY_COOLDOWN_TILES` in `utils/forageHandlers.ts`; do not add new tiles there.

Special cases that are not simple anchor tiles (stream dragonfly wings, sparrow feathers) live in `utils/forage/specialForage.ts`; bush harvests in `utils/forage/bushHarvest.ts`.

### Phase 12: Validate

```bash
make verify
```

Fix any TypeScript errors before testing, and confirm the test suite is clean.

**Never run `npm test`** — that is vitest in watch mode and will never exit. Use `make verify`, `make test` or `npm run test:run`.

**Expected result:** the suite is fully green — **any** failure is a real regression, including yours.

**Tests that guard this skill's output:**
- `tests/colorResolver.test.ts` — fails if the new `TileType` was not added to `TILE_TYPE_TO_COLOR_KEY` (Phase 7). This is the wrong-coloured-box bug.
- `tests/assetIntegrity.test.ts` — fails if the tile or inventory sprite path does not resolve to a real file, i.e. a typo or a skipped `npm run optimize-assets`.
- `tests/itemSSoT.test.ts` — fails if the new magical-ingredient item duplicates an existing item or is referenced anywhere by an ID that is not in `ITEMS`.
- `tests/interactionProviders.test.ts` — covers the interaction provider registry the foraging interaction is registered through.
- `tests/forageSources.test.ts` — fails if a `FORAGE_SOURCES` entry names an item or tile type that does not exist, reuses a label, or declares `cooldownMessage` without being listed in its expected set.
- `tests/forageCooldown.test.ts` — guards the once-per-day cooldown.

### Phase 13: Add to Procedural Generation (Optional)

**File:** `maps/procedural.ts`

If the plant should appear in procedurally generated maps, add spawn logic inside the relevant generator. **Use the generator's seeded `rng()`, never `Math.random()`** — procedural maps are shared between players and must be pure functions of `(seed, depth)`; `tests/proceduralDeterminism.test.ts` fails on a stray `Math.random()`.

```typescript
// Add luminescent toadstools to mushroom forest
for (let i = 0; i < 8; i++) {
  const x = Math.floor(rng() * (width - 2)) + 1;
  const y = Math.floor(rng() * (height - 2)) + 1;
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

Restrictions are `gates` on the `FORAGE_SOURCES` entry, built with the helpers in `utils/forage/helpers.ts`. The first gate that blocks wins, before the success roll.

**No restrictions (like luminescent toadstool):** omit `gates`.

**Season restricted (like addersmeat - spring/summer only):**
```typescript
gates: [seasonGate([Season.SPRING, Season.SUMMER], 'The plant is dormant.')],
```

**Time restricted (like moonpetal - night only):**
```typescript
gates: [nightGate('The flowers are closed.')],
```

**Both season AND time restricted:**
```typescript
gates: [
  seasonGate([Season.SPRING, Season.SUMMER], 'Dormant in this season.'),
  nightGate('Only blooms at night.'),
],
```

`seasonGate` also accepts a function `(season) => message` for a season-specific message (see heather).

## Common Issues

### Issue: Plant shows wrong background colour
**Cause:** Missing ColorResolver mapping
**Fix:** Add `[TileType.YOUR_PLANT]: 'grass'` to `TILE_TYPE_TO_COLOR_KEY`

### Issue: Item shows as emoji or brown parcel in inventory
**Cause:** The item definition has no `image` (or it names an asset key that does not exist)
**Fix:** Add `image: magicalAssets.your_item` to the definition in `data/items/magicalIngredients.ts`

### Issue: Can't forage the plant / No radial menu appears
**Cause:** Tile type missing from the multi-tile `hasTileTypeNearby()` list in `utils/interactions/providers/forage.ts`
**Fix:** THIS IS THE #1 BUG! Add `TileType.YOUR_PLANT` to that list.

### Issue: "Forage" appears but nothing is ever found / wrong item
**Cause:** No `FORAGE_SOURCES` entry for the tile in `utils/forage/sources.ts`, or an earlier entry near the same spot claims the forage first
**Fix:** Add the entry (Phase 11b), and check its position in the array.

### Issue: TypeScript error "Type 'string' not assignable to 'string[]'"
**Cause:** `image` property in tiles.ts must be an array
**Fix:** Change `image: tileAssets.plant` to `image: [tileAssets.plant]`

### Issue: Duplicate item error
**Cause:** Item ID already exists in `items.ts`
**Fix:** Search for existing entry and either update it or use unique ID

## Files Modified Summary

| File | Purpose |
|------|---------|
| `types/core.ts` | TileType enum |
| `maps/gridParser.ts` | Grid character code |
| `assets.ts` | Tile + inventory sprite paths |
| `data/tiles.ts` | TILE_LEGEND rendering config |
| `data/spriteMetadata.ts` | Multi-tile sprite size/offset |
| `utils/ColorResolver.ts` | Background colour mapping |
| `data/items/magicalIngredients.ts` | Foraged item definition (incl. `image`) |
| `utils/interactions/providers/forage.ts` | **Forageable tiles list** (CRITICAL) |
| `utils/forage/sources.ts` | `FORAGE_SOURCES` entry: gates, rates, cooldown, messages |
| `tests/forageSources.test.ts` | Expected cooldown set (if you set `cooldownMessage`) |
| `maps/procedural.ts` | (Optional) Procedural spawning |

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
- [ ] 8. Add item definition in `data/items/magicalIngredients.ts` (with `forageSuccessRate` and `image`)
- [ ] **9. Add to the forageable tiles list in `utils/interactions/providers/forage.ts` - CRITICAL!**
- [ ] 10. Add a `FORAGE_SOURCES` entry in `utils/forage/sources.ts` (and its label to the cooldown set in `tests/forageSources.test.ts` if it has `cooldownMessage`)
- [ ] 11. (Optional) Add to procedural generation in `maps/procedural.ts`
- [ ] 12. Run `make verify` to validate (typecheck + tests; `tests/colorResolver.test.ts` catches a missing `TILE_TYPE_TO_COLOR_KEY` entry, `tests/assetIntegrity.test.ts` catches bad asset paths, `tests/itemSSoT.test.ts` catches item duplicates. the suite is fully green)
- [ ] 13. Test in game (place on map, forage, check inventory)
