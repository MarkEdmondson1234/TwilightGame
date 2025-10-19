# Color System Documentation

## Overview

The game uses a four-layer color system for tiles that allows base colors, map-specific themes, optional seasonal variations, and day/night lighting. All colors use the custom palette defined in `palette.ts` which can be modified at runtime.

## Design Principles

**Single Source of Truth**: All tile colors flow through `utils/mapUtils.ts` which applies colors in priority order.

**Layer Priority** (lowest to highest):
1. **Base colors** in `constants.ts` - Default colors for each tile type
2. **Map color schemes** in `maps/colorSchemes.ts` - Theme-specific overrides per map
3. **Seasonal modifiers** (optional) - Subtle seasonal color shifts
4. **Time-of-day modifiers** (optional) - Day/night lighting variations

## Custom Color Palette

All colors use `bg-palette-*` classes defined in `palette.ts`. The palette is applied dynamically at runtime via CSS injection, allowing colors to be tweaked easily or even modified in-game.

**To modify colors:** Edit the hex values in `palette.ts` and call `applyPaletteToDOM()` to update the game.

**Available palette colors:**

### Neutral Colors
- `bg-palette-tan` - #D4A574 (light brown)
- `bg-palette-beige` - #E8D5B7 (pale tan)
- `bg-palette-cream` - #F5E6D3 (very light tan)
- `bg-palette-khaki` - #C3B091 (greenish tan)
- `bg-palette-taupe` - #8B7355 (gray-brown)

### Earth Tones
- `bg-palette-brown` - #6F4E37 (dark brown)
- `bg-palette-chocolate` - #4A3728 (very dark brown)
- `bg-palette-rust` - #B7410E (reddish brown)
- `bg-palette-sienna` - #A0522D (orange-brown)

### Greens
- `bg-palette-sage` - #87AE73 (muted green)
- `bg-palette-olive` - #6B8E23 (yellow-green)
- `bg-palette-moss` - #5A7247 (dark green)

### Blues/Purples
- `bg-palette-sky` - #7EC8E3 (light blue)
- `bg-palette-teal` - #4A7C7E (blue-green)
- `bg-palette-periwinkle` - #9BB7D4 (light purple-blue)
- `bg-palette-lavender` - #B19CD9 (light purple)
- `bg-palette-iris` - #5A4FCF (deep purple)
- `bg-palette-violet` - #8B5CF6 (bright purple)

### Grays
- `bg-palette-gray` - #8B8680 (medium gray)
- `bg-palette-slate` - #6B7280 (blue-gray)
- `bg-palette-charcoal` - #36454F (dark gray)
- `bg-palette-black` - #1A1A1A (near black)

### Accent Colors
- `bg-palette-burgundy` - #800020 (deep red)
- `bg-palette-maroon` - #5C0A0A (dark red)
- `bg-palette-magenta` - #C71585 (bright pink)
- `bg-palette-gold` - #D4AF37 (metallic gold)
- `bg-palette-mustard` - #E1AD01 (yellow-brown)

## Layer 1: Base Tile Colors

Base colors are defined in `constants.ts` in the `TILE_LEGEND` array. These provide sensible defaults that work without a color scheme.

### Example Base Colors

```typescript
{
  name: 'Grass',
  color: 'bg-palette-sage',  // Default grass color
  isSolid: false,
  image: [tileAssets.grass_1, tileAssets.grass_2]
}, // GRASS

{
  name: 'Water',
  color: 'bg-palette-sky',  // Default water color
  isSolid: true,
  image: []
}, // WATER
```

### When to Update Base Colors

- **Rarely** - These are fallback colors used when no map color scheme is active
- Only change if the default appearance needs adjustment across all maps
- Use palette colors that make sense for the tile type

## Layer 2: Map Color Schemes

Map color schemes override base colors to create themed environments. Defined in `maps/colorSchemes.ts`.

### Color Scheme Structure

```typescript
export const COLOR_SCHEMES: Record<string, ColorScheme> = {
  village: {
    name: 'village',
    colors: {
      grass: 'bg-palette-sage',       // Outdoor grass
      rock: 'bg-palette-gray',         // Rocks (usually matches grass)
      water: 'bg-palette-sky',         // Water tiles
      path: 'bg-palette-beige',        // Path background (for stepping stones)
      floor: 'bg-palette-tan',         // Indoor floor
      wall: 'bg-palette-brown',        // Indoor walls
      carpet: 'bg-palette-olive',      // Indoor carpet
      door: 'bg-palette-rust',         // Door tiles
      special: 'bg-palette-iris',      // Special tiles (exits, mine entrances)
      furniture: 'bg-palette-khaki',   // Tables, chairs
      mushroom: 'bg-palette-sage',     // Decorative mushrooms
      background: 'bg-palette-moss',   // Map background (unused currently)
    },
  },
};
```

### Existing Color Schemes

#### indoor
Warm interior tones - tan floors, brown walls, burgundy carpet

#### village
Natural outdoor tones - sage grass, sky blue water, beige paths

#### forest
Dark woodland tones - moss green, teal water, olive floors

#### cave
Cold underground tones - charcoal walls, gray floors, violet accents

#### water_area
Aquatic tones - sky blue water, sage grass, periwinkle floors

#### shop
Rich merchant tones - cream floors, rust walls, magenta accents

### Creating a New Color Scheme

1. Add a new entry to `COLOR_SCHEMES` in `maps/colorSchemes.ts`
2. Define all 12 color properties using palette colors
3. Reference the scheme name in your map definition

```typescript
myCustomScheme: {
  name: 'myCustomScheme',
  colors: {
    grass: 'bg-palette-olive',        // Pick colors that fit your theme
    rock: 'bg-palette-olive',         // Usually matches grass
    water: 'bg-palette-teal',
    path: 'bg-palette-khaki',
    floor: 'bg-palette-cream',
    wall: 'bg-palette-sienna',
    carpet: 'bg-palette-burgundy',
    door: 'bg-palette-chocolate',
    special: 'bg-palette-magenta',
    furniture: 'bg-palette-rust',
    mushroom: 'bg-palette-olive',     // Usually matches grass
    background: 'bg-palette-charcoal',
  },
},
```

### Applying a Color Scheme to a Map

In your map definition (e.g., `maps/definitions/myMap.ts`):

```typescript
export const myMap: MapDefinition = {
  id: 'my_map',
  name: 'My Custom Map',
  width: 20,
  height: 15,
  grid: parseGrid(gridString),
  colorScheme: 'myCustomScheme',  // Reference scheme by name
  spawnPoint: { x: 10, y: 7 },
  transitions: [],
  isRandom: false,
};
```

## Layer 3: Seasonal Modifiers (Optional)

Seasonal modifiers allow subtle color shifts based on the current season from `TimeManager`. These are **completely optional** - only add them if your map needs seasonal variation.

### Adding Seasonal Modifiers

In `maps/colorSchemes.ts`, add a `seasonalModifiers` property:

```typescript
village: {
  name: 'village',
  colors: {
    grass: 'bg-palette-sage',
    // ... other colors
  },
  // Optional seasonal modifiers - only override colors that change
  seasonalModifiers: {
    spring: {
      grass: 'bg-palette-sage',  // Bright spring green (default)
    },
    summer: {
      grass: 'bg-palette-olive',  // Warmer summer grass
    },
    autumn: {
      grass: 'bg-palette-khaki',  // Golden autumn grass
    },
    winter: {
      grass: 'bg-palette-slate',      // Cool winter grass
      water: 'bg-palette-periwinkle',  // Frozen water tint
    },
  },
},
```

### Seasonal Modifier Rules

- ✅ **Only override colors that change** - No need to repeat all 12 colors
- ✅ **Keep it subtle** - Use similar palette colors for smooth transitions
- ✅ **Test all seasons** - The game uses real-world time for seasons (see `TIME_SYSTEM.md`)
- ❌ **Don't overuse** - Not every map needs seasonal colors
- ❌ **Indoor maps typically don't need seasons** - Interiors stay the same year-round

### Season Keys

- `spring` - Days 1-7 of each year
- `summer` - Days 8-14 of each year
- `autumn` - Days 15-21 of each year
- `winter` - Days 22-28 of each year

See `docs/TIME_SYSTEM.md` for details on the time system.

## Layer 4: Time-of-Day Modifiers (Optional)

Time-of-day modifiers allow lighting variations between day and night based on the current hour from `TimeManager`. These are **completely optional** - only add them for maps that need day/night ambiance.

### Adding Time-of-Day Modifiers

In `maps/colorSchemes.ts`, add a `timeOfDayModifiers` property:

```typescript
village: {
  name: 'village',
  colors: {
    grass: 'bg-palette-sage',
    water: 'bg-palette-sky',
    // ... other colors
  },
  // Optional time-of-day modifiers - darker colors at night
  timeOfDayModifiers: {
    night: {
      grass: 'bg-palette-moss',      // Darker grass at night
      water: 'bg-palette-teal',      // Darker water at night
      path: 'bg-palette-taupe',      // Darker path at night
      floor: 'bg-palette-khaki',     // Darker floor at night
      wall: 'bg-palette-chocolate',  // Darker wall at night
    },
    // Day modifier is optional - if omitted, uses base colors
  },
},
```

### Time-of-Day Modifier Rules

- ✅ **Usually only define `night`** - Day colors typically use the base scheme
- ✅ **Darken colors at night** - Choose darker palette variants for realistic lighting
- ✅ **Keep it atmospheric** - Night should feel different but still playable
- ✅ **Works with seasons** - Time-of-day modifiers are applied after seasonal modifiers
- ❌ **Don't make night too dark** - Player must still see tiles and sprites clearly
- ❌ **Indoor maps might not need day/night** - Consider if lighting makes sense

### Time-of-Day Keys

- `day` - Even hours (0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22)
- `night` - Odd hours (1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23)

The game alternates between day and night every hour. Each in-game hour lasts approximately **1.07 real-world hours** (25.7 real hours per game day ÷ 24 hours).

See `docs/TIME_SYSTEM.md` for details on the time system.

### Interaction with Seasons

Time-of-day modifiers are **applied after** seasonal modifiers. This means:

1. Base color is determined
2. Map color scheme overrides it
3. Seasonal modifier overrides that
4. Time-of-day modifier overrides the seasonal color

**Example flow:**
```
Base: bg-palette-sage (grass)
→ Map: bg-palette-sage (village grass)
→ Season: bg-palette-khaki (autumn grass)
→ Time: bg-palette-taupe (autumn grass at night)
```

This allows night lighting to darken seasonal colors appropriately!

## How Colors are Applied

The color application logic lives in `utils/mapUtils.ts` in the `getTileData()` function:

### Application Flow

1. **Get base color** from `TILE_LEGEND[tileType].color`
2. **Get current map's color scheme** from `MapManager`
3. **Map tile type to color property** (e.g., GRASS → `colors.grass`)
4. **Check for seasonal modifier** if defined
5. **Check for time-of-day modifier** if defined (applied after seasonal)
6. **Return final color** to be applied to the tile

### Example Application

```typescript
// Base color from constants.ts
color = 'bg-palette-sage'  // Grass base color

// Map color scheme (village)
schemeColor = colorScheme.colors.grass  // 'bg-palette-sage'

// Seasonal modifier (autumn in village)
if (seasonalModifiers?.autumn?.grass) {
  schemeColor = 'bg-palette-khaki'  // Golden autumn override
}

// Time-of-day modifier (night in village)
if (timeOfDayModifiers?.night?.grass) {
  schemeColor = 'bg-palette-taupe'  // Darker at night
}

// Final color applied to tile
return { ...tileData, color: 'bg-palette-taupe' }
```

## Common Tile Type → Color Mappings

These mappings are defined in `utils/mapUtils.ts`:

| Tile Type | Color Property | Notes |
|-----------|---------------|-------|
| GRASS | `grass` | Standard ground color |
| ROCK | `grass` | Matches grass for blending |
| WATER | `water` | Ponds, rivers |
| PATH | `grass` | Background for stepping stones |
| FLOOR | `floor` | Indoor flooring |
| WALL | `wall` | Indoor walls |
| CARPET | `carpet` | Indoor carpet |
| DOOR | `door` | Standard doors |
| EXIT_DOOR | `door` | Exit doors |
| SHOP_DOOR | `special` | Shop entrances |
| MINE_ENTRANCE | `special` | Mine/cave entrances |
| TABLE | `furniture` | Indoor furniture |
| CHAIR | `furniture` | Indoor furniture |
| MUSHROOM | `mushroom` | Decorative items |
| BUSH | `grass` | Matches grass for blending |
| TREE | `grass` | Matches grass for blending |
| TREE_BIG | `grass` | Matches grass for blending |
| COTTAGE | `grass` | Building sits on grass |

## Best Practices

### Color Scheme Design

1. **Use existing palettes first** - The 6 built-in schemes cover most needs
2. **Match grass colors** - Rocks, paths, trees, and bushes should blend with grass
3. **Test contrast** - Ensure player sprites are visible against your colors
4. **Be consistent** - Similar map types should use similar color schemes

### Seasonal Colors

1. **Start without seasons** - Only add if your map benefits from seasonal variation
2. **Keep transitions subtle** - Jarring color changes feel unnatural
3. **Consider gameplay** - Ensure tiles remain distinguishable in all seasons
4. **Test readability** - Text, sprites, and UI must work with seasonal colors

### Performance

- ✅ Color lookup is **extremely fast** (simple object property access)
- ✅ Colors are applied once per frame during rendering
- ✅ No performance impact from seasonal modifiers
- ✅ Safe to use on all tiles without optimization concerns

## Troubleshooting

### Colors not applying

**Check these in order:**

1. Is the color scheme name spelled correctly in your map definition?
2. Is the color scheme registered in `maps/colorSchemes.ts`?
3. Are you using valid `bg-palette-*` class names?
4. Is the map loaded via `MapManager.loadMap()`?

### Seasonal colors not working

1. Verify `seasonalModifiers` is defined in your color scheme
2. Check the current season with `TimeManager.getCurrentTime().season`
3. Ensure you're overriding the correct color property (e.g., `grass` not `GRASS`)
4. Season keys are lowercase: `spring`, `summer`, `autumn`, `winter`

### Colors look wrong

1. Check `index.html` to see actual hex values for palette colors
2. Test your scheme on a simple map first
3. Compare to existing schemes (village, forest, etc.)
4. Preview at different times of day (lighting affects perception)

## Examples

### Example 1: Simple Map with Existing Scheme

```typescript
// maps/definitions/mySimpleMap.ts
export const mySimpleMap: MapDefinition = {
  id: 'simple_map',
  name: 'Simple Test Map',
  // ... map data
  colorScheme: 'village',  // Use existing village colors
};
```

### Example 2: Custom Color Scheme (No Seasons)

```typescript
// maps/colorSchemes.ts
desert: {
  name: 'desert',
  colors: {
    grass: 'bg-palette-beige',      // Sandy ground
    rock: 'bg-palette-taupe',        // Desert rocks
    water: 'bg-palette-teal',        // Oasis water
    path: 'bg-palette-tan',
    floor: 'bg-palette-cream',
    wall: 'bg-palette-sienna',
    carpet: 'bg-palette-rust',
    door: 'bg-palette-chocolate',
    special: 'bg-palette-gold',
    furniture: 'bg-palette-khaki',
    mushroom: 'bg-palette-beige',
    background: 'bg-palette-mustard',
  },
},
```

### Example 3: Custom Scheme with Seasonal Colors

```typescript
// maps/colorSchemes.ts
enchantedForest: {
  name: 'enchantedForest',
  colors: {
    grass: 'bg-palette-moss',
    rock: 'bg-palette-moss',
    water: 'bg-palette-teal',
    path: 'bg-palette-olive',
    floor: 'bg-palette-sage',
    wall: 'bg-palette-brown',
    carpet: 'bg-palette-olive',
    door: 'bg-palette-chocolate',
    special: 'bg-palette-violet',      // Magical purple accents
    furniture: 'bg-palette-rust',
    mushroom: 'bg-palette-lavender',   // Magical mushrooms
    background: 'bg-palette-charcoal',
  },
  seasonalModifiers: {
    spring: {
      grass: 'bg-palette-sage',        // Light spring green
      mushroom: 'bg-palette-magenta',  // Bright pink mushrooms
    },
    summer: {
      grass: 'bg-palette-olive',       // Deeper summer green
    },
    autumn: {
      grass: 'bg-palette-rust',        // Rusty autumn leaves
      mushroom: 'bg-palette-burgundy', // Dark red mushrooms
    },
    winter: {
      grass: 'bg-palette-slate',       // Frozen ground
      water: 'bg-palette-periwinkle',  // Icy water
      mushroom: 'bg-palette-lavender', // Frost-covered mushrooms
    },
  },
},
```

### Example 4: Scheme with Seasons and Day/Night

```typescript
// maps/colorSchemes.ts
mysteriousGarden: {
  name: 'mysteriousGarden',
  colors: {
    grass: 'bg-palette-sage',
    rock: 'bg-palette-gray',
    water: 'bg-palette-sky',
    path: 'bg-palette-beige',
    floor: 'bg-palette-tan',
    wall: 'bg-palette-brown',
    carpet: 'bg-palette-olive',
    door: 'bg-palette-rust',
    special: 'bg-palette-iris',
    furniture: 'bg-palette-khaki',
    mushroom: 'bg-palette-lavender',   // Always glowing mushrooms
    background: 'bg-palette-moss',
  },
  // Seasonal grass colors
  seasonalModifiers: {
    spring: {
      grass: 'bg-palette-sage',        // Spring green
    },
    summer: {
      grass: 'bg-palette-olive',       // Summer green
    },
    autumn: {
      grass: 'bg-palette-khaki',       // Autumn golden
    },
    winter: {
      grass: 'bg-palette-slate',       // Winter frost
    },
  },
  // Day/night lighting (applied after seasons)
  timeOfDayModifiers: {
    night: {
      grass: 'bg-palette-moss',        // Darken seasonal grass at night
      water: 'bg-palette-teal',        // Darker water at night
      path: 'bg-palette-taupe',        // Darker path at night
      // Note: mushroom intentionally NOT darkened - they glow at night!
    },
  },
},
```

**Result:** The garden has seasonal grass colors during the day, but at night everything darkens except the glowing mushrooms which keep their lavender color!

## Runtime Color Modification

The palette can be modified at runtime, allowing for in-game customization, accessibility features, or dynamic themes.

### Modifying Colors in Code

```typescript
import { updatePaletteColor, updatePaletteColors, getPalette, getColorHex } from './palette';

// Change a single color
updatePaletteColor('sage', '#90EE90');  // Brighter green grass

// Change multiple colors at once
updatePaletteColors({
  sage: '#90EE90',
  sky: '#87CEEB',
  water: '#4682B4',
});

// Get current palette
const palette = getPalette();
console.log(palette.sage.hex);  // Current sage color

// Get hex value directly
const sageHex = getColorHex('sage');  // '#87AE73'
```

### Export/Import Palettes

Players can save and load custom color palettes:

```typescript
import { exportPalette, importPalette, resetPalette } from './palette';

// Export current palette as JSON
const paletteJSON = exportPalette();
localStorage.setItem('customPalette', paletteJSON);

// Import saved palette
const savedPalette = localStorage.getItem('customPalette');
if (savedPalette) {
  importPalette(savedPalette);
}

// Reset to defaults
resetPalette();
```

### In-Game Color Editor (Future)

To add an in-game color picker:

1. Create UI component with color inputs
2. Call `updatePaletteColor()` when user changes a color
3. Changes apply immediately to all tiles using that color
4. Save to localStorage for persistence

**Example use cases:**
- Accessibility: High-contrast mode for colorblind players
- Personalization: Custom color themes
- Day/night: Programmatically darken all colors at night
- Special events: Holiday-themed palettes

## Related Documentation

- `docs/MAP_GUIDE.md` - How to create maps
- `docs/TIME_SYSTEM.md` - How seasons and time work
- `docs/ASSETS.md` - How tile images work with colors
- `palette.ts` - Color palette definitions and API
- `constants.ts` - Base tile color definitions
- `maps/colorSchemes.ts` - All color scheme definitions
- `utils/mapUtils.ts` - Color application logic
