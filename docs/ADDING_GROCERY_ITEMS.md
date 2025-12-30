# Adding Grocery Items (Cooking Ingredients)

This guide explains how to add new grocery items to the game as cooking ingredients and shop inventory items.

## Overview

Grocery items are cooking ingredients that players can:
- **Purchase** from the village shop
- **Use** in cooking recipes
- **Sell** back to the shop
- **Store** in their inventory

Examples: cheese, almonds, butter, flour, chocolate, olive oil, vanilla pods, etc.

## Complete Workflow

Adding a grocery item requires updates to **4 files**:

1. **`assets.ts`** - Register the sprite path
2. **`data/items.ts`** - Define the item properties
3. **`data/shopInventory.ts`** - Add to shop stock (optional but recommended)
4. **`utils/inventoryUIHelper.ts`** - Map sprite for UI rendering

## Step-by-Step Guide

### 1. Prepare the Sprite Image

**Location:** `/public/assets/items/grocery/`

**Requirements:**
- **Format**: PNG with transparency (recommended)
- **Size**: High resolution (512×512px or larger - will be optimized automatically)
- **Naming**: Use descriptive snake_case (e.g., `almonds.png`, `chocolate_bar.png`, `vanilla_pods.png`)

**Example:**
```
/public/assets/items/grocery/almonds.png
/public/assets/items/grocery/olive_oil.png
/public/assets/items/grocery/cheese.png
```

### 2. Register Sprite in `assets.ts`

Add the sprite path to the `groceryAssets` object:

```typescript
// assets.ts
export const groceryAssets = {
  // ... existing items
  cheese: '/TwilightGame/assets-optimized/items/grocery/cheese.png',
  almonds: '/TwilightGame/assets-optimized/items/grocery/almonds.png',
  // Add your new item:
  your_item: '/TwilightGame/assets-optimized/items/grocery/your_item.png',
};
```

**Important:**
- Always use `/TwilightGame/assets-optimized/` path (not `/assets/`)
- The optimization script creates this automatically
- Use the same filename as your source image

### 3. Define Item in `data/items.ts`

Add a new item definition following the grocery item pattern:

```typescript
// data/items.ts
import { groceryAssets } from '../assets';

export const ITEMS: Record<string, ItemDefinition> = {
  // ... existing items

  almonds: {
    id: 'almonds',                          // Unique ID (must match key)
    name: 'almonds',                        // Internal name
    displayName: 'Almonds',                 // Display name (shown in UI)
    category: ItemCategory.INGREDIENT,      // Category (always INGREDIENT for grocery)
    description: 'Crunchy roasted almonds.', // Short description
    stackable: true,                        // Always true for ingredients
    sellPrice: 6,                           // Price shop pays you (1/2 to 1/3 of buy price)
    buyPrice: 15,                           // Price you pay shop
    image: groceryAssets.almonds,           // Sprite reference
  },
};
```

**Pricing Guidelines:**
- **Buy price**: What players pay at the shop (10-30g for common ingredients)
- **Sell price**: What shop pays players (typically 30-50% of buy price)
- Balance based on rarity and recipe importance

**Common Price Ranges:**
- **Basic ingredients** (flour, salt, sugar): 5-10g buy, 2-4g sell
- **Common ingredients** (butter, eggs, milk): 10-15g buy, 4-6g sell
- **Special ingredients** (cheese, chocolate, spices): 15-30g buy, 6-12g sell
- **Premium ingredients** (vanilla, specialty items): 25-50g buy, 10-20g sell

### 4. Add to Shop Inventory (Optional but Recommended)

Add the item to the shop's stock in `data/shopInventory.ts`:

```typescript
// data/shopInventory.ts
export const SHOP_INVENTORY: ShopItem[] = [
  // ... existing items

  {
    itemId: 'almonds',        // Must match item ID from items.ts
    buyPrice: 15,             // Must match buyPrice in items.ts
    sellPrice: 6,             // Must match sellPrice in items.ts
    stock: 'unlimited',       // Usually 'unlimited' for common ingredients
  },
];
```

**Stock Options:**
- `'unlimited'` - Always available (recommended for common ingredients)
- Number (e.g., `10`) - Limited stock that doesn't restock
- Future: Daily restocking quantities

**Shop Organization:**
The shop inventory is organized into sections with comments:
- Dairy products (milk, butter, cream, cheese)
- Pantry staples (flour, sugar, salt, yeast)
- Cooking oils and condiments
- Spices and herbs
- Proteins (meat, eggs)
- Specialty items

Add your item to the appropriate section.

### 5. Map Sprite in `utils/inventoryUIHelper.ts`

This is the **critical step** that makes the sprite actually display in the inventory UI:

```typescript
// utils/inventoryUIHelper.ts
import { groceryAssets } from '../assets';

const ITEM_SPRITE_MAP: Record<string, string> = {
  // ... existing items

  // Grocery items (cooking ingredients)
  cheese: groceryAssets.cheese,
  almonds: groceryAssets.almonds,
  // Add your new item:
  your_item: groceryAssets.your_item,
};
```

**Important:**
- Without this mapping, the item will show a fallback emoji (📦) or no icon
- This is separate from the `image` property in `items.ts`
- Order doesn't matter, but group by category for readability

**Do NOT add emoji fallbacks** for items with sprites. The `ITEM_ICON_MAP` should only contain items that genuinely don't have sprite assets yet.

### 6. Optimize Assets

Run the optimization script to create the optimized sprite:

```bash
npm run optimize-assets
```

**What this does:**
- Resizes images to 256×256px (optimal for inventory display)
- Compresses with high quality (95%) while preserving transparency
- Outputs to `/public/assets-optimized/items/grocery/`
- Typically saves 85-95% file size

**Example output:**
```
✅ almonds.png: 800KB → 52KB (saved 93.5%)
```

### 7. Test in Game

**Option 1: Add via console**
```javascript
inventoryManager.addItem('almonds', 5);
```

**Option 2: Buy from shop**
1. Start game and navigate to village shop
2. Click "Buy" on your new item
3. Verify sprite displays correctly in inventory

**Option 3: Use in recipe** (if applicable)
1. Create recipe using the ingredient (see [Adding Recipes](#adding-recipes))
2. Cook the recipe and verify ingredient is consumed

## Complete Example: Adding Almonds

Here's the complete workflow we used to add almonds:

### 1. Added sprite file
```
/public/assets/items/grocery/almonds.png  (original high-res PNG)
```

### 2. Registered in `assets.ts`
```typescript
export const groceryAssets = {
  // ... existing items
  almonds: '/TwilightGame/assets-optimized/items/grocery/almonds.png',
};
```

### 3. Defined in `data/items.ts`
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

### 4. Added to shop in `data/shopInventory.ts`
```typescript
{
  itemId: 'almonds',
  buyPrice: 15,
  sellPrice: 6,
  stock: 'unlimited',
},
```

### 5. Mapped sprite in `utils/inventoryUIHelper.ts`
```typescript
const ITEM_SPRITE_MAP: Record<string, string> = {
  // ... existing items
  almonds: groceryAssets.almonds,
};
```

### 6. Optimized
```bash
npm run optimize-assets
# ✅ almonds.png: 800KB → 52KB (saved 93.5%)
```

### 7. Tested
- Bought almonds from village shop ✅
- Sprite displayed correctly in inventory ✅
- Used in marzipan recipe ✅

## Adding Recipes

Once you've added a grocery item, you can use it in recipes:

### Edit `data/recipes.ts`

```typescript
export const RECIPES: Record<string, Recipe> = {
  marzipan_chocolates: {
    id: 'marzipan_chocolates',
    name: 'marzipan_chocolates',
    displayName: 'Marzipan Chocolates',
    category: RecipeCategory.DESSERT,
    description: 'Sweet almond confections.',
    ingredients: [
      { itemId: 'almonds', quantity: 2 },      // Uses our new item
      { itemId: 'sugar', quantity: 1 },
      { itemId: 'chocolate', quantity: 1 },
    ],
    output: { itemId: 'food_marzipan_chocolates', quantity: 4 },
    cookingTime: 300,  // 5 minutes in game time
  },
};
```

**Recipe Guidelines:**
- Use 2-5 ingredients per recipe
- Output quantity should feel rewarding (3-6 items for complex recipes)
- Cooking time: 60-600 seconds (1-10 minutes)
- Balance ingredient costs with output value

## Troubleshooting

### Sprite shows as 📦 emoji instead of image

**Cause:** Item not registered in `ITEM_SPRITE_MAP` in `utils/inventoryUIHelper.ts`

**Fix:**
```typescript
// Add to ITEM_SPRITE_MAP in utils/inventoryUIHelper.ts
const ITEM_SPRITE_MAP: Record<string, string> = {
  your_item_id: groceryAssets.your_sprite_name,
};
```

### Item not available in shop

**Cause:** Not added to `data/shopInventory.ts` or wrong item ID

**Fix:**
```typescript
// Add to SHOP_INVENTORY in data/shopInventory.ts
{
  itemId: 'your_item_id',  // Must match exactly with items.ts
  buyPrice: 15,
  sellPrice: 6,
  stock: 'unlimited',
},
```

### Prices don't match between shop and item

**Cause:** `buyPrice`/`sellPrice` mismatch between `items.ts` and `shopInventory.ts`

**Fix:** Ensure prices match exactly in both files:
```typescript
// items.ts
buyPrice: 15,
sellPrice: 6,

// shopInventory.ts
buyPrice: 15,   // Must match
sellPrice: 6,   // Must match
```

### Image path broken or not found

**Causes:**
1. Optimized file doesn't exist yet
2. Path mismatch between `assets.ts` and actual file location
3. Typo in filename

**Fixes:**
1. Run `npm run optimize-assets`
2. Check filename matches exactly (case-sensitive)
3. Verify path uses `/TwilightGame/assets-optimized/` not `/TwilightGame/assets/`

### TypeScript errors after adding item

**Cause:** Item ID typo or missing import

**Fix:**
```bash
# Check for TypeScript errors
npx tsc --noEmit

# Common issues:
# - Forgot to import groceryAssets in items.ts
# - Item ID doesn't match between files
# - Missing comma in ITEMS object
```

## Quick Reference Checklist

- [ ] 1. Add PNG file to `/public/assets/items/grocery/your_item.png`
- [ ] 2. Register in `assets.ts` → `groceryAssets` object
- [ ] 3. Define in `data/items.ts` → `ITEMS` object with `ItemCategory.INGREDIENT`
- [ ] 4. Add to `data/shopInventory.ts` → `SHOP_INVENTORY` array (optional)
- [ ] 5. Map in `utils/inventoryUIHelper.ts` → `ITEM_SPRITE_MAP`
- [ ] 6. Run `npm run optimize-assets`
- [ ] 7. Test in game (buy from shop, check inventory)
- [ ] 8. Add to recipes if desired (optional)

## Related Documentation

- [`ADDING_INVENTORY_SPRITES.md`](ADDING_INVENTORY_SPRITES.md) - General inventory sprite guide
- [`ASSETS.md`](ASSETS.md) - Asset management guidelines
- [`data/items.ts`](../data/items.ts) - Item definitions reference
- [`data/shopInventory.ts`](../data/shopInventory.ts) - Shop stock reference
- [`data/recipes.ts`](../data/recipes.ts) - Recipe definitions reference

## Summary

The key insight: **Grocery items require 4 registrations:**

1. **`assets.ts`** - Define sprite path
2. **`data/items.ts`** - Define item properties (category, prices, description)
3. **`data/shopInventory.ts`** - Add to shop stock (makes it purchasable)
4. **`utils/inventoryUIHelper.ts`** - Map sprite for rendering (makes it visible)

After registration, always run `npm run optimize-assets` to create optimized sprites.

Prices should match exactly between `items.ts` and `shopInventory.ts`.
