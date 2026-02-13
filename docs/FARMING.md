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

### Click-Based Farming

The easiest way to farm is by **clicking directly on farm tiles**. A radial menu appears with available actions:

- **Click on fallow soil** → Choose "Till" to prepare the ground
- **Click on tilled soil** → Choose "Plant" then select your seed type
- **Click on growing crops** → Choose "Water" to speed up growth
- **Click on ready crops** → Choose "Harvest" to collect your produce
- **Click on dead crops** → Choose "Clear" to reset the plot

The radial menu shows all available actions with icons - just click the one you want!

### Keyboard Shortcuts (Optional)

For keyboard players, you can also use these shortcuts:

**Tool Selection (Keys 1-4):**
- **1** - Hand (harvest ready crops, clear dead crops)
- **2** - Hoe (till fallow soil)
- **3** - Seeds (plant crops in tilled soil)
- **4** - Watering Can (water plants)

**Seed Selection (Keys 5-9):**
When using the Seeds tool (key 3), press these keys to select which crop to plant:
- **5** - Radish Seeds (fast - 2 min)
- **6** - Tomato Seeds (medium - 5 min)
- **7** - Salad Seeds (long - 10 min)
- **8** - Corn Seeds (premium - 15 min)
- **9** - Pumpkin Seeds (specialty - 20 min)

**Using Tools:**
Stand on a farm tile and press `E` to perform an action with your current tool.

### Debug Controls
- **F4** - Open DevTools panel with farming controls:
  - View plot statistics (total, growing, ready)
  - Advance growth time (+1 min, +5 min, +1 hour buttons)
  - Reset all plots on current map
- **F6** - Quick advance farm time by 1 minute (keyboard shortcut)

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

### Salad Greens (Long - 10 minutes)
- Growth time: 10 minutes (7 min if watered)
- Needs water every: 3 minutes
- Yield: 5 salad greens
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

## Shared Farming & Personal Garden

Farm plots work differently depending on which map you're on:

### Shared Farms (Village & Farm Area)

Farm plots in the **Village** and **Farm Area** are **shared between all players**. When you're signed in:

- **Plant a crop** in the village and other players see it grow in real time
- **Water someone else's crop** — everyone can tend any plot
- **Harvests are shared** — anyone can pick a ready crop
- A small name badge shows who planted each crop

Shared farm plots are stored in the cloud, not in your personal save. This means they persist even if you clear your browser — but they also aren't included in your personal save slots.

**Without an account:** Shared maps still work as normal local farms. Your changes just won't be visible to other players.

### Personal Garden

The **Personal Garden** is your own private farming space. Find it via the path on the east side of the village.

- **Only you** can see and tend your plots here
- Saved in your personal cloud save (if signed in)
- Perfect for growing crops without anyone else harvesting them!

## How to Farm

1. **Get seeds** - Visit the Seed Shed in the farm area
   - From the village, look for the path leading to the farm area
   - Enter the Seed Shed building
   - Talk to the seed bag NPCs to collect free seeds

2. **Find farm plots** - Look for brown soil tiles in the farm area, village, or personal garden
   - Multiple plots are organised in fields
   - Connected by paths for easy access

3. **Till the soil** - Click on brown (fallow) soil and choose **"Till"** from the menu

4. **Plant seeds** - Click on tilled soil and choose **"Plant"**
   - A menu appears showing all your available seed types
   - Click the seed you want to plant

5. **Water your crops** - Click on growing plants and choose **"Water"**
   - Water regularly! Crops grow faster when watered
   - If you don't water, crops will wilt and eventually die
   - **Rain helps!** When it rains or storms, all outdoor crops are watered automatically

6. **Harvest** - Click on ready crops (they look mature!) and choose **"Harvest"**
   - Crops are automatically added to your inventory
   - Gold is automatically earned
   - Plot returns to tilled state for replanting

7. **Clear dead crops** - Click on dead plants and choose **"Clear"**
   - Returns plot to fallow state so you can start again

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

## Recent Improvements

- ✅ **Shared farming** - Village and Farm Area plots are now shared between all signed-in players in real time
- ✅ **Personal Garden** - A new private farming map accessible from the village's east side
- ✅ **Automatic rain watering** - When it rains or storms, all outdoor crops are watered automatically (indoor crops like those in greenhouses are not affected)
- ✅ **Multi-tile crop rendering** - Crops now grow visually from small seedlings (1x1) to young plants (1.5x2) to large adult plants (2x2.5)
- ✅ **Crop-specific sprites** - Tomato, sunflower, strawberry, and pea have unique young/adult sprites
- ✅ **Fertiliser support** - Apply fertiliser to improve crop quality (normal → good → excellent)
- ✅ **Quality system** - Crop quality affects sell price (1x/1.5x/2x multipliers)
- ✅ **Seasonal planting** - Crops can only be planted in specific seasons
- ✅ **F4 DevTools integration** - Full farming debug controls in the DevTools panel

## Future Enhancements

Potential additions:
- Multi-harvest crops (e.g., tomato plants that produce multiple times)
- Farm upgrades (sprinklers for auto-watering)
- Crop processing (e.g., grain → flour → bread)
- Scarecrows to protect crops from crows
- Companion planting bonuses
- More crop-specific sprites (salad, corn, pumpkin, etc.)
- Planted-by name badges visible on shared farm plots
