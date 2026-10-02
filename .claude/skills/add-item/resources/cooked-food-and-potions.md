# Cooked food and potions

Detail for §3b of `SKILL.md`. Do the common core first.

## Cooked food (chocolate cake)

Three places: `assets.ts`, the `food_*` item, and the recipe.

1. Art: `public/assets/cooking/chocolate_cake.png` (optimised to 256×256 by
   `optimizeCooking()` in `scripts/optimize-assets.js`).
2. `assets.ts` → `cookingAssets`:
   ```typescript
   chocolate_cake: '/TwilightGame/assets-optimized/cooking/chocolate_cake.png',
   ```
3. `data/items/food.ts` → `FOOD_ITEMS`:
   ```typescript
   food_chocolate_cake: {
     id: 'food_chocolate_cake',
     name: 'food_chocolate_cake',
     displayName: 'Chocolate Cake',
     category: ItemCategory.FOOD,
     description: 'A rich, decadent chocolate cake.',
     stackable: true,
     sellPrice: 90,
     image: cookingAssets.chocolate_cake,
   },
   ```
4. `data/recipes.ts` → `RECIPES` (fields typed by `RecipeDefinition` in that file):
   ```typescript
   chocolate_cake: {
     id: 'chocolate_cake',
     name: 'chocolate_cake',
     displayName: 'Chocolate Cake',
     category: 'dessert',            // 'starter' | 'savoury' | 'dessert' | 'baking' | 'miscellaneous'
     description: '…',
     ingredients: [
       { itemId: 'flour', quantity: 2 },
       { itemId: 'chocolate', quantity: 1 },
     ],
     cookingTime: 60,                // seconds
     difficulty: 2,                  // 1 | 2 | 3
     resultItemId: 'food_chocolate_cake',
     resultQuantity: 1,
     friendshipValue: 10,
     image: cookingAssets.chocolate_cake, // recipe-book illustration (components/book/RecipeContent.tsx)
     instructions: ['…'],
   },
   ```
   Copy a neighbouring recipe for the optional unlock fields (`unlockRequirement`,
   `courseRequired`, `teacherNpc`).

Every ingredient `itemId` and the `resultItemId` must exist in `ITEMS` —
`tests/itemSSoT.test.ts` fails otherwise. If an ingredient is a crop and the crop is sold
in the shop, the crop needs a `buyPrice` (same test).

## Potions (brewed at the cauldron)

1. Art: `public/assets/items/magical/potions/<name>.png`.
2. `assets.ts` → `potionAssets`:
   ```typescript
   friendship_elixir: '/TwilightGame/assets-optimized/items/magical/potions/friendship_elixir.png',
   ```
3. `data/items/potions.ts` → `POTION_ITEMS`:
   ```typescript
   potion_friendship: {
     id: 'potion_friendship',
     name: 'potion_friendship',
     displayName: 'Friendship Elixir',
     category: ItemCategory.POTION,
     description: 'A warm, honey-coloured potion…',
     stackable: true,
     sellPrice: 50,
     image: potionAssets.friendship_elixir,
   },
   ```
4. Recipe in `data/potionRecipes.ts` (`PotionRecipeDefinition`: `level`
   `'novice' | 'journeyman' | 'master'`, `ingredients`, `brewingTime`, `difficulty`,
   `resultItemId`, `resultQuantity`, `effectDescription`). Brewing runs through
   `MagicManager.brew()` (`utils/MagicManager.ts`).
5. If drinking it does something, add an entry to `POTION_EFFECTS` in
   `utils/MagicEffects.ts` (`applyPotionEffect()` dispatches on the potion id).
   `tests/magicEffects.test.ts` covers existing effects — add a case for a new one.
   Potions meant to be **given** to an NPC (friendship, grudge) are handled in
   `FriendshipManager.giveGift()` instead.

Differences from cooked food at a glance: `potionAssets` not `cookingAssets`;
`items/magical/potions/` not `cooking/`; `ItemCategory.POTION`; recipes in
`data/potionRecipes.ts`.
