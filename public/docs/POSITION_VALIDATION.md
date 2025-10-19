# Position Validation System

## Overview

The position validation system prevents entities (players, NPCs) from spawning inside walls. It runs automatically on game startup and reports any issues in the browser console.

## How It Works

### Core Utility: `positionValidator.ts`

Located in `/utils/positionValidator.ts`, this utility provides:

1. **`isPositionValid(position, entitySize)`**
   - Checks if a position would collide with solid tiles
   - Uses the same collision logic as player movement
   - Returns `true` if position is safe, `false` if inside a wall

2. **`validatePositions(positions, entitySize)`**
   - Tests multiple positions at once
   - Returns separate lists of valid and invalid positions
   - Useful for batch checking spawn points and NPCs

3. **`findNearestValidPosition(target, searchRadius, entitySize)`**
   - Finds the closest safe position to a target
   - Searches in a spiral pattern outward
   - Returns `null` if no valid position found within radius

### Automatic Validation

The game runs position validation on startup (in `runSelfTests()`):

- **Map spawn points**: Validates each map's default spawn location
- **Transition targets**: Checks all door/exit spawn positions
- **NPC positions**: Verifies NPCs aren't placed inside walls

Any invalid positions are logged to console with ⚠️ warnings.

## Using the Validation System

### When Creating New Maps

After adding a new map, check the browser console on game startup:

```
[Self-Test] ⚠️ Map "mymap" spawn point (5, 10) is inside a wall!
[Self-Test] ⚠️ NPCs inside walls in "mymap": ["NPC Guard (3, 4)"]
```

### Manual Testing

You can test positions programmatically:

```typescript
import { isPositionValid, findNearestValidPosition } from './utils/positionValidator';

// Check if position is safe
const safe = isPositionValid({ x: 10, y: 15 });

// Find nearest safe spot
const safePos = findNearestValidPosition({ x: 10, y: 15 }, 3);
```

### Emergency Reset (R key)

Players can press **R** to teleport to the map's spawn point if they get stuck.

## NPC Placeholder Sprites

Until your daughter draws NPC artwork, the game uses simple SVG placeholders:

- `/assets/npcs/elder.svg` - Village elder with beard and staff
- `/assets/npcs/shopkeeper.svg` - Shopkeeper with apron
- `/assets/npcs/child.svg` - Small child character

These are easy to replace with PNG files from your daughter's art.

## Tips for Valid Positions

1. **Use path tiles (P)**: Paths are always walkable
2. **Use grass (G) on main walkways**: Safe open areas
3. **Avoid building tiles (B, O, N, V)**: These are solid
4. **Test with R key**: If spawn feels wrong, press R to check if it's valid

## Console Warnings to Watch For

```
⚠️ Map "village" spawn point is inside a wall!
⚠️ Invalid transition spawn points in "house1": ["To Village (6, 6)"]
⚠️ NPCs inside walls in "village": ["Village Elder (12, 10)"]
```

These indicate positions that need to be adjusted in the map definition files.
