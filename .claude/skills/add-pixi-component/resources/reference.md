# PixiJS Component Reference

Detailed code examples and implementations for PixiJS components in TwilightGame.

## Complete Implementations

### TileLayer Implementation

Full TileLayer class with sprite pooling and culling:

```typescript
import * as PIXI from 'pixi.js';
import { TILE_SIZE } from '../../constants';
import { textureManager } from '../TextureManager';
import { getTileData } from '../mapUtils';
import { MapDefinition } from '../../types';

export class TileLayer {
  private container: PIXI.Container;
  private sprites: Map<string, PIXI.Sprite> = new Map();

  constructor() {
    this.container = new PIXI.Container();
  }

  renderTiles(
    map: MapDefinition,
    visibleRange: { minX: number; maxX: number; minY: number; maxY: number }
  ): void {
    this.cullSprites(visibleRange);

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

    const hash = Math.abs(Math.sin(x * 99.123 + y * 45.678) * 12345.6789);
    const index = Math.floor((hash % 1) * tileData.image.length);
    const imageUrl = tileData.image[index];

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
      sprite.visible = true;
    }
  }

  private cullSprites(visibleRange: any): void {
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

### ParticleEffect Implementation

Complete particle system:

```typescript
import * as PIXI from 'pixi.js';

export interface ParticleConfig {
  texture: PIXI.Texture;
  maxParticles: number;
  emitRate: number;
  lifespan: number;
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

      sprite.scale.set(
        this.lerp(this.config.scale.min, this.config.scale.max, Math.random())
      );
      sprite.alpha = this.config.alpha.start;
      sprite.blendMode = this.config.blendMode;

      this.container.addChild(sprite);
      this.particles.push({ sprite, velocity: { x: vx, y: vy }, life: 0, maxLife: this.config.lifespan });
    }
  }

  update(deltaTime: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      p.sprite.x += p.velocity.x * deltaTime;
      p.sprite.y += p.velocity.y * deltaTime;
      p.velocity.x += this.config.gravity.x * deltaTime;
      p.velocity.y += this.config.gravity.y * deltaTime;
      p.life += deltaTime;

      const lifePercent = p.life / p.maxLife;
      p.sprite.alpha = this.lerp(this.config.alpha.start, this.config.alpha.end, lifePercent);

      if (p.life >= p.maxLife) {
        this.container.removeChild(p.sprite);
        p.sprite.destroy();
        this.particles.splice(i, 1);
      }
    }

    this.emitTimer += deltaTime;
    const emitInterval = 1 / this.config.emitRate;
    if (this.emitTimer >= emitInterval) {
      this.emit(Math.random() * 800, 0);
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

### Particle Presets

Weather and effect configurations:

```typescript
import * as PIXI from 'pixi.js';
import { ParticleConfig } from '../utils/pixi/ParticleEffect';

export const snowEffect = (texture: PIXI.Texture): ParticleConfig => ({
  texture,
  maxParticles: 500,
  emitRate: 20,
  lifespan: 10,
  gravity: { x: 0, y: 50 },
  initialVelocity: { min: { x: -10, y: 20 }, max: { x: 10, y: 40 } },
  scale: { min: 0.5, max: 1.5 },
  alpha: { start: 0.8, end: 0 },
  blendMode: PIXI.BLEND_MODES.NORMAL,
});

export const rainEffect = (texture: PIXI.Texture): ParticleConfig => ({
  texture,
  maxParticles: 1000,
  emitRate: 100,
  lifespan: 2,
  gravity: { x: 0, y: 500 },
  initialVelocity: { min: { x: -20, y: 400 }, max: { x: 20, y: 600 } },
  scale: { min: 0.3, max: 0.8 },
  alpha: { start: 0.6, end: 0.2 },
  blendMode: PIXI.BLEND_MODES.NORMAL,
});

export const firefliesEffect = (texture: PIXI.Texture): ParticleConfig => ({
  texture,
  maxParticles: 50,
  emitRate: 2,
  lifespan: 5,
  gravity: { x: 0, y: -10 },
  initialVelocity: { min: { x: -20, y: -20 }, max: { x: 20, y: 20 } },
  scale: { min: 0.5, max: 1.0 },
  alpha: { start: 1, end: 0 },
  blendMode: PIXI.BLEND_MODES.ADD,
});
```

## Advanced Patterns

### Layer Management System

```typescript
class LayerManager {
  private layers = {
    background: new PIXI.Container(),
    tiles: new PIXI.Container(),
    sprites: new PIXI.Container(),
    effects: new PIXI.Container(),
  };

  constructor(app: PIXI.Application) {
    Object.values(this.layers).forEach(layer => app.stage.addChild(layer));
  }

  getLayer(name: keyof typeof this.layers): PIXI.Container {
    return this.layers[name];
  }

  updateCamera(cameraX: number, cameraY: number): void {
    ['background', 'tiles', 'sprites', 'effects'].forEach(key => {
      this.layers[key as keyof typeof this.layers].position.set(-cameraX, -cameraY);
    });
  }
}
```

### Sprite Pooling

```typescript
class SpritePool {
  private pool: PIXI.Sprite[] = [];
  private texture: PIXI.Texture;

  constructor(texture: PIXI.Texture, size: number = 100) {
    this.texture = texture;
    for (let i = 0; i < size; i++) {
      this.pool.push(new PIXI.Sprite(texture));
    }
  }

  acquire(): PIXI.Sprite {
    return this.pool.pop() || new PIXI.Sprite(this.texture);
  }

  release(sprite: PIXI.Sprite): void {
    sprite.visible = false;
    this.pool.push(sprite);
  }
}
```

### Viewport Culling

```typescript
class ViewportCuller {
  private viewport: PIXI.Rectangle;

  constructor(width: number, height: number) {
    this.viewport = new PIXI.Rectangle(0, 0, width, height);
  }

  updateViewport(x: number, y: number): void {
    this.viewport.x = x;
    this.viewport.y = y;
  }

  cullContainer(container: PIXI.Container): number {
    let culled = 0;
    container.children.forEach((child) => {
      const bounds = child.getBounds();
      const visible = this.viewport.intersects(bounds);
      if (child.visible !== visible) {
        child.visible = visible;
        if (!visible) culled++;
      }
    });
    return culled;
  }
}
```

## Performance Optimization

### Texture Atlas Creation

```bash
texturepacker --format pixijs \
  --data public/assets/atlases/tiles.json \
  --sheet public/assets/atlases/tiles.png \
  public/assets/tiles/*.png
```

### Batch Rendering

```typescript
// Group sprites by texture
const grassContainer = new PIXI.Container();
const rockContainer = new PIXI.Container();

grassContainer.addChild(new PIXI.Sprite(grassTexture));
grassContainer.addChild(new PIXI.Sprite(grassTexture));
// Both sprites render in one draw call
```

## Troubleshooting Guide

### Blurry Sprites

```typescript
// Solution 1: Set texture scale mode
texture.source.scaleMode = 'nearest';

// Solution 2: Global default
PIXI.TextureSource.defaultOptions.scaleMode = 'nearest';
```

### Low FPS

```typescript
// Check draw calls
app.renderer.gl?.getParameter(app.renderer.gl.CURRENT_PROGRAM);

// Optimize
// 1. Use texture atlases
// 2. Use ParticleContainer
// 3. Cull off-screen sprites
```

### Memory Leaks

```typescript
// Always destroy properly
sprite.destroy({ texture: false, baseTexture: false });

// Clear containers
container.removeChildren().forEach(child => child.destroy());
```

### Textures Not Loading

```typescript
// Use await
const texture = await PIXI.Assets.load(url);

// Or listen for events
texture.on('loaded', () => console.log('Loaded'));
texture.on('error', (err) => console.error(err));
```

## Testing Strategies

### Performance Benchmarking

```typescript
let frameCount = 0;
let totalTime = 0;

app.ticker.add(() => {
  const start = performance.now();

  // Game logic

  totalTime += performance.now() - start;
  if (++frameCount % 60 === 0) {
    console.log(`Avg: ${(totalTime / 60).toFixed(2)}ms`);
    totalTime = 0;
  }
});
```

### Visual Parity Testing

```bash
# Screenshot comparison
compare dom_renderer.png pixi_renderer.png difference.png
```

## Resources

- [PixiJS v8 Docs](https://pixijs.com/docs)
- [PixiJS Examples](https://pixijs.com/examples)
- [Particle Editor](https://pixijs.io/particle-emitter/)
- [PIXI_API_REFERENCE.md](../../../design_docs/planned/PIXI_API_REFERENCE.md)
