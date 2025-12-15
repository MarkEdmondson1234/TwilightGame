# Background Image Interior System

**Status**: Phase 1 Complete (Proof of Concept)
**Estimated Effort**: 3-4 days (2 days remaining)
**Priority**: Medium
**Dependencies**: PixiJS renderer (currently active)

---

## Overview

Replace tile-based interior rendering with a **layered background image system** that supports:

1. **Large background images** - Hand-painted or detailed interior artwork
2. **Walkmesh collision** - Invisible collision grid for walkable areas
3. **Foreground layers** - Elements that render in front of the player
4. **Parallax scrolling** - Depth effect as camera moves
5. **Window views** - Outside scenes visible through windows

This enables richer, more detailed interiors while maintaining the existing collision and gameplay systems.

---

## Architecture

### Layer Structure (Z-Index)

```
┌─────────────────────────────────────────────────────────────┐
│  Z-1000: WINDOW LAYER (outside scene, masked by window)    │
├─────────────────────────────────────────────────────────────┤
│  Z-100:  BACKGROUND LAYER (main room image)                │
├─────────────────────────────────────────────────────────────┤
│  Z-50:   BACKGROUND FURNITURE (rugs, low tables)           │
├─────────────────────────────────────────────────────────────┤
│  Z-100:  PLAYER/NPC LAYER (characters)                     │
├─────────────────────────────────────────────────────────────┤
│  Z-200:  FOREGROUND LAYER (columns, hanging plants)        │
├─────────────────────────────────────────────────────────────┤
│  Z-300:  FOREGROUND FURNITURE (tall bookshelves, canopy)   │
├─────────────────────────────────────────────────────────────┤
│  Z-1000: OVERLAY LAYER (lighting, vignette)                │
└─────────────────────────────────────────────────────────────┘

                    ↑ Camera/Player view
```

### Parallax Depths

Different layers can scroll at different rates to create depth:

| Layer | Parallax Factor | Effect |
|-------|-----------------|--------|
| Window view (outside) | 0.3 | Moves slowly, appears far away |
| Background | 1.0 | Moves with camera (standard) |
| Player/NPCs | 1.0 | Moves with camera |
| Foreground | 1.1-1.3 | Moves slightly faster, appears closer |

**Formula**: `layerOffset = cameraOffset * parallaxFactor`

---

## Data Structures

### Extended MapDefinition

```typescript
interface MapDefinition {
  // Existing fields...
  id: string;
  name: string;
  width: number;
  height: number;
  grid: TileType[][];           // Collision grid (invisible in background mode)
  colorScheme: string;
  spawnPoint: Position;
  transitions: Transition[];
  npcs?: NPC[];

  // NEW: Background image rendering
  renderMode?: 'tiled' | 'background-image';  // Default: 'tiled'
  backgroundLayers?: BackgroundLayer[];
  foregroundLayers?: ForegroundLayer[];
  windowViews?: WindowView[];
}
```

### BackgroundLayer

```typescript
interface BackgroundLayer {
  image: string;                // Path: '/assets/rooms/mansion_hall.png'
  zIndex: number;               // Layer order (default: -100)
  parallaxFactor?: number;      // Camera scroll multiplier (default: 1.0)
  opacity?: number;             // 0.0 - 1.0 (default: 1.0)

  // Positioning (in pixels relative to map origin)
  offsetX?: number;             // Default: 0
  offsetY?: number;             // Default: 0

  // Optional sizing (auto-calculated if not specified)
  width?: number;               // Image display width (pixels)
  height?: number;              // Image display height (pixels)

  // Optional animation
  animation?: LayerAnimation;
}

interface LayerAnimation {
  type: 'pan' | 'zoom' | 'pulse';
  duration: number;             // Milliseconds
  from?: { x: number; y: number; scale: number };
  to?: { x: number; y: number; scale: number };
  loop?: boolean;
}
```

### ForegroundLayer

```typescript
interface ForegroundLayer {
  image: string;                // Path: '/assets/rooms/mansion_columns.png'
  zIndex: number;               // Layer order (default: 200)
  parallaxFactor?: number;      // Typically 1.1-1.3 for "closer" feel
  opacity?: number;

  // Positioning
  offsetX?: number;
  offsetY?: number;

  // Collision mask (optional - for pillars, furniture)
  collisionMask?: CollisionRect[];
}

interface CollisionRect {
  x: number;                    // Tile coordinates
  y: number;
  width: number;
  height: number;
}
```

### WindowView

```typescript
interface WindowView {
  // Window frame position (in tile coordinates)
  x: number;
  y: number;
  width: number;                // Window width in tiles
  height: number;               // Window height in tiles

  // What's visible through the window
  outsideMapId?: string;        // Reference another map (e.g., 'village')
  outsideImage?: string;        // Or static image
  outsideOffset?: Position;     // Where in the outside scene to show

  // Visual effects
  parallaxFactor?: number;      // Default: 0.3 (slow movement = far away)
  tint?: number;                // Colour tint (e.g., 0xAADDFF for blue sky)
  blur?: number;                // Gaussian blur amount (0-10)

  // Time-of-day integration
  respectTimeOfDay?: boolean;   // Darken at night, warm at sunset
}
```

---

## Walkmesh System

The walkmesh uses the **existing tile grid** system - no changes needed to collision detection.

### How It Works

1. **Background image** renders as visual layer (no collision)
2. **Tile grid** defines walkable areas (invisible, collision-only)
3. **Existing collision system** reads from grid as normal

### Visual Grid Design (Collision-Only Mode)

When `renderMode: 'background-image'`, the tile grid becomes a pure collision map:

```
Legend:
  . = FLOOR (walkable, invisible)
  # = WALL (solid, invisible)
  D = DOOR (transition, invisible)
  F = FURNITURE (solid, invisible)

Example: Mansion Hall
####################
#..................#
#..FF..........FF..#
#..FF..........FF..#
#..................#
#.....########.....#
#.....#      #.....#
D.....#      #.....D
#.....#      #.....#
#.....########.....#
#..................#
#..FF..........FF..#
####################
```

### Tile Types for Walkmesh

| Code | TileType | Solid | Purpose |
|------|----------|-------|---------|
| `.` | FLOOR | No | Walkable area |
| `#` | WALL | Yes | Impassable boundary |
| `F` | FURNITURE | Yes | Tables, beds, etc. |
| `D` | DOOR | No | Transition trigger |
| `W` | WINDOW | Yes | Window (blocks movement) |
| `S` | STAIRS | No | Staircase (with transition) |

### Walkmesh Editor Workflow

**Option 1: Grid String Editor**
- Define grid in map file as ASCII art
- Quick to create and modify
- Use `parseGrid()` as with tiled maps

**Option 2: Visual Overlay Tool** (future)
- Load background image as reference
- Draw collision regions on top
- Export to grid format

---

## PixiJS Implementation

### New Classes Required

#### 1. BackgroundImageLayer.ts

```typescript
// utils/pixi/BackgroundImageLayer.ts
export class BackgroundImageLayer {
  private container: PIXI.Container;
  private sprites: Map<string, PIXI.Sprite> = new Map();

  constructor() {
    this.container = new PIXI.Container();
    this.container.sortableChildren = true;
  }

  getContainer(): PIXI.Container {
    return this.container;
  }

  async renderLayers(
    layers: BackgroundLayer[],
    textureManager: TextureManager
  ): Promise<void> {
    // Clear existing sprites
    this.container.removeChildren();
    this.sprites.clear();

    for (const layer of layers) {
      const texture = await textureManager.loadTexture(
        layer.image,
        layer.image
      );

      const sprite = new PIXI.Sprite(texture);
      sprite.x = layer.offsetX ?? 0;
      sprite.y = layer.offsetY ?? 0;
      sprite.zIndex = layer.zIndex ?? -100;
      sprite.alpha = layer.opacity ?? 1.0;

      // Store parallax factor for camera updates
      sprite.label = layer.image;
      (sprite as any).parallaxFactor = layer.parallaxFactor ?? 1.0;

      this.container.addChild(sprite);
      this.sprites.set(layer.image, sprite);
    }
  }

  updateCamera(cameraX: number, cameraY: number): void {
    for (const sprite of this.sprites.values()) {
      const parallax = (sprite as any).parallaxFactor ?? 1.0;
      sprite.x = -(cameraX * parallax);
      sprite.y = -(cameraY * parallax);
    }
  }

  destroy(): void {
    this.container.removeChildren();
    this.sprites.clear();
  }
}
```

#### 2. WindowViewLayer.ts

```typescript
// utils/pixi/WindowViewLayer.ts
export class WindowViewLayer {
  private container: PIXI.Container;
  private masks: Map<string, PIXI.Graphics> = new Map();

  constructor() {
    this.container = new PIXI.Container();
    this.container.zIndex = -1000; // Behind everything
  }

  renderWindows(
    windows: WindowView[],
    textureManager: TextureManager,
    tileSize: number
  ): void {
    for (const window of windows) {
      // Create mask for window shape
      const mask = new PIXI.Graphics();
      mask.rect(
        window.x * tileSize,
        window.y * tileSize,
        window.width * tileSize,
        window.height * tileSize
      );
      mask.fill(0xFFFFFF);

      // Create outside view sprite
      const outsideSprite = new PIXI.Sprite(/* texture */);
      outsideSprite.mask = mask;

      // Apply effects
      if (window.blur) {
        outsideSprite.filters = [new PIXI.BlurFilter(window.blur)];
      }
      if (window.tint) {
        outsideSprite.tint = window.tint;
      }

      this.container.addChild(mask);
      this.container.addChild(outsideSprite);
    }
  }

  updateTimeOfDay(hour: number): void {
    // Adjust tint/brightness based on time
    // Morning: warm orange
    // Day: neutral
    // Evening: warm red
    // Night: dark blue
  }
}
```

### Integration with Existing Layers

```typescript
// In App.tsx PixiJS setup

// Existing layers
const tileLayerRef = useRef<TileLayer | null>(null);
const spriteLayerRef = useRef<SpriteLayer | null>(null);
const playerSpriteRef = useRef<PlayerSprite | null>(null);

// NEW: Background layers
const backgroundLayerRef = useRef<BackgroundImageLayer | null>(null);
const windowLayerRef = useRef<WindowViewLayer | null>(null);

// Layer creation order (bottom to top)
if (currentMap.renderMode === 'background-image') {
  // 1. Window views (z: -1000)
  windowLayer.renderWindows(currentMap.windowViews);

  // 2. Background image (z: -100)
  backgroundLayer.renderLayers(currentMap.backgroundLayers);

  // 3. Skip tile rendering (collision still works!)
  // TileLayer.renderTile() checks renderMode and returns early

  // 4. Player/NPCs (z: 100) - unchanged

  // 5. Foreground layers (z: 200+)
  backgroundLayer.renderLayers(currentMap.foregroundLayers);
}
```

### TileLayer Modification

```typescript
// In TileLayer.ts

renderTile(x: number, y: number, ...): void {
  // Skip visual rendering for background-image maps
  if (this.renderMode === 'background-image') {
    // Still allow transition indicators if needed
    if (tileData.type === TileType.DOOR) {
      this.renderTransitionIndicator(x, y);
    }
    return;
  }

  // Existing tile rendering code...
}
```

---

## Asset Requirements

### Directory Structure

```
public/assets/
├── rooms/                      # NEW: Background images
│   ├── mansion_hall_bg.png     # Main background
│   ├── mansion_hall_fg.png     # Foreground elements
│   ├── mansion_hall_window.png # Window frame overlay
│   └── ...
├── tiles/                      # Existing tile sprites
├── character1/                 # Player sprites
└── npcs/                       # NPC sprites
```

### Image Specifications

| Layer Type | Max Size | Format | Quality | Notes |
|------------|----------|--------|---------|-------|
| Background | 2048×2048 | PNG | 95% | Main room image |
| Foreground | 2048×2048 | PNG | 95% | With transparency |
| Window view | 1024×1024 | PNG | 85% | Can be lower quality (blurred) |
| Overlays | 512×512 | PNG | 90% | Lighting, vignette |

### Transparency Requirements

- **Background**: Usually opaque (floor colour fills entire image)
- **Foreground**: Must have transparency for player to show through
- **Window views**: Usually opaque (masked by window shape)

### Art Style Considerations

- Match existing pixel art aesthetic
- Consistent lighting direction (top-left)
- Include subtle floor texture (not flat colour)
- Consider parallax when designing (layers should align when camera centered)

---

## Example: Witch's Cottage Interior

### Map Definition

```typescript
// maps/definitions/witchCottageInterior.ts

export const witchCottageInterior: MapDefinition = {
  id: 'witch_cottage_interior',
  name: "Witch's Cottage",
  width: 12,
  height: 10,
  spawnPoint: { x: 6, y: 8 },
  colorScheme: 'indoor',

  // NEW: Background image mode
  renderMode: 'background-image',

  // Walkmesh grid (collision only)
  grid: parseGrid(`
    ############
    #..........#
    #.FF....FF.#
    #.FF....FF.#
    #..........#
    #....WW....#
    #..........#
    #.FF....FF.#
    #..........#
    #####DD#####
  `),

  // Background layers
  backgroundLayers: [
    {
      image: '/assets/rooms/witch_cottage_bg.png',
      zIndex: -100,
      parallaxFactor: 1.0,
    },
    {
      image: '/assets/rooms/witch_cottage_rugs.png',
      zIndex: -50,
      parallaxFactor: 1.0,
      opacity: 0.9,
    },
  ],

  // Foreground layers (render in front of player)
  foregroundLayers: [
    {
      image: '/assets/rooms/witch_cottage_shelves.png',
      zIndex: 200,
      parallaxFactor: 1.05,
    },
    {
      image: '/assets/rooms/witch_cottage_hanging.png',
      zIndex: 250,
      parallaxFactor: 1.1,  // Slight parallax for depth
    },
  ],

  // Window looking outside
  windowViews: [
    {
      x: 4,
      y: 5,
      width: 2,
      height: 2,
      outsideMapId: 'forest',
      outsideOffset: { x: 50, y: 30 },
      parallaxFactor: 0.3,
      blur: 1.5,
      respectTimeOfDay: true,
    },
  ],

  transitions: [
    {
      from: { x: 5, y: 9 },
      to: { mapId: 'witch_hut', position: { x: 5, y: 3 } },
    },
    {
      from: { x: 6, y: 9 },
      to: { mapId: 'witch_hut', position: { x: 5, y: 3 } },
    },
  ],

  npcs: [
    {
      id: 'witch',
      position: { x: 6, y: 3 },
      sprite: 'witch',
    },
  ],
};
```

---

## Implementation Plan

### Phase 1: Core System (Day 1-2) ✅ COMPLETE

**Tasks:**
1. [x] Add `renderMode` and `backgroundLayers` to `MapDefinition` type
2. [x] Create `BackgroundImageLayer.ts` in `utils/pixi/`
3. [x] Modify `TileLayer.ts` to skip rendering when `renderMode: 'background-image'`
4. [x] Integrate `BackgroundImageLayer` into App.tsx PixiJS setup
5. [x] Create test room with single background image (`mums_kitchen`)
6. [x] Verify collision still works with invisible grid

**Deliverable**: One room renders with background image + working collision

**Implementation Notes (Dec 15, 2025):**
- Added `MapRenderMode`, `BackgroundLayer`, `WindowView` types to `types.ts`
- Created `utils/pixi/BackgroundImageLayer.ts` with parallax support
- Test room: `maps/definitions/mumsKitchen.ts` using `/assets/rooms/home/mums_kitchen.jpeg`
- Transition from `home_interior` via stove interaction

### Phase 2: Parallax & Foreground (Day 2-3)

**Tasks:**
1. [ ] Add parallax scrolling to `BackgroundImageLayer.updateCamera()`
2. [ ] Add `foregroundLayers` support
3. [ ] Create multi-layer test room (background + foreground)
4. [ ] Test parallax effect at different factors
5. [ ] Add asset optimization settings for room images

**Deliverable**: Parallax depth effect working with foreground layers

### Phase 3: Window Views (Day 3-4)

**Tasks:**
1. [ ] Create `WindowViewLayer.ts` in `utils/pixi/`
2. [ ] Implement window masking with PIXI.Graphics
3. [ ] Support static images and map references for outside view
4. [ ] Add blur and tint effects
5. [ ] Integrate with TimeManager for day/night window appearance
6. [ ] Test with witch cottage window

**Deliverable**: Windows showing outside scenes with time-of-day support

### Phase 4: Polish & Documentation (Day 4)

**Tasks:**
1. [ ] Create 2-3 example rooms using new system
2. [ ] Add optimization presets to `optimize-assets.js`
3. [ ] Write MAP_GUIDE.md section for background rooms
4. [ ] Add walkmesh visualization to debug overlay (F3)
5. [ ] Performance testing on various room sizes

**Deliverable**: Production-ready system with documentation

---

## Performance Considerations

### Texture Memory

| Room Size | Layers | Estimated Memory |
|-----------|--------|------------------|
| Small (10×8) | 2 | ~8 MB |
| Medium (16×12) | 3 | ~16 MB |
| Large (24×18) | 4 | ~32 MB |

**Mitigation:**
- Unload room textures when leaving map
- Compress images appropriately
- Limit layer count per room

### Rendering Performance

- Background images render as single sprites (fast)
- No tile-by-tile iteration for background rooms
- Foreground sprites use existing culling system
- Window views only rendered when visible

**Expected**: 60 FPS maintained with new system

### Memory Management

```typescript
// When leaving a background-image room
function onMapChange(oldMap: MapDefinition, newMap: MapDefinition): void {
  if (oldMap.renderMode === 'background-image') {
    // Unload room-specific textures
    for (const layer of oldMap.backgroundLayers ?? []) {
      textureManager.unloadTexture(layer.image);
    }
    for (const layer of oldMap.foregroundLayers ?? []) {
      textureManager.unloadTexture(layer.image);
    }
  }
}
```

---

## Compatibility

### Backward Compatibility

- **Fully backward compatible** - existing tiled maps unchanged
- `renderMode` defaults to `'tiled'` if not specified
- All existing maps continue to work
- Mixed mode supported (some tiled, some background-image)

### Feature Flag

```typescript
// constants.ts
export const ENABLE_BACKGROUND_ROOMS = true;  // Toggle feature
```

---

## Future Enhancements

### Phase 5+ (Optional)

- **Lighting overlays**: Time-of-day ambient lighting
- **Animated elements**: Flickering candles, swaying curtains
- **Interactive foreground**: Click through certain foreground elements
- **Room transitions**: Fade/slide between rooms
- **Mini-map**: Show room layout from walkmesh

### Tool Ideas

- **Walkmesh editor**: Visual tool to draw collision on top of image
- **Layer preview**: See parallax effect in editor
- **Auto-collision**: Generate collision from image alpha channel

---

## Questions to Resolve

1. **Art pipeline**: Who creates the background images? What tools?
2. **Room sizes**: Standardise room dimensions or flexible?
3. **Outside views**: Show actual map state (NPCs moving) or static image?
4. **Transitions**: Fade effect when entering background rooms?

---

## Related Documents

- [PIXI_MIGRATION.md](./PIXI_MIGRATION.md) - PixiJS rendering system
- [MAP_GUIDE.md](../docs/MAP_GUIDE.md) - Map creation guide
- [COORDINATE_GUIDE.md](../docs/COORDINATE_GUIDE.md) - Position system

---

## Version History

**v1.0** (Dec 15, 2025)
- Initial design document
- Core architecture defined
- Implementation plan created
