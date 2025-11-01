# PixiJS Migration Design Document

**Status**: Planned
**Priority**: High
**Estimated Effort**: 2-3 days
**Performance Gain**: 10-100x faster rendering

---

## Executive Summary

Migrate the game's rendering system from DOM-based (React divs/imgs) to WebGL-based (PixiJS) for significant performance improvements. This will enable 60 FPS gameplay on all devices, support for thousands of sprites, and unlock advanced visual effects (particles, lighting, shaders).

**Current State**: 30x30 map = ~1,800 DOM nodes (900 divs + 900 imgs)
**Future State**: 30x30 map = 1 canvas element with GPU-accelerated rendering

---

## Table of Contents

1. [Motivation](#motivation)
2. [Technical Overview](#technical-overview)
3. [Migration Strategy](#migration-strategy)
4. [Implementation Plan](#implementation-plan)
5. [File Changes](#file-changes)
6. [API Design](#api-design)
7. [Testing Strategy](#testing-strategy)
8. [Rollback Plan](#rollback-plan)
9. [Future Enhancements](#future-enhancements)

---

## Motivation

### Current Performance Bottlenecks

1. **DOM Rendering Overhead**
   - Each tile = 2 DOM elements (div + img)
   - 30x30 map = 1,800 elements in render tree
   - Browser must calculate layout/paint for all elements
   - React reconciliation overhead on state changes

2. **Re-render Performance**
   - Every state change triggers full component re-render
   - Viewport culling helps but doesn't eliminate overhead
   - Animation frame updates cause jank (inconsistent FPS)

3. **Scalability Limits**
   - Current: 30x30 maps max (900 tiles)
   - Larger maps (50x50 = 2,500 tiles) would be unplayable
   - Can't add particle effects (rain, snow, fireflies)
   - Limited sprite count for NPCs/items

### Expected Benefits

| Metric | Current (DOM) | With PixiJS | Improvement |
|--------|---------------|-------------|-------------|
| Render time (30x30 map) | ~15-20ms | ~1-2ms | **10x faster** |
| Max sprites | ~500 | 10,000+ | **20x more** |
| Frame rate (average) | 30-45 FPS | 60 FPS | **Consistent 60** |
| Memory usage | High (DOM nodes) | Low (GPU textures) | **50% reduction** |
| Mobile performance | Poor | Excellent | **Playable on all devices** |

---

## Technical Overview

### PixiJS Architecture

```
┌─────────────────────────────────────────┐
│           React Component Tree          │
│  (App.tsx, HUD, DialogueBox, etc.)     │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│         @pixi/react: <Stage>            │
│  (Single React component wrapping       │
│   PixiJS renderer)                      │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│          PixiJS Application             │
│  - WebGL/Canvas Renderer                │
│  - Ticker (game loop)                   │
│  - Stage (root container)               │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│         Display Object Tree             │
│  - TileContainer (all tiles)            │
│  - BackgroundSprites                    │
│  - NPCContainer                         │
│  - PlayerSprite                         │
│  - ForegroundSprites                    │
│  - AnimationContainer (particles)       │
└─────────────────────────────────────────┘
```

### Key Concepts

**Stage**: Root container, equivalent to `<div id="game">`
**Container**: Group of sprites, equivalent to `<div className="layer">`
**Sprite**: Single image, equivalent to `<img src="..." />`
**Texture**: GPU-loaded image (cached, reused)
**Ticker**: Game loop (replaces `requestAnimationFrame`)

---

## Migration Strategy

### Phase 1: Parallel Implementation (Low Risk)

Create PixiJS renderer **alongside** existing DOM renderer:

1. Add feature flag: `USE_PIXI_RENDERER = false` in constants.ts
2. Implement new PixiJS components in `components/pixi/`
3. Keep existing DOM components untouched
4. Test both renderers side-by-side
5. Switch via flag when ready

**Advantages**:
- Zero risk to existing functionality
- Can A/B test performance
- Easy rollback if issues arise

### Phase 2: Gradual Migration (Component-by-Component)

Migrate rendering in this order:

1. **TileRenderer** (simplest, highest impact)
2. **BackgroundSprites** (multi-tile furniture)
3. **NPCRenderer** (animated sprites)
4. **PlayerSprite** (character animation)
5. **AnimationOverlay** (GIFs → PixiJS AnimatedSprite)
6. **ForegroundSprites** (trees, buildings)

### Phase 3: Optimization & Enhancement

After migration complete:

1. Add sprite batching (group similar tiles)
2. Implement texture atlases (reduce draw calls)
3. Add particle systems (weather, effects)
4. Add lighting/shaders (day/night cycle)

---

## Implementation Plan

### Step 1: Setup PixiJS Infrastructure

**File**: `components/pixi/PixiGameStage.tsx`

```typescript
import { Stage } from '@pixi/react';
import { Application } from 'pixi.js';

interface PixiGameStageProps {
  width: number;
  height: number;
  children: React.ReactNode;
}

export const PixiGameStage: React.FC<PixiGameStageProps> = ({
  width,
  height,
  children
}) => {
  return (
    <Stage
      width={width}
      height={height}
      options={{
        backgroundColor: 0x000000,
        antialias: false, // Pixel art = no antialiasing
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      }}
    >
      {children}
    </Stage>
  );
};
```

### Step 2: Create Texture Manager

**File**: `utils/TextureManager.ts`

```typescript
import { Texture, BaseTexture, SCALE_MODES } from 'pixi.js';

class TextureManager {
  private textureCache: Map<string, Texture> = new Map();

  loadTexture(key: string, url: string): Texture {
    if (this.textureCache.has(key)) {
      return this.textureCache.get(key)!;
    }

    const baseTexture = BaseTexture.from(url, {
      scaleMode: SCALE_MODES.NEAREST, // Pixel-perfect rendering
    });
    const texture = new Texture(baseTexture);
    this.textureCache.set(key, texture);
    return texture;
  }

  preloadTextures(assets: Record<string, string>): Promise<void> {
    const promises = Object.entries(assets).map(([key, url]) => {
      return new Promise<void>((resolve) => {
        const texture = this.loadTexture(key, url);
        texture.baseTexture.on('loaded', () => resolve());
      });
    });
    return Promise.all(promises).then(() => {});
  }

  getTexture(key: string): Texture | undefined {
    return this.textureCache.get(key);
  }

  clear(): void {
    this.textureCache.forEach(texture => texture.destroy(true));
    this.textureCache.clear();
  }
}

export const textureManager = new TextureManager();
```

### Step 3: Migrate TileRenderer

**File**: `components/pixi/PixiTileRenderer.tsx`

```typescript
import { Container, Sprite } from '@pixi/react';
import { useCallback, useMemo } from 'react';
import { TILE_SIZE } from '../../constants';
import { MapDefinition } from '../../types';
import { getTileData } from '../../utils/mapUtils';
import { textureManager } from '../../utils/TextureManager';

interface PixiTileRendererProps {
  currentMap: MapDefinition;
  visibleRange: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
  cameraX: number;
  cameraY: number;
}

export const PixiTileRenderer: React.FC<PixiTileRendererProps> = ({
  currentMap,
  visibleRange,
  cameraX,
  cameraY,
}) => {
  // Generate tile sprites for visible area
  const tiles = useMemo(() => {
    const sprites: Array<{
      x: number;
      y: number;
      texture: string;
      tint: number;
    }> = [];

    for (let y = visibleRange.minY; y <= visibleRange.maxY; y++) {
      for (let x = visibleRange.minX; x <= visibleRange.maxX; x++) {
        const tileData = getTileData(x, y);
        if (!tileData || !tileData.image) continue;

        // Select image variant (deterministic hash - same as current implementation)
        const hash = Math.abs(Math.sin(x * 12.9898 + y * 78.233) * 43758.5453);
        const index = Math.floor((hash % 1) * tileData.image.length);
        const imageUrl = tileData.image[index];

        sprites.push({
          x: x * TILE_SIZE,
          y: y * TILE_SIZE,
          texture: imageUrl,
          tint: 0xffffff, // White = no tint (future: use for color schemes)
        });
      }
    }

    return sprites;
  }, [currentMap, visibleRange]);

  return (
    <Container x={-cameraX} y={-cameraY}>
      {tiles.map((tile, index) => {
        const texture = textureManager.getTexture(tile.texture);
        if (!texture) return null;

        return (
          <Sprite
            key={`tile-${index}`}
            texture={texture}
            x={tile.x}
            y={tile.y}
            width={TILE_SIZE}
            height={TILE_SIZE}
            tint={tile.tint}
          />
        );
      })}
    </Container>
  );
};
```

### Step 4: Migrate Player Sprite

**File**: `components/pixi/PixiPlayer.tsx`

```typescript
import { Sprite } from '@pixi/react';
import { TILE_SIZE, PLAYER_SIZE } from '../../constants';
import { Position } from '../../types';
import { textureManager } from '../../utils/TextureManager';

interface PixiPlayerProps {
  position: Position;
  spriteUrl: string;
  spriteScale: number;
  cameraX: number;
  cameraY: number;
}

export const PixiPlayer: React.FC<PixiPlayerProps> = ({
  position,
  spriteUrl,
  spriteScale,
  cameraX,
  cameraY,
}) => {
  const texture = textureManager.getTexture(spriteUrl);
  if (!texture) return null;

  const x = (position.x - (PLAYER_SIZE * spriteScale) / 2) * TILE_SIZE - cameraX;
  const y = (position.y - (PLAYER_SIZE * spriteScale) / 2) * TILE_SIZE - cameraY;
  const size = PLAYER_SIZE * spriteScale * TILE_SIZE;

  return (
    <Sprite
      texture={texture}
      x={x}
      y={y}
      width={size}
      height={size}
      anchor={{ x: 0, y: 0 }}
    />
  );
};
```

### Step 5: Integrate into App.tsx

**File**: `App.tsx` (modified)

```typescript
import { PixiGameStage } from './components/pixi/PixiGameStage';
import { PixiTileRenderer } from './components/pixi/PixiTileRenderer';
import { PixiPlayer } from './components/pixi/PixiPlayer';

// Inside App component render:
const USE_PIXI = true; // Feature flag

return (
  <div className="bg-gray-900 text-white w-screen h-screen overflow-hidden">
    {USE_PIXI ? (
      // PixiJS Renderer
      <PixiGameStage width={window.innerWidth} height={window.innerHeight}>
        <PixiTileRenderer
          currentMap={currentMap}
          visibleRange={visibleRange}
          cameraX={cameraX}
          cameraY={cameraY}
        />
        <PixiPlayer
          position={playerPos}
          spriteUrl={playerSpriteUrl}
          spriteScale={spriteScale}
          cameraX={cameraX}
          cameraY={cameraY}
        />
      </PixiGameStage>
    ) : (
      // Existing DOM Renderer (fallback)
      <div style={{ transform: `translate(${-cameraX}px, ${-cameraY}px)` }}>
        <TileRenderer {...tileProps} />
        {/* ... rest of DOM components */}
      </div>
    )}

    {/* UI components remain DOM-based (HUD, DialogueBox, etc.) */}
    <HUD />
    {activeNPC && <DialogueBox {...dialogueProps} />}
  </div>
);
```

---

## File Changes

### New Files to Create

```
components/pixi/
├── PixiGameStage.tsx           # Main PixiJS Stage wrapper
├── PixiTileRenderer.tsx        # Tile layer (replaces TileRenderer.tsx)
├── PixiBackgroundSprites.tsx   # Background multi-tile sprites
├── PixiPlayer.tsx              # Player sprite
├── PixiNPCRenderer.tsx         # NPC sprites
├── PixiForegroundSprites.tsx   # Foreground sprites (trees, etc.)
├── PixiAnimationOverlay.tsx    # Particle effects (replaces GIF animations)
└── PixiDebugOverlay.tsx        # Collision boxes, debug info

utils/
├── TextureManager.ts           # Texture loading/caching
├── PixiHelpers.ts              # Utility functions (coordinate conversion, etc.)
└── ParticleEffects.ts          # Particle system definitions

hooks/
└── usePixiApp.ts               # Hook for accessing PixiJS Application instance
```

### Files to Modify

```
App.tsx                         # Integrate PixiJS renderer
constants.ts                    # Add USE_PIXI_RENDERER flag
assets.ts                       # Preload all textures on startup
gameInitializer.ts              # Initialize TextureManager
```

### Files to Keep (Initially)

All existing DOM components remain as fallback:
- `TileRenderer.tsx`
- `BackgroundSprites.tsx`
- `NPCRenderer.tsx`
- `AnimationOverlay.tsx`
- etc.

**Removal**: After PixiJS migration is stable and tested (2-4 weeks), remove DOM components.

---

## API Design

### TextureManager API

```typescript
// Preload all game textures on startup
await textureManager.preloadTextures({
  grass_1: tileAssets.grass_1,
  rock_1: tileAssets.rock_1,
  player_down_0: playerAssets.down_0,
  // ... all assets
});

// Get texture for rendering
const texture = textureManager.getTexture('grass_1');

// Clear all textures (for testing/hot-reload)
textureManager.clear();
```

### PixiGameStage Props

```typescript
interface PixiGameStageProps {
  width: number;              // Canvas width
  height: number;             // Canvas height
  backgroundColor?: number;   // Background color (hex)
  children: React.ReactNode;  // Pixi components (<Container>, <Sprite>, etc.)
}
```

### Coordinate System

**DOM Coordinates** (current):
- Position in pixels relative to top-left of map
- Camera applied via CSS transform

**PixiJS Coordinates** (new):
- Position in pixels relative to Stage (0,0 = top-left of canvas)
- Camera applied via Container position

**Conversion**:
```typescript
// World position to screen position
const screenX = worldX * TILE_SIZE - cameraX;
const screenY = worldY * TILE_SIZE - cameraY;

// Screen position to world position
const worldX = (screenX + cameraX) / TILE_SIZE;
const worldY = (screenY + cameraY) / TILE_SIZE;
```

---

## Testing Strategy

### Phase 1: Visual Parity Testing

Goal: Ensure PixiJS renderer looks identical to DOM renderer.

1. **Screenshot Comparison**
   - Render same map with both systems
   - Take screenshots
   - Pixel-diff comparison (should be <1% difference)

2. **Manual Inspection**
   - Tile colors match color scheme
   - Sprites positioned correctly
   - Animation frames sync
   - Collision detection unchanged

### Phase 2: Performance Testing

Goal: Verify performance improvements.

**Metrics to Track**:
```typescript
interface PerformanceMetrics {
  fps: number;              // Target: 60 FPS
  renderTime: number;       // Time to render one frame (ms)
  memoryUsage: number;      // Heap size (MB)
  spriteCount: number;      // Number of visible sprites
  drawCalls: number;        // Number of GPU draw calls
}
```

**Test Scenarios**:
1. 30x30 map with 900 tiles + 10 NPCs (current baseline)
2. 50x50 map with 2,500 tiles + 50 NPCs (stress test)
3. Particle effects: 1,000 snowflakes falling
4. Mobile device: iPhone SE, Pixel 3

**Success Criteria**:
- ✅ 60 FPS on all scenarios
- ✅ <5ms render time per frame
- ✅ <100 MB memory usage
- ✅ No visual glitches or artifacts

### Phase 3: Integration Testing

Goal: Ensure game systems work with PixiJS.

**Test Cases**:
- [ ] Player movement (WASD keys)
- [ ] Collision detection (walls, water, NPCs)
- [ ] Map transitions (doors, exits)
- [ ] NPC interactions (dialogue)
- [ ] Farming actions (till, plant, water, harvest)
- [ ] Time system (day/night visual changes)
- [ ] Weather effects (rain, snow)
- [ ] Character customization (sprite reload)
- [ ] Save/load game state
- [ ] Touch controls (mobile)

---

## Rollback Plan

If critical issues arise during/after migration:

### Immediate Rollback (< 5 minutes)

1. Set `USE_PIXI_RENDERER = false` in constants.ts
2. Deploy to production
3. All users revert to DOM renderer

### Data Safety

- **No save data changes required**
- Game state (position, inventory, etc.) unchanged
- Only rendering method differs

### Communication

If rollback needed:
1. Notify users: "We've temporarily reverted to the classic renderer while we fix an issue"
2. File bug report with details
3. Fix issue in development
4. Re-deploy when stable

---

## Future Enhancements

Once PixiJS migration is complete, unlock these features:

### 1. Particle Systems

Replace GIF animations with dynamic particles:
- Rain/snow (1,000+ particles)
- Falling cherry blossoms (seasonal)
- Fireflies (night time)
- Sparkles (item pickup, level up)
- Dust clouds (running)

**Library**: `@pixi/particle-emitter`

### 2. Lighting System

Add dynamic lighting:
- Day/night ambient lighting
- Lanterns/torches (point lights)
- Firefly glow
- Campfire flickering

**Method**: PixiJS filters (AdjustmentFilter, GlowFilter)

### 3. Weather Effects

Advanced weather beyond GIFs:
- Wind direction (affects particle movement)
- Lightning flashes (storm)
- Fog (reduced visibility)
- Puddles (after rain)

### 4. Shaders

Custom WebGL shaders for:
- Water ripples (animated)
- Grass swaying (wind)
- Heat shimmer (summer)
- Frost effect (winter)

### 5. Larger Maps

Support massive maps:
- 100x100 tiles (10,000 tiles)
- Chunked loading (load visible chunks only)
- Infinite terrain (procedural generation)

### 6. Post-Processing Effects

Screen-space effects:
- Bloom (glowing objects)
- Depth of field (blur distant objects)
- Color grading (cinematic look)
- Vignette (focus attention)

---

## Risks & Mitigations

### Risk 1: Learning Curve

**Risk**: Team unfamiliar with PixiJS API
**Mitigation**:
- This design doc provides complete examples
- PixiJS docs are excellent
- @pixi/react simplifies integration
- Start with simple components (TileRenderer)

### Risk 2: Breaking Changes

**Risk**: PixiJS v8 may have breaking changes
**Mitigation**:
- Lock PixiJS version in package.json
- Test thoroughly before deploying
- Keep DOM renderer as fallback

### Risk 3: Mobile Compatibility

**Risk**: Some devices may not support WebGL
**Mitigation**:
- PixiJS auto-falls back to Canvas API
- Test on low-end devices
- Feature flag allows DOM fallback

### Risk 4: Asset Loading Time

**Risk**: Preloading all textures may slow startup
**Mitigation**:
- Show loading screen with progress bar
- Lazy-load non-critical assets
- Use texture atlases to reduce requests

---

## Success Metrics

Track these KPIs after migration:

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| FPS (30x30 map) | 35-45 | 60 | Chrome DevTools |
| Load time | 2-3s | 1-2s | Lighthouse |
| Memory usage | 150 MB | <100 MB | Chrome Task Manager |
| Mobile FPS | 20-30 | 60 | Real device testing |
| User complaints | Baseline | -50% | Support tickets |

---

## Timeline

**Week 1**: Setup & Infrastructure
- ✅ Install PixiJS + @pixi/react
- Create TextureManager
- Build PixiGameStage component
- Preload textures in gameInitializer

**Week 2**: Migrate Core Rendering
- Implement PixiTileRenderer
- Implement PixiPlayer
- Add feature flag to App.tsx
- Test visual parity

**Week 3**: Migrate Sprites & Effects
- Implement PixiNPCRenderer
- Implement PixiBackgroundSprites
- Implement PixiForegroundSprites
- Convert AnimationOverlay to particles

**Week 4**: Testing & Optimization
- Performance testing (FPS, memory)
- Mobile device testing
- Bug fixes
- Documentation updates

**Week 5+**: Polish & Enhancement
- Remove DOM renderer (cleanup)
- Add particle effects
- Implement lighting system
- Shader experiments

---

## References

- [PixiJS Documentation](https://pixijs.com/docs)
- [@pixi/react GitHub](https://github.com/pixijs/pixi-react)
- [PixiJS Examples](https://pixijs.com/examples)
- [WebGL Performance Best Practices](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices)

---

## Questions & Answers

**Q: Will this break mobile support?**
A: No, PixiJS works great on mobile and will actually improve mobile performance.

**Q: Can we still use React for UI?**
A: Yes! HUD, DialogueBox, Modals all remain React DOM components. Only the game world (tiles/sprites) uses PixiJS.

**Q: What about accessibility?**
A: Canvas rendering has limited accessibility. We'll add ARIA labels and keyboard navigation for UI elements.

**Q: Can we switch back to DOM if needed?**
A: Yes, feature flag allows instant rollback with zero data loss.

**Q: Do we need to learn WebGL?**
A: No, PixiJS abstracts WebGL complexity. API is similar to DOM (Sprite = img tag).

---

**Document Status**: Draft v1.0
**Last Updated**: November 1, 2025
**Author**: Claude + Mark
**Next Review**: After Phase 1 completion
