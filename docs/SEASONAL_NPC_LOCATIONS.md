# Seasonal NPC Locations

This document explains how to create NPCs that move to different locations and maps based on the current season.

## Overview

The seasonal NPC location system allows NPCs to:
- **Change positions** within the same map between seasons
- **Move between different maps** as seasons change
- **Change facing direction** when relocating
- **Fallback to base location** when no seasonal data is defined

This creates a more dynamic, living game world where NPCs have seasonal routines and behaviours.

## How It Works

### Type Definition

NPCs can have an optional `seasonalLocations` property that defines where they should be in each season:

```typescript
interface SeasonalLocation {
  spring?: { mapId: string; position: Position; direction?: Direction };
  summer?: { mapId: string; position: Position; direction?: Direction };
  autumn?: { mapId: string; position: Position; direction?: Direction };
  winter?: { mapId: string; position: Position; direction?: Direction };
}
```

### System Behaviour

1. **Registration**: When an NPC with `seasonalLocations` is registered to a map, it's added to a global NPC registry
2. **Initialization**: On game startup, `npcManager.initializeSeasonalLocations()` places all NPCs in their correct seasonal positions
3. **Season Changes**: The game loop checks for season changes every frame via `npcManager.checkSeasonChange()`
4. **Relocation**: When a season changes, NPCs are automatically removed from their current map and added to their new seasonal map

### Fallback Behaviour

If a season is not defined in `seasonalLocations`:
- The NPC uses its **base position** (position when first created)
- The NPC appears on its **base map** (map where it was registered)
- The NPC uses its **base direction** (direction when first created)

This means you only need to define the seasons where the NPC moves - other seasons use defaults.

## Creating NPCs with Seasonal Locations

### Using the NPC Factory

The easiest way is to use the `createNPC()` factory with the `seasonalLocations` parameter:

```typescript
import { createNPC } from './utils/npcs/createNPC';
import { Direction } from './types';

export function createTravellerNPC(id: string, position: Position): NPC {
  return createNPC({
    id,
    name: 'Wandering Traveller',
    position,  // Base position (used for unlisted seasons)
    direction: Direction.Down,
    sprite: npcAssets.traveller,
    dialogue: [...],
    behavior: NPCBehavior.WANDER,

    // Define seasonal locations
    seasonalLocations: {
      spring: {
        mapId: 'village',
        position: { x: 10, y: 15 },
        direction: Direction.Right,
      },
      summer: {
        mapId: 'magical_lake',
        position: { x: 14, y: 20 },
        direction: Direction.Down,
      },
      winter: {
        mapId: 'home_interior',
        position: { x: 5, y: 3 },
        direction: Direction.Left,
      },
      // Autumn not defined - uses base position/map
    },
  });
}
```

### Registering to a Map

When you register an NPC with seasonal locations, register it to its **most common map** or **base map**:

```typescript
// In maps/definitions/village.ts
export const village: MapDefinition = {
  id: 'village',
  // ...
  npcs: [
    createTravellerNPC('traveller', { x: 10, y: 15 }),
  ],
};
```

The NPC will automatically move between maps as seasons change, so the initial map is just the "home base".

## Examples

### Example 1: Seasonal Market Vendor

A shopkeeper who moves between different market locations throughout the year:

```typescript
export function createMarketVendorNPC(id: string, position: Position): NPC {
  return createNPC({
    id,
    name: 'Market Vendor',
    position,
    sprite: npcAssets.vendor,
    dialogue: [
      {
        id: 'greeting',
        text: 'Welcome to my stall!',
        seasonalText: {
          spring: "Fresh spring vegetables, just picked!",
          summer: "Cool summer fruits, perfect for the heat!",
          autumn: "Harvest bounty - best prices of the year!",
          winter: "Warm soups and preserves to get you through winter!",
        },
      },
    ],
    seasonalLocations: {
      spring: {
        mapId: 'village',
        position: { x: 12, y: 14 },  // Village square
      },
      summer: {
        mapId: 'village',
        position: { x: 18, y: 20 },  // Near the lake
      },
      autumn: {
        mapId: 'farm_area',
        position: { x: 5, y: 10 },  // Farm harvest area
      },
      winter: {
        mapId: 'shop',
        position: { x: 8, y: 6 },   // Indoor shop
      },
    },
  });
}
```

### Example 2: Seasonal Wildlife

An animal NPC that migrates between different areas:

```typescript
export function createMigratoryBirdNPC(id: string, position: Position): NPC {
  return createNPC({
    id,
    name: 'Blue Jay',
    position,
    sprite: npcAssets.blue_jay,
    dialogue: [{ id: 'chirp', text: '*chirp chirp*' }],
    behavior: NPCBehavior.WANDER,
    visibilityConditions: {
      // Only visible in spring and summer (migrates away in autumn/winter)
      season: 'spring',  // Will also need summer visibility
    },
    seasonalLocations: {
      spring: {
        mapId: 'village',
        position: { x: 20, y: 8 },  // Cherry tree
      },
      summer: {
        mapId: 'deep_forest',
        position: { x: 15, y: 12 },  // Deep forest
      },
      // Autumn and winter: bird has migrated (hidden via visibilityConditions)
    },
  });
}
```

### Example 3: NPC with Weekly Routine

An NPC who works in different locations but only moves position within the same map:

```typescript
export function createGardenerNPC(id: string, position: Position): NPC {
  return createNPC({
    id,
    name: 'Village Gardener',
    position,
    sprite: npcAssets.gardener,
    dialogue: [...],
    seasonalLocations: {
      spring: {
        mapId: 'village',
        position: { x: 8, y: 12 },   // Flower beds
        direction: Direction.Down,
      },
      summer: {
        mapId: 'village',
        position: { x: 20, y: 18 },  // Vegetable garden
        direction: Direction.Right,
      },
      autumn: {
        mapId: 'village',
        position: { x: 8, y: 12 },   // Back to flower beds
        direction: Direction.Down,
      },
      winter: {
        mapId: 'village',
        position: { x: 6, y: 6 },    // Tool shed
        direction: Direction.Left,
      },
    },
  });
}
```

## Best Practices

### 1. Use Meaningful Locations

Choose seasonal positions that make narrative sense:
- **Spring**: Gardens, flower fields, renewal locations
- **Summer**: Lakes, beaches, outdoor gathering spots
- **Autumn**: Harvest areas, markets, preparation zones
- **Winter**: Indoor locations, warm gathering places

### 2. Combine with Seasonal Dialogue

Pair seasonal locations with seasonal dialogue for maximum immersion:

```typescript
dialogue: [
  {
    id: 'greeting',
    seasonalText: {
      spring: "I love tending the spring flowers!",
      summer: "The vegetables are growing so well this year.",
      autumn: "Time to prepare the beds for winter.",
      winter: "I'm organizing my tools for next season.",
    },
  },
],
```

### 3. Consider Visibility Conditions

For NPCs that should only appear in certain seasons, combine `seasonalLocations` with `visibilityConditions`:

```typescript
visibilityConditions: {
  season: 'spring',  // Only visible in spring
},
seasonalLocations: {
  spring: {
    mapId: 'cherry_grove',
    position: { x: 10, y: 12 },
  },
  // Other seasons not defined - NPC is hidden
},
```

### 4. Use Direction Wisely

Set facing direction to make the NPC appear engaged with their environment:

```typescript
seasonalLocations: {
  spring: {
    mapId: 'village',
    position: { x: 8, y: 12 },
    direction: Direction.Down,  // Looking at flowers
  },
  summer: {
    mapId: 'village',
    position: { x: 15, y: 20 },
    direction: Direction.Left,  // Looking at lake
  },
},
```

### 5. Test Season Transitions

Use the dev console to test your seasonal locations:

```javascript
// Change season to test NPC movement
TimeManager.setTimeOverride({ season: Season.WINTER });

// Check NPC locations
npcManager.getCurrentMapNPCs();

// Switch to another season
TimeManager.setTimeOverride({ season: Season.SPRING });
```

## Technical Details

### Global NPC Registry

NPCs with `seasonalLocations` are added to a global registry (`npcManager.globalNPCs`). This allows the NPCManager to track and relocate them when seasons change, even if they're moving between maps.

### Season Change Detection

The game loop calls `npcManager.checkSeasonChange()` every frame. This method:
1. Checks if the current season differs from the last known season
2. If changed, calls `updateSeasonalLocations()`
3. Removes NPCs from all maps
4. Re-adds them to their seasonal map with updated position/direction
5. Returns `true` to trigger a React re-render (updates NPC display)

### Performance

Season checks are extremely lightweight - just a string comparison. The relocation logic only runs when seasons actually change (every 84 game days, or ~1 week real-time).

### Save Compatibility

Seasonal NPC locations are **not saved** to localStorage. The system uses the current season from `TimeManager` to determine where NPCs should be. This means:
- NPCs always appear in the correct seasonal location when loading a save
- No need to save/restore NPC positions separately
- Season changes apply immediately even to saved games

## Debugging

### Console Commands

```javascript
// Check current season
TimeManager.getCurrentTime().season

// Force season change
TimeManager.setTimeOverride({ season: Season.AUTUMN });

// Check which NPCs have seasonal locations
npcManager.globalNPCs

// See all NPCs on current map
npcManager.getCurrentMapNPCs()

// Check NPC state
npcManager.npcStates.get('npc_id')
```

### Common Issues

**Issue**: NPC doesn't move when season changes
- **Check**: Is `seasonalLocations` defined for that season?
- **Check**: Is `npcManager.initializeSeasonalLocations()` called in `gameInitializer.ts`?
- **Check**: Is `npcManager.checkSeasonChange()` called in the game loop?

**Issue**: NPC appears in wrong location
- **Check**: Is the `mapId` correct and registered?
- **Check**: Are position coordinates within map bounds?
- **Check**: Browser console for NPCManager warnings

**Issue**: NPC duplicated on multiple maps
- **Check**: Only register the NPC to **one** map (its base map)
- **Check**: The system will handle moving it to other maps automatically

## Related Systems

- **Time System** ([TIME_SYSTEM.md](TIME_SYSTEM.md)) - How seasons are calculated
- **NPC System** ([types/npc.ts](../types/npc.ts)) - Full NPC type definitions
- **Visibility Conditions** ([types/animation.ts](../types/animation.ts)) - Conditional NPC visibility

## Future Enhancements

Potential additions to the seasonal NPC system:
- **Time-of-day locations**: NPCs move during the day (morning/afternoon/evening)
- **Weather-based locations**: NPCs seek shelter when it rains
- **Event-based locations**: NPCs move for festivals or special occasions
- **Pathfinding between locations**: Smooth transitions instead of instant teleportation
