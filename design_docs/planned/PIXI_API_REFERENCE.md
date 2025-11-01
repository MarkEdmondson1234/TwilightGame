# PixiJS v8 API Reference for TwilightGame

**PixiJS Version**: 8.14.0
**@pixi/react Version**: 8.0.3

---

## Important API Changes in PixiJS v8

### What Changed from v7 → v8

1. **No Stage Component** - @pixi/react v8 uses `Application` + `createRoot` instead
2. **BaseTexture Removed** - Use `Texture.from()` directly
3. **SCALE_MODES Enum Deprecated** - Use string literals ('nearest', 'linear')
4. **Different React Integration** - No longer uses `<Stage>`, `<Sprite>` components

---

## @pixi/react v8 API

### Available Exports

```typescript
import {
  Application,      // Create PixiJS app
  createRoot,       // Create React renderer
  extend,           // Register custom components
  useApplication,   // Access app context
  useExtend,        // Extend dynamically
  useTick,          // Hook into game loop
} from '@pixi/react';
```

### Basic Setup (v8 Pattern)

```tsx
import { Application, createRoot } from '@pixi/react';
import * as PIXI from 'pixi.js';

// 1. Create PixiJS Application
const app = new PIXI.Application();
await app.init({
  width: 800,
  height: 600,
  backgroundColor: 0x000000,
  antialias: false, // Important for pixel art
});

// 2. Mount to DOM
document.body.appendChild(app.canvas);

// 3. Create React root and render
const root = createRoot(app.stage);
root.render(<GameScene />);
```

---

## Correct Implementation for TwilightGame

### Option 1: Hybrid Approach (Recommended)

Keep React for UI, use PixiJS directly for game rendering:

```tsx
// App.tsx
import { useEffect, useRef } from 'react';
import * as PIXI from 'pixi.js';

export function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);

  useEffect(() => {
    // Initialize PixiJS
    const app = new PIXI.Application();
    app.init({
      canvas: canvasRef.current!,
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: 0x1a1a1a,
      antialias: false,
      resolution: window.devicePixelRatio,
    }).then(() => {
      appRef.current = app;

      // Setup game scene
      setupGameScene(app);
    });

    return () => {
      app?.destroy(true);
    };
  }, []);

  return (
    <div className="relative w-screen h-screen">
      {/* PixiJS Canvas */}
      <canvas ref={canvasRef} />

      {/* React UI Overlay */}
      <div className="absolute inset-0 pointer-events-none">
        <HUD />
        {activeNPC && <DialogueBox />}
      </div>
    </div>
  );
}
```

### Option 2: Pure PixiJS with Custom Renderer

Use @pixi/react's `extend` to create custom components:

```tsx
import { extend, useApplication, useTick } from '@pixi/react';
import * as PIXI from 'pixi.js';

// Register PIXI classes as React components
extend(PIXI);

function GameScene() {
  const app = useApplication();

  // Access game loop
  useTick((delta) => {
    // Update logic here
  });

  return null; // Render imperatively
}
```

---

## Texture Loading (v8 Correct API)

### Old Way (v7 - WRONG)
```typescript
// ❌ BaseTexture is removed in v8
const baseTexture = PIXI.BaseTexture.from(url, {
  scaleMode: PIXI.SCALE_MODES.NEAREST
});
const texture = new PIXI.Texture(baseTexture);
```

### New Way (v8 - CORRECT)
```typescript
// ✅ Use Texture.from() directly
const texture = PIXI.Texture.from(url, {
  scaleMode: 'nearest', // String literal, not enum
});
```

### Texture Manager (v8 Compatible)

```typescript
// utils/TextureManager.ts
import * as PIXI from 'pixi.js';
import { Assets } from 'pixi.js';

class TextureManager {
  private textures = new Map<string, PIXI.Texture>();

  async loadTexture(key: string, url: string): Promise<PIXI.Texture> {
    if (this.textures.has(key)) {
      return this.textures.get(key)!;
    }

    // Use Assets API (v8 recommended way)
    const texture = await Assets.load(url);
    texture.source.scaleMode = 'nearest'; // Pixel art
    this.textures.set(key, texture);
    return texture;
  }

  // Batch load multiple assets
  async loadBatch(assets: Record<string, string>): Promise<void> {
    // Add assets to loader
    Assets.addBundle('game', assets);

    // Load bundle
    const loadedAssets = await Assets.loadBundle('game');

    // Configure and cache
    Object.entries(loadedAssets).forEach(([key, texture]) => {
      (texture as PIXI.Texture).source.scaleMode = 'nearest';
      this.textures.set(key, texture as PIXI.Texture);
    });
  }

  getTexture(key: string): PIXI.Texture | undefined {
    return this.textures.get(key);
  }
}

export const textureManager = new TextureManager();
```

---

## Sprite Creation (v8)

```typescript
// Create sprite from texture
const texture = textureManager.getTexture('grass_1');
const sprite = new PIXI.Sprite(texture);

// Position (pixels)
sprite.x = 100;
sprite.y = 100;

// Size
sprite.width = 64;
sprite.height = 64;

// Anchor (0-1, default is top-left 0,0)
sprite.anchor.set(0.5); // Center

// Tint (multiply color)
sprite.tint = 0xff0000; // Red tint

// Alpha (transparency)
sprite.alpha = 0.5;

// Add to stage
app.stage.addChild(sprite);
```

---

## Tile Rendering Example

```typescript
// components/PixiTileLayer.ts
import * as PIXI from 'pixi.js';
import { TILE_SIZE } from '../constants';
import { textureManager } from '../utils/TextureManager';

export class TileLayer {
  private container: PIXI.Container;
  private sprites: Map<string, PIXI.Sprite> = new Map();

  constructor() {
    this.container = new PIXI.Container();
  }

  renderTile(x: number, y: number, textureKey: string) {
    const key = `${x},${y}`;

    // Reuse existing sprite if possible
    let sprite = this.sprites.get(key);

    if (!sprite) {
      const texture = textureManager.getTexture(textureKey);
      if (!texture) return;

      sprite = new PIXI.Sprite(texture);
      sprite.x = x * TILE_SIZE;
      sprite.y = y * TILE_SIZE;
      sprite.width = TILE_SIZE;
      sprite.height = TILE_SIZE;

      this.container.addChild(sprite);
      this.sprites.set(key, sprite);
    } else {
      // Update texture if changed
      const newTexture = textureManager.getTexture(textureKey);
      if (newTexture && sprite.texture !== newTexture) {
        sprite.texture = newTexture;
      }
    }
  }

  clear() {
    this.sprites.forEach(sprite => sprite.destroy());
    this.sprites.clear();
  }

  getContainer(): PIXI.Container {
    return this.container;
  }
}
```

---

## Camera System

```typescript
// Camera controls container position (inverse of camera position)
const worldContainer = new PIXI.Container();

// Update camera
function updateCamera(cameraX: number, cameraY: number) {
  worldContainer.x = -cameraX;
  worldContainer.y = -cameraY;
}

// Add all game objects to worldContainer
worldContainer.addChild(tileLayer.getContainer());
worldContainer.addChild(playerSprite);
worldContainer.addChild(npcContainer);

app.stage.addChild(worldContainer);
```

---

## Game Loop Integration

```typescript
// Option 1: Use PixiJS Ticker directly
app.ticker.add((delta) => {
  // delta = time elapsed since last frame (scaled by ticker speed)
  const deltaTime = delta / 60; // Convert to seconds (60 FPS baseline)

  updateGame(deltaTime);
  renderGame();
});

// Option 2: Use React hook (if using @pixi/react components)
import { useTick } from '@pixi/react';

function GameComponent() {
  useTick((delta) => {
    // Update logic
  });

  return null;
}
```

---

## Particle Effects (v8)

```typescript
import { ParticleContainer, Sprite, Texture } from 'pixi.js';

// Optimized container for many similar sprites
const particleContainer = new ParticleContainer(10000, {
  scale: true,
  position: true,
  rotation: true,
  alpha: true,
});

// Add particles
for (let i = 0; i < 1000; i++) {
  const particle = new Sprite(snowflakeTexture);
  particle.x = Math.random() * 800;
  particle.y = Math.random() * 600;
  particle.alpha = Math.random();
  particleContainer.addChild(particle);
}

app.stage.addChild(particleContainer);

// Animate particles
app.ticker.add(() => {
  particleContainer.children.forEach((particle) => {
    particle.y += 2; // Fall down
    if (particle.y > 600) particle.y = 0; // Loop
  });
});
```

---

## Performance Optimization

### 1. Texture Atlases

```typescript
// Load sprite sheet with frames
const spritesheet = await Assets.load('spritesheet.json');

// Get individual textures
const texture1 = spritesheet.textures['frame1.png'];
const texture2 = spritesheet.textures['frame2.png'];
```

### 2. Object Pooling

```typescript
class SpritePool {
  private pool: PIXI.Sprite[] = [];

  acquire(texture: PIXI.Texture): PIXI.Sprite {
    return this.pool.pop() || new PIXI.Sprite(texture);
  }

  release(sprite: PIXI.Sprite) {
    sprite.visible = false;
    this.pool.push(sprite);
  }
}
```

### 3. Culling (Don't render off-screen)

```typescript
function cullSprites(container: PIXI.Container, viewport: PIXI.Rectangle) {
  container.children.forEach((child) => {
    const bounds = child.getBounds();
    child.visible = viewport.intersects(bounds);
  });
}
```

---

## Recommended Architecture for TwilightGame

```
┌─────────────────────────────────────────┐
│           React App (App.tsx)           │
│  - State management (Zustand)           │
│  - Game logic (hooks, managers)         │
│  - UI overlays (HUD, Dialogue, Modals)  │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│      PixiJS Application (canvas)        │
│  - Managed by useEffect in App          │
│  - Renders game world only              │
│  - No React components inside           │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│         Game Renderer Class             │
│  - TileLayer (extends Container)        │
│  - SpriteLayer (NPCs, player, items)    │
│  - EffectLayer (particles, animations)  │
│  - Camera (controls world position)     │
└─────────────────────────────────────────┘
```

---

## Migration Checklist

- [x] Install pixi.js and @pixi/react
- [x] Test imports and verify API
- [ ] Create TextureManager with v8 Assets API
- [ ] Create PixiRenderer class
- [ ] Implement TileLayer
- [ ] Implement SpriteLayer (player + NPCs)
- [ ] Integrate with existing game loop
- [ ] Add camera system
- [ ] Port viewport culling
- [ ] Test performance (FPS, memory)
- [ ] Add feature flag for rollback

---

## Common Pitfalls

### ❌ Don't: Use old BaseTexture API
```typescript
const baseTexture = PIXI.BaseTexture.from(url); // REMOVED in v8
```

### ✅ Do: Use Assets API
```typescript
const texture = await PIXI.Assets.load(url);
```

### ❌ Don't: Use SCALE_MODES enum
```typescript
scaleMode: PIXI.SCALE_MODES.NEAREST // Deprecated
```

### ✅ Do: Use string literal
```typescript
scaleMode: 'nearest'
```

### ❌ Don't: Mix React and PixiJS rendering
```typescript
return <Sprite texture={texture} />; // @pixi/react v8 doesn't have these
```

### ✅ Do: Use imperative PixiJS API
```typescript
const sprite = new PIXI.Sprite(texture);
container.addChild(sprite);
```

---

## Next Steps

1. Update PIXI_MIGRATION.md with v8-specific code
2. Create PixiRenderer class in `utils/PixiRenderer.ts`
3. Create TextureManager using Assets API
4. Build proof-of-concept with single tile layer
5. Compare performance with DOM renderer

---

**Document Status**: v1.0 (Updated for PixiJS v8)
**Last Updated**: November 1, 2025
