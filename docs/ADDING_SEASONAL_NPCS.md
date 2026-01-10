# Adding Seasonal NPCs - Quick Start Guide

This guide shows you how to create NPCs that move to different locations (and even different maps) based on the current season.

## Table of Contents

- [Overview](#overview)
- [Quick Example](#quick-example)
- [Step-by-Step Guide](#step-by-step-guide)
- [Common Patterns](#common-patterns)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)

## Overview

The seasonal NPC system allows NPCs to:
- **Move between positions** on the same map (e.g., shopkeeper moves from outdoor stall to indoor shop)
- **Move between different maps** (e.g., character goes inside during winter)
- **Change facing direction** when relocating
- **Automatically appear in the right place** based on the current season

NPCs with seasonal locations are tracked globally and automatically relocated when the season changes.

## Quick Example

Here's a complete example of an NPC that sits outside in spring/summer and moves indoors for autumn/winter:

```typescript
import { createStaticNPC } from '../utils/npcs/createNPC';
import { Direction, Position, NPC } from '../types';
import { npcAssets } from '../assets';

export function createOldWomanKnittingNPC(
  id: string,
  position: Position,
  name: string = 'Old Woman'
): NPC {
  return createStaticNPC({
    id,
    name,
    position, // Base position (used as fallback)
    sprite: npcAssets.old_woman_01,

    // Seasonal locations - NPC moves between these positions
    seasonalLocations: {
      spring: {
        mapId: 'village',
        position: { x: 18, y: 27 },
        direction: Direction.Down,
      },
      summer: {
        mapId: 'village',
        position: { x: 18, y: 27 },
        direction: Direction.Down,
      },
      autumn: {
        mapId: 'cottage_interior',
        position: { x: 11, y: 7 },
        direction: Direction.Down,
      },
      winter: {
        mapId: 'cottage_interior',
        position: { x: 11, y: 7 },
        direction: Direction.Down,
      },
    },

    dialogue: [
      {
        id: 'greeting',
        seasonalText: {
          spring: 'Good day! The spring flowers are lovely.',
          summer: 'Hot day, isn\'t it? I\'m still knitting though!',
          autumn: 'Getting chilly now. Time to prepare for winter.',
          winter: 'Come in from the cold! It\'s warm by the fire.',
        },
      },
    ],
  });
}
```

**Register the NPC to ONE map** (its "base map"):

```typescript
// In maps/definitions/village.ts
export const village: MapDefinition = {
  id: 'village',
  // ...
  npcs: [
    createOldWomanKnittingNPC('old_woman_knitting', { x: 18, y: 27 }),
  ],
};
```

That's it! The system handles the rest automatically.

## Step-by-Step Guide

### Step 1: Create Your NPC Factory Function

Create a function that returns an NPC with `seasonalLocations`:

```typescript
export function createMySeasonalNPC(
  id: string,
  position: Position
): NPC {
  return createStaticNPC({ // or createWanderingNPC, or createNPC
    id,
    name: 'My NPC',
    position, // Base position (fallback)
    sprite: npcAssets.my_npc,

    seasonalLocations: {
      // Define where NPC should be each season
      spring: {
        mapId: 'village',
        position: { x: 10, y: 15 },
        direction: Direction.Down, // Optional
      },
      summer: {
        mapId: 'beach',
        position: { x: 5, y: 8 },
      },
      autumn: {
        mapId: 'village',
        position: { x: 12, y: 20 },
      },
      winter: {
        mapId: 'shop',
        position: { x: 8, y: 6 },
      },
    },

    dialogue: [/* ... */],
  });
}
```

### Step 2: Register the NPC to Its Base Map

Add the NPC to **one map** (typically where it appears most often):

```typescript
// In maps/definitions/village.ts
export const village: MapDefinition = {
  id: 'village',
  // ...
  npcs: [
    createMySeasonalNPC('my_npc_id', { x: 10, y: 15 }),
  ],
};
```

**Important**: Only register the NPC to ONE map. The system will automatically move it to other maps as seasons change.

### Step 3: Ensure Target Maps Exist

Make sure all maps referenced in `seasonalLocations` are registered:

```typescript
// In maps/index.ts
export function initializeMaps(): void {
  // Register all maps
  mapManager.registerMap(village);
  mapManager.registerMap(beach);
  mapManager.registerMap(shop);
  // ... etc
}
```

If a target map doesn't have NPCs yet, add an empty `npcs` array:

```typescript
// In maps/definitions/shop.ts
export const shop: MapDefinition = {
  id: 'shop',
  // ...
  npcs: [], // Allow seasonal NPCs to be added dynamically
};
```

### Step 4: Test!

1. Run the game
2. Press **F4** to open DevTools
3. Change the season using the season selector
4. The NPC should immediately relocate to the new seasonal position
5. Travel to the target map to verify the NPC appears there

## Common Patterns

### Pattern 1: Indoor/Outdoor Seasonal Behaviour

NPC moves indoors during cold months:

```typescript
seasonalLocations: {
  spring: { mapId: 'village', position: { x: 10, y: 15 } }, // Outside
  summer: { mapId: 'village', position: { x: 10, y: 15 } }, // Outside
  autumn: { mapId: 'house_interior', position: { x: 5, y: 3 } }, // Inside
  winter: { mapId: 'house_interior', position: { x: 5, y: 3 } }, // Inside
}
```

### Pattern 2: Shopkeeper with Seasonal Stalls

Shopkeeper moves to different market locations:

```typescript
seasonalLocations: {
  spring: { mapId: 'village', position: { x: 12, y: 14 } }, // Spring market
  summer: { mapId: 'beach', position: { x: 8, y: 6 } },      // Beach stall
  autumn: { mapId: 'farm_area', position: { x: 5, y: 10 } }, // Harvest market
  winter: { mapId: 'shop', position: { x: 8, y: 6 } },       // Indoor shop
}
```

### Pattern 3: Partial Seasonal Data (Fallback to Base)

Only define seasons where NPC moves - others use base position:

```typescript
seasonalLocations: {
  winter: { mapId: 'home_interior', position: { x: 5, y: 3 } },
  // Spring, summer, autumn: Uses base position from createNPC() call
}
```

### Pattern 4: Same Map, Different Positions

NPC stays on same map but changes position:

```typescript
seasonalLocations: {
  spring: { mapId: 'village', position: { x: 8, y: 12 } },  // Flower garden
  summer: { mapId: 'village', position: { x: 20, y: 18 } }, // Vegetable patch
  autumn: { mapId: 'village', position: { x: 8, y: 12 } },  // Back to flowers
  winter: { mapId: 'village', position: { x: 6, y: 6 } },   // Tool shed
}
```

### Pattern 5: Direction Changes

Face different directions based on context:

```typescript
seasonalLocations: {
  spring: {
    mapId: 'village',
    position: { x: 10, y: 15 },
    direction: Direction.Down, // Looking at flowers
  },
  summer: {
    mapId: 'beach',
    position: { x: 8, y: 6 },
    direction: Direction.Left, // Looking at ocean
  },
}
```

## Combining with Seasonal Dialogue

Pair seasonal locations with seasonal dialogue for maximum immersion:

```typescript
return createStaticNPC({
  id: 'gardener',
  name: 'Village Gardener',
  position,
  sprite: npcAssets.gardener,

  seasonalLocations: {
    spring: { mapId: 'village', position: { x: 8, y: 12 } },
    summer: { mapId: 'village', position: { x: 20, y: 18 } },
    autumn: { mapId: 'village', position: { x: 8, y: 12 } },
    winter: { mapId: 'village', position: { x: 6, y: 6 } },
  },

  dialogue: [
    {
      id: 'greeting',
      seasonalText: {
        spring: 'I love tending the spring flowers!',
        summer: 'The vegetables are growing so well this year.',
        autumn: 'Time to prepare the beds for winter.',
        winter: 'I\'m organizing my tools for next season.',
      },
    },
  ],
});
```

## Testing

### Testing with DevTools (F4)

1. **Open the game** in your browser
2. **Press F4** to open DevTools panel
3. **Change the season** using the season dropdown
4. **Observe**: NPC should disappear from current map immediately
5. **Travel to target map**: NPC should appear in new location
6. **Check console**: Look for `[NPCManager] Moved NPC <id> to map <mapId>` log

### Testing on Game Load

1. **Set a specific season** via DevTools (F4)
2. **Refresh the browser** (F5)
3. **Check**: NPC should appear in correct seasonal location on startup

### Console Commands for Testing

```javascript
// Check current season
TimeManager.getCurrentTime().season

// Change season to Winter
TimeManager.setTimeOverride({ season: Season.WINTER })

// Change season to Spring
TimeManager.setTimeOverride({ season: Season.SPRING })

// Check which NPCs have seasonal locations
npcManager.globalNPCs

// See all NPCs on current map
npcManager.getCurrentMapNPCs()
```

## Troubleshooting

### Issue: NPC doesn't appear in target map

**Check**:
1. Is the target `mapId` correct and registered in `maps/index.ts`?
2. Does the target map have an `npcs` array (even if empty)?
3. Are the position coordinates within the map bounds?
4. Check browser console for errors

**Solution**: Verify map ID spelling and ensure map is registered before `initializeSeasonalLocations()` is called.

### Issue: NPC appears in wrong location

**Check**:
1. Are the position coordinates correct (`{ x, y }`)?
2. Is the position in a walkable area (not inside walls)?
3. Check the map grid to verify the position is valid

**Solution**: Use map validation to verify spawn points are within bounds and walkable.

### Issue: NPC duplicated on multiple maps

**Check**:
1. Did you register the NPC to multiple maps in their definitions?

**Solution**: Only register the NPC to **one** map (its base map). The system handles moving it to other maps automatically.

### Issue: Season change doesn't relocate NPC

**Check**:
1. Is `npcManager.initializeSeasonalLocations()` called in `gameInitializer.ts`?
2. Is `npcManager.checkSeasonChange()` called in the game loop (App.tsx)?
3. Are you using DevTools (F4) to change seasons (should work)?
4. Check console for `[NPCManager] Season changed` logs

**Solution**: Ensure both initialization and season checking are in place.

### Issue: NPC visible in wrong season

**Check**:
1. Are you using `visibilityConditions` along with `seasonalLocations`?
2. Seasonal locations don't hide NPCs - they move them. Use `visibilityConditions` to hide NPCs in certain seasons.

**Solution**: To hide an NPC in a season, either:
- Don't define that season in `seasonalLocations` AND use `visibilityConditions: { season: 'spring' }`
- Move them to a hidden/inaccessible map

## Advanced: Combining with Visibility Conditions

For NPCs that should only appear in certain seasons (not just move):

```typescript
return createNPC({
  id: 'migratory_bird',
  name: 'Blue Jay',
  position,
  sprite: npcAssets.blue_jay,

  // Only visible in spring/summer
  visibilityConditions: {
    season: 'spring', // Note: This will need enhancement to support multiple seasons
  },

  // Different locations in visible seasons
  seasonalLocations: {
    spring: { mapId: 'village', position: { x: 20, y: 8 } },
    summer: { mapId: 'deep_forest', position: { x: 15, y: 12 } },
    // Autumn/winter: Bird has migrated (hidden via visibilityConditions)
  },
});
```

**Note**: Current `visibilityConditions` only supports a single season. For multiple seasons, you'd need to enhance the system or use seasonal locations to move the NPC to an inaccessible map.

## Technical Details

### How It Works

1. **Registration**: When a map is registered via `mapManager.registerMap()`, its NPCs are registered with `npcManager.registerNPCs()`
2. **Global Registry**: NPCs with `seasonalLocations` are added to `npcManager.globalNPCs` Map
3. **Initialization**: On startup, `npcManager.initializeSeasonalLocations()` places all seasonal NPCs in their correct positions based on current season
4. **Season Tracking**: Game loop calls `npcManager.checkSeasonChange()` every frame
5. **Relocation**: When season changes, `updateSeasonalLocations()` removes NPCs from all maps and re-adds them to their seasonal map
6. **React Re-render**: `checkSeasonChange()` returns `true` when season changes, triggering `setNpcUpdateTrigger()` to update the display

### Performance

- Season checks are **extremely lightweight** - just a string comparison
- Relocation only runs when seasons actually change (every ~84 game days)
- No performance impact during normal gameplay

### Save Compatibility

Seasonal NPC locations are **not saved** to localStorage:
- NPCs always appear in the correct seasonal location when loading a save
- The system uses `TimeManager.getCurrentTime().season` to determine placement
- Season changes apply immediately even to saved games

## Related Documentation

- [SEASONAL_NPC_LOCATIONS.md](SEASONAL_NPC_LOCATIONS.md) - Full technical documentation
- [TIME_SYSTEM.md](TIME_SYSTEM.md) - How seasons are calculated
- [MAP_GUIDE.md](MAP_GUIDE.md) - Creating and validating maps
- [types/npc.ts](../types/npc.ts) - NPC type definitions

## Example NPCs in Codebase

See these files for working examples:

- `utils/npcs/villageNPCs.ts` - Old Woman with seasonal cottage/village movement
- `utils/npcs/createNPC.ts` - NPC factory functions with seasonal location support

---

**Questions or issues?** Check the troubleshooting section above or review the full technical documentation in [SEASONAL_NPC_LOCATIONS.md](SEASONAL_NPC_LOCATIONS.md).
