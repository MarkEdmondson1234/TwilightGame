# Tile Organization Guide

This document explains how tiles are organized in subdirectories.

## Folder Structure

```
/public/assets/tiles/
  /village/        - Village-specific decorations and structures
  /forest/         - Forest-specific flora and features
  /shared/         - Tiles used across multiple map types
  /(root)          - Legacy tiles and multi-map structures
```

## Organization Rules

### `/village/` - Village-specific tiles
Items that only appear in the village map:
- Village green decorations
- Village-specific buildings (if not used elsewhere)
- Village monuments or features
- Community structures (notice boards, wells if village-only)

**Examples:**
- `village_green.png`

### `/forest/` - Forest-specific tiles
Items that only appear in forest/woodland maps:
- Forest flowers and mushrooms (if forest-only)
- Forest-specific decorations
- Woodland features

**Examples:**
- `celestia_flower_bud_01.png`
- `celestia_flower_bud_02.png`
- `forest_fern3.png` (should be moved)
- `giant_mushroom.png` (should be moved)
- `mushrooms.png` (should be moved)

### `/shared/` - Multi-map tiles
Items used across multiple map types:
- Trees (oak, birch, cherry, spruce, willow) - appear in village AND forest
- Rocks and stepping stones
- Grass variations
- Generic bushes and vegetation

**Examples:**
- All `*_tree_*.png` files
- All `oak_*.png`, `birch_*.png`, `cherry_*.png` files
- `rock_1.png`, `rock_2.png`
- `stepping_stones_*.png`
- `grass_*.png`

### Root `/tiles/` - Special cases
Keep in root for backward compatibility or special categories:
- Indoor furniture (beds, sofas, stoves)
- Buildings (cottages, shops, sheds) - organized in subfolders
- Floors and walls (indoor tiles)
- Doors and chimneys
- Existing subfolders: `brambles/`, `hawthorn_bush/`, `lake/`, `shed/`, `shop/`, `tuft/`, `wild_iris/`, `wild_strawberry/`, `willow/`

## Moving Existing Tiles

### Suggested Moves:

**To `/shared/`:**
- All tree files: `oak_tree_*.png`, `birch_*.png`, `fairy_oak_*.png`, `spruce_tree*.png`, `tree_cherry_*.png`, `willow_tree.png`, `tree_*.png`
- Rocks: `rock_1.png`, `rock_2.png`
- Stepping stones: `stepping_stones_*.png`
- Grass: `grass_1.png`, `grass_2.png`
- Generic bushes: `bush_1.png`
- Stumps: `stump.png`
- Tuft grass: `tuft.png`, `tuft_autumn.png`

**To `/forest/`:**
- `forest_fern3.png`
- `giant_mushroom.png`, `giant_mushroom_winter.png`
- `mushrooms.png`
- `sambuca_bush_*.png` (if forest-only)

**To `/village/`:**
- `well.png`, `well_in_winter.png` (if village-only, otherwise shared)
- `pond_flowers_*.png` (if village-only, otherwise shared)

**Keep in root:**
- All indoor furniture: `bed-cottage-square.png`, `cottage_bed.png`, `sofa_*.png`, `sofa_table.png`, `stove.png`
- Building structures: `cottage_*.png`, `mine_entrance.png`
- Walls/floors: `wooden_wall*.png`, `floor_*.png`, `bricks_1.jpeg`, `rocks_floor.png`, `mine_floor.png`
- Doors: `door_1.png`, `chimney.png`
- Rugs: `rug_*.png`, `rug2.jpeg`
- Existing subfolders remain as-is

## Adding New Tiles

When adding new tiles, consider:

1. **Is it specific to one map type?** → Use `/village/` or `/forest/`
2. **Is it used in multiple map types?** → Use `/shared/`
3. **Is it indoor furniture or building?** → Keep in root
4. **Is it part of a set?** → Consider creating a subfolder in root (like existing `wild_iris/`, `hawthorn_bush/`)

## Asset References

When referencing tiles in `src/assets.ts`, use the full path:

```typescript
// Village tiles
village_green: new URL('./public/assets/tiles/village/village_green.png', import.meta.url).href,

// Forest tiles
celestia_flower: new URL('./public/assets/tiles/forest/celestia_flower_bud_01.png', import.meta.url).href,

// Shared tiles
oak_tree: new URL('./public/assets/tiles/shared/oak_tree_spring.png', import.meta.url).href,

// Root tiles
sofa: new URL('./public/assets/tiles/sofa_01.png', import.meta.url).href,
```

## Optimization

The `scripts/optimize-assets.js` script automatically processes all subdirectories, so organization doesn't affect optimization behavior.
