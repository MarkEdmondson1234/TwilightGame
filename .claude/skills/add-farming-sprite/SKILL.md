---
name: Add Farming Sprite
description: Add farming-related sprites (crops, soil states, plants) to the game's farming system
---

# Add Farming Sprite

This skill helps you add farming-related sprites to the TwilightGame project, including soil states, plant growth stages, and harvested crop item images.

## When to Use

Use this skill when you need to:
- Add sprites for soil states (fallow, tilled, watered)
- Add plant growth stage sprites (young, adult) for a crop
- Add a harvested crop item image (shown in inventory)
- Add a new crop type end-to-end

## Rendering Architecture Note

**TwilightGame uses PixiJS WebGL rendering** for high performance (10-100x faster than DOM).

**What this means for you:**
- **Asset registration** (in `assets.ts`): Unchanged
- **Rendering**: Farm plot sprites are automatically rendered by the tile system
  - **PixiJS** (default): `TileLayer.ts` handles all tile rendering including farm plots
  - **DOM Fallback**: `TileRenderer.tsx` with farm plot override logic
- **You don't need PixiJS knowledge** — just register your assets as documented below

The rendering engine automatically selects the appropriate sprite based on farm plot state, crop type, growth stage, and current season.

---

## Three Sprite Types

A crop typically has **three distinct sprites**, each living in a different location:

| Sprite | File location | Registered in | Used by |
|--------|--------------|---------------|---------|
| Plant growth stages (`plant_[crop]_young/adult`) | `/public/assets/farming/` | `farmingAssets` in `assets.ts` | Farm plot renderer |
| Harvested crop item image | `/public/assets/items/grocery/` | `groceryAssets` in `assets.ts` | Inventory / item UI |
| Seed item image (optional) | `/public/assets/items/` | `itemAssets` in `assets.ts` | Inventory / item UI |

These are **separate concerns** — forgetting the crop item image means the inventory will show no icon for the harvested vegetable.

---

## Farming Sprite Categories

### Soil States
- `fallow_soil_[variation]` — Untilled brown soil (can have variations)
- `tilled` — Dark brown tilled soil ready for planting
- `watered` — Tilled soil that has been watered (optional visual)

### Plant Growth Stages (per crop)
Each crop has two in-field sprites:
- `plant_[cropName]_young` — Early growth (33–95% of growth time)
- `plant_[cropName]_adult` — Mature / ready to harvest (95–100%)

The generic `seedling` sprite covers the earliest stage (0–33%) for all crops.

### Current Crops

| Crop | Growth time | Seed source |
|------|------------|-------------|
| radish | 2 min | shop |
| spinach | 4 min | shop |
| tomato | 5 min | friendship |
| pea | 6 min | friendship |
| carrot | 6 min | friendship |
| cucumber | 7 min | friendship |
| potato | 8 min | shop |
| sunflower | 8 min | friendship |
| strawberry | 8 min | forage |
| chili | 10 min | shop |
| broccoli | 10 min | shop |
| salad | 10 min | shop |
| onion | 10 min | friendship |
| fairy_bluebell | 10 min | forage (quest) |
| melon | 12 min | shop |
| cauliflower | 12 min | shop |
| corn | 15 min | shop |
| pumpkin | 20 min | shop |

---

## Steps: Adding Plant Growth Sprites Only

Use this when the crop already exists in code and you are only supplying new artwork.

### 1. Place the asset files

```
/public/assets/farming/plant_[crop]_young.png
/public/assets/farming/plant_[crop]_adult.png
```

### 2. Register in `farmingAssets` (`assets.ts`)

```typescript
export const farmingAssets = {
  // ... existing assets
  plant_[crop]_young: '/TwilightGame/assets-optimized/farming/plant_[crop]_young.png',
  plant_[crop]_adult: '/TwilightGame/assets-optimized/farming/plant_[crop]_adult.png',
};
```

### 3. Run asset optimisation

```bash
npm run optimize-assets
```

Farming plant sprites are resized to **768px** and compressed at 95% quality into `/public/assets-optimized/farming/`.

### 4. Verify

- Optimised files exist at `/public/assets-optimized/farming/plant_[crop]_young.png` and `plant_[crop]_adult.png`
- `make verify` is clean — typecheck plus the full test suite. **Never `npm test`** (watch mode, never exits); use `make test` or `npm run test:run` for tests alone.
- `tests/assetIntegrity.test.ts` fails if a `farmingAssets` path does not resolve to a real file — usually a typo or a skipped `npm run optimize-assets`
- **Known baseline:** `cropGrowth` and `eventChains` already fail on `main` for unrelated reasons, so "2 failed" is green

---

## Steps: Adding a Harvested Crop Item Image

Use this when the crop item in inventory needs its own icon.

### 1. Place the asset file

```
/public/assets/items/grocery/[crop]_crop.png
```

### 2. Register in `groceryAssets` (`assets.ts`)

```typescript
export const groceryAssets = {
  // ... existing assets (keep alphabetical)
  [crop]_crop: '/TwilightGame/assets-optimized/items/grocery/[crop]_crop.png',
};
```

### 3. Link it to the crop item in `data/items/crops.ts`

Find the `crop_[crop]` entry and add the `image` property:

```typescript
crop_[crop]: {
  id: 'crop_[crop]',
  // ...
  image: groceryAssets.[crop]_crop,
},
```

### 4. Run asset optimisation

```bash
npm run optimize-assets
```

### 5. Verify

- Optimised file exists at `/public/assets-optimized/items/grocery/[crop]_crop.png`
- `make verify` is clean — typecheck plus the full test suite. **Never `npm test`** (watch mode, never exits); use `make test` or `npm run test:run` for tests alone.
- `tests/assetIntegrity.test.ts` fails if the item's `image` path does not resolve to a real file; `tests/itemSSoT.test.ts` fails if the crop item duplicates an existing entry or is referenced by a non-existent ID
- **Known baseline:** `cropGrowth` and `eventChains` already fail on `main` for unrelated reasons, so "2 failed" is green

---

## Steps: Adding a Completely New Crop

Use this when you are adding a brand-new crop that does not yet exist in code.

### 1. Place all asset files

```
/public/assets/farming/plant_[crop]_young.png
/public/assets/farming/plant_[crop]_adult.png
/public/assets/items/grocery/[crop]_crop.png
```

### 2. Register farming sprites in `farmingAssets` (`assets.ts`)

```typescript
plant_[crop]_young: '/TwilightGame/assets-optimized/farming/plant_[crop]_young.png',
plant_[crop]_adult: '/TwilightGame/assets-optimized/farming/plant_[crop]_adult.png',
```

### 3. Register crop item image in `groceryAssets` (`assets.ts`)

```typescript
[crop]_crop: '/TwilightGame/assets-optimized/items/grocery/[crop]_crop.png',
```

### 4. Define the crop in `data/crops.ts`

Copy an existing entry of similar rarity and adjust the values:

```typescript
[crop]: {
  id: '[crop]',
  name: '[crop]',
  displayName: 'My Crop',
  plantSeasons: [Season.SPRING],
  growthTime: 7 * MINUTE,
  growthTimeWatered: 5 * MINUTE,
  waterNeededInterval: 1 * GAME_DAY,
  wiltingGracePeriod: 0.5 * GAME_DAY,
  deathGracePeriod: 0.5 * GAME_DAY,
  harvestYield: 2,
  sellPrice: 18,
  experience: 12,
  seedDropMin: 1,
  seedDropMax: 3,
  description: 'Description here.',
  seedCost: 0,          // 0 = not sold in shop
  rarity: CropRarity.COMMON,
  seedSource: 'friendship', // 'shop' | 'friendship' | 'forage'
},
```

### 5. Add seed and crop items in `data/items/seeds.ts` and `data/items/crops.ts`

Item definitions live in per-category modules under `data/items/` — see the category → module table in the `data/items.ts` header.

**Seed item** — add to `SEED_ITEMS` in `data/items/seeds.ts`:
```typescript
seed_[crop]: {
  id: 'seed_[crop]',
  name: 'seed_[crop]',
  displayName: 'My Crop Seeds',
  category: ItemCategory.SEED,
  description: 'Seeds for my crop.',
  rarity: ItemRarity.COMMON,
  stackable: true,
  sellPrice: 4,
  cropId: '[crop]',
  image: itemAssets.[crop]_seeds, // if a seed PNG exists, otherwise omit
},
```

**Crop item** — add to `CROP_ITEMS` in `data/items/crops.ts`:
```typescript
crop_[crop]: {
  id: 'crop_[crop]',
  name: 'crop_[crop]',
  displayName: 'My Crop',
  category: ItemCategory.CROP,
  description: 'A fresh my crop.',
  stackable: true,
  sellPrice: 18,
  image: groceryAssets.[crop]_crop,
},
```

### 6. Run asset optimisation

```bash
npm run optimize-assets
```

### 7. Verify

- All three optimised files exist
- `make verify` is clean — typecheck plus the full test suite. **Never `npm test`** (watch mode, never exits); use `make test` or `npm run test:run` for tests alone.
- `tests/assetIntegrity.test.ts` catches unresolvable sprite paths; `tests/itemSSoT.test.ts` catches duplicate or missing `seed_*` / `crop_*` IDs and shop entries; `tests/farmManager.test.ts` covers the plant/water/harvest lifecycle the new crop plugs into
- **Known baseline:** `cropGrowth` and `eventChains` already fail on `main` for unrelated reasons, so "2 failed" is green
- Test in-game: plant the crop and confirm the young → adult sprite transition, then harvest and check the inventory icon

---

## Asset Naming Convention

```
# Farming (in-field) sprites
plant_[crop]_young.png
plant_[crop]_adult.png

# Inventory item sprites
[crop]_crop.png        → groceryAssets
[crop]_seeds.png       → itemAssets
```

## Optimisation Sizes

| Asset type | Output size | Quality |
|-----------|-------------|---------|
| Farming plant sprites | 768px | 95% |
| Grocery / crop item sprites | 512px | 95% |

## Important Notes

- **Always use optimised paths** in `assets.ts` (pointing to `assets-optimized/`)
- **Always place originals** in the appropriate `/public/assets/` subdirectory
- Use transparent backgrounds for plant sprites (soil shows through underneath)
- All sprites use **linear (smooth) scaling** — this game is NOT pixel art

## Related Documentation

- [FARMING.md](../../../docs/FARMING.md) — Complete farming system guide
- [ASSETS.md](../../../docs/ASSETS.md) — General asset guidelines
- [assets.ts](../../../assets.ts) — Centralised asset registry
- [data/crops.ts](../../../data/crops.ts) — Crop definitions (growth time, seasons, yield)
- [data/items.ts](../../../data/items.ts) — Item definitions (seed and crop items)
- **Rendering:**
  - [utils/pixi/TileLayer.ts](../../../utils/pixi/TileLayer.ts) — PixiJS tile renderer (includes farm plots)
  - [components/TileRenderer.tsx](../../../components/TileRenderer.tsx) — DOM fallback renderer
