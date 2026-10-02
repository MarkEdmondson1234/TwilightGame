# Adding Inventory Item Sprites

This guide explains how to add new sprites for inventory items (grocery items, tools, seeds, etc.) to the game.

## Overview

Inventory items can display either **image sprites** or **emoji fallbacks**. When adding new items, you'll need to:

1. Add the image file to the correct folder
2. Register the sprite in `assets.ts`
3. Link the sprite to the item definition (`image` property in the matching `data/items/` module)
4. Run the asset optimization script

## Step-by-Step Guide

### 1. Add the Image File

Place your sprite image in the appropriate subfolder under `/public/assets/items/`:

```
/public/assets/items/
├── grocery/          # Cooking ingredients (bread, eggs, spices, etc.)
├── tools/            # Future: Tools (hoe, watering can, etc.)
├── seeds/            # Future: Seed packets
└── resources/        # Future: Crafting materials
```

**Image Requirements:**
- **Format**: PNG (recommended) or JPEG
- **Size**: High resolution (512×512px or larger is fine - will be optimized)
- **Transparency**: PNG with alpha channel recommended
- **Naming**: Use snake_case matching the item ID (e.g., `chocolate_bar.png` for `chocolate` item)

**Example:**
```
/public/assets/items/grocery/chocolate_bar.png
/public/assets/items/grocery/vanilla_pods.png
/public/assets/items/grocery/minced_meat.png
```

### 2. Register Sprite in `assets.ts`

Add the sprite path to the appropriate asset collection in `assets.ts`:

```typescript
// For grocery items (cooking ingredients)
export const groceryAssets = {
  chocolate_bar: '/TwilightGame/assets-optimized/items/grocery/chocolate_bar.png',
  vanilla_pods: '/TwilightGame/assets-optimized/items/grocery/vanilla_pods.png',
  minced_meat: '/TwilightGame/assets-optimized/items/grocery/minced_meat.png',
  // Add your new sprite here:
  new_ingredient: '/TwilightGame/assets-optimized/items/grocery/new_ingredient.png',
};

// For tools
export const itemAssets = {
  hoe: '/TwilightGame/assets-optimized/items/hoe.png',
  watering_can: '/TwilightGame/assets-optimized/items/watering_can.png',
  // Add new tools here:
  new_tool: '/TwilightGame/assets-optimized/items/new_tool.png',
};
```

**Important:**
- Always use the `/TwilightGame/assets-optimized/` path (not `/assets/`)
- The optimization script will create the optimized version automatically
- Use the same filename as your source image

### 3. Link Sprite to Item Definition

Add the `image` property to your item definition in the module that matches its category under `data/items/` — see the category → module table in the `data/items.ts` header. The example below is an ingredient, so it goes in `data/items/ingredients.ts`:

```typescript
import { groceryAssets } from '../../assets';

export const INGREDIENT_ITEMS: Record<string, ItemDefinition> = {
  // Example: Grocery item
  chocolate: {
    id: 'chocolate',
    name: 'chocolate',
    displayName: 'Chocolate',
    category: ItemCategory.INGREDIENT,
    description: 'Dark cooking chocolate.',
    stackable: true,
    sellPrice: 10,
    buyPrice: 25,
    image: groceryAssets.chocolate_bar,  // ← Add this line
  },

  // Example: Tool
  tool_hoe: {
    id: 'tool_hoe',
    name: 'tool_hoe',
    displayName: 'Hoe',
    category: ItemCategory.TOOL,
    description: 'Used for tilling soil.',
    stackable: false,
    sellPrice: 50,
    buyPrice: 100,
    image: itemAssets.hoe,  // ← Add this line
  },
};
```

**This is the critical step.** The item's `image` is the single source of truth for its picture: the inventory, quick slot bar, shop, recipe book and cooking popup all read it via `getItem()`.

**How it works:** `getItemIcon()` in `utils/inventoryUIHelper.ts` resolves an icon in this order:
1. Runtime registry (`registerItemSprite()` — only for picked-up placed items with per-instance art)
2. `item.image` — renders as `<img>`
3. `item.icon` — an emoji, renders as text
4. `FALLBACK_ITEM_ICON` — a brown parcel image

There is no separate sprite map to edit in `inventoryUIHelper.ts`.

### 4. Run Asset Optimization

After adding your sprite files, run the optimization script:

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

**Before optimization:**
```
/public/assets/items/grocery/chocolate_bar.png  (710 KB - original)
```

**After optimization:**
```
/public/assets-optimized/items/grocery/chocolate_bar.png  (22 KB - optimized 97% savings)
```

### 5. Test in Game

1. **Clear localStorage** (if testing existing save):
   ```javascript
   localStorage.clear();
   location.reload();
   ```

2. **Add item to inventory** (console):
   ```javascript
   inventoryManager.addItem('chocolate', 5);
   ```

3. **Open inventory** (press `I` or `B` key in game)

4. **Verify sprite displays** as an image (not emoji)

## Common Issues and Troubleshooting

### Issue: Sprite shows as emoji (or brown parcel) instead of image

**Cause:** The item definition has no `image` property, or it names an asset key that does not exist

**Fix:**
```typescript
// In the item's data/items/<category>.ts module
your_item_id: {
  // ...
  image: groceryAssets.your_sprite_name,
},
```

### Issue: Image shows as broken/missing (beige brick emoji)

**Causes:**
1. Optimized file doesn't exist yet
2. Path mismatch between `assets.ts` and actual file location
3. Cached inventory data with old broken paths

**Fixes:**
1. Run `npm run optimize-assets`
2. Check filename matches exactly (case-sensitive on some systems)
3. Clear localStorage and reload:
   ```javascript
   localStorage.clear();
   location.reload();
   ```

### Issue: Optimization script skips my sprite

**Cause:** File is in a subdirectory that optimization script doesn't scan

**Fix:** Ensure file is in a recognized location:
- `/public/assets/items/grocery/` ✅
- `/public/assets/items/tools/` ✅
- Any subdirectory under `/public/assets/items/` ✅

The script recursively scans all subdirectories under `items/`.

### Issue: Sprite path in `assets.ts` doesn't match optimized location

**Cause:** Using wrong base path

**Wrong:**
```typescript
❌ chocolate_bar: '/TwilightGame/assets/items/grocery/chocolate_bar.png'
```

**Correct:**
```typescript
✅ chocolate_bar: '/TwilightGame/assets-optimized/items/grocery/chocolate_bar.png'
```

## Quick Reference Checklist

When adding a new inventory item sprite:

- [ ] 1. Add PNG file to `/public/assets/items/{category}/filename.png`
- [ ] 2. Register in `assets.ts` → appropriate assets object (e.g., `groceryAssets`)
- [ ] 3. **CRITICAL:** Link in the matching `data/items/` module → item definition `image` property
- [ ] 4. Run `npm run optimize-assets`
- [ ] 5. Run `make verify`, then test in game

## Examples

### Example 1: Adding a Grocery Item (Olive Oil)

**1. Add file:**
```
/public/assets/items/grocery/olive_oil.png  (original 800KB)
```

**2. Register in `assets.ts`:**
```typescript
export const groceryAssets = {
  // ... existing items
  olive_oil: '/TwilightGame/assets-optimized/items/grocery/olive_oil.png',
};
```

**3. Link in `data/items/ingredients.ts`:**
```typescript
import { groceryAssets } from '../../assets';

olive_oil: {
  id: 'olive_oil',
  name: 'olive_oil',
  displayName: 'Olive Oil',
  category: ItemCategory.INGREDIENT,
  description: 'Golden olive oil for cooking.',
  stackable: true,
  sellPrice: 5,
  buyPrice: 15,
  image: groceryAssets.olive_oil,  // ← Link sprite
},
```

**4. Optimize:**
```bash
npm run optimize-assets
# ✅ olive_oil.png: 800KB → 52KB (saved 93.5%)
```

**5. Test:**
```javascript
inventoryManager.addItem('olive_oil', 1);
```

### Example 2: Adding a Tool (Axe)

**1. Add file:**
```
/public/assets/items/tools/axe.png
```

**2. Register in `assets.ts`:**
```typescript
export const itemAssets = {
  hoe: '/TwilightGame/assets-optimized/items/hoe.png',
  watering_can: '/TwilightGame/assets-optimized/items/watering_can.png',
  axe: '/TwilightGame/assets-optimized/items/tools/axe.png',  // ← New tool
};
```

**3. Link in `data/items/toolsAndMaterials.ts`:**
```typescript
tool_axe: {
  id: 'tool_axe',
  name: 'tool_axe',
  displayName: 'Axe',
  category: ItemCategory.TOOL,
  description: 'Used for chopping wood.',
  stackable: false,
  sellPrice: 75,
  buyPrice: 150,
  image: itemAssets.axe,
},
```

**4. Optimize and test:**
```bash
npm run optimize-assets
```

## Asset Organization Best Practices

### Folder Structure

Organize sprites by category:

```
/public/assets/items/
├── grocery/           # Cooking ingredients
│   ├── bread.png
│   ├── butter.png
│   ├── chocolate_bar.png
│   └── ...
├── tools/             # Player tools
│   ├── hoe.png
│   ├── watering_can.png
│   └── axe.png
├── seeds/             # Seed packets
│   ├── carrot_seeds.png
│   └── tomato_seeds.png
└── resources/         # Crafting materials
    ├── wood.png
    └── stone.png
```

### Naming Conventions

**Item IDs** (in `items.ts`):
- Use `snake_case`
- Be descriptive and unique
- Examples: `chocolate`, `olive_oil`, `tool_hoe`, `seed_carrot`

**Sprite Filenames** (in `/assets/items/`):
- Match item ID when possible
- Use descriptive names when item ID is generic
- Examples:
  - `chocolate` item → `chocolate_bar.png` (more descriptive)
  - `vanilla` item → `vanilla_pods.png` (shows form)
  - `meat` item → `minced_meat.png` (shows preparation)

**Asset Object Keys** (in `assets.ts`):
- Use `snake_case`
- Match sprite filename (without extension)
- Examples: `chocolate_bar`, `vanilla_pods`, `minced_meat`

### Multiple Items Sharing One Sprite

Sometimes multiple items can share the same sprite:

```typescript
// In assets.ts
export const groceryAssets = {
  minced_meat: '/TwilightGame/assets-optimized/items/grocery/minced_meat.png',
};

// In data/items/ingredients.ts
meat: {
  id: 'meat',
  name: 'meat',
  displayName: 'Meat',
  image: groceryAssets.minced_meat,  // Shares sprite
},

minced_meat: {
  id: 'minced_meat',
  name: 'minced_meat',
  displayName: 'Minced Meat',
  image: groceryAssets.minced_meat,  // Same sprite
},
```

## Optimization Settings

The optimization script (`scripts/optimize-assets.js`) uses these settings for inventory items:

```javascript
// Item sprite optimization (in optimizeItems function)
const ITEM_SIZE = 256;           // Resize to 256×256px
const HIGH_QUALITY = 95;         // Quality level (0-100)
const compressionLevel = 6;      // PNG compression (0-9, lower = better quality)

await sharp(inputPath)
  .resize(ITEM_SIZE, ITEM_SIZE, {
    fit: 'contain',                          // Preserve aspect ratio
    background: { r: 0, g: 0, b: 0, alpha: 0 }  // Transparent background
  })
  .png({
    palette: false,                          // Force RGBA (PixiJS compatible)
    quality: HIGH_QUALITY,
    compressionLevel: compressionLevel
  })
  .toFile(outputPath);
```

**Customizing for specific items:**

If you need higher quality for certain items, edit the `optimizeItems()` function in `scripts/optimize-assets.js`:

```javascript
// Example: Higher quality for showcase items
const isShowcaseItem = file.includes('rare_') || file.includes('legendary_');
const targetQuality = isShowcaseItem ? 98 : HIGH_QUALITY;
const targetCompression = isShowcaseItem ? 4 : 6;
```

## Related Documentation

- [`ASSETS.md`](ASSETS.md) - General asset management guidelines
- [`docs/FARMING.md`](FARMING.md) - Farming system (includes crop sprites)
- [`data/items.ts`](../data/items.ts) - Item definitions
- [`utils/inventoryUIHelper.ts`](../utils/inventoryUIHelper.ts) - `getItemIcon()` resolution order
- [`components/Inventory.tsx`](../components/Inventory.tsx) - Inventory UI component

## Summary

The key insight: **Inventory sprites are registered in TWO places:**

1. **`assets.ts`** - Define the optimised sprite path
2. **`data/items/<category>.ts`** - Set `image` on the item definition (**CRITICAL** - every UI reads this)

Without step 2, the item falls back to its `icon` emoji or the brown parcel placeholder.

After adding sprites, always run `npm run optimize-assets` to generate the optimized versions that the game actually uses.
