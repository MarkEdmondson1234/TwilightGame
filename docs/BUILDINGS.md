# Building Implementation Guide

This guide explains how to add and configure buildings (large multi-tile structures) in TwilightGame.

## What are Buildings?

Buildings are large multi-tile sprites that serve as major landmarks and structures in the game world. Examples include:

- **Cottages** (6×5 tiles) - Player homes and NPC residences
- **Shops** (6×6 tiles) - Merchant buildings with seasonal variations
- **Garden Sheds** (6×6 tiles) - Storage structures with seasonal variations
- **Witch Hut** (20×20 tiles) - Special landmark building
- **Mine Entrance** (6×6 tiles) - Entry point to underground areas

Buildings differ from furniture in that they:
- Are much larger (typically 6×6 tiles or more)
- Often have seasonal variations
- Require higher resolution assets (1024×1024 or larger)
- Serve as major visual landmarks
- May have interactive elements (doors, transitions)

## Building vs Furniture Classification

The asset optimization system treats buildings and furniture differently:

| Category | Size | Quality | Examples |
|----------|------|---------|----------|
| **Buildings** | 1024×1024 | 98% (SHOP_QUALITY) | Cottages, shops, sheds, mine entrance |
| **Large Furniture** | 768×768 | 95% (HIGH_QUALITY) | Beds, sofas, tables, stoves |
| **Regular Tiles** | 256×256 | 85% (COMPRESSION_QUALITY) | Grass, rocks, paths |

**Why the difference?**
- Buildings are major visual elements that players see from a distance
- Higher resolution preserves architectural details like windows, doors, rooflines
- Buildings often span 6+ tiles, so quality loss is more noticeable

## Step-by-Step: Adding a New Building

### 1. Prepare Your Asset

**Recommended specifications:**
- **Format**: PNG with transparency
- **Dimensions**: Square aspect ratio (e.g., 2100×2100, 3000×3000)
- **Content**: Building centered with transparent background
- **Details**: Include all architectural features (windows, doors, chimneys, etc.)

**Naming conventions:**
- Single building: `building_name.png` (e.g., `cottage_small_spring.png`)
- Seasonal variations: `building_name_season.png` (e.g., `shop_spring.png`, `shop_summer.png`)

**File location:**
```
public/assets/tiles/building_name.png
```

### 2. Configure Optimization

Edit `scripts/optimize-assets.js` to ensure your building is optimized correctly.

**Find the buildings section:**
```javascript
// Special handling for large multi-tile sprites (shop, cottage, mine entrance, garden shed)
else if (file.includes('shop') || file.includes('cottage') || file.includes('mine_entrance') || file.includes('garden_shed')) {
  await sharp(inputPath)
    .resize(SHOP_SIZE, SHOP_SIZE, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .png({ palette: false, quality: SHOP_QUALITY, compressionLevel: 3 })
    .toFile(outputPath);
}
```

**Add your building keyword:**
```javascript
else if (file.includes('shop') || file.includes('cottage') || file.includes('your_building') || ...) {
```

**Important**: Ensure your building keyword appears in the buildings section, NOT in the furniture section (which comes later in the code). The order matters - the first matching condition wins.

### 3. Optimize Assets

Run the optimization script to generate the optimized version:

```bash
npm run optimize-assets
```

**Verify the output:**
```bash
file public/assets-optimized/tiles/your_building.png
```

You should see: `PNG image data, 1024 x 1024, 8-bit/color RGBA, non-interlaced`

If the size is 768×768 instead, your building was incorrectly categorized as furniture. Move the keyword check earlier in the optimization script.

### 4. Register Asset in assets.ts

Add your building to the `tileAssets` object in `assets.ts`:

```typescript
export const tileAssets = {
  // ... existing assets ...

  // Your building (single version)
  your_building: '/TwilightGame/assets-optimized/tiles/your_building.png',

  // Or with seasonal variations
  your_building_spring: '/TwilightGame/assets-optimized/tiles/your_building_spring.png',
  your_building_summer: '/TwilightGame/assets-optimized/tiles/your_building_summer.png',
  your_building_autumn: '/TwilightGame/assets-optimized/tiles/your_building_autumn.png',
  your_building_winter: '/TwilightGame/assets-optimized/tiles/your_building_winter.png',
};
```

### 5. Define Tile Type

Add a new tile type in `types.ts`:

```typescript
export enum TileType {
  // ... existing types ...
  YOUR_BUILDING = 'YOUR_BUILDING',
}
```

### 6. Configure Tile Legend

Add your building to the `TILE_LEGEND` in `constants.ts`:

```typescript
export const TILE_LEGEND: Record<TileType, TileConfig> = {
  // ... existing tiles ...

  [TileType.YOUR_BUILDING]: {
    color: '#8B4513',  // Fallback colour (shown if image fails to load)
    blocksMovement: true,  // Can players walk through this?
    baseType: TileType.GRASS,  // What tile shows underneath?
  },
};
```

**Important settings:**
- `color`: Fallback colour if image doesn't load
- `blocksMovement`: Set to `true` for solid buildings
- `baseType`: The ground tile that shows underneath (usually `GRASS` or `FLOOR`)

### 7. Configure Sprite Metadata

Add sprite configuration to `SPRITE_METADATA` in `constants.ts`:

```typescript
export const SPRITE_METADATA: SpriteMetadata[] = [
  // ... existing sprites ...

  {
    tileType: TileType.YOUR_BUILDING,
    spriteWidth: 6,      // Width in tiles (visual size)
    spriteHeight: 6,     // Height in tiles (visual size)
    offsetX: -2.5,       // Horizontal offset from anchor point
    offsetY: -5,         // Vertical offset from anchor point
    image: tileAssets.your_building,
    isForeground: true,  // Render in front of player (true) or behind (false)
    enableFlip: false,   // Allow horizontal flipping for variation
    enableRotation: false, // Allow rotation
    enableScale: false,  // Allow size variation
    enableBrightness: false, // Allow brightness variation
    // Collision settings (functional area, not visual)
    collisionWidth: 6,   // Collision width in tiles
    collisionHeight: 3,  // Collision height in tiles (often less than visual height)
  },
];
```

**Key parameters explained:**

- **`spriteWidth` / `spriteHeight`**: Visual size of the building in tiles
  - For a 6×6 building, use `6` and `6`
  - This determines how large the building appears on screen

- **`offsetX` / `offsetY`**: Position adjustment from the anchor point
  - Anchor point is where you place the grid character in your map (e.g., `K` for cottage)
  - Negative `offsetY` makes the building extend upward from the anchor
  - Use these to center the building or position it correctly relative to the anchor

- **`isForeground`**: Rendering layer
  - `true`: Building renders in front of the player (trees, tall buildings)
  - `false`: Building renders behind the player (low furniture, rugs)

- **`collisionWidth` / `collisionHeight`**: Functional collision area
  - Often smaller than visual size (e.g., only the base of a tall building)
  - For a 6-tile wide cottage with collision at the base: `collisionWidth: 6, collisionHeight: 2`

### 8. Add Grid Character (Optional)

If you want a shorthand character for your building in map grids, add it to the grid parser in `maps/gridParser.ts`:

```typescript
const TILE_MAP: Record<string, TileType> = {
  // ... existing mappings ...
  'Y': TileType.YOUR_BUILDING,  // Choose an unused character
};
```

**Choosing a character:**
- Use uppercase letters for major structures
- Check existing mappings to avoid conflicts
- Choose something memorable (e.g., 'B' for barn, 'M' for mill)

### 9. Place Building in Map

Add your building to a map definition (e.g., `maps/definitions/village.ts`):

**Using the grid character:**
```typescript
const grid = `
GGGGGGGGG
GGGYGGGGG  // Y = Your building anchor point
GGGGGGGGG
`;
```

**Or using the transition system:**
```typescript
export const villageMap: MapDefinition = {
  // ... other config ...

  tiles: Array(MAP_WIDTH * MAP_HEIGHT).fill(TileType.GRASS),

  // Place building programmatically
  customTiles: [
    { x: 15, y: 10, type: TileType.YOUR_BUILDING },
  ],
};
```

**Important**: Only place ONE anchor point per building. The sprite will automatically render the full multi-tile structure from that single point.

## Seasonal Variations

Buildings can change appearance with the seasons using the `getSeasonalAsset()` utility.

### 1. Create Seasonal Assets

Create four versions of your building:
```
public/assets/tiles/your_building_spring.png
public/assets/tiles/your_building_summer.png
public/assets/tiles/your_building_autumn.png
public/assets/tiles/your_building_winter.png
```

### 2. Register All Seasons in assets.ts

```typescript
export const tileAssets = {
  your_building_spring: '/TwilightGame/assets-optimized/tiles/your_building_spring.png',
  your_building_summer: '/TwilightGame/assets-optimized/tiles/your_building_summer.png',
  your_building_autumn: '/TwilightGame/assets-optimized/tiles/your_building_autumn.png',
  your_building_winter: '/TwilightGame/assets-optimized/tiles/your_building_winter.png',
};
```

### 3. Use Seasonal Asset in Sprite Metadata

```typescript
import { getSeasonalAsset } from '../utils/seasonalAssets';

{
  tileType: TileType.YOUR_BUILDING,
  // ... other config ...
  image: getSeasonalAsset({
    spring: tileAssets.your_building_spring,
    summer: tileAssets.your_building_summer,
    autumn: tileAssets.your_building_autumn,
    winter: tileAssets.your_building_winter,
  }),
}
```

The building will now automatically change appearance based on the in-game season!

## Building with Transitions (Doors)

Buildings often have doors that allow players to enter/exit. Use the transition system to connect indoor and outdoor maps.

### 1. Define the Door Tile

In your map definition:

```typescript
export const villageMap: MapDefinition = {
  // ... other config ...

  transitions: [
    {
      x: 15,           // Door position (front of building)
      y: 12,
      targetMap: 'cottage_interior',  // Map to load when entering
      spawnX: 3,       // Player spawn position in interior
      spawnY: 5,
      spawnDirection: Direction.DOWN,
    },
  ],
};
```

### 2. Create Interior Map

Create the corresponding interior map (e.g., `maps/definitions/cottageInterior.ts`):

```typescript
export const cottageInterior: MapDefinition = {
  id: 'cottage_interior',
  width: 8,
  height: 8,
  tiles: parseGrid(grid, 8, 8),
  colorScheme: 'indoor',

  transitions: [
    {
      x: 3,
      y: 7,          // Door to exit
      targetMap: 'village',
      spawnX: 15,    // Spawn back outside the cottage
      spawnY: 13,    // Just south of the entrance
      spawnDirection: Direction.DOWN,
    },
  ],
};
```

### 3. Register Interior Map

Add the interior map to `maps/index.ts`:

```typescript
import { cottageInterior } from './definitions/cottageInterior';

export function initializeMaps(savedMaps?: Record<string, MapDefinition>): void {
  MapManager.addMap(cottageInterior);
  // ... other maps ...
}
```

## Building Collision System

Buildings use a collision system separate from their visual size. This allows tall buildings to have collision only at their base.

### Example: Tall Cottage

```typescript
{
  tileType: TileType.COTTAGE,
  spriteWidth: 6,      // Building is 6 tiles wide
  spriteHeight: 5,     // Building is 5 tiles tall (visual)
  offsetX: -3,
  offsetY: -4,
  image: tileAssets.cottage_wooden,
  isForeground: true,

  // Collision only at the base
  collisionWidth: 3.0,   // 3 tiles wide at entrance
  collisionHeight: 1.5,  // 1.5 tiles tall at base
}
```

**How collision works:**
1. Player cannot walk through the `collisionWidth × collisionHeight` area
2. Collision area is positioned at the anchor point (where you placed the building in the map)
3. Visual sprite extends beyond collision area (creates illusion of height)

**Common patterns:**
- **Full collision**: `collisionWidth = spriteWidth, collisionHeight = spriteHeight` (player can't walk through any part)
- **Base collision**: `collisionHeight` much smaller than `spriteHeight` (player can walk "under" upper floors/roof)
- **Narrow entrance**: `collisionWidth` smaller than `spriteWidth` (player can walk beside the building)

## Optimization Tips

### Image Quality Guidelines

| Building Type | Recommended Original Size | Optimized Size | Quality |
|--------------|---------------------------|----------------|---------|
| Small cottage (4×4) | 1500×1500 | 1024×1024 | 98% |
| Large cottage (6×6) | 2100×2100 | 1024×1024 | 98% |
| Shop/shed (6×6) | 2100×2100 | 1024×1024 | 98% |
| Landmark (20×20) | 3000×3000 | 1024×1024 | 98% |

### File Size Guidelines

After optimization, expect:
- Small buildings (4×4): 400-800 KB
- Medium buildings (6×6): 800-1200 KB
- Large buildings (8×8+): 1200-2000 KB

If your optimized file is larger than expected:
1. Check that the keyword is in the buildings section (not furniture)
2. Verify `SHOP_SIZE` constant is set to 1024
3. Ensure `compressionLevel: 3` (minimal compression)

### Performance Considerations

**Do:**
- ✅ Use single anchor point per building (one grid character)
- ✅ Enable viewport culling (buildings outside camera view aren't rendered)
- ✅ Use seasonal variations sparingly (only for major landmarks)
- ✅ Keep collision areas as small as functionally necessary

**Don't:**
- ❌ Place overlapping building sprites (causes z-fighting)
- ❌ Use overly complex collision shapes (simple rectangles work best)
- ❌ Create buildings larger than 20×20 tiles without testing performance
- ❌ Add too many buildings with animated elements in one map

## Example: Complete Building Implementation

Here's a complete example of adding a "Barn" building:

### 1. Asset files
```
public/assets/tiles/barn_spring.png (3000×3000)
public/assets/tiles/barn_summer.png (3000×3000)
public/assets/tiles/barn_autumn.png (3000×3000)
public/assets/tiles/barn_winter.png (3000×3000)
```

### 2. Optimization script (`scripts/optimize-assets.js`)
```javascript
else if (file.includes('shop') || file.includes('cottage') || file.includes('barn') || ...) {
```

### 3. Run optimization
```bash
npm run optimize-assets
```

### 4. Register assets (`assets.ts`)
```typescript
export const tileAssets = {
  barn_spring: '/TwilightGame/assets-optimized/tiles/barn_spring.png',
  barn_summer: '/TwilightGame/assets-optimized/tiles/barn_summer.png',
  barn_autumn: '/TwilightGame/assets-optimized/tiles/barn_autumn.png',
  barn_winter: '/TwilightGame/assets-optimized/tiles/barn_winter.png',
};
```

### 5. Tile type (`types.ts`)
```typescript
export enum TileType {
  BARN = 'BARN',
}
```

### 6. Tile legend (`constants.ts`)
```typescript
[TileType.BARN]: {
  color: '#8B4513',
  blocksMovement: true,
  baseType: TileType.GRASS,
},
```

### 7. Sprite metadata (`constants.ts`)
```typescript
{
  tileType: TileType.BARN,
  spriteWidth: 8,
  spriteHeight: 7,
  offsetX: -4,
  offsetY: -6,
  image: getSeasonalAsset({
    spring: tileAssets.barn_spring,
    summer: tileAssets.barn_summer,
    autumn: tileAssets.barn_autumn,
    winter: tileAssets.barn_winter,
  }),
  isForeground: true,
  enableFlip: false,
  enableRotation: false,
  enableScale: false,
  enableBrightness: false,
  collisionWidth: 8,
  collisionHeight: 3,
},
```

### 8. Grid character (`maps/gridParser.ts`)
```typescript
'B': TileType.BARN,
```

### 9. Place in map (`maps/definitions/village.ts`)
```typescript
const grid = `
GGGGGGGGGGGG
GGGGBGGGGGGG  // B = Barn anchor at row 2
GGGGGGGGGGGG
`;
```

Done! The barn now appears in the village with seasonal variations and proper collision detection.

## Troubleshooting

### Building appears blurry
- Check optimization script - ensure building is in the buildings section (1024px, 98% quality)
- Re-run `npm run optimize-assets`
- Verify original asset is high resolution (2100×2100 or larger)

### Building has wrong background colour showing through
- Check that the PNG has proper transparency (not a solid background)
- Verify `baseType` in `TILE_LEGEND` is set correctly (usually `TileType.GRASS`)
- See `docs/ASSETS.md` for transparency guidelines

### Player can walk through building
- Check `blocksMovement: true` in `TILE_LEGEND`
- Verify collision dimensions are set in sprite metadata
- Ensure collision area overlaps with player's path

### Building positioned incorrectly
- Adjust `offsetX` and `offsetY` in sprite metadata
- Negative `offsetY` moves building upward from anchor
- Negative `offsetX` moves building leftward from anchor
- Test in-game and iterate

### Multiple buildings overlapping
- Use only ONE anchor point per building instance
- Check that grid character isn't repeated unintentionally
- Ensure different buildings don't have overlapping sprite areas

### Seasonal variation not working
- Verify all four seasonal assets are registered in `assets.ts`
- Check that `getSeasonalAsset()` is used in sprite metadata
- Confirm `TimeManager` is initialized in `gameInitializer.ts`

## Further Reading

- **[MAP_GUIDE.md](MAP_GUIDE.md)** - How to create and design maps
- **[ASSETS.md](ASSETS.md)** - Asset guidelines and optimization
- **[COORDINATE_GUIDE.md](COORDINATE_GUIDE.md)** - Understanding the position system
- **[TIME_SYSTEM.md](TIME_SYSTEM.md)** - Seasonal variation system

## Related Files

- `scripts/optimize-assets.js` - Asset optimization pipeline
- `assets.ts` - Asset registry
- `constants.ts` - Tile legend and sprite metadata
- `types.ts` - TypeScript type definitions
- `maps/gridParser.ts` - Grid character mappings
- `utils/seasonalAssets.ts` - Seasonal asset helper
