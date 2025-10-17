# Farming System

## Overview

The farming system allows players to grow crops on special farm tiles. Each farm plot has a state and timestamp tracking system that efficiently updates only when the player enters an area, not every frame.

## Performance

- **Not taxing!** Farm states only update when:
  - Player enters a map (batch check all plots once)
  - Player performs a farm action (single tile update)
- No per-frame updates
- Timestamps handle time progression automatically

## Controls

### Tool Selection (Keys 1-4)
- **1** - Hand (harvest ready crops, clear dead crops)
- **2** - Hoe (till fallow soil)
- **3** - Seeds (plant crops in tilled soil)
- **4** - Watering Can (water plants)

### Farm Actions (E key)
Stand on a farm tile and press `E` to perform an action with your current tool.

## Farm Tile States

### State Flow
```
FALLOW (brown) → [hoe] → TILLED (dark brown)
TILLED → [seeds] → PLANTED (dark green)
PLANTED → [water] → WATERED (green)
WATERED/PLANTED → [time] → READY (bright green)
READY → [harvest] → TILLED (get crops + gold)

Without water:
PLANTED → [no water] → WILTING (yellow) → [no water] → DEAD (gray)
DEAD → [clear] → FALLOW
```

### Visual States
- **Fallow** (brown) - Untilled ground, ready to work
- **Tilled** (dark brown) - Ready for planting
- **Planted** (dark green) - Seeds growing
- **Watered** (green) - Recently watered, grows faster
- **Ready** (bright green) - Crop ready to harvest!
- **Wilting** (yellow) - Needs water soon or will die
- **Dead** (gray) - Plant died, needs clearing

## Available Crops

### Radish (Fast - 2 minutes)
- Growth time: 2 minutes (1.5 min if watered)
- Needs water every: 1 minute
- Yield: 1 radish
- Sell price: 10 gold
- Great for beginners and testing!

### Tomato (Medium - 5 minutes)
- Growth time: 5 minutes (3.5 min if watered)
- Needs water every: 2 minutes
- Yield: 3 tomatoes
- Sell price: 25 gold each (75 total)

### Wheat (Long - 10 minutes)
- Growth time: 10 minutes (7 min if watered)
- Needs water every: 3 minutes
- Yield: 5 wheat
- Sell price: 15 gold each (75 total)

### Corn (Premium - 15 minutes)
- Growth time: 15 minutes (10 min if watered)
- Needs water every: 4 minutes
- Yield: 4 corn
- Sell price: 40 gold each (160 total)

### Pumpkin (Specialty - 20 minutes)
- Growth time: 20 minutes (14 min if watered)
- Needs water every: 5 minutes
- Yield: 1 pumpkin
- Sell price: 150 gold
- Requires patience and care!

## How to Farm

1. **Find farm plots** - Look for brown soil tiles (marked with `X` in map editor)
   - There's a farm area in the village (east side, near the mine entrance)

2. **Till the soil** - Switch to Hoe (key `2`) and press `E` on fallow soil

3. **Plant seeds** - Switch to Seeds (key `3`) and press `E` on tilled soil
   - Currently defaults to radish seeds (fast growth for testing)

4. **Water your crops** - Switch to Watering Can (key `4`) and press `E` on planted/wilting crops
   - Water regularly! Crops grow faster when watered
   - If you don't water, crops will wilt and eventually die

5. **Harvest** - Switch to Hand (key `1`) and press `E` on ready crops
   - Crops are automatically added to inventory
   - Gold is automatically earned
   - Plot returns to tilled state for replanting

6. **Clear dead crops** - Use Hand (key `1`) and press `E` on dead crops
   - Returns plot to fallow state

## Technical Architecture

### Single Source of Truth (SSoT)
- **FarmManager** ([utils/farmManager.ts](utils/farmManager.ts)) - Manages all farm plot data
- All farm operations go through FarmManager
- State persisted via GameState to localStorage

### Files Created/Modified

**New Files:**
- `data/crops.ts` - Crop definitions (growth times, water needs, rewards)
- `utils/farmManager.ts` - Core farm logic and state management

**Modified Files:**
- `types.ts` - Added farm tile types and FarmPlot interface
- `constants.ts` - Added farm tile legend entries
- `GameState.ts` - Added farming tool and plot persistence
- `App.tsx` - Added farm action handlers and plot rendering
- `utils/mapUtils.ts` - Added override support for dynamic tile types
- `utils/testUtils.ts` - Added farm system validation
- `components/HUD.tsx` - Added tool display
- `maps/gridParser.ts` - Added `X` code for farm plots
- `maps/definitions/village.ts` - Added 30-tile farm area (east side)

### State Management

Farm plot state includes:
- Position (x, y) and map ID
- Current state (fallow, tilled, planted, etc.)
- Crop type
- Planted timestamp
- Last watered timestamp
- State changed timestamp

State transitions are calculated based on timestamps when:
1. Player enters the map (all plots checked once)
2. Player performs a farm action (single plot updated)

This approach is very efficient - no continuous polling or frame-by-frame updates!

## Adding More Crops

Edit [data/crops.ts](data/crops.ts) to add new crop definitions:

```typescript
newCrop: {
  id: 'newCrop',
  name: 'newCrop',
  displayName: 'New Crop',
  growthTime: 10 * MINUTE,
  growthTimeWatered: 7 * MINUTE,
  waterNeededInterval: 3 * MINUTE,
  wiltingGracePeriod: 2 * MINUTE,
  deathGracePeriod: 1 * MINUTE,
  harvestYield: 2,
  sellPrice: 30,
  experience: 15,
  description: 'A wonderful new crop!',
  seedCost: 20,
}
```

## Adding Farm Areas to Maps

1. Edit map file in `maps/definitions/`
2. Add `X` characters for farm plots in the grid string
3. Example: `GGGXXXGGG` creates a 3-tile farm area

## Future Enhancements

Potential additions:
- Seed purchasing system (shop integration)
- Crop selection UI (currently defaults to radish)
- Fertilizer for faster growth
- Crop quality/star ratings
- Seasonal crops
- Multi-harvest crops (e.g., tomato plants)
- Farm upgrades (sprinklers for auto-watering)
- Crop-specific sprites
