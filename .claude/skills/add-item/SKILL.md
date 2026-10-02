---
name: add-item
description: Add any item to the game, or give an existing item its picture — inventory sprites and item images, grocery items and cooking ingredients, shop items and shop stock, cooked food and recipes, potions and brewing results, tools and materials, crops and crop sprites (plant growth stages, soil, farming sprites), seeds, herbs and other perennial or regrowable crops, and forageable or wild plants that yield magical ingredients. Use when the user says "add an item", "add [x] sprite to inventory", "item image", "why is [item] showing as an emoji", "add an ingredient", "grocery item", "make this buyable in the shop", "add a cooked food / recipe picture", "add a potion sprite", "add a crop", "crop sprite", "add a herb", "regrowable crop", "add a forageable plant", "make this plant harvestable" or "magical ingredient".
---

# Add Item

One path for every kind of item. Do the **common core** (§2) for every item, then the
extra steps for its kind (§3), which point at a resource file for the detail.

## 1. Which kind?

| The user wants…                                                         | Module (`data/items/…`)                       | Extra steps                    | Detail                                  |
| ----------------------------------------------------------------------- | --------------------------------------------- | ------------------------------ | --------------------------------------- |
| A picture for an item that already exists                               | wherever it lives                             | core steps 3–6 only            | —                                       |
| A shop-bought cooking ingredient (flour, almonds, spices)               | `ingredients.ts`                              | §3a shop entry                 | `resources/grocery-and-shop.md`         |
| An existing crop to also be buyable in a shop                           | `crops.ts` (no new item)                      | §3a shop entry, maybe `buyPrice` | `resources/grocery-and-shop.md`       |
| A cooked dish / recipe output                                           | `food.ts`                                     | §3b recipe                     | `resources/cooked-food-and-potions.md`  |
| A potion / brewing result                                               | `potions.ts`                                  | §3b potion recipe + effect     | `resources/cooked-food-and-potions.md`  |
| A new farm crop, or new crop growth-stage art                           | `seeds.ts` + `crops.ts`                       | §3c crop definition + sprites  | `resources/crops-and-herbs.md`          |
| A herb / perennial that regrows after harvest                           | `seeds.ts` + `crops.ts`                       | §3c with `isHerb: true`        | `resources/crops-and-herbs.md`          |
| A wild plant on the map that players forage                             | `magicalIngredients.ts` (or `decorations.ts`) | §3d tile + forage source       | `resources/forageable-plants.md`        |
| A tool or raw material                                                  | `toolsAndMaterials.ts`                        | none                           | —                                       |
| Furniture, decorations, clothing, quest items, crafting supplies        | see the table in `data/items.ts`              | copy a neighbouring entry      | —                                       |

The category → module table in the header of `data/items.ts` is the authority. Never add
items to `data/items.ts` itself; its `ITEMS` spread picks up each module automatically.

Clothing grants a costume through `outfitId` — that half lives in the `add-character-sprite`
skill. Placeable furniture uses the `placed*` fields on `ItemDefinition`
(`data/items/types.ts`); copy the nearest existing entry in `furniture.ts`, and if a lone
click could do something surprising (picking a bed up), set `confirmPickup: true` —
`tests/furnitureActions.test.ts` guards that.

## 2. The common core (every item)

### Step 1 — Check the item does not already exist (SSoT)

Each item has exactly **one** definition. Before creating anything:

```bash
grep -rn "displayName: 'Almonds'\|almond" data/items/
```

- If it is grown, it is a crop: use `crop_<id>`. Do **not** add an ingredient called
  `potatoes` when `crop_potato` exists (that exact duplicate is pinned by
  `tests/itemSSoT.test.ts`). To sell a crop in a shop, add a shop entry for the crop
  (and a `buyPrice` on the crop) — never a second item.
- Recipes and shops must use the **exact** existing `id` (`sugar`, not `cane_sugar`).
- Naming: `crop_*` harvested produce, `seed_*` seeds, `food_*` cooked food, `potion_*`
  potions, `tool_*` tools. The harvest item id **must** be `crop_<cropId>` —
  `getCropItemId()` in `data/items.ts` builds it that way.

### Step 2 — Write the definition in the right module

```typescript
// data/items/ingredients.ts → INGREDIENT_ITEMS
almonds: {
  id: 'almonds',            // id, name and object key must all match
  name: 'almonds',
  displayName: 'Almonds',   // British English: colour, flavour, favourite
  category: ItemCategory.INGREDIENT,
  description: 'Crunchy roasted almonds.',
  stackable: true,
  sellPrice: 6,
  buyPrice: 15,
  image: groceryAssets.almonds,
},
```

Every field is typed in `ItemDefinition` (`data/items/types.ts`). Add the asset import at
the top of the module (`import { groceryAssets } from '../../assets';`) if it is not there.

### Step 3 — Put the art under `public/assets/`

| Kind                                   | Folder                                       | `assets.ts` export |
| -------------------------------------- | -------------------------------------------- | ------------------ |
| Grocery ingredient, most crop items    | `public/assets/items/grocery/`               | `groceryAssets`    |
| Tools, seeds, raw materials            | `public/assets/items/` (top level)           | `itemAssets`       |
| Cooked food                            | `public/assets/cooking/`                     | `cookingAssets`    |
| Potions                                | `public/assets/items/magical/potions/`       | `potionAssets`     |
| Foraged magical ingredients            | `public/assets/items/magical/forageable/`    | `magicalAssets`    |
| Herb seeds / plant / bunch             | `public/assets/herbs/`                       | `herbAssets`       |
| Crop growth stages (in the field)      | `public/assets/farming/`                     | `farmingAssets`    |
| Furniture, decoration, crafting, clothing | `public/assets/items/<that folder>/`      | `furnitureAssets` / `itemAssets` (follow neighbours) |

Hand-drawn PNG with transparency, snake_case filename. Large sources are fine — the
optimiser resizes them.

### Step 4 — Register it in `assets.ts`

```typescript
export const groceryAssets = {
  // ...
  almonds: '/TwilightGame/assets-optimized/items/grocery/almonds.png',
};
```

Always `/TwilightGame/assets-optimized/…`, never `/assets/` — the original would be
downloaded and uploaded to the GPU at full resolution. The filename keeps its source name.

### Step 5 — Link it with `image:`

`item.image` is the **single source of truth** for the item's picture: inventory, quick
slot bar, shop, recipe book and cooking popup all read it via `getItem()`.
`getItemIcon()` in `utils/inventoryUIHelper.ts` resolves runtime registry
(`registerItemSprite()`, only for placed items with per-instance art) → `item.image` →
`item.icon` (emoji) → `FALLBACK_ITEM_ICON` (brown parcel). There is **no** sprite map to
edit. An item showing an emoji or a brown parcel is missing `image`.

Several items may share one asset — point both `image` fields at it.

### Step 6 — Optimise, verify, try it

```bash
npm run optimize-assets      # writes public/assets-optimized/…  (required — the game never reads /assets/)
make verify                  # typecheck + full suite. NEVER `npm test` (watch mode, hangs)
npm run lint                 # CI also runs this; needed if you added or moved files
```

The suite is fully green on `main`, so any failure is a real regression. In the running
game (`make dev`), the dev console exposes `inventoryManager`:
`inventoryManager.addItem('almonds', 5)`; `inventoryManager.resetToStarter()` to tidy up.
Open the inventory and hard-refresh (Cmd/Ctrl+Shift+R) if an old image is cached.

### Tests that guard items

| Test                                   | Fails when                                                                                    |
| -------------------------------------- | --------------------------------------------------------------------------------------------- |
| `tests/itemSSoT.test.ts`               | duplicate `displayName`; recipe ingredient/result, or `GENERAL_STORE_INVENTORY` entry, naming an id not in `ITEMS`; legacy duplicates (`potatoes`, `tomato_fresh`, `cane_sugar`); a recipe crop sold in the shop without `buyPrice`; `getSeedItemId()` not resolving; a quest recipe ingredient not sold all year |
| `tests/assetIntegrity.test.ts`         | any `assets.ts` path, or any `ITEMS` `image` / `placedImage` / `foregroundPlacedImage`, does not resolve to a real file (typo, wrong case, `/assets/` path, or `optimize-assets` skipped) |
| `tests/assetCasing.test.ts`            | two files under `public/` differ only by case                                                  |
| `tests/mapTextureBudget.test.ts`       | a texture a map references 404s, or a map exceeds the phone texture budget                     |

Kind-specific tests are listed in each resource file.

## 3. Extra steps by kind

### 3a. Grocery ingredient / shop item

Add a `ShopItem` to `GENERAL_STORE_INVENTORY` (or `MUSHRAS_SHOP_INVENTORY`,
`SHELLA_SHOP_INVENTORY`) in `data/shopInventory.ts`:
`{ itemId: 'almonds', buyPrice: 15, sellPrice: 6, stock: 'unlimited' }`. Keep the prices
in step with the item definition. Seeds need no `availableSeasons` (derived from the crop's
`plantSeasons`); other seasonal stock sets it. Pricing bands, crops-as-shop-items:
`resources/grocery-and-shop.md`.

### 3b. Cooked food or potion

Cooked food: `food_<id>` in `food.ts` with `cookingAssets`, plus a recipe in
`data/recipes.ts` whose `resultItemId` is the food id and whose `image` is the same asset
(the recipe-book illustration). Potion: `potion_<id>` in `potions.ts` with `potionAssets`,
a recipe in `data/potionRecipes.ts`, and — if drinking it does something — an entry in
`POTION_EFFECTS` in `utils/MagicEffects.ts`. Full templates:
`resources/cooked-food-and-potions.md`.

### 3c. Crop or herb

Crop definition in `data/crops.ts`, `seed_<id>` (with `cropId`) in `seeds.ts`,
`crop_<id>` in `crops.ts`, in-field art keyed `plant_<id>_young` / `plant_<id>_adult` in
`farmingAssets`, and an optional size override in `CROP_ADULT_SIZES`
(`utils/pixi/TileLayer.ts`). Herbs add `isHerb: true` and `harvestCooldownDays`, skip the
young stage, and may add `plant_<id>_winter`. Full walkthrough:
`resources/crops-and-herbs.md`.

### 3d. Forageable plant

A map tile as well as an item: `TileType` (`types/core.ts`), grid code
(`maps/gridParser.ts`), `TILE_LEGEND` (`data/tiles.ts`), `SPRITE_METADATA`
(`data/spriteMetadata.ts`), `TILE_TYPE_TO_COLOR_KEY` (`utils/ColorResolver.ts`), the item
with `forageSuccessRate`, then **both** the "Forage" provider list in
`utils/interactions/providers/forage.ts` **and** a `FORAGE_SOURCES` entry in
`utils/forage/sources.ts`. Full walkthrough: `resources/forageable-plants.md`.

## 4. Checklist

- [ ] Searched `data/items/` — no existing item, correct `crop_`/`seed_`/`food_`/`potion_` prefix
- [ ] Definition in the right `data/items/<module>.ts`; `id` = `name` = key
- [ ] Art under `public/assets/…`; path in `assets.ts` uses `/TwilightGame/assets-optimized/`
- [ ] `image:` on the definition
- [ ] Kind-specific steps (§3)
- [ ] `npm run optimize-assets`, then `make verify` (and `npm run lint` if files were added)
- [ ] Seen in game: inventory icon, shop, recipe book / field / forage as relevant
