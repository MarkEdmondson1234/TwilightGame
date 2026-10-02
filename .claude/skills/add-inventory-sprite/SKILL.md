---
name: Add Inventory Sprite
description: Add inventory item sprites (grocery items, tools, seeds, potions) to the game. Handles asset registration, optimization, and linking the sprite to the item definition. (project)
---

# Add Inventory Sprite

Add new sprites for inventory items (grocery items, tools, seeds, resources, potions) to TwilightGame. This skill handles the complete workflow: file placement, asset registration, TypeScript integration, UI mapping, and optimization.

## Quick Start

**The Two-Location Pattern:**

Every inventory sprite is registered in **two places**:

1. **`assets.ts`** - Define the optimised sprite path
2. **The matching module under `data/items/`** - Set the `image` property on the item definition
   - Pick the module for the item's category (see the category → module table in the `data/items.ts` header)
   - **This is the single source of truth for the item's picture** - the inventory, quick slot bar, shop, recipe book and cooking popup all read `item.image`

There is no separate inventory sprite map. `getItemIcon()` in `utils/inventoryUIHelper.ts` resolves an icon in this order: runtime registry (`registerItemSprite()`, used only for picked-up placed items with per-instance art) → `item.image` → `item.icon` (emoji) → `FALLBACK_ITEM_ICON` (a brown parcel). **You do not need to edit `inventoryUIHelper.ts`.**

**Without `image:` on the definition, the item shows its `icon` emoji, or the brown parcel placeholder.**

**Typical workflow:**
```typescript
// 1. User uploads sprite to: /public/assets/items/grocery/chocolate_bar.png

// 2. Register in assets.ts:
export const groceryAssets = {
  chocolate_bar: '/TwilightGame/assets-optimized/items/grocery/chocolate_bar.png',
};

// 3. Link in data/items/ingredients.ts:
chocolate: {
  id: 'chocolate',
  displayName: 'Chocolate',
  image: groceryAssets.chocolate_bar,  // ← this is what every UI reads
  // ...other properties
},

// 4. Run optimisation:
npm run optimize-assets
```

## When to Use This Skill

Invoke this skill when:
- User uploads sprites for grocery items, ingredients, or cooking items
- User wants to add tool sprites (hoe, watering can, axe, etc.)
- User asks to add seed packet sprites
- User mentions "inventory sprite", "item image", "grocery sprite"
- User wants to replace emoji placeholders with real images
- User reports sprites showing as emojis instead of images (missing `image:` on the item definition)
- User adds a crop that should also be purchasable at the shop (like spinach or salad)
- User adds cooked food sprites (recipes that produce food items)
- User adds potion sprites (brewed items from MagicManager)
- User mentions "potion sprite", "magical item", "brewing result"

**Trigger phrases:**
- "Add [item] sprite to inventory"
- "I have drawings for grocery items"
- "Upload [ingredient] image"
- "Add sprite for [tool/seed/item]"
- "Why is [item] showing as emoji?"
- "Make this crop buyable at the shop like spinach"
- "Add sprite for [cooked food]"
- "Add potion sprite"
- "Set up potion assets"

## Workflow

### 1. Confirm File Location

**Ask user where they uploaded the sprite(s):**

- **Grocery items** (cooking ingredients): `/public/assets/items/grocery/`
- **Tools, seeds and raw materials**: directly in `/public/assets/items/` (e.g. `hoe.png`, `carrot_seeds.png`, `wood_fine.png`)
- **Crafting stations/furniture/decorations/clothing**: `/public/assets/items/crafting/`, `furniture/`, `decoration/`, `clothing/`
- **Cooked food** (finished recipes): `/public/assets/cooking/`
- **Magical ingredients** (forageable): `/public/assets/items/magical/forageable/`
- **Potions** (brewed results): `/public/assets/items/magical/potions/`

**If user hasn't uploaded yet**, recommend the appropriate subfolder based on item category.

**File naming convention:**
- Use descriptive names (e.g., `chocolate_bar.png` not `choc.png`)
- Use snake_case (e.g., `sack_of_potatoes.png`)
- PNG format recommended (supports transparency)

### 2. Register in `assets.ts`

Add the sprite path to the appropriate asset collection:

**For grocery items:**
```typescript
// In assets.ts
export const groceryAssets = {
  // ...existing items
  new_item: '/TwilightGame/assets-optimized/items/grocery/new_item.png',
};
```

**For tools:**
```typescript
// In assets.ts
export const itemAssets = {
  // ...existing tools
  new_tool: '/TwilightGame/assets-optimized/items/new_tool.png',
};
```

**For potions:**
```typescript
// In assets.ts
export const potionAssets = {
  // ...existing potions
  new_potion: '/TwilightGame/assets-optimized/items/magical/potions/new_potion.png',
};
```

**IMPORTANT:** Always use `/TwilightGame/assets-optimized/` path (not `/assets/`).

### 3. Link in the matching `data/items/` module

Item definitions live in per-category modules under `data/items/` (ingredients, crops, seeds, food, potions, …) — see the category → module table in the `data/items.ts` header. The example below is an ingredient, so it goes in `data/items/ingredients.ts`.

Link the sprite to the item definition by adding the `image` property:

```typescript
// Import the asset collection
import { groceryAssets } from '../../assets';

// Add to existing item or create new item:
new_item: {
  id: 'new_item',
  name: 'new_item',
  displayName: 'New Item',
  category: ItemCategory.INGREDIENT,
  description: 'Description of the item.',
  stackable: true,
  sellPrice: 10,
  buyPrice: 25,
  image: groceryAssets.new_item,  // ← Link sprite (read by inventory, shop and recipe book)
},
```

**This step is REQUIRED for every item with a sprite.** Inventory, quick slot bar, `ShopUI`, `components/book/RecipeContent.tsx` and `CookingResultPopup` all read `item.image` via `getItem()`.

If the item previously had only an emoji `icon`, you can leave the `icon` in place — `image` takes precedence — or remove it.

**Multiple items sharing one sprite:** point both definitions' `image` at the same asset.

### 4b. Special Case: Cooked Food Items

Cooked food uses the same item `image`, and the recipe usually carries the same picture too.

**Example: Adding chocolate_cake sprite**

1. **Upload sprite**: `/public/assets/cooking/chocolate_cake.png`

2. **Register in `assets.ts`** (in `cookingAssets` object):
   ```typescript
   export const cookingAssets = {
     // ...existing items
     chocolate_cake: '/TwilightGame/assets-optimized/cooking/chocolate_cake.png',
   };
   ```

3. **Link in `data/items/food.ts`** (the cooked food item):
   ```typescript
   food_chocolate_cake: {
     id: 'food_chocolate_cake',
     name: 'food_chocolate_cake',
     displayName: 'Chocolate Cake',
     category: ItemCategory.FOOD,
     description: 'A rich, decadent chocolate cake.',
     stackable: true,
     sellPrice: 90,
     image: cookingAssets.chocolate_cake,  // ← REQUIRED
   },
   ```

4. **Add `image` to the recipe in `data/recipes.ts`**:
   ```typescript
   chocolate_cake: {
     id: 'chocolate_cake',
     name: 'chocolate_cake',
     displayName: 'Chocolate Cake',
     // ...ingredients, cookingTime, etc.
     image: cookingAssets.chocolate_cake,  // ← shown on the recipe page
     instructions: [...],
   },
   ```
   The recipe's `image` is the illustration on its page in the recipe book (`components/book/RecipeContent.tsx`, opened from the cottage book). It is optional, but a recipe without one has no picture there.

5. **Run optimisation**:
   ```bash
   npm run optimize-assets
   ```

**Three locations for cooked food:**
1. `assets.ts` - cookingAssets object
2. `data/items/food.ts` - food_* item definition (inventory, shop, etc.)
3. `data/recipes.ts` - recipe definition (recipe book illustration)

### 4c. Special Case: Magical Potions (Brewed Items)

Magical potions are brewed via the `MagicManager` system (similar to how food is cooked via `CookingManager`). They follow the standard two-location pattern but use a dedicated asset collection.

**File location:** `/public/assets/items/magical/potions/`

**Example: Adding friendship_elixir sprite**

1. **Upload sprite**: `/public/assets/items/magical/potions/friendship_elixir.png`

2. **Register in `assets.ts`** (in `potionAssets` object):
   ```typescript
   // Potion assets - Brewed magical potions (results from brewing recipes)
   export const potionAssets = {
     // ...existing potions
     friendship_elixir: '/TwilightGame/assets-optimized/items/magical/potions/friendship_elixir.png',
   };
   ```

3. **Link in `data/items/potions.ts`** (the potion item):
   ```typescript
   import { potionAssets } from '../../assets';

   potion_friendship: {
     id: 'potion_friendship',
     name: 'potion_friendship',
     displayName: 'Friendship Elixir',
     category: ItemCategory.POTION,
     description: 'A warm, honey-coloured potion. Increases friendship with the target NPC.',
     stackable: true,
     sellPrice: 50,
     image: potionAssets.friendship_elixir,  // ← Link sprite
   },
   ```

4. **Run optimisation**:
   ```bash
   npm run optimize-assets
   ```

**Key differences from cooked food:**
- Potions use `potionAssets` (not `cookingAssets`)
- Potions are stored in `/items/magical/potions/` (not `/cooking/`)
- Potions use `ItemCategory.POTION` (not `ItemCategory.FOOD`)
- Potions are brewed via `MagicManager.brew()` (not `CookingManager.cook()`)
- Potion recipes are in `data/potionRecipes.ts` (not `data/recipes.ts`)
- Potions currently cannot be sold in shops (future: witch shop)

**Two locations for potions:**
1. `assets.ts` - potionAssets object
2. `data/items/potions.ts` - potion_* item definition (`image`)

**Existing potion sprites:**
- `friendship_elixir.png` → `potion_friendship`
- `bitter_grudge.png` → `potion_bitter_grudge`
- `glamour_draught.png` → `potion_glamour`
- `beastward_balm.png` → `potion_beastward`
- `wakefulness_brew.png` → `potion_wakefulness`

### 4d. Special Case: Crops That Are Also Shop Items

Some crops can be both **harvested from farming** AND **purchased at the shop** (like spinach or salad). These require additional setup beyond the standard two-location pattern.

**Example: Adding salad as both a crop and shop item**

1. **Complete steps 1-3** above (asset registration, `image` on the item definition)

2. **Add to shop inventory** (`data/shopInventory.ts`):
   ```typescript
   export const GENERAL_STORE_INVENTORY: ShopItem[] = [
     // ...existing items
     {
       itemId: 'crop_salad',  // The harvested crop item ID
       buyPrice: 35,          // Overpriced (normally sells for 15g)
       sellPrice: 15,         // Match the crop's sellPrice from items.ts
       stock: 'unlimited',
       availableSeasons: ['spring', 'summer'],  // When salad grows
     },
   ];
   ```

3. **Pattern to follow:**
   - Buy price should be ~2-3x the sell price (overpriced)
   - Sell price should match the crop's `sellPrice` in `items.ts`
   - Available seasons should match when the crop can be planted (`data/crops.ts`)
   - This allows players to buy the crop directly instead of farming it

**Why do this?**
- Players can buy crops they haven't grown yet
- Useful for cooking recipes that need specific ingredients
- Creates a trade-off: grow cheaply or buy expensively for convenience

**Examples of dual-purpose crops:**
- `crop_spinach` - Available spring/summer at 30g (sells for 12g)
- `crop_salad` - Available spring/summer at 35g (sells for 15g)
- `crop_tomato` - Available summer/autumn as "tomato_fresh" at 12g (sells for 5g)

### 5. Run Asset Optimization

**CRITICAL:** Sprites must be optimized or the game will crash (high-resolution images).

```bash
npm run optimize-assets
```

**What this does:**
- Scans all subdirectories in `/public/assets/items/`
- Resizes images to 256×256px (optimal for inventory display)
- Compresses with high quality (95%) and compression level 6
- Preserves transparency (alpha channel)
- Outputs to `/public/assets-optimized/items/` (preserving folder structure)
- Typically saves 85-95% file size

**Example output:**
```
🎒 Optimizing item sprites...
✅ chocolate_bar.png: 710 KB → 22 KB (saved 96.9%)
✅ vanilla_pods.png: 1.2 MB → 45 KB (saved 96.3%)
```

### 6. Validate with TypeScript

```bash
make verify
```

**Should output:** No typecheck errors, and a clean test run. If errors appear, fix them before testing.

**Never run `npm test`** — that is vitest in watch mode and will never exit. Use `make verify`, `make test` or `npm run test:run`.

**Expected result:** the suite is fully green — **any** failure is a real regression, including yours.

**Tests that guard this skill's output:**
- `tests/assetIntegrity.test.ts` — walks every path in `assets.ts`, `iconAssets.ts` and the `image` fields of `ITEMS`, and fails if one does not resolve to a real file on disk. A failure here almost always means a typo/wrong case, a path pointing at `assets/` instead of `assets-optimized/`, or a skipped `npm run optimize-assets`.
- `tests/itemSSoT.test.ts` — fails if the item ID does not exist in `ITEMS` or duplicates an existing item.

### 7. Test in Game

**Start dev server (if not running):**
```bash
npm run dev
```

**Add item to inventory (browser console):**
```javascript
// Allow pasting first (type this manually):
allow pasting

// Then paste this:
inventoryManager.addItem('new_item', 5);
```

**Open inventory:** Press `I` or `B` key

**Verify:**
- Sprite displays as image (not emoji)
- No broken image icons (beige brick emoji)
- Background color matches map theme

### 8. Clear Inventory for Clean Testing (Optional)

**Reset to starter items:**
```javascript
inventoryManager.resetToStarter();
```

**Clear all items:**
```javascript
inventoryManager.clearAll();
```

## Common Issues and Troubleshooting

### Issue: Sprite shows as emoji or brown parcel instead of image

**Cause:** The item definition in `data/items/<category>.ts` has no `image` property (or it points at an asset key that does not exist). Inventory, quick slot bar and shop all read `item.image`, so the symptom is the same everywhere.

**Fix:**
```typescript
// In the item's data/items/<category>.ts module
import { groceryAssets } from '../../assets';

your_item_id: {
  // ...
  image: groceryAssets.your_sprite_name,  // ← Add this line
},
```

### Issue: Image shows as broken/missing (beige brick emoji)

**Causes:**
1. Optimized file doesn't exist yet (most common)
2. Path mismatch between `assets.ts` and actual file location
3. Cached inventory data with old broken paths
4. Browser cached the missing image

**Fixes:**
1. **First, check if optimized file exists:**
   ```bash
   ls public/assets-optimized/items/grocery/your_item.png
   ```
   If it says "No such file", run optimization:
   ```bash
   npm run optimize-assets
   ```

2. **Hard refresh browser** to clear cached assets:
   - Windows/Linux: `Ctrl + Shift + R`
   - Mac: `Cmd + Shift + R`

3. Check filename matches exactly (case-sensitive on some systems)

4. If still broken, clear localStorage and reload:
   ```javascript
   localStorage.clear();
   location.reload();
   ```

**Common workflow:**
After adding a sprite to `assets.ts` and the item definition, you MUST:
1. Run `npm run optimize-assets` (creates the optimized version)
2. Hard refresh browser (Ctrl+Shift+R) to clear cache

### Issue: Optimization script skips my sprite

**Cause:** File is not in a recognized subdirectory

**Fix:** Ensure file is in a recognized location:
- `/public/assets/items/grocery/` ✅
- `/public/assets/items/` (top level) ✅
- Any subdirectory under `/public/assets/items/` ✅

The script recursively scans all subdirectories.

### Issue: Wrong asset path in `assets.ts`

**Wrong:**
```typescript
❌ chocolate_bar: '/TwilightGame/assets/items/grocery/chocolate_bar.png'
```

**Correct:**
```typescript
✅ chocolate_bar: '/TwilightGame/assets-optimized/items/grocery/chocolate_bar.png'
```

## Available Scripts

No specialized scripts needed - this skill uses existing game commands:

- `npm run optimize-assets` - Optimize all sprites
- `make verify` - Typecheck + run the full test suite (use this before finishing)
- `npm run dev` - Start dev server

**Never `npm test`** — it is vitest in watch mode and never exits. Use `make test` or `npm run test:run` for tests alone.

## Resources

### Detailed Documentation
See [`docs/ADDING_INVENTORY_SPRITES.md`](../../../docs/ADDING_INVENTORY_SPRITES.md) for comprehensive guide with examples, optimization settings, and best practices.

### Related Files
- [`assets.ts`](../../../assets.ts) - Asset path definitions
- [`data/items.ts`](../../../data/items.ts) - Item definitions
- [`utils/inventoryUIHelper.ts`](../../../utils/inventoryUIHelper.ts) - `getItemIcon()` resolution order (no edits needed)
- [`components/Inventory.tsx`](../../../components/Inventory.tsx) - Inventory UI component
- [`scripts/optimize-assets.js`](../../../scripts/optimize-assets.js) - Optimization script

## Quick Reference Checklist

When adding a new inventory item sprite:

- [ ] 1. Upload PNG file to `/public/assets/items/{category}/filename.png`
- [ ] 2. Register in `assets.ts` → appropriate assets object (e.g., `groceryAssets`)
- [ ] 3. **REQUIRED:** Link in the matching `data/items/` module → item definition `image` property
  - Every UI (inventory, quick slot bar, shop, recipe book) reads this
- [ ] 4. (Optional) If crop is also shop item, add to `data/shopInventory.ts`
- [ ] 5. Run `npm run optimize-assets` (creates optimized version)
- [ ] 6. Run `make verify` (typecheck + full test suite; `tests/assetIntegrity.test.ts` catches bad asset paths, `tests/itemSSoT.test.ts` catches bad item IDs. the suite is fully green)
- [ ] 7. Test in game:
  - Add item to inventory (verify sprite in inventory UI)
  - If shop item: visit shop and verify sprite displays (not 📦)
- [ ] 8. Hard refresh browser (Ctrl+Shift+R) to clear cached assets

## Progressive Disclosure

This skill loads information progressively:

1. **Always loaded**: This SKILL.md file (YAML frontmatter + workflow overview)
2. **Load on demand**: `docs/ADDING_INVENTORY_SPRITES.md` (detailed reference with 500+ lines of examples)

## Notes

- **Both locations are MANDATORY** - `assets.ts` and the item's `image` property
- **The item definition's `image` is the single source of truth** - `utils/inventoryUIHelper.ts` reads it via `getItem()`; there is no separate sprite map to maintain
- **Always optimise sprites** - high-resolution images will crash the game
- **Asset paths must use `/assets-optimized/`** - not `/assets/`
- **Multiple items can share one sprite** - point both definitions' `image` at the same asset
- **File naming**: Use descriptive snake_case names matching item context (e.g., `chocolate_bar.png` not `choc.png`)
