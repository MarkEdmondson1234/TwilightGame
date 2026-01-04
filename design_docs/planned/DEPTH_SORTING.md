# Dynamic Depth Sorting for Multi-Tile Sprites

**STATUS: ✅ IMPLEMENTED** (2026-01-04)

All phases completed. Key implementation details:
- Shared `depthSortedContainer` in App.tsx holds all depth-sorted entities
- SpriteLayer, PlayerSprite, and NPCLayer use `setDepthContainer()` to share one container
- All entities use formula: `zIndex = Z_DEPTH_SORTED_BASE + Math.floor(feetY * 10)`
- Depth line visualization added to debug collision overlay

## Problem Statement

Currently, multi-tile sprites like cottages, trees, and buildings use **fixed z-indexes**:
- Background sprites: `Z_SPRITE_BACKGROUND = 50` (always behind player)
- Foreground sprites: `Z_SPRITE_FOREGROUND = 200` (always in front of player)

This creates an all-or-nothing situation where the player either appears completely in front of or completely behind a sprite. For large sprites like cottages, this breaks immersion - the player should be able to walk behind the building when at the top, but appear in front of the doorway when at the bottom.

### Current Z-Index System

| Layer | Z-Index | Sorting |
|-------|---------|---------|
| Ground decorations | 25 | Fixed |
| Background sprites | 50 | Fixed |
| Player | 100 | Fixed |
| NPCs | 100 + floor(feetY) | **Dynamic** |
| Foreground sprites | 200 | Fixed |

NPCs already use dynamic depth sorting based on their Y position. Sprites should do the same.

## Proposed Solution

### Concept: Depth Line

Each sprite has a **depth line** - a Y position that determines sorting. When an entity's feet are:
- **Above the depth line** (lower Y): Entity appears **behind** the sprite
- **Below the depth line** (higher Y): Entity appears **in front** of the sprite

```
        ┌─────────────────┐
        │     ROOF        │  ← Player behind here
        │                 │
        ├─────────────────┤  ← Depth Line (Y = anchor + depthOffset)
        │    DOORWAY      │  ← Player in front here
        │    ██████       │
        └─────────────────┘
             Anchor
```

### Algorithm

```typescript
// For each sprite:
const depthLineY = anchorY + (metadata.depthLineOffset ?? defaultDepthOffset);
const spriteZIndex = Z_DEPTH_SORTED_BASE + Math.floor(depthLineY * 10); // *10 for sub-tile precision

// For player:
const playerFeetY = playerPos.y + PLAYER_FEET_OFFSET; // ~0.8 tiles from center
const playerZIndex = Z_DEPTH_SORTED_BASE + Math.floor(playerFeetY * 10);

// Z-ordering happens automatically via PixiJS sortableChildren
```

### New Z-Index Range

Reserve a dedicated range for depth-sorted entities (100-199):

```typescript
// zIndex.ts additions
export const Z_DEPTH_SORTED_BASE = 100;  // Base for all depth-sorted entities
export const Z_DEPTH_SORTED_MAX = 199;   // Maximum for depth-sorted range
```

All depth-sorted entities (player, NPCs, certain sprites) use `Z_DEPTH_SORTED_BASE + floor(feetY * 10)`.

## Implementation Plan (Option B: Single SpriteLayer)

### Phase 1: Schema Updates (Low effort)

**File: `types/tiles.ts`**

Add to `SpriteMetadata`:
```typescript
interface SpriteMetadata {
  // ... existing fields ...

  /**
   * Y offset from anchor for depth line (in tiles)
   * Default: calculated from collision box bottom
   * The depth line determines where the sprite sorts relative to player/NPCs
   */
  depthLineOffset?: number;
}
```

Note: `isForeground` is kept for backward compatibility but will be ignored.

**Effort: ~15 minutes**

---

### Phase 2: Merge SpriteLayer Instances (Medium effort)

**Files:**
- `utils/pixi/SpriteLayer.ts` - Remove foreground/background distinction
- `App.tsx` or renderer setup - Use single SpriteLayer instance

Changes to SpriteLayer:
```typescript
export class SpriteLayer extends PixiLayer {
  constructor() {
    // Single layer - no foreground/background parameter
    super(Z_DEPTH_SORTED_BASE, true); // sortableChildren = true
  }

  private calculateDepthLine(anchorY: number, metadata: SpriteMetadata): number {
    // Use explicit offset if provided
    if (metadata.depthLineOffset !== undefined) {
      return anchorY + metadata.depthLineOffset;
    }

    // Default: collision box bottom
    const collisionBottom = anchorY
      + (metadata.collisionOffsetY ?? metadata.offsetY)
      + (metadata.collisionHeight ?? metadata.spriteHeight);
    return collisionBottom;
  }

  // In renderSpriteWithImage():
  const depthLineY = this.calculateDepthLine(anchorY, metadata);
  sprite.zIndex = Z_DEPTH_SORTED_BASE + Math.floor(depthLineY * 10);
}
```

**Effort: ~1-2 hours**

---

### Phase 3: Player Dynamic Z-Index (Low effort)

**File: `utils/pixi/PlayerSprite.ts`**

```typescript
// In update()
const PLAYER_FEET_OFFSET = 0.8; // Feet ~0.8 tiles below center
const playerFeetY = playerPos.y + PLAYER_FEET_OFFSET;
this.sprite.zIndex = Z_DEPTH_SORTED_BASE + Math.floor(playerFeetY * 10);
```

**Effort: ~30 minutes**

---

### Phase 4: Align NPC Z-Index (Low effort)

**File: `utils/pixi/NPCLayer.ts`**

Update to use same base constant:
```typescript
// Change from:
sprite.zIndex = npc.zIndexOverride ?? (Z_PLAYER + Math.floor(feetY));

// To:
sprite.zIndex = npc.zIndexOverride ?? (Z_DEPTH_SORTED_BASE + Math.floor(feetY * 10));
```

**Effort: ~15 minutes**

---

### Phase 5: Update Z-Index Constants (Low effort)

**File: `zIndex.ts`**

```typescript
// Add new constant for depth-sorted entities
export const Z_DEPTH_SORTED_BASE = 100;

// These become unused but keep for reference:
// export const Z_SPRITE_BACKGROUND = 50;  // DEPRECATED
// export const Z_SPRITE_FOREGROUND = 200; // DEPRECATED
```

**Effort: ~15 minutes**

---

### Phase 6: Sprite Metadata Editor UI (Medium effort)

**File: `components/SpriteMetadataEditor/SpriteMetadataEditor.tsx`**

Add depth line control and visual preview:

```tsx
{/* Depth Sorting */}
<div className="sprite-form-section">
  <h4>Depth Line</h4>
  <p className="sprite-form-hint">
    The Y position where the sprite sorts with player/NPCs.
    Default: collision box bottom.
  </p>
  <div className="sprite-form-row">
    <label>
      Offset from anchor:
      <input
        type="number"
        step="0.1"
        value={selectedSprite.depthLineOffset ?? calculatedDefault}
        onChange={(e) => handleFieldChange('depthLineOffset', parseFloat(e.target.value))}
      />
    </label>
    <button onClick={() => handleFieldChange('depthLineOffset', undefined)}>
      Reset to Default
    </button>
  </div>
</div>
```

Visual preview: Draw horizontal blue line at depth line position.

**Effort: ~1-2 hours**

---

### Phase 7: Clean Up Renderer Setup (Low effort)

**File: `App.tsx` or PixiJS setup file**

Remove:
```typescript
// Before:
const backgroundSpriteLayer = new SpriteLayer(false);
const foregroundSpriteLayer = new SpriteLayer(true);

// After:
const spriteLayer = new SpriteLayer();
```

Update render calls to use single layer.

**Effort: ~30 minutes**

---

### Phase 8: Testing & Polish (Medium effort)

- Test cottage: walk behind roof, in front of door
- Test trees: walk behind canopy, in front of trunk
- Test ground decorations: always at ground level
- Test NPCs sorting with sprites
- Test map transitions
- Performance check with many sprites

**Effort: ~1-2 hours**

---

## Revised Total Effort Estimate

| Phase | Task | Effort |
|-------|------|--------|
| 1 | Schema updates | 15 min |
| 2 | Merge SpriteLayer | 1-2 hours |
| 3 | PlayerSprite z-index | 30 min |
| 4 | NPC z-index alignment | 15 min |
| 5 | Z-index constants | 15 min |
| 6 | Editor UI | 1-2 hours |
| 7 | Renderer cleanup | 30 min |
| 8 | Testing & polish | 1-2 hours |
| **Total** | | **5-8 hours** |

Option B is ~2-4 hours faster than the original estimate since we're simplifying rather than adding complexity.

## Risks and Mitigations

### Risk 1: Performance Impact
Dynamic z-index calculation happens every frame for visible sprites.
- **Mitigation:** Only calculate for sprites with `useDepthSorting: true`
- **Mitigation:** Z-index only updates when player moves significantly

### Risk 2: Visual Glitches
Sprites may "pop" between layers unexpectedly.
- **Mitigation:** Use `* 10` multiplier for sub-tile precision
- **Mitigation:** Add debug overlay showing depth lines

### Risk 3: Backward Compatibility
Existing sprites should continue to work.
- **Mitigation:** `useDepthSorting` defaults to `false`
- **Mitigation:** Existing `isForeground` logic remains as fallback

### Risk 4: Edge Cases
Player at exact depth line, multiple overlapping sprites.
- **Mitigation:** Consistent rounding (always `Math.floor`)
- **Mitigation:** Add tie-breaker based on X position if needed

## Testing Plan

1. **Unit tests:** Z-index calculation logic
2. **Visual tests:**
   - Walk behind cottage roof
   - Walk in front of cottage doorway
   - Multiple sprites at different depths
   - NPCs and player sorting correctly with sprites
3. **Edge cases:**
   - Player exactly at depth line
   - Sprites overlapping each other
   - Map transitions preserve sorting
4. **Performance:**
   - FPS with 20+ depth-sorted sprites
   - Memory usage comparison

## Future Enhancements

1. **Per-sprite depth line visualisation** in debug overlay (F3)
2. **Automatic depth line detection** from sprite image analysis
3. **Layered sprites** - split single sprite into base + roof for pixel-perfect sorting
4. **Y-sorting for ground items** - dropped items sort with player

## Decision: Option B - Single SpriteLayer

**Chosen approach:** Merge foreground/background SpriteLayer instances into a single layer where all sprites calculate z-index dynamically based on their depth line.

**Rationale:**
- Simplest code - one layer to manage
- All sprites naturally sort with player and NPCs
- No coordination between layers needed
- Most games use this approach
- Clean mental model: everything depth-sorts by Y position

**Implications:**
- Remove `isForeground` boolean from SpriteMetadata (deprecated)
- Remove separate foreground/background SpriteLayer instances
- All sprites use dynamic z-index: `Z_DEPTH_SORTED_BASE + floor(depthLineY * 10)`
- Ground decorations (ferns, tufts) use their anchor Y as depth line (appear at ground level)
- Tall sprites (trees, buildings) use collision box bottom as depth line

**Migration:**
- Existing `isForeground: true` sprites → `depthLineOffset` calculated from collision box
- Existing `isForeground: false` sprites → same calculation
- `isForeground` field kept for backward compatibility but ignored

## References

- [zIndex.ts](../../zIndex.ts) - Current z-index constants
- [SpriteLayer.ts](../../utils/pixi/SpriteLayer.ts) - Current sprite rendering
- [PlayerSprite.ts](../../utils/pixi/PlayerSprite.ts) - Player rendering
- [NPCLayer.ts](../../utils/pixi/NPCLayer.ts) - Reference for dynamic z-index
