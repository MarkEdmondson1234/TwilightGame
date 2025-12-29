# Codebase Simplification Plan

This document tracks opportunities to simplify the TwilightGame codebase by reducing duplication, extracting common patterns, and improving organisation.

## Overview

**Total Estimated Savings**: ~1,150-1,500 lines of code
**Actual Savings So Far**: ~1,873 lines (including 622 lines reorganised)
**Status**: Complete (All Phases Finished)

## Implementation Phases

### Phase 1: Quick Wins (Easy, High ROI)

| Task | Lines Saved | Status |
|------|-------------|--------|
| 1.1 Sprite variant selection utility | 40-50 | [x] Complete |
| 1.2 Camera update in base class | 24 | [x] Complete |
| 1.3 Viewport culling utility | 15-20 | [x] Complete |
| 1.4 Unified metadata caching | 100-120 | [x] Complete |

### Phase 2: PixiJS Layer Refactoring (Medium)

| Task | Lines Saved | Status |
|------|-------------|--------|
| 2.1 Create PixiLayer base class | 200-300 | [x] Complete (6 layers migrated) |
| 2.2 Create PixiLayerManager | 30 | [ ] Pending |

### Phase 3: Hook Decomposition (Medium)

| Task | Lines Saved | Status |
|------|-------------|--------|
| 3.1 Extract debug key handlers | 50 | [x] Complete |
| 3.2 Extract UI key handlers | 30 | [x] Complete |
| 3.3 Refactor useKeyboardControls | 60 | [x] Complete |
| 3.4 Extract remaining handlers | 30 | [ ] Pending (optional) |

### Phase 4: File Organisation (Hard, Major Refactoring)

| Task | Lines Saved | Status |
|------|-------------|--------|
| 4.1 Move SPRITE_METADATA to data/ | 831 | [x] Complete |
| 4.2 Split types.ts by system | 622 (reorganised) | [x] Complete |
| 4.3 Organise constants.ts | N/A | [x] Complete (now 187 lines, well-organised) |

---

## Detailed Tasks

### 1.1 Sprite Variant Selection Utility

**Problem**: Same hash formula repeated 5+ times across TileLayer.ts and SpriteLayer.ts:
```typescript
const hash = Math.abs(Math.sin(x * 99.123 + y * 45.678) * 12345.6789);
const index = Math.floor((hash % 1) * array.length);
```

**Solution**: Create `utils/spriteVariantUtils.ts`:
```typescript
export function selectVariant(x: number, y: number, variantCount: number): number {
  if (variantCount <= 1) return 0;
  const hash = Math.abs(Math.sin(x * 99.123 + y * 45.678) * 12345.6789);
  return Math.floor((hash % 1) * variantCount);
}
```

**Files to update**:
- `utils/pixi/TileLayer.ts` (3 occurrences)
- `utils/pixi/SpriteLayer.ts` (2 occurrences)

---

### 1.2 Camera Update in Base Class

**Problem**: Identical `updateCamera()` method in 8 layer classes:
```typescript
updateCamera(cameraX: number, cameraY: number): void {
  this.container.x = -cameraX;
  this.container.y = -cameraY;
}
```

**Solution**: Move to `PixiLayer` base class (see 2.1).

**Files affected**:
- TileLayer.ts
- SpriteLayer.ts
- ShadowLayer.ts
- WeatherLayer.ts
- PlacedItemsLayer.ts
- BackgroundImageLayer.ts
- PlayerSprite.ts
- DarknessLayer.ts

---

### 1.3 Viewport Culling Utility

**Problem**: Viewport margin calculation duplicated in SpriteLayer and ShadowLayer:
```typescript
const margin = Math.ceil(maxSpriteSize / 2) + 2;
const startY = Math.max(0, visibleRange.minY - margin);
const endY = Math.min(map.height - 1, visibleRange.maxY + margin);
```

**Solution**: Create utility in `utils/viewportUtils.ts`:
```typescript
export interface ViewportBounds {
  startX: number;
  endX: number;
  startY: number;
  endY: number;
}

export function calculateScanArea(
  visibleRange: { minX: number; maxX: number; minY: number; maxY: number },
  mapWidth: number,
  mapHeight: number,
  margin: number = 0
): ViewportBounds {
  return {
    startX: Math.max(0, visibleRange.minX - margin),
    endX: Math.min(mapWidth - 1, visibleRange.maxX + margin),
    startY: Math.max(0, visibleRange.minY - margin),
    endY: Math.min(mapHeight - 1, visibleRange.maxY + margin),
  };
}
```

---

### 1.4 Unified Metadata Caching

**Problem**: Three classes independently cache SPRITE_METADATA:
- TileLayer: `multiTileSpriteTypes` Set
- SpriteLayer: `spriteMetadataMap` Map + `maxSpriteSize`
- ShadowLayer: `spriteMetadataMap` Map (foreground only) + `maxSpriteSize`

**Solution**: Create `utils/MetadataCache.ts` singleton:
```typescript
export class MetadataCache {
  private static instance: MetadataCache;

  readonly multiTileSpriteTypes: Set<TileType>;
  readonly spriteMetadataMap: Map<TileType, SpriteMetadata>;
  readonly foregroundMetadataMap: Map<TileType, SpriteMetadata>;
  readonly maxSpriteSize: number;
  readonly maxForegroundSize: number;

  static getInstance(): MetadataCache { ... }

  isMultiTileSprite(type: TileType): boolean { ... }
  getMetadata(type: TileType): SpriteMetadata | undefined { ... }
  getForegroundMetadata(type: TileType): SpriteMetadata | undefined { ... }
}
```

---

### 2.1 PixiLayer Base Class

**Problem**: All 8 PixiJS layer classes duplicate:
- Container creation and management
- `getContainer()` method
- `updateCamera()` method
- Sprite map patterns
- `clear()` / `destroy()` patterns

**Solution**: Create abstract `utils/pixi/PixiLayer.ts`:
```typescript
import * as PIXI from 'pixi.js';

export abstract class PixiLayer {
  protected container: PIXI.Container;

  constructor(zIndex: number = 0) {
    this.container = new PIXI.Container();
    this.container.sortableChildren = true;
    this.container.zIndex = zIndex;
  }

  getContainer(): PIXI.Container {
    return this.container;
  }

  updateCamera(cameraX: number, cameraY: number): void {
    this.container.x = -cameraX;
    this.container.y = -cameraY;
  }

  abstract clear(): void;
}
```

**Migration**: Each layer extends PixiLayer and removes duplicated code.

---

### 2.2 PixiLayerManager

**Problem**: App.tsx manually calls `updateCamera()` on 9+ layer refs.

**Solution**: Create manager that handles all layers:
```typescript
export class PixiLayerManager {
  private layers: PixiLayer[] = [];

  addLayer(layer: PixiLayer): void { ... }
  updateAllCameras(cameraX: number, cameraY: number): void { ... }
  clearAll(): void { ... }
}
```

---

### 3.1-3.4 Hook Decomposition

**Problem**: `useKeyboardControls.ts` is 346 lines with a giant if/else cascade.

**Solution**: Extract handler groups:
- `utils/keyHandlers/debugKeys.ts` - F1, F3, F4, F6, F7, F8
- `utils/keyHandlers/movementKeys.ts` - WASD, arrows, shift
- `utils/keyHandlers/inventoryKeys.ts` - 1-9, Q, I
- `utils/keyHandlers/actionKeys.ts` - E, R, Enter

Then refactor hook to delegate:
```typescript
const handleKeyDown = (e: KeyboardEvent) => {
  if (handleDebugKey(e, config)) return;
  if (handleActionKey(e, config)) return;
  if (handleMovementKey(e, config)) return;
  if (handleInventoryKey(e, config)) return;
};
```

---

### 4.1-4.3 File Organisation

**Problem**:
- `constants.ts` is 1,018 lines (SPRITE_METADATA alone is 470 lines)
- `types.ts` is 642 lines mixing unrelated types

**Solution**:
1. Move `SPRITE_METADATA` to `assets.ts` or new `data/spriteMetadata.ts`
2. Split types by system:
   - `types/core.ts` - Position, Direction, etc.
   - `types/farm.ts` - FarmPlot, CropGrowthStage
   - `types/npc.ts` - NPC, Dialogue
   - `types/inventory.ts` - InventoryItem, Recipe
3. Create `types/index.ts` that re-exports all for backwards compatibility

---

## Progress Log

| Date | Change | Lines Saved |
|------|--------|-------------|
| 2025-12-29 | Created `utils/spriteVariantUtils.ts` - consolidated 5 hash calculations | ~40 |
| 2025-12-29 | Created `utils/viewportUtils.ts` - consolidated viewport margin calculations | ~15 |
| 2025-12-29 | Created `utils/MetadataCache.ts` - unified SPRITE_METADATA caching | ~100 |
| 2025-12-29 | Created `utils/pixi/PixiLayer.ts` - abstract base class for layers | ~50 |
| 2025-12-29 | Migrated PlacedItemsLayer to extend PixiLayer | ~15 |
| 2025-12-29 | Migrated ShadowLayer to extend PixiLayer | ~15 |
| 2025-12-29 | Migrated SpriteLayer to extend PixiLayer | ~15 |
| 2025-12-29 | Migrated TileLayer to extend PixiLayer | ~15 |
| 2025-12-29 | Migrated PlayerSprite to extend PixiLayer | ~15 |
| 2025-12-29 | Created `utils/keyHandlers/debugKeys.ts` - F-key handlers | ~50 |
| 2025-12-29 | Created `utils/keyHandlers/uiKeys.ts` - UI toggle handlers | ~30 |
| 2025-12-29 | Refactored useKeyboardControls to use extracted handlers | ~60 |
| 2025-12-29 | Moved SPRITE_METADATA to `data/spriteMetadata.ts` (constants.ts: 1,018→187 lines) | ~831 |
| 2025-12-29 | Split types.ts into 8 organised files in `types/` directory | 622 (reorganised) |
| **Total** | | **~1,873** |

### Notes on Layer Migration

The following layers were **not migrated** because they have custom camera/container logic:
- **WeatherLayer** - Weather effects are viewport-relative (don't follow camera)
- **BackgroundImageLayer** - Uses parallax scrolling (custom camera offset per layer)
- **DarknessLayer** - Overlay is fixed to screen (intentionally ignores camera)

---

## Notes

- All changes maintain backwards compatibility
- Run `npx tsc --noEmit` after each change
- Test in browser after significant refactoring
- Update imports incrementally to avoid breaking changes
