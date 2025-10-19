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

### Seed Selection (Keys 5-9)
When using the Seeds tool (key 3), press these keys to select which crop to plant:
- **5** - Radish Seeds (fast - 2 min)
- **6** - Tomato Seeds (medium - 5 min)
- **7** - Wheat Seeds (long - 10 min)
- **8** - Corn Seeds (premium - 15 min)
- **9** - Pumpkin Seeds (specialty - 20 min)

The HUD will show your currently selected seed and how many you have in inventory.

### Farm Actions (E key)
Stand on a farm tile and press `E` to perform an action with your current tool:
- **Hoe + Fallow Soil** → Tills the soil (shows tilled texture)
- **Seeds + Tilled Soil** → Plants selected seed (consumes 1 seed from inventory, shows young plant sprite)
- **Watering Can + Planted/Watered/Wilting** → Waters the crop (shows darker wet soil)
- **Hand + Ready Crop** → Harvests the crop (adds crops to inventory, awards gold, returns plot to tilled state)
- **Hand + Dead Crop** → Clears dead plant (returns plot to fallow state)

### Debug Controls
- **F5** - Reset all farm plots on current map (useful for testing)

## Farm Tile States

### State Flow
```
FALLOW (brown soil) → [hoe] → TILLED (tilled texture)
TILLED → [seeds] → PLANTED (young plant sprite)
PLANTED → [water] → WATERED (young plant on darker wet soil)
WATERED/PLANTED → [time] → READY (mature plant sprite - ready to harvest!)
READY → [harvest] → TILLED (get crops + gold, plot resets)

Without water:
PLANTED → [no water] → WILTING (young plant on dry soil) → [no water] → DEAD (dead soil, no plant)
DEAD → [clear] → FALLOW
```

### Visual States
Farm tiles now show visual sprites and colors for each state:
- **Fallow** - Brown soil texture (untilled ground)
- **Tilled** - Tilled soil texture (ready for seeds)
- **Planted** - Young plant sprite on tilled soil (seeds growing)
- **Watered** - Young plant sprite on darker wet soil (grows faster!)
- **Ready** - Mature plant sprite (bright, full-grown - harvest now!)
- **Wilting** - Young plant sprite on lighter dry soil (needs water urgently!)
- **Dead** - Dead soil with no plant (needs clearing)

**Note:** Tiles update **immediately** when you perform actions - no need to move to see changes!

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

1. **Get seeds** - Visit the seed shed in the farm area
   - From village, go to bottom-right corner (28, 28) to enter farm area
   - In farm area, enter the building (door at 10, 21)
   - Talk to seed keeper NPCs to get free seeds

2. **Find farm plots** - Look for brown soil tiles (marked with `X` in map editor)
   - Farm area has multiple plots organized in fields
   - Connected by path network for easy access

3. **Till the soil** - Switch to Hoe (key `2`) and press `E` on fallow soil

4. **Select seeds** - Switch to Seeds (key `3`), then press keys `5-9` to choose crop type
   - The HUD shows your selected seed and quantity
   - 5=Radish, 6=Tomato, 7=Wheat, 8=Corn, 9=Pumpkin

5. **Plant seeds** - Press `E` on tilled soil (consumes 1 seed from inventory)

6. **Water your crops** - Switch to Watering Can (key `4`) and press `E` on planted/wilting crops
   - Water regularly! Crops grow faster when watered
   - If you don't water, crops will wilt and eventually die

7. **Harvest** - Switch to Hand (key `1`) and press `E` on ready crops
   - Crops are automatically added to inventory
   - Gold is automatically earned
   - Plot returns to tilled state for replanting

8. **Clear dead crops** - Use Hand (key `1`) and press `E` on dead crops
   - Returns plot to fallow state

## Technical Architecture

### Single Source of Truth (SSoT)
- **FarmManager** ([utils/farmManager.ts](../utils/farmManager.ts)) - Manages all farm plot data
- All farm operations go through FarmManager
- State persisted via GameState to localStorage

### Key Implementation Details

**Farm Action Logic** ([App.tsx:196-279](../App.tsx#L196-L279)):
- Checks plot state from FarmManager, not just visual tile type
- This ensures actions work correctly even if visual and internal state differ
- Force triggers re-render after farm actions for immediate visual feedback

**Tile Rendering** ([App.tsx:728-740](../App.tsx#L728-L740)):
- Queries FarmManager for plot state
- Overrides visual tile type based on plot state
- Shows appropriate sprite/color for each farm state

**Farm Manager** ([utils/farmManager.ts](../utils/farmManager.ts)):
- Stores plots in Map with key format: `"mapId:x:y"`
- Updates plot states based on game time (not real time)
- Validates actions before allowing them (e.g., can't till already-tilled soil)

**Asset Management** ([assets.ts](../assets.ts), [constants.ts](../constants.ts)):
- Farming sprites imported from `public/assets-optimized/farming/`
- Each farm tile state has corresponding sprite in TILE_LEGEND
- Currently uses pea plant sprites as placeholders for all crops

### Files Created/Modified

**New Files:**
- `data/crops.ts` - Crop definitions (growth times, water needs, rewards)
- `utils/farmManager.ts` - Core farm logic and state management

**Modified Files:**
- `types.ts` - Added farm tile types (SOIL_FALLOW through SOIL_DEAD) and FarmPlot interface
- `constants.ts` - Added farm tile legend entries with sprites for all farm states
- `assets.ts` - Added farmingAssets with fallow soil, tilled soil, and plant sprites
- `GameState.ts` - Added farming tool selection, plot persistence, and inventory system
- `App.tsx` - Added farm action handlers (till/plant/water/harvest), plot state checking, and immediate visual updates
- `utils/mapUtils.ts` - Added override support for dynamic tile types (for farm plots)
- `utils/testUtils.ts` - Added farm system validation
- `components/HUD.tsx` - Added tool display and seed selection indicator
- `maps/gridParser.ts` - Added `X` code for farm plots
- `maps/definitions/village.ts` - Added transition to farm area
- `maps/definitions/farmArea.ts` - Added dedicated 20x26 farm area with multiple plots and seed shed
- `maps/definitions/seedShed.ts` - Added seed storage building with NPC seed keepers

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

## Troubleshooting

### Seeds not planting?
1. Make sure you've selected the Seeds tool (press '3')
2. Select a seed type (press '5' for radish seeds)
3. Check you have seeds in inventory (visible in HUD)
4. Make sure you're standing on **tilled** soil (not fallow soil)
5. The console log should show: `[Action Key] Planted <crop_type>`

### Tile not updating after action?
- This was fixed - tiles now update immediately after farm actions
- If it still doesn't work, try moving one tile to force a re-render
- Check console for error messages

### All tiles already tilled?
- Press **F5** to reset all farm plots on the current map
- This clears saved plot data and returns tiles to fallow state

### Can't till soil?
- Make sure you have the Hoe tool equipped (press '2')
- Check that the tile is in FALLOW state (not already tilled)
- If tile shows brown but won't till, it may already be tilled - check console logs

## Future Enhancements

Potential additions:
- Seed purchasing system (shop integration)
- Crop-specific sprites (currently all crops use pea plant placeholders)
- Fertilizer for faster growth
- Crop quality/star ratings
- Seasonal crops (crops that only grow in certain seasons)
- Multi-harvest crops (e.g., tomato plants that produce multiple times)
- Farm upgrades (sprinklers for auto-watering)
- Crop processing (e.g., wheat → flour → bread)
- Scarecrows to protect crops from crows
- Companion planting bonuses
