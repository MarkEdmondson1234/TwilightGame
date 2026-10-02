# Crops and herbs

Detail for §3c of `SKILL.md`. Do the common core first. The farming system itself is described in `public/docs/FARMING.md`.

## The pieces of a crop

| Piece                         | Where                                                         | Notes |
| ----------------------------- | ------------------------------------------------------------- | ----- |
| Crop definition               | `data/crops.ts` → `CROPS`                                      | growth, seasons, yield, seed source |
| Seed item `seed_<id>`         | `data/items/seeds.ts` → `SEED_ITEMS`                           | `cropId: '<id>'` links it to the crop — without it `getCropIdFromSeed()` returns null and nothing can be planted |
| Harvest item `crop_<id>`      | `data/items/crops.ts` → `CROP_ITEMS`                           | id must be `crop_<id>` (`getCropItemId()`) |
| In-field art                  | `public/assets/farming/` → `farmingAssets.plant_<id>_young` / `plant_<id>_adult` | herbs keep theirs in `public/assets/herbs/` but still register under `farmingAssets` |
| Inventory art                 | `groceryAssets` / `itemAssets` (crop), `itemAssets` (seed packet), `herbAssets` (herbs) | follow the neighbouring entries |
| Adult size override (optional)| `CROP_ADULT_SIZES` in `utils/pixi/TileLayer.ts`                | default is the `CROP_SPRITE_CONFIG` box |
| Shop entry for seeds (if `seedSource: 'shop'`) | `data/shopInventory.ts`                       | no `availableSeasons` — derived from `plantSeasons` |

## How the field sprite is chosen

`TileLayer` picks the plot's picture from the growth stage (thresholds in
`GROWTH_THRESHOLDS`, `constants.ts`: 0–33% seedling, 33–95% young, 95–100% adult):

- seedling → `farmingAssets.seedling` (shared by every crop)
- young → `lookupFarmingAsset('plant_<id>_young')`, falling back to the seedling
- adult → `plant_<id>_adult`; a dormant herb uses `plant_<id>_winter` if it exists
- dead → `farmingAssets.wilted_plant`

So the **key names** in `farmingAssets` are the contract; the filenames can be anything
(e.g. `plant_salad_young` → `farming/salad_young.png`). Crop sprites are not preloaded —
they load on demand when a plot grows one (`utils/mapTextureSet.ts`).

The optimiser (`optimizeFarming()`) sizes files in `farming/` by name: anything containing
`seedling`, `plant_`, `wilted`, `_young` or `_adult` becomes 768px; soil and fences 256px;
`apple_tree`, `pear_tree` and `magic_bean` 1024px. Name new growth art so it matches.
`optimizeHerbs()` makes everything in `herbs/` 768px.

## New crop — template

```typescript
// data/crops.ts → CROPS (copy a neighbour of similar rarity)
beetroot: {
  id: 'beetroot',
  name: 'beetroot',
  displayName: 'Beetroot',
  plantSeasons: [Season.SPRING, Season.AUTUMN],
  growthTime: 7 * MINUTE,
  growthTimeWatered: 5 * MINUTE,
  waterNeededInterval: WATER_NEEDED,
  wiltingGracePeriod: WILTING_GRACE,
  deathGracePeriod: DEATH_GRACE,
  harvestYield: 2,
  sellPrice: 18,
  experience: 12,
  seedDropMin: 1,
  seedDropMax: 3,
  description: 'Earthy, sweet and a lovely deep colour.',
  seedCost: 0,              // 0 = not sold in a shop
  rarity: CropRarity.COMMON,
  seedSource: 'friendship', // 'shop' | 'friendship' | 'forage'
},

// data/items/seeds.ts → SEED_ITEMS
seed_beetroot: {
  id: 'seed_beetroot',
  name: 'seed_beetroot',
  displayName: 'Beetroot Seeds',
  category: ItemCategory.SEED,
  description: 'Seeds for growing beetroot.',
  rarity: ItemRarity.COMMON,
  stackable: true,
  sellPrice: 4,
  cropId: 'beetroot',
  image: itemAssets.beetroot_seeds,
},

// data/items/crops.ts → CROP_ITEMS
crop_beetroot: {
  id: 'crop_beetroot',
  name: 'crop_beetroot',
  displayName: 'Beetroot',
  category: ItemCategory.CROP,
  description: 'A freshly pulled beetroot.',
  stackable: true,
  sellPrice: 18,
  image: groceryAssets.beetroot_crop,
},
```

`WATER_NEEDED`, `WILTING_GRACE`, `DEATH_GRACE` and `MINUTE` are module constants at the
top of `data/crops.ts`. Existing crops grow in real minutes (`N * MINUTE`); follow them.

If the crop should also be buyable as produce, see "A crop that is also sold in a shop" in
`grocery-and-shop.md` — never add an ingredient twin.

### Size override

```typescript
// utils/pixi/TileLayer.ts → CROP_ADULT_SIZES (units are tiles)
beetroot: { width: 1, height: 1, offsetX: 0, offsetY: 0 },
```

`offsetY: 0` puts the sprite's bottom on the soil's bottom; `-1` lifts a 2-tile crop one
tile above it. To centre horizontally, `offsetX = -(width - 1) / 2` (1.2 → -0.1,
2 → -0.5, 2.5 → -0.75). Existing groups: small 1×1, medium 2×2, large 2.5–3, herbs
1.2–1.8.

## Herbs (perennial, regrow after harvest)

Herbs are crops with `isHerb: true`. The plot survives harvest and enters
`HERB_COOLDOWN` for `harvestCooldownDays` game days, then becomes ready again; in winter
it goes `HERB_DORMANT` (`types/farm.ts`). Herbs skip the young stage (seedling → adult),
so they need no `plant_<id>_young`.

Reference implementation — thyme:

```typescript
// assets.ts → farmingAssets  (the field sprite; this key is what TileLayer reads)
plant_thyme_adult: '/TwilightGame/assets-optimized/herbs/plant_thyme.png',
// optional dormant look, as lavender has:
// plant_lavender_winter: '/TwilightGame/assets-optimized/herbs/lavender_winter.png',

// assets.ts → herbAssets  (inventory icons)
thyme_seeds: '/TwilightGame/assets-optimized/herbs/thyme_seeds.png',
thyme_crop: '/TwilightGame/assets-optimized/herbs/thyme_bunch.png',

// data/crops.ts → CROPS, under the "===== HERBS =====" heading
thyme: {
  // ...same fields as any crop, then:
  seedDropMin: 0,
  seedDropMax: 0,            // herbs never drop seeds
  seedCost: 8,
  rarity: CropRarity.UNCOMMON,
  seedSource: 'shop',
  isHerb: true,
  harvestCooldownDays: 1,
},

// data/items/seeds.ts → seed_thyme  (cropId: 'thyme', image: herbAssets.thyme_seeds)
// data/items/crops.ts → crop_thyme  (image: herbAssets.thyme_crop)
// data/shopInventory.ts:
{ itemId: 'seed_thyme', buyPrice: 8, sellPrice: 4, stock: 'unlimited' },
// utils/pixi/TileLayer.ts → CROP_ADULT_SIZES, "Herbs" group:
thyme: { width: 1.2, height: 1.2, offsetX: -0.1, offsetY: -0.125 },
```

`herbAssets` also holds `<herb>_plant` entries, but nothing reads them — the field uses
`farmingAssets.plant_<id>_adult`.

Herb pricing: common seed 5g / crop 8g; uncommon seed 8g (sells 4g) / crop 12g; rare seed
15g (sells 7g) / crop 20g. `seedCost` matches the seed's buy price.

**Name clash:** if a dried cooking ingredient with the herb's bare name already exists,
keep it; the new items are `seed_<id>` and `crop_<id>`, so they do not collide.

## Tests

- `tests/itemSSoT.test.ts` — `getSeedItemId(cropId)` must resolve to a real seed for every
  crop with seed drops; duplicates; shop ids.
- `tests/assetIntegrity.test.ts` — every `farmingAssets` / `herbAssets` path exists.
- `tests/cropGrowth.test.ts`, `tests/cropGrowthStageTransitions.test.ts`,
  `tests/farmManager.test.ts` — the plant / water / grow / harvest lifecycle.

In game: plant, watch seedling → young → adult, harvest, check the inventory icon.

## Troubleshooting

| Symptom                                   | Cause                                                       |
| ----------------------------------------- | ----------------------------------------------------------- |
| "No seeds available" / cannot plant       | seed item missing `cropId`                                   |
| Adult shows the seedling                  | no `farmingAssets.plant_<id>_adult` key (key name, not filename) |
| Herb shows a young stage / vanishes after harvest | `isHerb: true` missing                              |
| Sprite sits too low / high                | tune `offsetY` in `CROP_ADULT_SIZES`                         |
| Shop seed seasons wrong                   | check `plantSeasons`; do not set `availableSeasons` on seeds |
