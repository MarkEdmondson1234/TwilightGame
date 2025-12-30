---
name: Add Grocery Item
description: Add grocery items (cooking ingredients) to the game. Use when user wants to add a new ingredient, food item, or shop inventory item.
---

# Add Grocery Item

Add grocery items (cooking ingredients) to the game as purchasable shop items and usable recipe ingredients. Handles sprite registration, item definition, shop inventory, and UI mapping.

## Quick Start

**Most common usage:**
```bash
# User says: "Add almonds as a new ingredient"
# This skill will:
# 1. Verify sprite file exists in /public/assets/items/grocery/
# 2. Register sprite in assets.ts
# 3. Create item definition in data/items.ts
# 4. Add to shop inventory in data/shopInventory.ts
# 5. Map sprite in utils/inventoryUIHelper.ts
# 6. Run npm run optimize-assets (CRITICAL - sprite won't work without this!)
# 7. Verify optimized file exists
# 8. Run TypeScript check
```

## When to Use This Skill

Invoke this skill when:
- User asks to "add a new ingredient" or "add grocery item"
- User provides a sprite image for a cooking ingredient
- User mentions adding items like "cheese", "almonds", "spices", "oils"
- User wants to add shop inventory items
- User says "I have a new food ingredient sprite"

## Workflow

### 1. Verify Sprite File

**Check sprite exists:**
```
Expected location: /public/assets/items/grocery/[item_name].png
Requirements: PNG with transparency, high resolution (512x512+ is fine)
```

**If missing:**
- Ask user to provide the sprite file
- Guide them on naming conventions (snake_case)

### 2. Register Sprite in assets.ts

**Add to groceryAssets object:**
```typescript
export const groceryAssets = {
  // ... existing items
  almonds: '/TwilightGame/assets-optimized/items/grocery/almonds.png',
};
```

**Key points:**
- Always use `/TwilightGame/assets-optimized/` path
- Match filename to sprite name
- Alphabetical ordering preferred

### 3. Create Item Definition in data/items.ts

**Add to ITEMS object:**
```typescript
almonds: {
  id: 'almonds',
  name: 'almonds',
  displayName: 'Almonds',
  category: ItemCategory.INGREDIENT,
  description: 'Crunchy roasted almonds.',
  stackable: true,
  sellPrice: 6,        // 30-50% of buyPrice
  buyPrice: 15,        // Base price
  image: groceryAssets.almonds,
},
```

**Pricing guidelines:**
- Basic ingredients (flour, salt): 5-10g buy, 2-4g sell
- Common ingredients (butter, eggs): 10-15g buy, 4-6g sell
- Special ingredients (cheese, spices): 15-30g buy, 6-12g sell
- Premium ingredients (vanilla): 25-50g buy, 10-20g sell

### 4. Add to Shop Inventory in data/shopInventory.ts

**Add to SHOP_INVENTORY array:**
```typescript
{
  itemId: 'almonds',
  buyPrice: 15,
  sellPrice: 6,
  stock: 'unlimited',
},
```

**Important:**
- Prices must match items.ts exactly
- Use 'unlimited' for common ingredients
- Place in appropriate section (dairy, pantry, spices, etc.)

### 5. Map Sprite in utils/inventoryUIHelper.ts

**Add to ITEM_SPRITE_MAP:**
```typescript
const ITEM_SPRITE_MAP: Record<string, string> = {
  // ... existing items
  almonds: groceryAssets.almonds,
};
```

**Critical:**
- This is what makes the sprite actually display
- Without this, item shows fallback emoji (📦)
- Do NOT add emoji fallback if sprite exists

### 6. Optimize Assets

**CRITICAL - Run optimization script:**
```bash
npm run optimize-assets
```

**What it does:**
- Resizes to 256x256px
- Compresses with 95% quality
- Preserves transparency
- Outputs to assets-optimized/
- Typically saves 85-95% file size

**Verify optimization succeeded:**
```bash
ls -la public/assets-optimized/items/grocery/[item_name].png
```

**Why this is critical:**
- Without this step, the sprite will NOT display
- Game references /assets-optimized/, not /assets/
- Missing optimized file = broken image in game

### 7. Verify with TypeScript

**Run type check:**
```bash
npx tsc --noEmit
```

**Fix common issues:**
- Missing import for groceryAssets
- Typo in item ID
- Missing comma in object

### 8. Test in Game (Optional)

**Add item via console:**
```javascript
inventoryManager.addItem('almonds', 5);
```

**Or buy from shop:**
- Navigate to village shop in game
- Verify item appears with correct sprite
- Test purchase and inventory display

## Resources

### Complete Documentation
See [`resources/complete_guide.md`](resources/complete_guide.md) for:
- Detailed examples
- Troubleshooting guide
- Recipe integration
- Advanced pricing strategies

## Progressive Disclosure

This skill loads information progressively:

1. **Always loaded**: This SKILL.md file (workflow steps)
2. **Execute as needed**: npm run optimize-assets (during step 6)
3. **Load on demand**: `resources/complete_guide.md` (detailed reference)

## Notes

**Four files must be updated:**
1. `assets.ts` - Sprite path registration
2. `data/items.ts` - Item definition
3. `data/shopInventory.ts` - Shop stock (optional but recommended)
4. `utils/inventoryUIHelper.ts` - UI sprite mapping (CRITICAL)

**Common mistakes to avoid:**
- Forgetting to add to ITEM_SPRITE_MAP (step 5)
- Price mismatch between items.ts and shopInventory.ts
- Using /assets/ instead of /assets-optimized/ path
- **Not running optimize-assets** - sprite won't display without this!
- Not verifying optimized file exists after running script

**British English:**
- Use "colour", "flavour", "favourite" in descriptions
- Avoid Americanisms in item display names
