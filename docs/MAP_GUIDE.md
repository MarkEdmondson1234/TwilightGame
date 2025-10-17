# Map Creation Guide

This guide explains how to create new maps for the game using our simple grid system.

## Grid Character Codes

Maps are created using single-character codes. Just draw your map with these characters!

### Outdoor Tiles
- `G` = Grass (walkable)
- `R` = Rock (blocks movement)
- `W` = Water (blocks movement)
- `P` = Path (walkable)

### Indoor Tiles
- `F` = Floor (walkable)
- `#` = Wall (blocks movement)
- `C` = Carpet (walkable)

### Doors/Transitions
- `D` = Door (transition tile)
- `E` = Exit Door (transition tile)
- `S` = Shop Door (transition tile)
- `M` = Mine Entrance (transition tile)

### Furniture
- `T` = Table (blocks movement)
- `H` = Chair (walkable)
- `I` = Mirror (walkable, opens character customization)

### Buildings (Outdoor Structures)
- `B` = Building Wall (blocks movement)
- `O` = Building Roof (blocks movement)
- `N` = Building Door/eNtrance (walkable)
- `V` = Building Window (blocks movement)

Use these to create buildings in outdoor areas! Example 2x2 house:
```
OOOO
OBVB
OBVB
OBNB
```

## Creating a New Map

1. **Create a new file** in `maps/definitions/` (e.g., `myMap.ts`)

2. **Draw your map** using the grid codes:

```typescript
import { MapDefinition, TileType } from '../../types';
import { parseGrid } from '../gridParser';

const gridString = `
########
#FFFFE##
#FFFFH##
#FFTFF##
###D####
`;

export const myMap: MapDefinition = {
  id: 'my_map',           // Unique ID
  name: 'My Cool Map',     // Display name
  width: 8,                // Width in tiles
  height: 5,               // Height in tiles
  grid: parseGrid(gridString),
  colorScheme: 'indoor',   // Color theme (see below)
  isRandom: false,         // false = designed, true = procedural
  spawnPoint: { x: 4, y: 3 },  // Where player spawns
  transitions: [
    {
      fromPosition: { x: 3, y: 4 },  // Door location
      tileType: TileType.DOOR,
      toMapId: 'village',             // Where it goes
      toPosition: { x: 10, y: 10 },  // Spawn point in target map
      label: 'To Village',
    },
  ],
};
```

3. **Register your map** in `maps/index.ts`:

```typescript
import { myMap } from './definitions/myMap';

// In the initializeMaps function:
mapManager.registerMap(myMap);
```

## Color Schemes

Choose a color scheme that matches your map's theme:

- `indoor` - Warm browns, tans, burgundy (houses, buildings)
- `village` - Natural greens, beige, sage (outdoor village)
- `forest` - Greens, mossy colors, earthy tones (forest areas)
- `cave` - Grays, charcoal, dark colors (caves, mines)
- `water_area` - Blues, teals, periwinkle (lakeside, rivers)
- `shop` - Bright colors, gold, cream (shops, special buildings)

## Adding Transitions

Transitions allow players to move between maps. You can link to:

1. **Specific maps** - Use the map ID (e.g., `'village'`, `'home_interior'`)
2. **Random maps** - Use special IDs:
   - `'RANDOM_FOREST'` - Generates a random forest
   - `'RANDOM_CAVE'` - Generates a random cave
   - `'RANDOM_SHOP'` - Generates a random shop

## Tips for Child-Friendly Map Making

1. **Keep it visual** - The grid codes create a picture of your map in the code
2. **Use spacing** - Line up your characters to make the map easy to see
3. **Start small** - Try a 10x10 map first
4. **Test in-game** - Walk around and make sure transitions work
5. **Draw it first** - Sketch your map on graph paper before coding

## Example: A Simple House

```
##########
#FFFFFE###   E = Exit to outside
#FCCCFF###   C = Carpet area
#FCHTFF###   T = Table, H = Chair
#FCCCFF###
#FFFFFFFF#
#FFFFFFFF#
###D######   D = Front door
```

This creates a cozy house with:
- Carpeted area in the center
- Table with chair
- Back exit to go outside
- Front door entrance

## Next Steps

Once you've created your map, test it by:
1. Setting it as the starting map in App.tsx
2. Walking around to check collisions
3. Testing all transitions
4. Adjusting spawn points if needed
