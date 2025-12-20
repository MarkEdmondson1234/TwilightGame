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
2. **`data/items.ts`** - Link sprite to item definition (optional, for documentation)
3. **`utils/inventoryUIHelper.ts`** - Map sprite for UI rendering (**CRITICAL - this actually displays the sprite**)

**Without step 3, sprites will show as emoji fallbacks.**

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

**Trigger phrases:**
- "Add [item] sprite to inventory"
- "I have drawings for grocery items"
- "Upload [ingredient] image"
- "Add sprite for [tool/seed/item]"
- "Why is [item] showing as emoji?"

## Workflow

### 1. Confirm File Location

**Ask user where they uploaded the sprite(s):**

- **Grocery items** (cooking ingredients): `/public/assets/items/grocery/`
- **Tools**: `/public/assets/items/tools/`
- **Seeds**: `/public/assets/items/seeds/`
- **Resources** (crafting materials): `/public/assets/items/resources/`

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

### 3. Link in `data/items.ts` (Optional)

Link the sprite to the item definition:

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
  image: groceryAssets.new_item,  // ← Link sprite
},
```

**Note:** This step is optional and for documentation only. The actual rendering uses `inventoryUIHelper.ts`.

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

### Issue: Sprite shows as emoji instead of image

**Cause:** Item not registered in `ITEM_SPRITE_MAP` in `inventoryUIHelper.ts`

**Fix:**
```typescript
// Add to ITEM_SPRITE_MAP in utils/inventoryUIHelper.ts
const ITEM_SPRITE_MAP: Record<string, string> = {
  your_item_id: groceryAssets.your_sprite_name,
};
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
- [ ] 3. Link in `data/items.ts` → item definition `image` property (optional)
- [ ] 4. **CRITICAL:** Map in `utils/inventoryUIHelper.ts` → `ITEM_SPRITE_MAP`
- [ ] 5. Run `npm run optimize-assets`
- [ ] 6. Run `npx tsc --noEmit` (validate TypeScript)
- [ ] 7. Test in game (add item to inventory, verify sprite displays)

## Progressive Disclosure

This skill loads information progressively:

1. **Always loaded**: This SKILL.md file (YAML frontmatter + workflow overview)
2. **Load on demand**: `docs/ADDING_INVENTORY_SPRITES.md` (detailed reference with 500+ lines of examples)

## Notes

- **The three-location pattern is MANDATORY** - missing any step will cause issues
- **Step 4 (inventoryUIHelper.ts) is the most commonly forgotten** - this is what actually renders sprites
- **Always optimize sprites** - high-resolution images will crash the game
- **Asset paths must use `/assets-optimized/`** - not `/assets/`
- **Multiple items can share one sprite** - just map both item IDs to the same asset
- **File naming**: Use descriptive snake_case names matching item context (e.g., `chocolate_bar.png` not `choc.png`)
