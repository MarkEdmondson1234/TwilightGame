# Shop Inventory Fix - Quick Test Guide

**🎯 Goal**: Verify shop purchases update the inventory UI immediately

**⏱️ Time Required**: 5 minutes

**🔧 Prerequisites**: Dev server running at `http://localhost:4000/TwilightGame/`

---

## Test Steps

### 1. Open Game and Console

```
1. Navigate to: http://localhost:4000/TwilightGame/
2. Press F12 → Click "Console" tab
3. Create character and start game
```

### 2. Get to the Shop

**Option A - Walk there:**
```
From village spawn → Walk to shop building → Enter door (press E)
```

**Option B - Teleport (faster):**
```
In browser console, type:
window.location.hash = '#shop'
```

### 3. Open Shop UI

```
Press 'O' key → Shop interface appears
```

### 4. Note Starting State

**Before buying anything:**
```
Gold: 100g (top-right corner of screen)
Inventory: Empty (press 'I' to check)
```

### 5. Buy an Item

```
1. Click "Carrot Seeds" (20g)
2. Click "Buy" button
3. Set quantity to 1
4. Click "Confirm"
```

### 6. Verify Console Output

**✅ You should see these 6 logs:**

```
[App] onTransaction called: { newGold: 80, newInventoryLength: 1 }
[App] Gold change: { currentGold: 100, newGold: 80, goldDifference: -20 }
[App] Spent gold: 20
[App] Updated InventoryManager with new inventory  ← CRITICAL!
[App] Saved inventory to GameState
[App] Updated UI inventory: 1
```

**❌ Red flags (should NOT see):**
```
TypeError: Cannot read property 'loadInventory' of undefined
[InventoryUIHelper] Unknown item: seed_carrot
Any React errors
```

### 7. Verify UI Updates

**Gold:**
```
Top-right corner: 100g → 80g ✅
```

**Shop Feedback:**
```
Green success message: "Purchased 1 Carrot Seeds for 20 gold" ✅
```

**Inventory:**
```
Press 'I' key → Inventory panel opens
Look for: Carrot Seeds icon with "×1" badge ✅
Hover over item → Tooltip shows "Carrot Seeds" ✅
```

### 8. Test Stacking

```
1. Buy Carrot Seeds again (quantity: 2)
2. Check inventory: Should show "×3" (not 2 separate stacks) ✅
3. Gold should be 80g → 40g ✅
```

### 9. Test Selling

```
1. In shop UI, click "Sell" tab
2. Select Carrot Seeds
3. Sell quantity: 1
4. Gold should increase: 40g → 50g (sells for 50% of buy price) ✅
5. Inventory quantity: 3 → 2 ✅
```

---

## Pass/Fail Criteria

### ✅ TEST PASSES IF:

- [x] All 6 console logs appear (in order)
- [x] No errors in console
- [x] Gold updates immediately after purchase
- [x] Item appears in inventory UI (press 'I')
- [x] Items stack correctly (buying same item increases quantity)
- [x] Selling decreases quantity and increases gold
- [x] Shop shows success messages

### ❌ TEST FAILS IF:

- [ ] Console logs missing or out of order
- [ ] Errors appear in console
- [ ] Gold updates but inventory doesn't
- [ ] Must restart game to see items
- [ ] Items don't stack (creates duplicates)
- [ ] Selling doesn't update inventory

---

## Quick Debug Commands

**Open browser console (F12) and try:**

```javascript
// Check current gold
console.log('Gold:', window.gameState?.getGold());

// Check current inventory
console.log('Inventory:', window.gameState?.getState().inventory.items);

// Add 1000 gold for testing (if needed)
window.gameState?.addGold(1000);
```

**Note**: These only work if gameState is exposed on window object.

---

## Expected Behavior

### Before Fix (OLD BEHAVIOR - BUG)

```
User buys item
  ↓
Gold updates ✅
  ↓
Inventory UI doesn't update ❌
  ↓
Must restart game to see item
```

### After Fix (NEW BEHAVIOR - FIXED)

```
User buys item
  ↓
Gold updates ✅
  ↓
Inventory UI updates ✅
  ↓
Item appears immediately ✅
```

---

## Visual Checklist

**Screenshot locations to verify:**

1. **HUD (top-right)**: Gold value decreases
2. **Shop UI**: Success message appears
3. **Inventory Panel (press 'I')**: Item icon appears
4. **Console**: All 6 logs present

---

## Troubleshooting

### Issue: Shop UI doesn't open

**Solution:**
```
- Ensure you're on shop map (window.location.hash should be '#shop')
- Try clicking on shop keeper NPC instead
- Check console for errors
```

### Issue: Console logs missing

**Solution:**
```
- Ensure Console tab is open (F12 → Console)
- Clear console (trash icon) and try again
- Check filter isn't hiding [App] messages
```

### Issue: Inventory panel doesn't show item

**Solution:**
```
- Wait 1 second after purchase (React re-render)
- Close and reopen inventory (press 'I' twice)
- Check console for "[App] Updated UI inventory" log
- If missing, the fix didn't work
```

### Issue: Item appears but quantity is wrong

**Solution:**
```
- Check shop transaction quantity (should match inventory)
- Look for duplicate items (stacking failed)
- Check console logs for inventory length
```

---

## Test Result Template

**Copy/paste this after testing:**

```
Shop Inventory Fix Test Results
================================

Date: _____________
Tester: _____________
Browser: _____________

Basic Purchase Test:
[ ] Gold updated (100g → 80g)
[ ] Inventory updated (shows Carrot Seeds)
[ ] Console logs correct (all 6 logs)
[ ] No errors in console

Stacking Test:
[ ] Buying same item increases quantity
[ ] Quantity displays correctly (×3)
[ ] No duplicate stacks created

Selling Test:
[ ] Gold increases when selling
[ ] Inventory quantity decreases
[ ] Item removed when quantity reaches 0

Overall Result: [ ] PASS  [ ] FAIL

Notes:
_________________________________________________
_________________________________________________
_________________________________________________
```

---

## Next Steps

### If Test Passes ✅

1. Mark test as PASSED in template above
2. Proceed with deployment
3. Consider adding automated tests (see TEST_REPORT_SHOP_INVENTORY.md)

### If Test Fails ❌

1. Copy console errors
2. Take screenshots of inventory UI
3. Check browser console for React errors
4. Review code in App.tsx lines 1598-1610
5. Verify InventoryManager.loadInventory() is called

---

## Additional Resources

**Detailed Documentation:**
- `TEST_REPORT_SHOP_INVENTORY.md` - Full test plan
- `SHOP_INVENTORY_FIX_ANALYSIS.md` - Complete code analysis
- `SHOP_INVENTORY_TEST_SUMMARY.md` - Executive summary

**Code Locations:**
- Fix: `App.tsx` lines 1598-1610
- ShopUI: `components/ShopUI.tsx` lines 133-176
- InventoryManager: `utils/inventoryManager.ts` lines 218-233

---

**⏱️ Total Test Time: ~5 minutes**

**✅ If all checkboxes pass, the fix is working correctly!**
