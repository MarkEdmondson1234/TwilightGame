# Moonpetal Foraging Implementation

## Overview
Successfully implemented moonpetal flower foraging in the Deep Forest (Sacred Grove) with seasonal and time-of-day restrictions.

## Changes Made

### 1. Asset Registration ([assets.ts](assets.ts))
Added moonpetal_flower.png to `magicalAssets`:
```typescript
export const magicalAssets = {
  dragonfly_wings: '/TwilightGame/assets-optimized/items/magical/forageable/dragonfly_wings.png',
  moonpetal_flower: '/TwilightGame/assets-optimized/items/magical/forageable/moonpetal_flower.png',
};
```

**Asset Details:**
- Original size: 225.3KB
- Optimized size: 18.5KB (91.8% reduction)
- Location: `public/assets-optimized/items/magical/forageable/moonpetal_flower.png`

### 2. Item Definition Update ([data/items.ts](data/items.ts))
Updated the `moonpetal` item with:
- Image reference: `magicalAssets.moonpetal_flower`
- Success rate: `forageSuccessRate: 0.8` (80% when conditions are met)

### 3. Foraging Logic ([utils/actionHandlers.ts](utils/actionHandlers.ts))

**Interaction Detection** (in `getAvailableInteractions()`):
- Added `TileType.MOONPETAL` to the list of forageable tiles
- Moonpetal tiles now show "Forage" option when clicked
- Works in both keyboard (R key) and mouse click interactions

**Foraging Handler** (in `handleForageAction()`):
Implemented moonpetal foraging with the following conditions:

**3x3 Area Detection:**
- Moonpetal is a 3x3 multi-tile sprite with a single anchor tile
- The foraging system checks for moonpetal anchors within 1 tile in all directions
- The **entire 3x3 area** around each moonpetal is forageable (not just the center anchor)
- Cooldown is tracked at the anchor position (shared across the whole 3x3 area)
- This makes moonpetals easier to interact with - you don't need to click precisely on the center

**Seasonal Restrictions:**
- Only available in **Spring** and **Summer**
- Dormant in autumn and winter

**Time-of-Day Restrictions:**
- Only forageable at **Night** (when flowers bloom)
- Closed during the day

**Success Rate:**
- 80% chance to successfully forage when conditions are met
- Random yield: 60% chance of 1, 30% chance of 2, 10% chance of 3 flowers

**Cooldown:**
- Uses same foraging cooldown system as other forageable tiles
- Prevents repeated harvesting from same location

## How It Works

### Tile Detection
The system checks if the player is standing on a `TileType.MOONPETAL` tile (already placed in deep forest map using grid code `a`).

### Condition Checks
1. **Season Check**: Rejects if not spring/summer with message "The moonpetal is dormant"
2. **Time Check**: Rejects if daytime with message "The moonpetal flowers are closed"
3. **Success Roll**: 80% chance to find flowers when blooming
4. **Cooldown Check**: Prevents repeated foraging (same as other tiles)

### Visual Feedback
The moonpetal tiles already have time-of-day conditional rendering:
- **Day**: Closed flowers (dormant appearance)
- **Night**: Open flowers (blooming appearance)

This visual cue helps players understand when they can forage.

## Testing Guide

### Prerequisites
1. Navigate to Deep Forest (Sacred Grove) - map ID: `deep_forest`
2. Find moonpetal tiles (marked with `a` in map grid - there are ~15 scattered across the grove)

### Test Scenarios

**Scenario 1: Wrong Season (Autumn/Winter)**
- Location: Any moonpetal tile
- Expected: "The moonpetal is dormant. It only blooms in spring and summer."

**Scenario 2: Wrong Time (Day in Spring/Summer)**
- Location: Any moonpetal tile
- Expected: "The moonpetal flowers are closed. They only bloom at night."

**Scenario 3: Correct Conditions (Spring/Summer Night)**
- Location: Any moonpetal tile
- Expected: 80% chance of success
  - Success: "Found X Moonpetal!" (X = 1-3 flowers)
  - Failure: "You search amongst the moonpetals, but find none suitable for harvesting."

**Scenario 4: Cooldown**
- Location: Previously foraged moonpetal tile
- Expected: "You've already searched here. Come back tomorrow!"

### Debug Commands
Use F8 key to cycle through seasons and F9 to cycle through time of day for testing.

## Lore Integration

The moonpetal is a magical ingredient used in several potion recipes:
- **Friendship Elixir** (honey + milk + moonpetal)
- **Glamour Draught** (blackberries + cream + moonpetal)
- **Floatation Philtre** (feather + moonpetal + morning_dew)
- **Twilight Call** (blackberries + moonpetal + shadow_essence)

The restriction to night-time foraging in spring/summer creates a special gameplay moment - players must visit the sacred grove at night to harvest these rare magical flowers.

## Map Location

**Deep Forest - Sacred Grove**
- Map ID: `deep_forest`
- Size: 35x35 tiles
- Access: 20% random chance when going deeper into forest from village
- Moonpetal locations: ~15 tiles scattered throughout the grove (marked with `a` in grid)
- Other features: Giant Fairy Oak (10x10), Stella NPC, Bunnyfly NPC

## Bug Fixes

### 1. Interaction Detection

**Issue Found:**
The original `getAvailableInteractions()` function only checked for foraging on forest maps and didn't include `TileType.MOONPETAL` or stream adjacency checks.

**Solution:**
Updated the foraging interaction detection to:
1. Include `TileType.MOONPETAL` in the forageable tiles list
2. Check for `deep_forest` map in addition to maps starting with `forest`
3. Add stream adjacency checking (for dragonfly wings foraging)
4. Consolidate all foraging interaction logic in one place

This ensures that clicking on moonpetal tiles or standing on them shows the "Forage" interaction option.

### 2. Tile Rendering (Empty Image Array)

**Issue Found:**
The moonpetal tile definition had `image: []` (empty array) which prevented the tile from rendering and being detected for interactions.

**Solution:**
Removed the `image: []` line from the TILE_LEGEND definition. The tile now properly uses `timeOfDayImages` for rendering, matching the pattern used by brambles and other multi-tile sprites.

### 3. Cache Issues

**Important:** If you experience issues where moonpetal tiles show as GRASS (type: 0) instead of MOONPETAL (type: 83), do a **hard refresh**:
- **Windows/Linux**: Ctrl+Shift+R
- **Mac**: Cmd+Shift+R
- **Or use**: `make reload` to clear Vite cache and restart dev server

The deep forest map needs to be reloaded for the grid parser changes to take effect.

## Technical Notes

### Pattern Following
This implementation follows the same pattern as dragonfly wings foraging:
- Time/season conditional checks
- Per-item success rate (`forageSuccessRate` in item definition)
- Cooldown system integration
- Random quantity yields
- Proper inventory save via CharacterData API

### Code Location
All foraging logic is centralized in `utils/actionHandlers.ts` in the `handleForageAction()` function, making it easy to maintain and extend with new forageable items.
