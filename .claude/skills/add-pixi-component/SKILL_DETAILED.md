---
name: Add PixiJS Component
description: Add PixiJS rendering components (layers, sprites, effects). Use when implementing PixiJS migration, adding particle effects, or creating WebGL-optimized game renderers.
---

# Add PixiJS Component

This skill helps you implement PixiJS rendering components for high-performance game rendering using WebGL.

## When to Use

Use this skill when you need to:
- Implement PixiJS tile rendering (TileLayer, SpriteLayer)
- Add particle effects (rain, snow, fireflies, sparkles)
- Create animated sprites with PixiJS AnimatedSprite
- Optimize rendering performance with sprite batching
- Add lighting effects or shaders
- Convert DOM-based rendering to WebGL

## Prerequisites

- ✅ PixiJS v8.14.0 installed (`pixi.js`)
- ✅ @pixi/react v8.0.3 installed
- 📖 Read [design_docs/planned/PIXI_API_REFERENCE.md](../../../design_docs/planned/PIXI_API_REFERENCE.md)
- 📖 Read [design_docs/planned/PIXI_MIGRATION.md](../../../design_docs/planned/PIXI_MIGRATION.md)

## Quick Start

**Adding a tile rendering layer:**
```typescript
// 1. Create TextureManager (if not exists)
// 2. Create TileLayer class
// 3. Integrate with App.tsx
// 4. Test performance vs DOM
```

**Adding particle effects:**
```typescript
// 1. Create ParticleEffect class
// 2. Define emitter configuration
// 3. Add to effect layer
// 4. Trigger on events
```

## Workflow

### Option 1: Add Tile Rendering Layer

**Use case**: Convert DOM tile rendering to PixiJS for 10-100x performance improvement.

#### 1. Verify TextureManager Exists

Check if TextureManager is already created:

```bash
ls -la utils/TextureManager.ts
```

If not, create it using the template in [PIXI_API_REFERENCE.md](../../../design_docs/planned/PIXI_API_REFERENCE.md#texture-manager-v8-compatible).

#### 2. Create TileLayer Class

Create `utils/pixi/TileLayer.ts`:

```typescript
import * as PIXI from 'pixi.js';
import { TILE_SIZE } from '../../constants';
import { textureManager } from '../TextureManager';
import { getTileData } from '../mapUtils';
import { MapDefinition } from '../../types';

export class TileLayer {
  private container: PIXI.Container;
  private sprites: Map<string, PIXI.Sprite> = new Map();
  private currentMap: MapDefinition | null = null;

  constructor() {
    this.container = new PIXI.Container();
  }

  /**
   * Render all tiles in visible range
   */
  renderTiles(
    map: MapDefinition,
    visibleRange: { minX: number; maxX: number; minY: number; maxY: number }
  ): void {
    this.currentMap = map;

    // Clear sprites outside visible range
    this.cullSprites(visibleRange);

    // Render visible tiles
    for (let y = visibleRange.minY; y <= visibleRange.maxY; y++) {
      for (let x = visibleRange.minX; x <= visibleRange.maxX; x++) {
        this.renderTile(x, y);
      }
    }
  }

  private renderTile(x: number, y: number): void {
    const key = `${x},${y}`;
    const tileData = getTileData(x, y);
    if (!tileData || !tileData.image) return;

    // Select image variant (deterministic hash - matches DOM renderer)
    const hash = Math.abs(Math.sin(x * 12.9898 + y * 78.233) * 43758.5453);
    const imageHash = Math.abs(Math.sin(x * 99.123 + y * 45.678) * 12345.6789);
    const index = Math.floor((imageHash % 1) * tileData.image.length);
    const imageUrl = tileData.image[index];

    // Reuse existing sprite if possible
    let sprite = this.sprites.get(key);

    if (!sprite) {
      const texture = textureManager.getTexture(imageUrl);
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
      const newTexture = textureManager.getTexture(imageUrl);
      if (newTexture && sprite.texture !== newTexture) {
        sprite.texture = newTexture;
      }
      sprite.visible = true;
    }
  }

  private cullSprites(visibleRange: { minX: number; maxX: number; minY: number; maxY: number }): void {
    this.sprites.forEach((sprite, key) => {
      const [x, y] = key.split(',').map(Number);
      const visible = x >= visibleRange.minX && x <= visibleRange.maxX &&
                      y >= visibleRange.minY && y <= visibleRange.maxY;
      sprite.visible = visible;
    });
  }

  clear(): void {
    this.sprites.forEach(sprite => sprite.destroy());
    this.sprites.clear();
  }

  getContainer(): PIXI.Container {
    return this.container;
  }

  updateCamera(cameraX: number, cameraY: number): void {
    this.container.x = -cameraX;
    this.container.y = -cameraY;
  }
}
```

#### 3. Integrate with App.tsx

Add PixiJS renderer to App.tsx:

```typescript
// In App.tsx
import * as PIXI from 'pixi.js';
import { TileLayer } from './utils/pixi/TileLayer';
import { textureManager } from './utils/TextureManager';

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const tileLayerRef = useRef<TileLayer | null>(null);

  useEffect(() => {
    // Initialize PixiJS
    const initPixi = async () => {
      const app = new PIXI.Application();
      await app.init({
        canvas: canvasRef.current!,
        width: window.innerWidth,
        height: window.innerHeight,
        backgroundColor: 0x1a1a1a,
        antialias: false, // Pixel art
        resolution: window.devicePixelRatio,
      });

      appRef.current = app;

      // Preload textures
      await textureManager.loadBatch(tileAssets);

      // Create tile layer
      const tileLayer = new TileLayer();
      tileLayerRef.current = tileLayer;
      app.stage.addChild(tileLayer.getContainer());

      // Initial render
      tileLayer.renderTiles(currentMap, visibleRange);
    };

    initPixi();

    return () => {
      appRef.current?.destroy(true);
    };
  }, []);

  // Update tiles when map/camera changes
  useEffect(() => {
    if (tileLayerRef.current) {
      tileLayerRef.current.renderTiles(currentMap, visibleRange);
      tileLayerRef.current.updateCamera(cameraX, cameraY);
    }
  }, [currentMap, visibleRange, cameraX, cameraY]);

  return (
    <div className="relative w-screen h-screen">
      {/* PixiJS Canvas */}
      <canvas ref={canvasRef} />

      {/* React UI Overlay */}
      <div className="absolute inset-0 pointer-events-none">
        <HUD />
      </div>
    </div>
  );
};
```

#### 4. Test Performance

Compare PixiJS vs DOM rendering:

```bash
# Open dev tools → Performance
# Record while moving player
# Check FPS, render time, memory usage
```

**Expected improvements:**
- FPS: 30-45 → 60
- Render time: 15-20ms → 1-2ms
- Memory: -50%

---

### Option 2: Add Particle Effects

**Use case**: Add rain, snow, fireflies, sparkles, or other particle effects.

#### 1. Create ParticleEffect Class

Create `utils/pixi/ParticleEffect.ts`:

```typescript
import * as PIXI from 'pixi.js';

export interface ParticleConfig {
  texture: PIXI.Texture;
  maxParticles: number;
  emitRate: number; // Particles per second
  lifespan: number; // Seconds
  gravity: { x: number; y: number };
  initialVelocity: { min: { x: number; y: number }; max: { x: number; y: number } };
  scale: { min: number; max: number };
  alpha: { start: number; end: number };
  blendMode: PIXI.BLEND_MODES;
}

export class ParticleEffect {
  private container: PIXI.ParticleContainer;
  private particles: Array<{
    sprite: PIXI.Sprite;
    velocity: { x: number; y: number };
    life: number;
    maxLife: number;
  }> = [];
  private config: ParticleConfig;
  private emitTimer: number = 0;

  constructor(config: ParticleConfig) {
    this.config = config;
    this.container = new PIXI.ParticleContainer(config.maxParticles, {
      scale: true,
      position: true,
      rotation: true,
      alpha: true,
    });
  }

  emit(x: number, y: number, count: number = 1): void {
    for (let i = 0; i < count && this.particles.length < this.config.maxParticles; i++) {
      const sprite = new PIXI.Sprite(this.config.texture);
      sprite.x = x;
      sprite.y = y;
      sprite.anchor.set(0.5);

      // Random velocity
      const vx = this.lerp(
        this.config.initialVelocity.min.x,
        this.config.initialVelocity.max.x,
        Math.random()
      );
      const vy = this.lerp(
        this.config.initialVelocity.min.y,
        this.config.initialVelocity.max.y,
        Math.random()
      );

      // Random scale
      sprite.scale.set(
        this.lerp(this.config.scale.min, this.config.scale.max, Math.random())
      );

      sprite.alpha = this.config.alpha.start;
      sprite.blendMode = this.config.blendMode;

      this.container.addChild(sprite);
      this.particles.push({
        sprite,
        velocity: { x: vx, y: vy },
        life: 0,
        maxLife: this.config.lifespan,
      });
    }
  }

  update(deltaTime: number): void {
    // Update existing particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      // Update position
      p.sprite.x += p.velocity.x * deltaTime;
      p.sprite.y += p.velocity.y * deltaTime;

      // Apply gravity
      p.velocity.x += this.config.gravity.x * deltaTime;
      p.velocity.y += this.config.gravity.y * deltaTime;

      // Update life
      p.life += deltaTime;

      // Fade out
      const lifePercent = p.life / p.maxLife;
      p.sprite.alpha = this.lerp(this.config.alpha.start, this.config.alpha.end, lifePercent);

      // Remove dead particles
      if (p.life >= p.maxLife) {
        this.container.removeChild(p.sprite);
        p.sprite.destroy();
        this.particles.splice(i, 1);
      }
    }

    // Auto-emit
    this.emitTimer += deltaTime;
    const emitInterval = 1 / this.config.emitRate;
    if (this.emitTimer >= emitInterval) {
      this.emit(Math.random() * 800, 0); // Random X, top of screen
      this.emitTimer = 0;
    }
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  getContainer(): PIXI.ParticleContainer {
    return this.container;
  }

  clear(): void {
    this.particles.forEach(p => p.sprite.destroy());
    this.particles = [];
  }
}
```

#### 2. Create Effect Presets

Create `data/particlePresets.ts`:

```typescript
import * as PIXI from 'pixi.js';
import { ParticleConfig } from '../utils/pixi/ParticleEffect';

export const snowEffect = (texture: PIXI.Texture): ParticleConfig => ({
  texture,
  maxParticles: 500,
  emitRate: 20, // 20 snowflakes per second
  lifespan: 10, // 10 seconds to fall
  gravity: { x: 0, y: 50 }, // Fall down slowly
  initialVelocity: {
    min: { x: -10, y: 20 },
    max: { x: 10, y: 40 },
  },
  scale: { min: 0.5, max: 1.5 },
  alpha: { start: 0.8, end: 0 },
  blendMode: PIXI.BLEND_MODES.NORMAL,
});

export const rainEffect = (texture: PIXI.Texture): ParticleConfig => ({
  texture,
  maxParticles: 1000,
  emitRate: 100,
  lifespan: 2,
  gravity: { x: 0, y: 500 }, // Fall fast
  initialVelocity: {
    min: { x: -20, y: 400 },
    max: { x: 20, y: 600 },
  },
  scale: { min: 0.3, max: 0.8 },
  alpha: { start: 0.6, end: 0.2 },
  blendMode: PIXI.BLEND_MODES.NORMAL,
});

export const firefliesEffect = (texture: PIXI.Texture): ParticleConfig => ({
  texture,
  maxParticles: 50,
  emitRate: 2,
  lifespan: 5,
  gravity: { x: 0, y: -10 }, // Float up slightly
  initialVelocity: {
    min: { x: -20, y: -20 },
    max: { x: 20, y: 20 },
  },
  scale: { min: 0.5, max: 1.0 },
  alpha: { start: 1, end: 0 },
  blendMode: PIXI.BLEND_MODES.ADD, // Glow effect
});
```

#### 3. Integrate Effect System

Add to App.tsx:

```typescript
import { ParticleEffect } from './utils/pixi/ParticleEffect';
import { snowEffect } from './data/particlePresets';

// In useEffect after PixiJS init
const snowTexture = await PIXI.Assets.load('/assets/particles/snowflake.png');
const particleEffect = new ParticleEffect(snowEffect(snowTexture));
app.stage.addChild(particleEffect.getContainer());

// In game loop
app.ticker.add((delta) => {
  const deltaTime = delta / 60; // Convert to seconds
  particleEffect.update(deltaTime);
});
```

#### 4. Trigger on Events

```typescript
// Item pickup sparkles
function onItemPickup(x: number, y: number) {
  sparkleEffect.emit(x, y, 20); // Burst of 20 sparkles
}

// Weather system integration
function onWeatherChange(weather: string) {
  switch (weather) {
    case 'snow':
      snowEffect.enable();
      rainEffect.disable();
      break;
    case 'rain':
      rainEffect.enable();
      snowEffect.disable();
      break;
    default:
      snowEffect.disable();
      rainEffect.disable();
  }
}
```

---

### Option 3: Add Animated Sprites

**Use case**: Animated NPCs, effects, or decorations using sprite sheets.

#### 1. Create Sprite Sheet

Combine animation frames into a single image with JSON metadata:

```bash
# Use TexturePacker or create manually
# Example: npc_walk.png (4 frames horizontally)
```

#### 2. Load Sprite Sheet

```typescript
import { Assets, AnimatedSprite, Spritesheet } from 'pixi.js';

// Load sprite sheet
const spritesheet = await Assets.load('/assets/spritesheets/npc_walk.json');

// Create animated sprite
const animatedSprite = new AnimatedSprite(spritesheet.animations['walk']);
animatedSprite.animationSpeed = 0.1; // Speed
animatedSprite.loop = true;
animatedSprite.play();

app.stage.addChild(animatedSprite);
```

#### 3. Control Animation

```typescript
// Change animation
animatedSprite.textures = spritesheet.animations['run'];
animatedSprite.play();

// Stop animation
animatedSprite.stop();

// Jump to frame
animatedSprite.gotoAndStop(2);
```

---

## Common Patterns

### Pattern 1: Layer Management

Organize rendering in layers:

```typescript
// Create layers (bottom to top)
const backgroundLayer = new PIXI.Container();
const tileLayer = new PIXI.Container();
const spriteLayer = new PIXI.Container();
const effectLayer = new PIXI.Container();
const uiLayer = new PIXI.Container();

// Add to stage in order
app.stage.addChild(backgroundLayer);
app.stage.addChild(tileLayer);
app.stage.addChild(spriteLayer);
app.stage.addChild(effectLayer);
app.stage.addChild(uiLayer);
```

### Pattern 2: Sprite Pooling

Reuse sprites for better performance:

```typescript
class SpritePool {
  private pool: PIXI.Sprite[] = [];

  acquire(texture: PIXI.Texture): PIXI.Sprite {
    const sprite = this.pool.pop() || new PIXI.Sprite(texture);
    sprite.texture = texture;
    sprite.visible = true;
    return sprite;
  }

  release(sprite: PIXI.Sprite): void {
    sprite.visible = false;
    this.pool.push(sprite);
  }
}
```

### Pattern 3: Viewport Culling

Only render visible sprites:

```typescript
function cullSprites(container: PIXI.Container, viewport: PIXI.Rectangle) {
  container.children.forEach((child) => {
    const bounds = child.getBounds();
    child.visible = viewport.intersects(bounds);
  });
}
```

---

## Performance Tips

1. **Use ParticleContainer** for many similar sprites (up to 10,000)
2. **Batch sprites** with same texture together
3. **Cull off-screen sprites** (set visible = false)
4. **Pool sprites** instead of creating/destroying
5. **Use texture atlases** to reduce draw calls
6. **Disable interactivity** on static sprites (`sprite.eventMode = 'none'`)
7. **Use `PIXI.Ticker`** instead of requestAnimationFrame

---

## Testing Checklist

After implementing PixiJS component:

- [ ] Visual parity with DOM renderer (screenshot comparison)
- [ ] FPS ≥ 60 on target devices
- [ ] No memory leaks (check DevTools Memory)
- [ ] Correct z-ordering (layers render in right order)
- [ ] Camera movement smooth
- [ ] Textures load correctly (no missing sprites)
- [ ] Pixel art rendering sharp (scaleMode: 'nearest')

---

## Troubleshooting

**Issue: Blurry sprites**
```typescript
// Solution: Use 'nearest' scale mode
texture.source.scaleMode = 'nearest';
```

**Issue: Low FPS**
```typescript
// Check draw calls in DevTools
// Batch sprites with same texture
// Use ParticleContainer for particles
```

**Issue: Memory leak**
```typescript
// Always destroy sprites when done
sprite.destroy({ texture: false, baseTexture: false });
```

**Issue: Textures not loading**
```typescript
// Use await for async loading
const texture = await PIXI.Assets.load(url);
```

---

## Resources

- 📖 [PixiJS v8 Documentation](https://pixijs.com/docs)
- 📖 [PIXI_API_REFERENCE.md](../../../design_docs/planned/PIXI_API_REFERENCE.md)
- 📖 [PIXI_MIGRATION.md](../../../design_docs/planned/PIXI_MIGRATION.md)
- 📖 [PixiJS Examples](https://pixijs.com/examples)
- 🎮 [Particle Editor](https://pixijs.io/particle-emitter/)

---

## Next Steps

After adding PixiJS component:

1. Update [IMPLEMENTATION_STATUS.md](../../../design_docs/planned/IMPLEMENTATION_STATUS.md)
2. Document performance benchmarks
3. Add to feature flag system
4. Test on mobile devices
5. Create visual regression tests

---

**Skill Status**: Ready to use ✅
**PixiJS Version**: 8.14.0
**Last Updated**: November 1, 2025
