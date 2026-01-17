# Forageable Multi-Tile Sprites Guide

This guide explains how to set up multi-tile sprites (like moonpetals, brambles, trees) as forageable objects with area-based detection.

## Overview

Multi-tile sprites are decorative objects that occupy more than one tile but are placed using a single anchor tile. Making them forageable requires special handling to ensure the entire visual area is interactive, not just the center anchor.

**Key Concepts:**
- **Anchor Tile**: Single tile placed in map grid (e.g., `a` for moonpetal)
- **Visual Sprite**: Extends beyond anchor (e.g., 3x3 for moonpetals)
- **Forageable Area**: Entire visual sprite should be interactive
- **Cooldown**: Shared across entire sprite area (tracked at anchor)

## Prerequisites

Before making a multi-tile sprite forageable, ensure you have:

1. **Tile Type Defined** (`types/core.ts`)
   ```typescript
   export enum TileType {
     // ... existing types
     YOUR_FORAGEABLE = 999, // Choose unique number
   }
   ```

2. **Sprite Metadata** (`data/spriteMetadata.ts`)
   ```typescript
   {
     tileType: TileType.YOUR_FORAGEABLE,
     spriteWidth: 3,   // Width in tiles
     spriteHeight: 3,  // Height in tiles
     offsetX: -1,      // Center on anchor tile
     offsetY: -2,      // Extend upward
     image: tileAssets.your_sprite,
     // ... collision, transforms, etc.
   }
   ```

3. **Tile Legend Entry** (`data/tiles.ts`)
   ```typescript
   [TileType.YOUR_FORAGEABLE]: {
     name: 'Your Forageable',
     color: 'bg-palette-sage',
     collisionType: CollisionType.WALKABLE,
     baseType: TileType.GRASS, // Background tile type
     // Images (seasonal, time-of-day, or regular)
     image: [tileAssets.your_sprite],
     // IMPORTANT: Don't add empty image: [] array - it breaks detection!
   },
   ```

4. **Forageable Item** (`data/items.ts`)
   ```typescript
   your_item: {
     id: 'your_item',
     name: 'your_item',
     displayName: 'Your Item',
     category: ItemCategory.FORAGEABLE, // or MAGICAL_INGREDIENT
     description: 'Found by foraging your sprite.',
     rarity: ItemRarity.UNCOMMON,
     stackable: true,
     sellPrice: 15,
     image: itemAssets.your_item_image,
     forageSuccessRate: 0.8, // 80% chance when conditions met
   },
   ```

## Implementation Steps

### Step 1: Add to Interaction Detection

In `utils/actionHandlers.ts`, add your tile type to the forageable tiles list in `getAvailableInteractions()`:

```typescript
// Check for forage interactions
if (tileData) {
  let canForage = false;

  // Forest/deep forest foraging (regular tiles)
  if (currentMapId.startsWith('forest') || currentMapId === 'deep_forest') {
    const forageableTiles = [
      TileType.FERN,
      TileType.MUSHROOM,
      TileType.GRASS,
      TileType.WILD_STRAWBERRY,
      TileType.MOONPETAL,
      TileType.YOUR_FORAGEABLE, // <-- Add here
    ];
    if (forageableTiles.includes(tileData.type)) {
      canForage = true;
    }
  }

  if (canForage) {
    interactions.push({
      type: 'forage',
      label: 'Forage',
      icon: '🔍',
      color: '#059669',
      execute: () => {
        const result = handleForageAction(position, currentMapId);
        onForage?.(result);
      },
    });
  }
}
```

**Why This Matters:**
- Enables click-based foraging (radial menu shows "Forage" option)
- Without this, only F key works (direct action bypass)

### Step 2: Implement Area Detection in Foraging Handler

In `utils/actionHandlers.ts`, add area detection logic to `handleForageAction()`:

#### 2a. Update Cooldown Check (Top of Function)

```typescript
// Check cooldown FIRST (applies to all foraging types)
// For multi-tile sprites, check cooldown at anchor position
let cooldownCheckPos = { x: playerTileX, y: playerTileY };

// Check if player is near YOUR_FORAGEABLE anchor (for NxN area foraging)
const searchRadius = 1; // For 3x3, use radius 1; for 5x5, use radius 2
for (let dy = -searchRadius; dy <= searchRadius; dy++) {
  for (let dx = -searchRadius; dx <= searchRadius; dx++) {
    const checkX = playerTileX + dx;
    const checkY = playerTileY + dy;
    const checkTile = getTileData(checkX, checkY);

    if (checkTile?.type === TileType.YOUR_FORAGEABLE) {
      // Use anchor position for cooldown check (entire area shares cooldown)
      cooldownCheckPos = { x: checkX, y: checkY };
      console.log(`[Forage] Found anchor at (${checkX}, ${checkY}), player at (${playerTileX}, ${playerTileY})`);
      break;
    }
  }
  if (cooldownCheckPos.x !== playerTileX || cooldownCheckPos.y !== playerTileY) break;
}

if (gameState.isForageTileOnCooldown(currentMapId, cooldownCheckPos.x, cooldownCheckPos.y, TIMING.FORAGE_COOLDOWN_MS)) {
  console.log(`[Forage] Tile (${cooldownCheckPos.x}, ${cooldownCheckPos.y}) is on cooldown`);
  return { found: false, message: `You've already searched here. Come back tomorrow!` };
}
```

**Search Radius Calculation:**
- 3x3 sprite: radius 1 (checks 1 tile in each direction)
- 5x5 sprite: radius 2 (checks 2 tiles in each direction)
- Formula: `radius = Math.floor(spriteSize / 2)`

#### 2b. Add Foraging Logic

```typescript
// Your forageable foraging (after cooldown check, before other foraging types)
let yourForageableAnchor: { x: number; y: number } | null = null;

// Search nearby tiles for anchor (same radius as cooldown check)
const searchRadius = 1; // Adjust for sprite size
for (let dy = -searchRadius; dy <= searchRadius; dy++) {
  for (let dx = -searchRadius; dx <= searchRadius; dx++) {
    const checkX = playerTileX + dx;
    const checkY = playerTileY + dy;
    const checkTile = getTileData(checkX, checkY);

    if (checkTile?.type === TileType.YOUR_FORAGEABLE) {
      yourForageableAnchor = { x: checkX, y: checkY };
      console.log(`[Forage] Found anchor at (${checkX}, ${checkY})`);
      break;
    }
  }
  if (yourForageableAnchor) break;
}

if (yourForageableAnchor) {
  // Optional: Add seasonal/time restrictions
  const { season, timeOfDay } = TimeManager.getCurrentTime();

  // Example: Spring/summer only
  if (season !== Season.SPRING && season !== Season.SUMMER) {
    return { found: false, message: 'This plant is dormant. Try again in spring or summer.' };
  }

  // Example: Daytime only
  if (timeOfDay !== 'Day') {
    return { found: false, message: 'You can only forage this during the day.' };
  }

  // Success/failure roll
  const item = items.your_item; // Import from data/items.ts
  const successRate = item.forageSuccessRate || 0.5;
  const succeeded = Math.random() < successRate;

  if (succeeded) {
    // Random quantity (adjust probabilities as needed)
    const rand = Math.random();
    const quantity = rand < 0.6 ? 1 : rand < 0.9 ? 2 : 3; // 60% = 1, 30% = 2, 10% = 3

    // Set cooldown at anchor position (shared across entire sprite)
    gameState.setForageTileCooldown(currentMapId, yourForageableAnchor.x, yourForageableAnchor.y);

    return {
      found: true,
      message: `Found ${quantity} ${item.displayName}!`,
      item: item,
      quantity,
    };
  } else {
    // Still set cooldown on failure (prevents spam attempts)
    gameState.setForageTileCooldown(currentMapId, yourForageableAnchor.x, yourForageableAnchor.y);

    return {
      found: false,
      message: `You search carefully, but find nothing suitable for harvesting.`,
    };
  }
}
```

### Step 3: Test Your Implementation

1. **Start Dev Server**: `npm run dev` or `make dev`

2. **Navigate to Map**: Go to the map where your sprite is placed

3. **Test Scenarios**:
   - Click anywhere in the visual sprite area → Should show "Forage" option
   - Press F key while standing in sprite area → Should trigger foraging
   - Test seasonal/time restrictions (F8/F9 to cycle)
   - Test cooldown (forage twice in a row)
   - Test edge cases (standing at corners of sprite)

4. **Check Console Logs**:
   ```
   [Forage] Found anchor at (X, Y), player at (X, Y)
   [Forage] Season check: ...
   [Forage] Time check: ...
   [Forage] Success/failure: ...
   ```

5. **Verify Cooldown**:
   - Forage successfully
   - Try to forage same sprite again immediately
   - Should see: "You've already searched here. Come back tomorrow!"

## Common Pitfalls

### 1. Empty Image Array Prevents Detection

**Problem**: Tile type shows as `GRASS` (type 0) in console logs, not your custom type.

**Cause**: `image: []` in tile definition blocks tile detection.

**Solution**: Remove `image: []` line entirely. Use `seasonalImages` or `timeOfDayImages` instead.

```typescript
// ❌ WRONG - Empty array prevents detection
[TileType.YOUR_FORAGEABLE]: {
  name: 'Your Forageable',
  image: [], // <-- Remove this line!
  seasonalImages: { ... },
},

// ✅ CORRECT - No image property, uses seasonal/time images
[TileType.YOUR_FORAGEABLE]: {
  name: 'Your Forageable',
  seasonalImages: { ... },
},
```

**Exception**: Use `image: []` ONLY if you want completely invisible tiles (like winter grass with no visual).

### 2. Cache Issues (Hot Reload)

**Problem**: Changes to tile definitions or grid parser don't take effect immediately.

**Cause**: Vite's hot module replacement caches map data.

**Solution**: Hard refresh the browser:
- Windows/Linux: `Ctrl+Shift+R`
- Mac: `Cmd+Shift+R`
- Or run: `make reload` to restart dev server and clear cache

### 3. Interaction Detection Missing

**Problem**: F key works but clicking on sprite shows no "Forage" option.

**Cause**: Tile type not added to `forageableTiles` list in `getAvailableInteractions()`.

**Solution**: Add your tile type to the array (see Step 1 above).

### 4. Wrong Search Radius

**Problem**: Only center tile is forageable, or area is too large.

**Cause**: Search radius doesn't match sprite size.

**Solution**: Calculate radius correctly:
- 3x3 sprite → radius 1
- 5x5 sprite → radius 2
- 7x7 sprite → radius 3
- Formula: `Math.floor(spriteSize / 2)`

### 5. Cooldown Not Shared Across Sprite

**Problem**: Player can forage different parts of same sprite repeatedly.

**Cause**: Cooldown set at player position instead of anchor position.

**Solution**: Use anchor position for cooldown (see Step 2a):
```typescript
gameState.setForageTileCooldown(currentMapId, anchorPosition.x, anchorPosition.y);
```

### 6. Seasonal/Time Images Not Working

**Problem**: Sprite doesn't change appearance with season/time.

**Cause**: Using `image: [...]` instead of `seasonalImages` or `timeOfDayImages`.

**Solution**: Use conditional image properties:

```typescript
// For seasonal changes
seasonalImages: {
  spring: [tileAssets.your_sprite_spring],
  summer: [tileAssets.your_sprite_summer],
  autumn: [tileAssets.your_sprite_autumn],
  winter: [], // Empty = no sprite in winter
  default: [tileAssets.your_sprite_default],
},

// For time-of-day changes (per season)
timeOfDayImages: {
  spring: {
    day: [tileAssets.your_sprite_day],
    night: [tileAssets.your_sprite_night],
  },
  // ... repeat for summer, autumn, winter
},
```

## Architecture Notes

### Why Anchor-Based Detection?

Multi-tile sprites use a **single anchor tile** in the map grid, but the visual sprite extends beyond it. This creates a mismatch:

- **Map Grid**: 1 tile with your tile type (the anchor)
- **Visual Rendering**: NxN sprite covering multiple tiles
- **Player Position**: Can be anywhere in the NxN visual area

To make the entire visual area forageable, we search for anchors near the player's position.

### Cooldown Strategy

Cooldown is tracked **at the anchor position** for these reasons:

1. **Consistency**: Same cooldown regardless of where player stood
2. **No Duplication**: Prevents foraging different corners of same sprite
3. **Simplicity**: One cooldown per sprite, not per tile within sprite

### Two Input Paths

The game has two input systems for foraging:

1. **F Key (Direct)**: Calls `handleForageAction()` directly
   - Always works if foraging logic exists
   - Bypasses `getAvailableInteractions()`

2. **Mouse Click (Interactions)**: Goes through `getAvailableInteractions()` first
   - Only works if tile type is in `forageableTiles` list
   - Shows "Forage" in radial menu

**Always implement both** to ensure consistent behavior.

## Example: Moonpetal Implementation

See [MOONPETAL_FORAGING_IMPLEMENTATION.md](../MOONPETAL_FORAGING_IMPLEMENTATION.md) for a complete working example:

- 3x3 sprite with seasonal AND time-of-day images
- Spring/summer only, night-time only restrictions
- 80% success rate with random yields (1-3 flowers)
- Proper cooldown at anchor position
- Full area detection (entire 3x3 is forageable)

## Reference Files

- **Interaction Detection**: `utils/actionHandlers.ts` → `getAvailableInteractions()`
- **Foraging Logic**: `utils/actionHandlers.ts` → `handleForageAction()`
- **Tile Types**: `types/core.ts` → `TileType` enum
- **Tile Definitions**: `data/tiles.ts` → `TILE_LEGEND`
- **Sprite Metadata**: `data/spriteMetadata.ts` → `SPRITE_METADATA`
- **Items**: `data/items.ts` → Item definitions
- **Grid Parser**: `maps/gridParser.ts` → Character to TileType mapping

## Quick Checklist

Before committing your forageable multi-tile sprite:

- [ ] Tile type defined in `types/core.ts`
- [ ] Sprite metadata configured in `data/spriteMetadata.ts`
- [ ] Tile legend entry in `data/tiles.ts` (no empty `image: []`)
- [ ] Forageable item defined in `data/items.ts` with `forageSuccessRate`
- [ ] Added to `forageableTiles` in `getAvailableInteractions()`
- [ ] Area detection implemented in `handleForageAction()`
- [ ] Cooldown uses anchor position, not player position
- [ ] Search radius matches sprite size
- [ ] Tested click and F key interactions
- [ ] Tested seasonal/time restrictions (if applicable)
- [ ] Tested cooldown (forage twice in a row)
- [ ] Tested edge cases (corners, boundaries)
- [ ] Console logs show correct anchor detection
- [ ] Hard refresh clears cache (Ctrl+Shift+R)

## Future Enhancements

Potential improvements to the forageable multi-tile system:

1. **Visual Feedback**: Highlight entire sprite area on hover
2. **Exhaustion System**: Sprite visually changes when on cooldown
3. **Growth Stages**: Sprite evolves over time (seedling → mature)
4. **Dynamic Spawning**: Random forageable spawns in valid locations
5. **Quality System**: Better items from more mature/rare sprites
6. **Tool Requirements**: Require specific tools for certain forageables

## Questions?

If you encounter issues:

1. Check console logs for tile type detection
2. Verify search radius matches sprite size
3. Hard refresh browser to clear cache
4. Compare with moonpetal implementation
5. Check `TILE_LEGEND` for empty `image: []` arrays
6. Ensure cooldown uses anchor position, not player position
