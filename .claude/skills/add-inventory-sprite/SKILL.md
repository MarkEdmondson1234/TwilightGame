---
name: Add Inventory Sprite
description: Add inventory item sprites (grocery items, tools, seeds) to the game. Handles asset registration, optimization, and UI mapping following the three-location pattern. (project)
---

# Add Inventory Sprite

Add new sprites for inventory items (grocery items, tools, seeds, resources) to TwilightGame. This skill handles the complete workflow: file placement, asset registration, TypeScript integration, UI mapping, and optimization.

## Quick Start

**The Three-Location Pattern (CRITICAL):**

Every inventory sprite must be registered in **exactly three locations**:

1. **`assets.ts`** - Define the optimized sprite path
2. **`data/items.ts`** - Link sprite to item definition (`image` property)
   - **REQUIRED for shop items** (ShopUI reads from items.ts)
   - Optional for non-shop items (for documentation)
3. **`utils/inventoryUIHelper.ts`** - Map sprite for inventory UI rendering
   - **REQUIRED for all items** (Inventory component reads from here)

**Without step 2, shop items show as 📦 placeholders in the shop.**
**Without step 3, items show as emoji fallbacks in inventory.**

**Typical workflow:**
```typescript
// 1. User uploads sprite to: /public/assets/items/grocery/chocolate_bar.png

// 2. Register in assets.ts:
export const groceryAssets = {
  chocolate_bar: '/TwilightGame/assets-optimized/items/grocery/chocolate_bar.png',
};

// 3. Link in items.ts (optional):
chocolate: {
  id: 'chocolate',
  displayName: 'Chocolate',
  image: groceryAssets.chocolate_bar,
  // ...other properties
},

// 4. Map in inventoryUIHelper.ts (CRITICAL):
const ITEM_SPRITE_MAP: Record<string, string> = {
  chocolate: groceryAssets.chocolate_bar,  // ← Must add this!
};

// 5. Run optimization:
npm run optimize-assets
```

## When to Use This Skill

Invoke this skill when:
- User uploads sprites for grocery items, ingredients, or cooking items
- User wants to add tool sprites (hoe, watering can, axe, etc.)
- User asks to add seed packet sprites
- User mentions "inventory sprite", "item image", "grocery sprite"
- User wants to replace emoji placeholders with real images
- User reports sprites showing as emojis instead of images (missing ITEM_SPRITE_MAP entry)
- User adds a crop that should also be purchasable at the shop (like spinach or salad)
- User adds cooked food sprites (recipes that produce food items)

**Trigger phrases:**
- "Add [item] sprite to inventory"
- "I have drawings for grocery items"
- "Upload [ingredient] image"
- "Add sprite for [tool/seed/item]"
- "Why is [item] showing as emoji?"
- "Make this crop buyable at the shop like spinach"
- "Add sprite for [cooked food]"

## Workflow

### 1. Confirm File Location

**Ask user where they uploaded the sprite(s):**

- **Grocery items** (cooking ingredients): `/public/assets/items/grocery/`
- **Tools**: `/public/assets/items/tools/`
- **Seeds**: `/public/assets/items/seeds/`
- **Resources** (crafting materials): `/public/assets/items/resources/`
- **Cooked food** (finished recipes): `/public/assets/cooking/`

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
  new_tool: '/TwilightGame/assets-optimized/items/tools/new_tool.png',
};
```

**IMPORTANT:** Always use `/TwilightGame/assets-optimized/` path (not `/assets/`).

### 3. Link in `data/items.ts`

Link the sprite to the item definition by adding the `image` property:

```typescript
// Import the asset collection
import { groceryAssets } from '../assets';

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
  image: groceryAssets.new_item,  // ← Link sprite (REQUIRED for shop display)
},
```

**CRITICAL:** This step is **REQUIRED** for items sold in shops (ShopUI component reads `itemDef.image` from items.ts). Without this, shop items show as 📦 placeholders.

**When this step is REQUIRED:**
- ✅ Seeds available in the shop
- ✅ Grocery items/ingredients sold in the shop
- ✅ Tools sold in the shop
- ✅ Any item that appears in shop inventory

**When this step is optional:**
- ⚠️ Crops harvested from farming (not sold in shop, only in inventory)
- ⚠️ Foraged items (not sold in shop)
- ⚠️ Crafted items (not sold in shop)

### 4. Map in `utils/inventoryUIHelper.ts` (CRITICAL)

**This is the most important step** - without this, sprites won't display.

```typescript
// Import asset collections at top of file
import { itemAssets, groceryAssets } from '../assets';

// Add to ITEM_SPRITE_MAP
const ITEM_SPRITE_MAP: Record<string, string> = {
  // Tools
  tool_hoe: itemAssets.hoe,
  tool_watering_can: itemAssets.watering_can,

  // Seeds
  seed_carrot: itemAssets.carrot_seeds,

  // Grocery items
  chocolate: groceryAssets.chocolate_bar,
  vanilla: groceryAssets.vanilla_pods,

  // Crops (harvested items that also appear in shop)
  crop_spinach: groceryAssets.spinach_bundle,
  crop_salad: groceryAssets.salad_head,

  // ← Add new items here:
  new_item: groceryAssets.new_item,
};
```

**Common mistake:** Forgetting this step causes sprites to show as emoji fallbacks.

**Multiple items sharing one sprite:**
```typescript
// Both 'meat' and 'minced_meat' can use the same sprite
meat: groceryAssets.minced_meat,
minced_meat: groceryAssets.minced_meat,
```

**Remove emoji fallbacks when adding sprites:**
```typescript
// In ITEM_ICON_MAP (emoji fallback section)
const ITEM_ICON_MAP: Record<string, string> = {
  crop_salad: '🥗',  // ← Remove this line when adding sprite
};
```

If an item has an emoji fallback in `ITEM_ICON_MAP` and you add a sprite, remove the emoji entry to avoid confusion. The sprite in `ITEM_SPRITE_MAP` takes precedence, but removing the fallback keeps the code clean.

### 4b. Special Case: Cooked Food Items

Cooked food items (recipes that produce food) require **four locations** instead of three, plus the recipe must have an `image` property to spawn the food sprite near the player.

**Example: Adding chocolate_cake sprite**

1. **Upload sprite**: `/public/assets/cooking/chocolate_cake.png`

2. **Register in `assets.ts`** (in `cookingAssets` object):
   ```typescript
   export const cookingAssets = {
     // ...existing items
     chocolate_cake: '/TwilightGame/assets-optimized/cooking/chocolate_cake.png',
   };
   ```

3. **Link in `data/items.ts`** (the cooked food item):
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

4. **Map in `utils/inventoryUIHelper.ts`** (ITEM_SPRITE_MAP):
   ```typescript
   const ITEM_SPRITE_MAP: Record<string, string> = {
     // Cooked Food
     food_tea: cookingAssets.cup_of_tea,
     food_french_toast: cookingAssets.french_toast,
     food_chocolate_cake: cookingAssets.chocolate_cake,  // ← Add this
   };
   ```

5. **Add to recipe in `data/recipes.ts`**:
   ```typescript
   chocolate_cake: {
     id: 'chocolate_cake',
     name: 'chocolate_cake',
     displayName: 'Chocolate Cake',
     // ...ingredients, cookingTime, etc.
     image: cookingAssets.chocolate_cake,  // ← REQUIRED for spawning
     instructions: [...],
   },
   ```

6. **Run optimization**:
   ```bash
   npm run optimize-assets
   ```

**Why the recipe needs `image` property:**

When you cook a recipe successfully, the game spawns the food sprite near the player (1 tile above). This happens in `components/RecipeBook.tsx`:

```typescript
// After successful cooking
if (result.success && result.foodProduced && playerPosition && currentMapId) {
  const recipe = getRecipe(recipeId);
  if (recipe?.image) {  // ← Checks for this!
    // Place the food item near the player
    const placedItem: PlacedItem = {
      // ...
      image: recipe.image,  // ← Uses recipe's image
    };
    gameState.addPlacedItem(placedItem);
  }
}
```

**Four locations for cooked food:**
1. `assets.ts` - cookingAssets object
2. `data/items.ts` - food_* item definition (for inventory display)
3. `utils/inventoryUIHelper.ts` - ITEM_SPRITE_MAP (for inventory rendering)
4. `data/recipes.ts` - recipe definition (for spawning sprite after cooking)

### 4c. Special Case: Crops That Are Also Shop Items

Some crops can be both **harvested from farming** AND **purchased at the shop** (like spinach or salad). These require additional setup beyond the standard three-location pattern.

**Example: Adding salad as both a crop and shop item**

1. **Complete steps 1-4** above (asset registration, items.ts, inventoryUIHelper.ts)

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
npx tsc --noEmit
```

**Should output:** No errors. If errors appear, fix them before testing.

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

### Issue: Sprite shows as emoji instead of image (in inventory)

**Cause:** Item not registered in `ITEM_SPRITE_MAP` in `inventoryUIHelper.ts`

**Fix:**
```typescript
// Add to ITEM_SPRITE_MAP in utils/inventoryUIHelper.ts
const ITEM_SPRITE_MAP: Record<string, string> = {
  your_item_id: groceryAssets.your_sprite_name,
};
```

### Issue: Sprite shows as 📦 placeholder (in shop only)

**Cause:** Item missing `image` property in `data/items.ts`

**Symptoms:**
- Item displays correctly in inventory (shows sprite)
- Item shows as beige brick (📦) in shop UI
- This affects seeds, tools, and grocery items sold in shops

**Fix:**
```typescript
// Add image property to item definition in data/items.ts
import { itemAssets } from '../assets';

seed_your_item: {
  id: 'seed_your_item',
  name: 'seed_your_item',
  displayName: 'Your Item Seeds',
  category: ItemCategory.SEED,
  description: 'Description here.',
  stackable: true,
  sellPrice: 10,
  buyPrice: 25,
  cropId: 'your_item',
  image: itemAssets.your_item_seeds,  // ← Add this line!
},
```

**Why this happens:**
- ShopUI component reads `itemDef.image` from items.ts
- Inventory component reads from `ITEM_SPRITE_MAP` in inventoryUIHelper.ts
- Shop items need BOTH locations set

### Issue: Image shows as broken/missing (beige brick emoji)

**Causes:**
1. Optimized file doesn't exist yet (most common)
2. Path mismatch between `assets.ts` and actual file location
3. Cached inventory data with old broken paths
4. Browser cached the missing image

**Fixes:**
1. **First, check if optimized file exists:**
   ```bash
   ls "c:\Github files\TwilightGame\public\assets-optimized\items\grocery\your_item.png"
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
After adding a sprite to `assets.ts` and `inventoryUIHelper.ts`, you MUST:
1. Run `npm run optimize-assets` (creates the optimized version)
2. Hard refresh browser (Ctrl+Shift+R) to clear cache

### Issue: Optimization script skips my sprite

**Cause:** File is not in a recognized subdirectory

**Fix:** Ensure file is in a recognized location:
- `/public/assets/items/grocery/` ✅
- `/public/assets/items/tools/` ✅
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
- `npx tsc --noEmit` - Validate TypeScript
- `npm run dev` - Start dev server

## Resources

### Detailed Documentation
See [`docs/ADDING_INVENTORY_SPRITES.md`](../../../docs/ADDING_INVENTORY_SPRITES.md) for comprehensive guide with examples, optimization settings, and best practices.

### Related Files
- [`assets.ts`](../../../assets.ts) - Asset path definitions
- [`data/items.ts`](../../../data/items.ts) - Item definitions
- [`utils/inventoryUIHelper.ts`](../../../utils/inventoryUIHelper.ts) - Sprite rendering (CRITICAL)
- [`components/Inventory.tsx`](../../../components/Inventory.tsx) - Inventory UI component
- [`scripts/optimize-assets.js`](../../../scripts/optimize-assets.js) - Optimization script

## Quick Reference Checklist

When adding a new inventory item sprite:

- [ ] 1. Upload PNG file to `/public/assets/items/{category}/filename.png`
- [ ] 2. Register in `assets.ts` → appropriate assets object (e.g., `groceryAssets`)
- [ ] 3. Link in `data/items.ts` → item definition `image` property
  - **REQUIRED if item is sold in shop** (ShopUI reads from items.ts)
  - Optional for non-shop items (inventory-only items)
- [ ] 4. **CRITICAL:** Map in `utils/inventoryUIHelper.ts` → `ITEM_SPRITE_MAP`
  - **REQUIRED for all items** (Inventory component reads from here)
- [ ] 4b. Remove emoji fallback from `ITEM_ICON_MAP` if it exists (keeps code clean)
- [ ] 4c. (Optional) If crop is also shop item, add to `data/shopInventory.ts`
- [ ] 5. Run `npm run optimize-assets` (creates optimized version)
- [ ] 6. Run `npx tsc --noEmit` (validate TypeScript)
- [ ] 7. Test in game:
  - Add item to inventory (verify sprite in inventory UI)
  - If shop item: visit shop and verify sprite displays (not 📦)
- [ ] 8. Hard refresh browser (Ctrl+Shift+R) to clear cached assets

## Progressive Disclosure

This skill loads information progressively:

1. **Always loaded**: This SKILL.md file (YAML frontmatter + workflow overview)
2. **Load on demand**: `docs/ADDING_INVENTORY_SPRITES.md` (detailed reference with 500+ lines of examples)

## Notes

- **The three-location pattern is MANDATORY** - missing any step will cause issues
- **Step 3 (items.ts) is REQUIRED for shop items** - ShopUI reads `itemDef.image`, not inventoryUIHelper
- **Step 4 (inventoryUIHelper.ts) is REQUIRED for all items** - Inventory component reads from ITEM_SPRITE_MAP
- **Always optimize sprites** - high-resolution images will crash the game
- **Two different rendering systems:**
  - **ShopUI** → reads `image` from `data/items.ts`
  - **Inventory** → reads from `ITEM_SPRITE_MAP` in `utils/inventoryUIHelper.ts`
  - Both must be set for shop items to display correctly everywhere
- **Asset paths must use `/assets-optimized/`** - not `/assets/`
- **Multiple items can share one sprite** - just map both item IDs to the same asset
- **File naming**: Use descriptive snake_case names matching item context (e.g., `chocolate_bar.png` not `choc.png`)
