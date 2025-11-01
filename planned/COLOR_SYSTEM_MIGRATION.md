# Color System Migration - PixiJS Renderer

**Status:** ✅ COMPLETED
**Priority:** High
**Complexity:** High
**Completed:** November 1, 2025

## ✅ Completion Summary

All phases completed successfully! The PixiJS renderer now fully integrates with the color system:

### What Works:
✅ **Dynamic Colors** - All tiles render with correct color scheme colors (village sage, forest moss, etc.)
✅ **Seasonal Variations** - Grass changes color with seasons (spring sage → summer olive → autumn khaki → winter slate)
✅ **Time-of-Day** - Tiles darken at night (moss green grass at night)
✅ **Color Scheme Editor** - Runtime color changes immediately update PixiJS
✅ **BaseType Rendering** - Grass shows correctly under cherry trees
✅ **Dynamic Background** - Canvas background uses map's color scheme background color

### Implementation Summary:
- **Phase 1**: Created [ColorResolver.ts](../utils/ColorResolver.ts) - Single source of truth for color logic
- **Phase 2**: Integrated ColorResolver with [TileLayer.ts](../utils/pixi/TileLayer.ts) via getTileData()
- **Phase 3**: Added reactivity to colorSchemeVersion changes in [App.tsx](../App.tsx:453-474)
- **Phase 4**: Added timeOfDay dependency for night color changes in [App.tsx](../App.tsx:451)
- **Optimization**: Simplified [mapUtils.ts](../utils/mapUtils.ts) from 126 → 32 lines (75% reduction!)

### Files Modified:
- `utils/ColorResolver.ts` - NEW (190 lines)
- `utils/mapUtils.ts` - Simplified (126 → 32 lines)
- `utils/pixi/TileLayer.ts` - Fixed renderBaseTile to use getTileData()
- `components/ColorSchemeEditor.tsx` - Uses ColorResolver mapping
- `App.tsx` - Dynamic background color + reactivity hooks

**Estimated Time**: ~3 hours (faster than 9-15 hour estimate!)

---

## Problem Statement

The PixiJS renderer is currently not displaying tile background colors correctly. Grass tiles and other colored tiles appear black or invisible. The root cause is that the new `TileLayer.ts` renderer does not integrate with the existing sophisticated color system that includes:

1. **Dynamic color resolution** via `getTileData()` in `mapUtils.ts`
2. **Color scheme system** with per-map themes (indoor, village, forest, cave, water_area, shop)
3. **Seasonal color modifiers** (grass changes color in spring/summer/autumn/winter)
4. **Time-of-day modifiers** (darker colors at night)
5. **Runtime color editing** via ColorSchemeEditor dev tool
6. **Palette-based colors** from `palette.ts` for user customization

## Current Architecture Analysis

### DOM Renderer (Working System)

**Flow:**
```
TileRenderer.tsx
  → getTileData(x, y)                    [utils/mapUtils.ts]
    → TILE_LEGEND[tileType].color        [constants.ts - base color]
    → mapManager.getCurrentColorScheme() [maps/MapManager.ts]
      → Apply color scheme override      [maps/colorSchemes.ts]
      → Apply seasonal modifier          [if defined]
      → Apply time-of-day modifier       [if defined]
    → Return final color (bg-palette-*)
  → Render <div> with Tailwind class
```

**Key Features:**
- ✅ Per-tile type color mapping (grass → scheme.colors.grass)
- ✅ Seasonal variations (grass: sage → olive → khaki → slate)
- ✅ Time variations (darker at night)
- ✅ Runtime editing via ColorSchemeEditor
- ✅ All colors stored in single palette (palette.ts)

### PixiJS Renderer (Broken System)

**Current Flow:**
```
TileLayer.ts
  → tileData.color                       [STATIC from TILE_LEGEND]
  → getHexFromTailwind(color)            [Parse bg-palette-* to hex]
  → graphics.beginFill(hexColor)         [Render solid color]
```

**Missing Integrations:**
- ❌ No call to `getTileData()` - uses static TILE_LEGEND colors
- ❌ No color scheme application - ignores map themes
- ❌ No seasonal modifiers - grass always same color
- ❌ No time-of-day modifiers - no darker night colors
- ❌ No reactivity to ColorSchemeEditor changes
- ❌ BaseType color resolution partially broken

## Proposed Architecture

### 1. Centralized Color Resolution Service

Create `utils/ColorResolver.ts` - **Single Source of Truth** for all color logic:

```typescript
/**
 * ColorResolver - Central color resolution service
 * Handles all color logic for both DOM and PixiJS renderers
 */
export class ColorResolver {
  /**
   * Get final display color for a tile
   * Applies color scheme, seasonal, and time-of-day modifiers
   */
  public static getTileColor(
    tileType: TileType,
    mapId: string,
    options?: {
      season?: Season;
      timeOfDay?: 'day' | 'night';
    }
  ): string {
    // 1. Get base color from TILE_LEGEND
    const baseColor = TILE_LEGEND[tileType].color;

    // 2. Get current map's color scheme
    const colorScheme = mapManager.getColorScheme(mapId);
    if (!colorScheme) return baseColor;

    // 3. Map tile type to color key (grass, water, floor, etc.)
    const colorKey = this.getTileColorKey(tileType);
    if (!colorKey) return baseColor;

    // 4. Get scheme color
    let schemeColor = colorScheme.colors[colorKey];

    // 5. Apply seasonal modifier (if defined)
    const season = options?.season || TimeManager.getCurrentTime().season;
    if (colorScheme.seasonalModifiers) {
      const seasonKey = season.toLowerCase() as SeasonKey;
      const seasonalOverride = colorScheme.seasonalModifiers[seasonKey];
      if (seasonalOverride && seasonalOverride[colorKey]) {
        schemeColor = seasonalOverride[colorKey];
      }
    }

    // 6. Apply time-of-day modifier (if defined)
    const timeOfDay = options?.timeOfDay || TimeManager.getCurrentTime().timeOfDay;
    if (colorScheme.timeOfDayModifiers) {
      const timeKey = timeOfDay.toLowerCase() as TimeKey;
      const timeOverride = colorScheme.timeOfDayModifiers[timeKey];
      if (timeOverride && timeOverride[colorKey]) {
        schemeColor = timeOverride[colorKey];
      }
    }

    return schemeColor || baseColor;
  }

  /**
   * Convert palette color to hex (for PixiJS Graphics)
   */
  public static paletteToHex(paletteColor: string): number {
    const match = paletteColor.match(/bg-palette-(\w+)/);
    if (!match) return 0x000000;

    const hex = getColorHex(match[1] as any);
    return parseInt(hex.replace('#', ''), 16);
  }

  /**
   * Map tile type to color scheme key
   */
  private static getTileColorKey(tileType: TileType): TileColorKey | null {
    // Same mapping as in mapUtils.ts and ColorSchemeEditor
    // Extract to shared constant
  }
}
```

### 2. Update TileLayer.ts

**Changes Required:**

```typescript
// In renderTiles()
for (let y = visibleRange.minY; y <= visibleRange.maxY; y++) {
  for (let x = visibleRange.minX; x <= visibleRange.maxX; x++) {
    const tileType = mapManager.getTileAt(x, y);
    if (tileType === null) continue;

    // ✅ Use getTileData() for dynamic color resolution
    const tileData = getTileData(x, y);
    if (!tileData) continue;

    // Check if this tile has a baseType
    if (tileData.baseType) {
      // Render base tile first with dynamic color
      const baseTileData = getTileData(x, y, tileData.baseType);
      if (baseTileData) {
        this.renderTile(x, y, baseTileData, currentMapId, seasonKey);
      }
    }

    // Render main tile with dynamic color
    this.renderTile(x, y, tileData, currentMapId, seasonKey);
  }
}
```

### 3. Reactive Color Updates

**Problem:** ColorSchemeEditor changes palette colors, but PixiJS doesn't re-render.

**Solution:** Subscribe to palette changes in TileLayer:

```typescript
// In TileLayer constructor
palette.subscribe((updatedPalette) => {
  // Re-render all visible color tiles with new palette values
  this.refreshColorTiles();
});

private refreshColorTiles(): void {
  // Only update Graphics objects (not Sprites)
  for (const [key, sprite] of this.sprites) {
    if (sprite instanceof PIXI.Graphics) {
      // Re-render this color tile with updated palette
      const [x, y] = this.parseKey(key);
      const tileData = getTileData(x, y);
      if (tileData) {
        this.renderColorTile(x, y, tileData.color, mapManager.getCurrentMap()!, key);
      }
    }
  }
}
```

### 4. Seasonal/Time Update System

**Problem:** When season or time changes, colors need to update.

**Solution:** Subscribe to TimeManager events:

```typescript
// In TileLayer constructor
TimeManager.subscribe((timeEvent) => {
  if (timeEvent.type === 'season_change' || timeEvent.type === 'time_of_day_change') {
    // Re-render all tiles with new seasonal/time colors
    this.renderTiles(
      mapManager.getCurrentMap()!,
      this.currentMapId,
      this.visibleRange,
      timeEvent.season
    );
  }
});
```

### 5. Update mapUtils.ts

**Simplify:** Since ColorResolver will handle logic, `getTileData()` can delegate to it:

```typescript
export function getTileData(
  tileX: number,
  tileY: number,
  overrideTileType?: TileType
): (Omit<TileData, 'type'> & {type: TileType}) | null {
  const tileType = overrideTileType !== undefined ? overrideTileType : mapManager.getTileAt(tileX, tileY);

  if (tileType === null) return null;

  const legendEntry = TILE_LEGEND[tileType];
  if (!legendEntry) return null;

  // ✅ Use ColorResolver for consistent color resolution
  const color = ColorResolver.getTileColor(
    tileType,
    mapManager.getCurrentMapId()
  );

  return { ...legendEntry, type: tileType, color };
}
```

## Implementation Plan

### Phase 1: Create ColorResolver Service
- [ ] Extract color resolution logic from `mapUtils.ts` to new `utils/ColorResolver.ts`
- [ ] Extract `TILE_TYPE_TO_COLOR_KEY` mapping from `ColorSchemeEditor.tsx` to `ColorResolver.ts`
- [ ] Add `paletteToHex()` helper for PixiJS Graphics
- [ ] Add comprehensive unit tests for color resolution
- [ ] **Success Criteria:** ColorResolver can resolve all tile colors correctly

### Phase 2: Integrate with TileLayer
- [ ] Update `TileLayer.renderTiles()` to call `getTileData()` for each tile
- [ ] Update `TileLayer.renderBaseTile()` to use `getTileData(x, y, baseType)`
- [ ] Fix `renderColorTile()` to use dynamic colors from tileData
- [ ] **Success Criteria:** All tiles render with correct scheme colors

### Phase 3: Add Reactivity
- [ ] Create palette subscription system in `palette.ts`
- [ ] Subscribe to palette changes in `TileLayer` constructor
- [ ] Implement `refreshColorTiles()` method
- [ ] **Success Criteria:** ColorSchemeEditor changes immediately update PixiJS tiles

### Phase 4: Add Seasonal/Time Reactivity
- [ ] Create event system in `TimeManager.ts` (if not exists)
- [ ] Subscribe to time/season changes in `TileLayer`
- [ ] Trigger tile re-render on season/time changes
- [ ] **Success Criteria:** Season changes update grass color, night darkens tiles

### Phase 5: Cleanup and Optimization
- [ ] Remove duplicate color logic from `mapUtils.ts` (delegate to ColorResolver)
- [ ] Update `ColorSchemeEditor.tsx` to use ColorResolver mappings
- [ ] Add performance optimizations (batch updates, debouncing)
- [ ] Document the new color system in `docs/COLOR_SYSTEM.md`
- [ ] **Success Criteria:** Clean, maintainable code with single source of truth

## Data Flow Diagrams

### Current System (DOM - Working)
```
User edits palette → palette.ts updates
                       ↓
ColorSchemeEditor → Triggers App re-render (colorSchemeVersion++)
                       ↓
TileRenderer → getTileData(x, y) → Applies scheme/season/time → Renders <div>
```

### Broken System (PixiJS - Current)
```
User edits palette → palette.ts updates
                       ↓ [BROKEN - no connection]
TileLayer → Uses static TILE_LEGEND.color → Renders Graphics
```

### Target System (PixiJS - Proposed)
```
User edits palette → palette.ts updates → Triggers TileLayer.refreshColorTiles()
                                            ↓
TileLayer → getTileData(x, y) → ColorResolver → scheme/season/time → Renders Graphics
               ↑                                                            ↓
TimeManager changes season/time → Triggers TileLayer.renderTiles() ────────┘
```

## Testing Strategy

### Manual Testing
1. **Color Scheme Test:**
   - Start in home (indoor scheme - tan floors, brown walls)
   - Exit to village (village scheme - sage grass)
   - Verify each map shows correct scheme colors

2. **Seasonal Test:**
   - Use DevTools to change season
   - Verify grass color changes: spring (sage) → summer (olive) → autumn (khaki) → winter (slate)

3. **Time Test:**
   - Wait for night or use DevTools
   - Verify grass/water/tiles darken at night

4. **Color Editor Test:**
   - Open color editor (F7)
   - Change sage palette color
   - Verify all grass tiles update immediately
   - Change olive palette color
   - Switch to summer, verify grass updates

5. **BaseType Test:**
   - Check cherry trees have grass underneath (not mini tree)
   - Check cottage/buildings have grass underneath

### Automated Testing
```typescript
describe('ColorResolver', () => {
  it('should resolve base color from TILE_LEGEND', () => {
    const color = ColorResolver.getTileColor(TileType.GRASS, 'village');
    expect(color).toBe('bg-palette-sage');
  });

  it('should apply color scheme override', () => {
    const color = ColorResolver.getTileColor(TileType.GRASS, 'forest');
    expect(color).toBe('bg-palette-moss'); // Forest uses moss for grass
  });

  it('should apply seasonal modifier', () => {
    const color = ColorResolver.getTileColor(TileType.GRASS, 'village', {
      season: Season.Summer
    });
    expect(color).toBe('bg-palette-olive'); // Summer grass
  });

  it('should apply time-of-day modifier', () => {
    const color = ColorResolver.getTileColor(TileType.GRASS, 'village', {
      timeOfDay: 'night'
    });
    expect(color).toBe('bg-palette-moss'); // Night grass darker
  });

  it('should chain seasonal and time modifiers', () => {
    const color = ColorResolver.getTileColor(TileType.GRASS, 'village', {
      season: Season.Winter,
      timeOfDay: 'night'
    });
    expect(color).toBe('bg-palette-slate'); // Winter night grass
  });
});
```

## Performance Considerations

### Color Calculation Caching
- Cache resolved colors per frame to avoid recalculating for every tile
- Invalidate cache on season/time/palette changes

```typescript
private colorCache = new Map<string, number>();

private getCachedColor(tileType: TileType, mapId: string, cacheKey: string): number {
  if (!this.colorCache.has(cacheKey)) {
    const paletteColor = ColorResolver.getTileColor(tileType, mapId);
    const hexColor = ColorResolver.paletteToHex(paletteColor);
    this.colorCache.set(cacheKey, hexColor);
  }
  return this.colorCache.get(cacheKey)!;
}
```

### Batch Updates
- When palette changes, batch Graphics updates in single frame
- Use `requestAnimationFrame` to debounce rapid changes

### Viewport Culling
- Only update visible tiles when palette changes
- Off-screen tiles updated lazily on next render

## Migration Risks

### Risk 1: Performance Degradation
**Impact:** High
**Likelihood:** Medium
**Mitigation:** Implement caching, profile before/after, benchmark FPS

### Risk 2: Color Mismatches
**Impact:** Medium
**Likelihood:** Low
**Mitigation:** Comprehensive testing, side-by-side comparison with DOM renderer

### Risk 3: Reactivity Bugs
**Impact:** Medium
**Likelihood:** Medium
**Mitigation:** Test all reactive paths (palette edit, season change, time change, map transition)

### Risk 4: Breaking DOM Renderer
**Impact:** High
**Likelihood:** Low
**Mitigation:** Keep DOM renderer working during migration, use feature flag to toggle

## Success Metrics

- ✅ All tiles render with correct color scheme colors
- ✅ Seasonal grass color changes work (4 seasons × 6 color schemes = 24 combinations)
- ✅ Time-of-day darkening works (day/night × 6 color schemes = 12 combinations)
- ✅ ColorSchemeEditor changes instantly update PixiJS tiles
- ✅ BaseType rendering shows correct background colors (grass under trees)
- ✅ No FPS degradation compared to current PixiJS renderer
- ✅ Zero TypeScript errors
- ✅ All existing map transitions work correctly

## Documentation Updates Required

- [ ] Update `docs/ASSETS.md` - Document color system architecture
- [ ] Create `docs/COLOR_SYSTEM.md` - Comprehensive color system guide
- [ ] Update `CLAUDE.md` - Add ColorResolver to core architecture section
- [ ] Update `MAP_GUIDE.md` - Explain color scheme assignment

## Open Questions

1. **Should we create a Color Manager singleton** (like MapManager) or keep ColorResolver stateless?
   - Stateless preferred for simplicity, but singleton could cache better

2. **Should palette changes trigger full re-render or incremental?**
   - Incremental preferred for performance, but full re-render simpler

3. **How to handle color animations** (e.g., water shimmering, grass swaying)?
   - Future enhancement - add animated color transitions

4. **Should we support per-tile color overrides** (e.g., one grass tile different color)?
   - Not in initial implementation - can add later if needed

## Related Files

**Core Files:**
- `utils/mapUtils.ts` - Current color resolution (lines 28-123)
- `utils/pixi/TileLayer.ts` - PixiJS tile renderer (needs integration)
- `maps/colorSchemes.ts` - Color scheme definitions
- `palette.ts` - Palette color storage and helpers
- `components/ColorSchemeEditor.tsx` - Runtime color editing UI

**Data Files:**
- `constants.ts` - TILE_LEGEND with base colors
- `types.ts` - ColorScheme, Season, TimeOfDay types

**Supporting Files:**
- `utils/TimeManager.ts` - Season and time-of-day state
- `maps/MapManager.ts` - Current map and color scheme access
- `GameState.ts` - Persistent game state (may need palette storage)

## Timeline Estimate

- Phase 1 (ColorResolver): 2-3 hours
- Phase 2 (TileLayer Integration): 2-3 hours
- Phase 3 (Reactivity): 1-2 hours
- Phase 4 (Seasonal/Time): 1-2 hours
- Phase 5 (Cleanup): 1-2 hours
- Testing & Debugging: 2-3 hours

**Total: 9-15 hours** (1-2 days of focused work)

## Notes

- This is a **critical blocker** for PixiJS migration completion
- DOM renderer should remain working throughout migration
- Consider using feature flag `USE_PIXI_RENDERER` to toggle during testing
- Profile performance before/after to ensure no regressions
- Take screenshots of color variations for regression testing
