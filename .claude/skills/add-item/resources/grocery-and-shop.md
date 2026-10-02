# Grocery ingredients and shop stock

Detail for §3a of `SKILL.md`. Do the common core first.

## A new grocery ingredient — worked example (almonds)

1. Art: `public/assets/items/grocery/almonds.png`
2. `assets.ts` → `groceryAssets`:
   ```typescript
   almonds: '/TwilightGame/assets-optimized/items/grocery/almonds.png',
   ```
3. `data/items/ingredients.ts` → `INGREDIENT_ITEMS` (check `data/items/crops.ts` first — if
   it is grown, it belongs there, not here):
   ```typescript
   almonds: {
     id: 'almonds',
     name: 'almonds',
     displayName: 'Almonds',
     category: ItemCategory.INGREDIENT,
     description: 'Crunchy roasted almonds.',
     stackable: true,
     sellPrice: 6,
     buyPrice: 15,
     image: groceryAssets.almonds,
   },
   ```
4. `data/shopInventory.ts` → `GENERAL_STORE_INVENTORY`:
   ```typescript
   { itemId: 'almonds', buyPrice: 15, sellPrice: 6, stock: 'unlimited' },
   ```
   The array is grouped by comment headings (dairy, pantry, spices…); add it to the right
   group.
5. `npm run optimize-assets` — items under `public/assets/items/` (any subfolder) become
   256×256 PNGs in `public/assets-optimized/items/` (`optimizeItems()` in
   `scripts/optimize-assets.js`). Check the output exists:
   `ls public/assets-optimized/items/grocery/almonds.png`.
6. `make verify`; in game, buy one and check the shop and inventory icons.

## `ShopItem` fields (`data/shopInventory.ts`)

| Field              | Meaning                                                                 |
| ------------------ | ----------------------------------------------------------------------- |
| `itemId`           | exact id from `ITEMS`                                                   |
| `buyPrice`         | what the player pays                                                    |
| `sellPrice`        | what the shop pays the player                                           |
| `stock`            | `'unlimited'` or a number                                               |
| `availableSeasons` | optional; omit for year-round                                           |
| `requiresFlag`     | optional game flag that unlocks the entry                               |

Shops: `GENERAL_STORE_INVENTORY`, `MUSHRAS_SHOP_INVENTORY`, `SHELLA_SHOP_INVENTORY`.
`tests/itemSSoT.test.ts` validates ids in the General Store.

**Seeds** (`seed_*`) need no `availableSeasons`: `getEffectiveSeasons()` derives them from
the crop's `plantSeasons` in `data/crops.ts`. Setting them by hand would duplicate that.

## Pricing bands (ingredients)

| Tier                                   | buy    | sell   |
| -------------------------------------- | ------ | ------ |
| Basic (flour, salt, sugar)             | 5–10g  | 2–4g   |
| Common (butter, eggs, milk)            | 10–15g | 4–6g   |
| Special (cheese, chocolate, spices)    | 15–30g | 6–12g  |
| Premium (vanilla)                      | 25–50g | 10–20g |

Keep the shop entry's prices consistent with the item's `buyPrice` / `sellPrice`.

## A crop that is also sold in a shop

Do **not** create an ingredient twin of a crop. Add a shop entry for the crop itself:

```typescript
{
  itemId: 'crop_spinach',
  buyPrice: 30,
  sellPrice: 12, // matches the crop's sellPrice
  stock: 'unlimited',
  availableSeasons: ['spring', 'summer'],
},
```

- Overprice it (~2–3× the sell price) so growing it stays worthwhile.
- `availableSeasons` should follow when the crop grows (`plantSeasons` in `data/crops.ts`).
- If the crop is used in any recipe, also give the crop item a `buyPrice` —
  `tests/itemSSoT.test.ts` ("crops used in recipes should have buyPrice if sold in shop")
  fails otherwise.
- Ingredients of quest recipes must be sold in the General Store in **every** season;
  `tests/itemSSoT.test.ts` checks that too.

## Troubleshooting

| Symptom                                  | Cause / fix                                                                |
| ---------------------------------------- | -------------------------------------------------------------------------- |
| Emoji or brown parcel in shop/inventory  | no `image` on the definition, or it names an asset key that does not exist |
| Broken image                             | `optimize-assets` not run, filename case differs, or path uses `/assets/`; then hard-refresh |
| Not in the shop                          | no `ShopItem`, wrong `itemId`, or `availableSeasons` excludes this season   |
| `itemSSoT` duplicate-displayName failure | the thing already exists — reuse its id                                     |
