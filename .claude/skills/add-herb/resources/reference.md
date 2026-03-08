# Add Herb — Reference Guide

## Thyme: Complete Reference Implementation

Thyme is the first herb added to the game. Use it as a template.

### assets.ts
```typescript
// In farmingAssets:
plant_thyme_adult: '/TwilightGame/assets-optimized/herbs/plant_thyme.png',

// herbAssets export:
export const herbAssets = {
  thyme_seeds: '/TwilightGame/assets-optimized/herbs/thyme_seeds.png',
  thyme_plant: '/TwilightGame/assets-optimized/herbs/plant_thyme.png',
  thyme_crop:  '/TwilightGame/assets-optimized/herbs/thyme_bunch.png',
};
```

### data/crops.ts
```typescript
thyme: {
  id: 'thyme', name: 'thyme', displayName: 'Thyme',
  plantSeasons: [Season.SPRING, Season.SUMMER],
  growthTime: 2 * MINUTE,          // debug — production: 2 * GAME_DAY
  growthTimeWatered: 1.5 * MINUTE, // debug — production: 1.5 * GAME_DAY
  waterNeededInterval: 1 * GAME_DAY,
  wiltingGracePeriod: 0.5 * GAME_DAY,
  deathGracePeriod: 0.5 * GAME_DAY,
  harvestYield: 2, sellPrice: 12, experience: 8,
  seedDropMin: 0, seedDropMax: 0,
  seedCost: 8, rarity: CropRarity.UNCOMMON, seedSource: 'shop',
  isHerb: true, harvestCooldownDays: 1,
  description: 'A fragrant herb that regrows after harvesting. Goes dormant in winter.',
},
```

### data/items.ts
```typescript
seed_thyme: {
  id: 'seed_thyme', name: 'seed_thyme', displayName: 'Thyme Seeds',
  category: ItemCategory.SEED,
  description: 'Seeds for growing your own thyme. The plant regrows after each harvest.',
  rarity: ItemRarity.UNCOMMON, stackable: true,
  sellPrice: 4, buyPrice: 8,
  cropId: 'thyme',
  image: herbAssets.thyme_seeds,
},
crop_thyme: {
  id: 'crop_thyme', name: 'crop_thyme', displayName: 'Fresh Thyme',
  category: ItemCategory.CROP,
  description: 'Freshly harvested thyme sprigs.',
  rarity: ItemRarity.UNCOMMON, stackable: true,
  sellPrice: 12,
  image: herbAssets.thyme_crop,
},
```

### data/shopInventory.ts
```typescript
{ itemId: 'seed_thyme', buyPrice: 8, sellPrice: 4, stock: 'unlimited' },
```

### utils/pixi/TileLayer.ts — CROP_ADULT_SIZES
```typescript
thyme: { width: 1.2, height: 1.2, offsetX: -0.1, offsetY: -0.125 },
```

---

## Pricing Guidelines

| Herb tier | seedCost | seed buyPrice | seed sellPrice | crop sellPrice |
|-----------|----------|---------------|----------------|----------------|
| Common    | 5        | 5             | 2              | 8              |
| Uncommon  | 8        | 8             | 4              | 12             |
| Rare      | 15       | 15            | 7              | 20             |

---

## Sprite Offset Cheatsheet

TILE_SIZE = 64px. Each `0.0625` units = 4px.

| offsetY   | Effect |
|-----------|--------|
| `0`       | Sprite bottom at soil bottom (very low) |
| `-0.0625` | 4px above soil top |
| `-0.125`  | 8px above soil top (good default for herbs) |
| `-0.25`   | 16px above soil top |
| `-0.5`    | 32px above soil top (default for all adult crops) |

For horizontally centred sprites: `offsetX = -(width - 1) / 2`
- width 1.0 → offsetX 0
- width 1.2 → offsetX -0.1
- width 1.5 → offsetX -0.25
- width 2.0 → offsetX -0.5

---

## Common Mistakes

- **Broken image in shop/inventory**: Sprite files are missing or corrupted in `assets-optimized/`. Re-run `npm run optimize-assets` after confirming source PNGs open in an image viewer.
- **"No seeds available" when planting**: The seed item is missing `cropId`, so `getCropIdFromSeed()` returns null. Check `data/items.ts`.
- **Herb not skipping young stage**: `isHerb: true` is missing from the crop definition in `data/crops.ts`.
- **Seasonal availability wrong**: No `availableSeasons` is needed on the shop entry — it is auto-derived from `plantSeasons` in crops.ts.
- **Naming conflict with cooking ingredient**: If a dried herb ingredient already exists (e.g. `thyme`), new items must use `seed_<id>` and `crop_<id>` to avoid SSoT violations.
- **Sprite filenames don't match assets.ts paths**: Check the actual filenames in `public/assets/herbs/` and match them exactly in `assets.ts` — the optimizer outputs the same filename it receives.
