# Path Tile System

The game features an intelligent path tile system that automatically selects the correct path sprite based on neighboring tiles, creating seamless paths with proper corners, straights, and ends.

## How It Works

### 1. Neighbor Detection

For each path tile at position `(x, y)`, the system checks the 4 adjacent tiles:
- **Up**: `(x, y-1)`
- **Down**: `(x, y+1)`
- **Left**: `(x-1, y)`
- **Right**: `(x+1, y)`

### 2. Connection Analysis

The system counts how many neighboring tiles are also paths (0-4 connections) and determines the tile type based on the pattern:

#### Isolated Path (0 connections)
- **Tile**: `path_horizontal`
- **Use**: Single path tile with no neighbors

#### Path End (1 connection)
- **Tiles**: `path_end_left`, `path_end_right`
- **Rotation**: 90° for vertical ends
- **Use**: Dead-end paths

| Neighbor Direction | Tile Used | Rotation |
|-------------------|-----------|----------|
| Right | `path_end_left` | 0° |
| Left | `path_end_right` | 0° |
| Down | `path_end_left` | 90° |
| Up | `path_end_right` | 90° |

#### Straight Path (2 opposite connections)
- **Horizontal** (left + right): `path_horizontal` at 0°
- **Vertical** (up + down): `path_horizontal` at 90°

#### Corner/Curve (2 perpendicular connections)

The curve tiles follow a "FROM → TO" naming convention:

| Corner Type | Connections | Tile Used | Visual |
|-------------|------------|-----------|--------|
| Bottom-left | Down + Right | `path_curve_bottom_to_right` | Path from ↑ bottom → right |
| Top-left | Up + Right | `path_curve_top_to_right` | Path from ↓ top → right |
| Top-right | Up + Left | `path_curve_left_to_top` | Path from ← left → top |
| Bottom-right | Down + Left | `path_curve_left_to_bottom` | Path from ← left → bottom |

**Understanding Curve Names:**
- `path_curve_bottom_to_right` = Path flows FROM the bottom TO the right
- `path_curve_top_to_right` = Path flows FROM the top TO the right
- `path_curve_left_to_top` = Path flows FROM the left TO the top
- `path_curve_left_to_bottom` = Path flows FROM the left TO the bottom

#### Junction/Cross (3-4 connections)
- **Current**: Uses `path_horizontal` as placeholder
- **Future**: Could support T-junctions and 4-way intersections

## Implementation

### Core Files

- **[utils/pathTileSelector.ts](../utils/pathTileSelector.ts)**: Main logic for selecting path tiles
- **[assets.ts](../assets.ts)**: Path asset imports (optimized versions)
- **[App.tsx](../App.tsx)**: Integration into render loop (lines 615-619)

### Color Scheme

Path tiles use **grass color** as the background (defined in `utils/mapUtils.ts` line 44):
```typescript
case TileType.PATH:
  color = colorScheme.colors.grass;  // Use grass color so path sprites blend naturally
```

This allows the transparent PNG path sprites to blend seamlessly with the surrounding grass.

### Asset Optimization

Path assets are optimized using the asset optimizer:
```bash
npm run optimize-assets
```

This reduces file sizes from ~1.6MB to <1KB per tile while maintaining visual quality for pixel art.

## Available Path Assets

Located in `public/assets-optimized/tiles/`:

1. `path_horizontal.png` - Straight horizontal path (rotated 90° for vertical)
2. `path_curve_bottom_to_right.png` - Bottom-left corner
3. `path_curve_top_to_right.png` - Top-left corner
4. `path_curve_left_to_top.png` - Top-right corner
5. `path_curve_left_to_bottom.png` - Bottom-right corner
6. `path_end_left.png` - Path ending (open on left)
7. `path_end_right.png` - Path ending (open on right)

## Adding Path Tiles to Maps

Use the `P` character in grid-based map definitions:

```typescript
const myMap = parseGrid(`
  GGGGGGGGGG
  GGPPPPPPGG
  GGPGGGPGGG
  GGPGGGPGGG
  GGPPPPPPGG
  GGGGGGGGGG
`);
```

The path tiles will automatically:
- Use the correct sprite based on neighbors
- Display with grass-colored backgrounds
- Show proper curves, straights, and ends

## Performance Considerations

The path selector is called **every frame** during rendering. For better performance:
- Results could be cached per map load
- Only recalculate when map changes
- Pre-compute path tile types during map initialization

## Future Enhancements

- **T-junctions**: Add assets for 3-way intersections
- **4-way crosses**: Add intersection tile
- **Caching**: Cache path tile selections per map
- **Variations**: Add multiple path styles (dirt, stone, brick)
