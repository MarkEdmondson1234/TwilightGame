---
name: Add Herb
description: Add a new herb crop to the TwilightGame farming system. Use when user wants to add a new herb, perennial plant, or regrowable crop.
---

# Add Herb

Add a new herb to the farming system. Herbs differ from normal crops: they **persist after harvesting** (plot stays, enters a cooldown), skip the young growth stage (seedling → adult only), and go dormant in winter.

## Quick Start

```
User says: "Add lavender as a new herb"
This skill will:
1. Verify sprites exist in /public/assets/herbs/
2. Register sprites in assets.ts (farmingAssets + herbAssets)
3. Add crop definition in data/crops.ts
4. Add two items: seed in data/items/seeds.ts, harvested crop in data/items/crops.ts
5. Add seed to shop inventory in data/shopInventory.ts
6. Add adult size/offset config in utils/pixi/TileLayer.ts
7. Run npm run optimize-assets
8. Run make verify (typecheck + full test suite)
```

## When to Use This Skill

- User says "add a new herb" or "add [plant] as an herb"
- User provides herb sprites (seeds, plant, crop)
- User wants a crop that regrows after harvest
- User wants a perennial farmable plant

---

## Workflow

### 1. Verify Sprite Files

Three sprites are required in `public/assets/herbs/`:

| File | Purpose |
|------|---------|
| `[herb]_seeds.png` | Inventory icon for the seed item |
| `[herb]_plant.png` (or similar) | Rendered on the farm tile (growing + ready + cooldown) |
| `[herb]_crop.png` (or similar) | Inventory icon for the harvested herb |

Ask the user for exact filenames if unsure — they may differ (e.g. `plant_thyme.png` instead of `thyme_plant.png`).

### 2. Register Sprites in assets.ts

**Add the plant sprite to `farmingAssets`** (uses the `plant_<cropId>_adult` key pattern so TileLayer finds it automatically):
```typescript
// In farmingAssets object:
plant_lavender_adult: '/TwilightGame/assets-optimized/herbs/lavender_plant.png',
```

**Add all three to `herbAssets`**:
```typescript
export const herbAssets = {
  // ... existing herbs
  lavender_seeds: '/TwilightGame/assets-optimized/herbs/lavender_seeds.png',
  lavender_plant: '/TwilightGame/assets-optimized/herbs/lavender_plant.png',
  lavender_crop:  '/TwilightGame/assets-optimized/herbs/lavender_crop.png',
};
```

Always use `/TwilightGame/assets-optimized/` paths (not `/assets/`).

### 3. Add Crop Definition in data/crops.ts

Add under the `// ===== HERBS =====` section:

```typescript
lavender: {
  id: 'lavender',
  name: 'lavender',
  displayName: 'Lavender',
  plantSeasons: [Season.SPRING, Season.SUMMER],
  growthTime: 2 * MINUTE,          // TEMP debug — change to 2 * GAME_DAY for production
  growthTimeWatered: 1.5 * MINUTE, // TEMP debug — change to 1.5 * GAME_DAY for production
  waterNeededInterval: 1 * GAME_DAY,
  wiltingGracePeriod: 0.5 * GAME_DAY,
  deathGracePeriod: 0.5 * GAME_DAY,
  harvestYield: 2,
  sellPrice: 12,
  experience: 8,
  seedDropMin: 0,
  seedDropMax: 0,       // Herbs never drop seeds on harvest
  seedCost: 8,
  rarity: CropRarity.UNCOMMON,
  seedSource: 'shop',
  isHerb: true,
  harvestCooldownDays: 1,
  description: 'A fragrant herb that regrows after harvesting. Goes dormant in winter.',
},
```

**Key herb-specific fields:**
- `isHerb: true` — enables persistent harvest behaviour
- `harvestCooldownDays: 1` — days before re-harvest
- `seedDropMin: 0, seedDropMax: 0` — herbs never drop seeds
- `growthTime` — use `MINUTE` during dev, `GAME_DAY` for production

### 4. Add Items in data/items/seeds.ts and data/items/crops.ts

Item definitions live in per-category modules under `data/items/` — see the category → module table in the `data/items.ts` header.

**Seed item** — add to `SEED_ITEMS` in `data/items/seeds.ts` (needs `herbAssets` imported at top):
```typescript
seed_lavender: {
  id: 'seed_lavender',
  name: 'seed_lavender',
  displayName: 'Lavender Seeds',
  category: ItemCategory.SEED,
  description: 'Seeds for growing lavender. The plant regrows after each harvest.',
  rarity: ItemRarity.UNCOMMON,
  stackable: true,
  sellPrice: 4,
  buyPrice: 8,
  cropId: 'lavender',    // CRITICAL — links seed to crop definition
  image: herbAssets.lavender_seeds,
},
```

**Harvested crop item** — add to `CROP_ITEMS` in `data/items/crops.ts` (sell-only — no `buyPrice`):
```typescript
crop_lavender: {
  id: 'crop_lavender',
  name: 'crop_lavender',
  displayName: 'Fresh Lavender',
  category: ItemCategory.CROP,
  description: 'Freshly harvested lavender sprigs.',
  rarity: ItemRarity.UNCOMMON,
  stackable: true,
  sellPrice: 12,
  image: herbAssets.lavender_crop,
},
```

**SSoT note:** If a dried `lavender` cooking ingredient already exists, keep its original id unchanged. These new items use `seed_lavender` and `crop_lavender` to avoid conflicts.

### 5. Add Seed to Shop Inventory in data/shopInventory.ts

```typescript
{ itemId: 'seed_lavender', buyPrice: 8, sellPrice: 4, stock: 'unlimited' },
```

No `availableSeasons` needed — it is **auto-derived** from `crops.ts plantSeasons` via `getEffectiveSeasons()`.

The harvested crop (`crop_lavender`) does **not** need a shop entry — `getSellPrice()` falls back to `ITEMS[itemId].sellPrice`.

### 6. Add Sprite Size Config in utils/pixi/TileLayer.ts

Add to the `// Herbs` section of `CROP_ADULT_SIZES`:

```typescript
lavender: { width: 1.2, height: 1.2, offsetX: -0.1, offsetY: -0.125 },
```

**Offset guide** (TILE_SIZE = 64px, each `0.0625` = 4px):
- `offsetY: -0.5` = default (sprite extends half tile above soil)
- `offsetY: -0.125` = 24px above soil top (good starting point for herbs)
- `offsetY: 0` = sprite bottom at soil bottom

Start with `width: 1.2, height: 1.2, offsetX: -0.1` and adjust `offsetY` visually.

### 7. Optimise Assets

```bash
npm run optimize-assets
```

**Critical:** Sprites won't display without this step — the game loads from `/assets-optimized/`.

Verify the output folder exists: `public/assets-optimized/herbs/`

### 8. TypeScript Check

```bash
make verify
```

Typecheck must pass with zero errors before testing in-game, and the test suite must be clean.

**Never run `npm test`** — that is vitest in watch mode and will never exit. Use `make verify`, `make test` or `npm run test:run`.

**Expected result:** the suite is fully green — **any** failure is a real regression, including yours.

**Tests that guard this skill's output:**
- `tests/itemSSoT.test.ts` — fails if `seed_<id>` or `crop_<id>` duplicates an existing item, or if the shop entry references an item ID that is not in `ITEMS`.
- `tests/assetIntegrity.test.ts` — fails if any `farmingAssets` / `herbAssets` path does not resolve to a real file, which is what happens when `npm run optimize-assets` was skipped.

---

## How the Herb System Works

| State | Behaviour |
|-------|-----------|
| `PLANTED` / `WATERED` | Growing — wilts/dies if not watered |
| `READY` | Harvestable — shows Harvest + Remove in radial menu |
| `HERB_COOLDOWN` | Resting after harvest (1 game day) — shows Remove option |
| `HERB_DORMANT` | Winter — plant visible but dimmed; becomes READY in spring |
| `FALLOW` | Empty plot after Remove |

Growth goes: **Seedling → Adult** (young stage skipped for all herbs).

---

## Files Modified Checklist

- [ ] `assets.ts` — `farmingAssets.plant_<id>_adult` + `herbAssets.<id>_*`
- [ ] `data/crops.ts` — crop definition with `isHerb: true`
- [ ] `data/items/seeds.ts` — `seed_<id>` item (with `cropId`)
- [ ] `data/items/crops.ts` — `crop_<id>` item
- [ ] `data/shopInventory.ts` — `seed_<id>` entry (no `availableSeasons` needed)
- [ ] `utils/pixi/TileLayer.ts` — `CROP_ADULT_SIZES` entry for sprite sizing
- [ ] `npm run optimize-assets` — generate optimised sprites
- [ ] `make verify` — typecheck clean; the test suite is fully green

---

## Resources

See [`resources/reference.md`](resources/reference.md) for pricing guidelines and the thyme reference implementation.
