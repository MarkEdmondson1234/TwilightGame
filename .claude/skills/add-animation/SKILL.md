---
name: Add Animation
description: Add animated GIF effects to the game for environmental ambiance (falling petals, rain, smoke, fireflies, etc.)
---

# Add Animation

This skill helps you add animated GIF effects to TwilightGame for environmental ambiance and atmosphere.

## When to Use

Use this skill when you need to:
- Add environmental effects (falling petals, rain, snow, fireflies)
- Create atmospheric animations near specific tiles (smoke from chimneys, sparkles from magic)
- Add seasonal or time-based visual effects
- Create ambient animations for specific maps

## Animation System Overview

TwilightGame supports two types of animations:

### 1. Tile-Based Animations
Automatically appear near specific tile types when conditions are met.

**Key Features:**
- Render near trigger tiles (e.g., petals near cherry trees)
- Seasonal and time-of-day conditions
- Three rendering layers (background, midground, foreground)
- Viewport culling for performance
- Configurable opacity, scale, and positioning

### 2. Weather Animations
Fullscreen effects that cover the entire viewport based on weather state.

**Key Features:**
- Triggered by weather setting (change via DevTools F4)
- Cover entire screen (not tied to specific tiles)
- Perfect for atmospheric effects like rain, snow, fog
- Weather options: `clear`, `rain`, `snow`, `fog`, `mist`, `storm`, `cherry_blossoms`

## File Formats

- **GIF** (recommended for looping animations)
- **APNG** (animated PNG, also supported)
- **Note**: GIFs ARE optimized by the asset pipeline! They're automatically resized to 512x512px and compressed with gifsicle

## Important: GIF Sizing and Scale Values

**The `scale` parameter scales the optimized GIF dimensions!**

- Tile size is 64x64 pixels
- GIFs are automatically optimized to **512x512px** by `npm run optimize-assets`
- Original size doesn't matter - optimization resizes everything to 512px
- Always calculate: `(512 * scale) / 64 = tiles wide`

**Example calculations for optimized 512x512px GIF:**
- `scale: 0.25` = ~128px = 2 tiles wide (small, delicate)
- `scale: 0.5` = ~256px = 4 tiles wide (medium)
- `scale: 0.8` = ~410px = 6.4 tiles wide (large, atmospheric)
- `scale: 1.0` = 512px = 8 tiles wide (very large!)

**Recommendations:**
- **Tile animations**: Use `scale: 0.2 - 0.6` for most effects
- **Weather animations**: Use `scale: 0.6 - 1.0` for fullscreen effects
- Place original GIF in `/public/assets/animations/` (any size)
- Run `npm run optimize-assets` to resize and optimize
- Optimized GIFs saved to `/public/assets-optimized/animations/`
- Typical savings: 60-80% file size reduction + perfect sizing!

## Steps

### 1. Place the Animation File

Place your animated GIF in `/public/assets/animations/`:
- Format: `[effect_name].gif`
- Examples: `cherry_spring_petals.gif`, `rain.gif`, `fireflies.gif`, `chimney_smoke.gif`

**Tips:**
- Keep file size reasonable (< 100KB if possible)
- Use transparent backgrounds for overlay effects
- Ensure smooth looping (first and last frames should match)

### 2. Register in assets.ts

Add the animation to the `animationAssets` object in `assets.ts`:

```typescript
export const animationAssets = {
  cherry_spring_petals: new URL('./public/assets/animations/cherry_spring_petals.gif', import.meta.url).href,
  rain: new URL('./public/assets/animations/rain.gif', import.meta.url).href,
  // ... your new animation
};
```

### 3a. Configure Tile-Based Animation in constants.ts

Add your animation configuration to the `TILE_ANIMATIONS` array in `constants.ts`:

```typescript
export const TILE_ANIMATIONS: import('./types').TileAnimation[] = [
  {
    id: 'unique_animation_id',
    image: animationAssets.your_animation,
    tileType: TileType.TARGET_TILE, // Which tile triggers this
    offsetX: 0, // Position offset (in tiles) from tile center
    offsetY: -2, // Negative = above the tile
    radius: 3, // Show within N tiles of trigger
    layer: 'foreground', // 'background' | 'midground' | 'foreground'
    loop: true, // Whether animation loops
    opacity: 0.85, // Optional: 0-1 (default 1)
    scale: 0.25, // IMPORTANT: See GIF Sizing section above!
    conditions: { // Optional conditions
      season: 'spring', // Only in spring
      timeOfDay: 'night', // Only at night
    },
  },
];
```

### 3b. Configure Weather Animation in constants.ts

**OR** add a fullscreen weather animation to the `WEATHER_ANIMATIONS` array:

```typescript
export const WEATHER_ANIMATIONS: import('./types').WeatherAnimation[] = [
  {
    id: 'rain_weather',
    image: animationAssets.rain,
    weather: 'rain', // Which weather state triggers this
    layer: 'foreground',
    loop: true,
    opacity: 0.7,
    scale: 0.4, // Larger scale for fullscreen effects
  },
];
```

**Testing Weather Animations:**
1. Press **F4** in-game to open DevTools
2. Change the "Current Weather" dropdown to your weather type
3. Animation should appear fullscreen immediately

### 4. Verify

Check that:
- Animation file exists at `/public/assets/animations/[fileName].gif`
- Asset is registered in `animationAssets`
- Configuration added to `TILE_ANIMATIONS`
- No TypeScript errors: `npx tsc --noEmit`
- Animation appears in-game near trigger tiles

## Configuration Options

### Layer Options

- **`background`**: Renders behind everything (use for ground-level effects)
- **`midground`**: Renders behind player, above NPCs (use for mid-height effects)
- **`foreground`**: Renders above everything (use for falling effects like petals, rain)

### Positioning

- **`offsetX`/`offsetY`**: Position relative to trigger tile center (in tile units)
  - `offsetX: 0.5` = half a tile to the right
  - `offsetY: -2` = 2 tiles above
- **`radius`**: How far from trigger tile to show animation (in tiles)
  - `radius: 1` = only directly on/near tile
  - `radius: 3` = within 3 tiles

### Conditions

- **`season`**: `'spring' | 'summer' | 'autumn' | 'winter'`
- **`timeOfDay`**: `'day' | 'night'` (day = 6am-8pm, night = 8pm-6am)
- **`weather`**: (future) `'rain' | 'snow' | 'clear'`

## Example: Cherry Blossom Petals

Current implementation (already in the game):

```typescript
{
  id: 'cherry_petals_spring',
  image: animationAssets.cherry_spring_petals,
  tileType: TileType.CHERRY_TREE,
  offsetX: 0.5,
  offsetY: -2, // Above the tree
  radius: 3, // Visible within 3 tiles
  layer: 'foreground',
  loop: true,
  opacity: 0.85,
  scale: 1.5,
  conditions: {
    season: 'spring', // Only in spring!
  },
}
```

## Example: Chimney Smoke

```typescript
{
  id: 'chimney_smoke',
  image: animationAssets.chimney_smoke,
  tileType: TileType.CHIMNEY,
  offsetX: 0,
  offsetY: -3, // Well above chimney
  radius: 1, // Only directly above
  layer: 'foreground',
  loop: true,
  opacity: 0.7, // Semi-transparent
  scale: 1.0,
  conditions: {
    timeOfDay: 'day', // Smoke during daytime only
  },
}
```

## Example: Fireflies at Night

```typescript
{
  id: 'summer_fireflies',
  image: animationAssets.fireflies,
  tileType: TileType.BUSH, // Near bushes
  offsetX: 0,
  offsetY: 0,
  radius: 2,
  layer: 'midground', // Behind player
  loop: true,
  opacity: 0.9,
  scale: 1.2,
  conditions: {
    season: 'summer',
    timeOfDay: 'night', // Only at night in summer
  },
}
```

## Example: Rain (Global Effect)

For full-screen effects, set a large radius or use a common tile type:

```typescript
{
  id: 'rain_effect',
  image: animationAssets.rain,
  tileType: TileType.GRASS, // Most maps have grass
  offsetX: 0,
  offsetY: 0,
  radius: 10, // Large radius for coverage
  layer: 'foreground',
  loop: true,
  opacity: 0.6,
  scale: 2.0,
  conditions: {
    weather: 'rain', // Future: when weather system exists
  },
}
```

## Performance Considerations

- Animations use viewport culling (only render visible ones)
- GIFs are not optimized - keep file sizes small
- Too many animations can impact performance
- Use appropriate radius (larger = more instances rendered)

## Tips & Best Practices

1. **Transparent backgrounds**: Use transparent GIFs for overlay effects
2. **Smooth loops**: Ensure first/last frames match for seamless looping
3. **Appropriate layer**:
   - Falling effects → foreground
   - Ground effects → background
   - Mid-height → midground
4. **Seasonal awareness**: Use conditions to match seasons
5. **File size**: Aim for < 50KB for smooth performance
6. **Test visibility**: Check animation appears where expected

## Related Documentation

- [ASSETS.md](../../../docs/ASSETS.md) - Complete asset guidelines
- [constants.ts](../../../constants.ts) - TILE_ANIMATIONS configuration
- [assets.ts](../../../assets.ts) - animationAssets registry
- [AnimationOverlay.tsx](../../../components/AnimationOverlay.tsx) - Renderer component
