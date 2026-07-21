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

#### Step 1: Verify TextureManager

```bash
ls -la utils/TextureManager.ts
```

If missing, use template from [PIXI_API_REFERENCE.md](../../../design_docs/planned/PIXI_API_REFERENCE.md#texture-manager-v8-compatible).

#### Step 2: Create TileLayer Class

Create `utils/pixi/TileLayer.ts` - See [resources/reference.md](resources/reference.md#tilelayer-implementation) for complete code.

Key features:
- Sprite reuse (avoids creating new sprites)
- Viewport culling (hide off-screen tiles)
- Camera updates
- Deterministic tile variation

#### Step 3: Integrate with App.tsx

```typescript
import * as PIXI from 'pixi.js';
import { TileLayer } from './utils/pixi/TileLayer';

useEffect(() => {
  const initPixi = async () => {
    const app = new PIXI.Application();
    await app.init({ canvas: canvasRef.current!, antialias: false });
    await textureManager.loadBatch(tileAssets);
    
    const tileLayer = new TileLayer();
    app.stage.addChild(tileLayer.getContainer());
    tileLayer.renderTiles(currentMap, visibleRange);
  };
  initPixi();
}, []);
```

#### Step 4: Test Performance

Compare PixiJS vs DOM:
- FPS: 30-45 → 60
- Render time: 15-20ms → 1-2ms
- Memory: -50%

---

### Option 2: Add Particle Effects

**Use case**: Add rain, snow, fireflies, sparkles, or other particle effects.

#### Step 1: Create ParticleEffect Class

Create `utils/pixi/ParticleEffect.ts` - See [resources/reference.md](resources/reference.md#particleeffect-implementation) for complete code.

#### Step 2: Create Effect Presets

Create `data/particlePresets.ts`:
```typescript
export const snowEffect = (texture) => ({
  maxParticles: 500,
  emitRate: 20,
  lifespan: 10,
  gravity: { x: 0, y: 50 },
});
```

See [resources/reference.md](resources/reference.md#particle-presets) for all presets.

#### Step 3: Integrate Effect System

```typescript
const snowTexture = await PIXI.Assets.load('/assets/particles/snowflake.png');
const particleEffect = new ParticleEffect(snowEffect(snowTexture));
app.stage.addChild(particleEffect.getContainer());

app.ticker.add((delta) => particleEffect.update(delta / 60));
```

#### Step 4: Trigger on Events

```typescript
onItemPickup((x, y) => sparkleEffect.emit(x, y, 20));
onWeatherChange((weather) => {
  if (weather === 'snow') snowEffect.enable();
});
```

---

### Option 3: Add Animated Sprites

**Use case**: Animated NPCs, effects, or decorations using sprite sheets.

```typescript
const spritesheet = await Assets.load('/assets/spritesheets/npc_walk.json');
const animatedSprite = new AnimatedSprite(spritesheet.animations['walk']);
animatedSprite.animationSpeed = 0.1;
animatedSprite.loop = true;
animatedSprite.play();
```

---

## Common Patterns

See [resources/reference.md](resources/reference.md) for detailed implementations:

- **Layer Management**: LayerManager class for organizing rendering layers
- **Sprite Pooling**: SpritePool class for reusing sprites
- **Viewport Culling**: ViewportCuller class for hiding off-screen sprites

---

## Performance Tips

1. Use ParticleContainer for many similar sprites
2. Batch sprites with same texture
3. Cull off-screen sprites
4. Pool sprites instead of creating/destroying
5. Use texture atlases
6. Disable interactivity on static sprites

See [resources/reference.md](resources/reference.md#performance-optimization) for details.

---

## Testing Checklist

- [ ] Visual parity with DOM renderer
- [ ] FPS ≥ 60
- [ ] No memory leaks
- [ ] Correct z-ordering
- [ ] Camera smooth
- [ ] Textures load
- [ ] Hand-drawn art renders smoothly (`scaleMode: 'linear'` + mipmaps — **never** `'nearest'`)
- [ ] `make verify` clean (typecheck + full test suite). **Never `npm test`** — watch mode, never exits; use `make test` or `npm run test:run` for tests alone. Only `cropGrowth` + `eventChains` should fail — that is the known baseline on `main`
- [ ] If the component resolves tile colours, `tests/colorResolver.test.ts` still passes — any new `TileType` must be mapped in `TILE_TYPE_TO_COLOR_KEY`
- [ ] If the component references new textures, `tests/assetIntegrity.test.ts` still passes — every asset path must resolve to a real file

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Blurry sprites | Keep `scaleMode: 'linear'` + `autoGenerateMipmaps`; if still soft the asset is under-resolved — raise its size in `scripts/optimize-assets.js`. **Never** `'nearest'` (hand-drawn art) |
| Low FPS | Use texture atlases, ParticleContainer, culling |
| Memory leaks | `sprite.destroy({ texture: false })` |
| Textures not loading | `await PIXI.Assets.load(url)` |

See [resources/reference.md](resources/reference.md#troubleshooting-guide) for detailed solutions.

---

## Resources

- 📖 [Detailed Code Examples](resources/reference.md)
- 📖 [PIXI_API_REFERENCE.md](../../../design_docs/planned/PIXI_API_REFERENCE.md)
- 📖 [PIXI_MIGRATION.md](../../../design_docs/planned/PIXI_MIGRATION.md)
- 📖 [PixiJS v8 Documentation](https://pixijs.com/docs)
- 🎮 [Particle Editor](https://pixijs.io/particle-emitter/)

---

**Skill Status**: Ready to use ✅
**PixiJS Version**: 8.14.0
**Last Updated**: November 1, 2025
