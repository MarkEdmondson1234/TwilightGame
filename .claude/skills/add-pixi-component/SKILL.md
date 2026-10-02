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

## Existing Layers — Check These First

Most of the PixiJS renderer already exists. Extend one of these before creating a new file. All live in `utils/pixi/` and are wired up in `hooks/usePixiRenderer.ts` (not `App.tsx`):

- `PixiLayer.ts` — abstract base class (container, camera, visibility); new layers should extend it
- `PixiLayerManager.ts` — coordinates layers: camera updates, lookup by name
- `TileLayer.ts` — ground tiles, colours, farm plot states
- `SpriteLayer.ts` — multi-tile sprites (furniture, buildings, trees) with Y-based depth sorting
- `PlayerSprite.ts` — the local player's animated sprite
- `NPCLayer.ts` — NPCs, depth-sorted by feet position
- `RemotePlayerLayer.ts` — other players in the shared world (mirrors `NPCLayer`)
- `PlacedItemsLayer.ts` — runtime-placed items (cooked food, dropped items, paintings, crafted decorations)
- `RoomPropsLayer.ts` — static props declared on a map's `props`
- `BackgroundImageLayer.ts` — painted room backgrounds for interiors
- `AnimationLayer.ts` — tile-triggered animations (petals, bees, dragonflies, hearth fire) from sprite sheets
- `WeatherLayer.ts` — particle weather (rain, snow, storm, blossoms) and fog/mist overlays
- `WeatherTint.ts` — full-viewport colour wash for weather
- `CloudShadowLayer.ts` — drifting cloud shadows
- `ShadowLayer.ts` — time-of-day shadows under trees and buildings
- `DarknessLayer.ts` — cave/mine darkness with torch lighting
- `ForegroundParallaxLayer.ts` — tree crowns framing the bottom of the screen
- `HighlightLayer.ts` — hover highlight on the targeted tile
- `ThoughtBubbleLayer.ts` / `PlayerSpeechBubble.ts` / `speechBubbleLayout.ts` — NPC thought bubbles, chat bubbles, text wrapping
- `EmoteSprite.ts` — emote thumbnails above players
- `CaveDrips.ts` / `WeatherVane.ts` — small animated attachments to existing sprites
- `maskUtils.ts` — safe mask attach/detach (read before using masks: a mask destroyed while assigned is a white-screen crash)
- `contextRecovery.ts` — WebGL context-loss recovery policy

Textures always go through `utils/TextureManager.ts` and are scoped per map by `utils/mapTextureSet.ts` (see "Texture Memory" in `CLAUDE.md`). Z-order values come from `zIndex.ts`.

Potion/magic VFX are not PixiJS: they are React components (`components/VFXRenderer.tsx`, `components/vfx/`) driven by `data/vfxConfig.ts` and `hooks/useVFX.ts`.

## Quick Start

**Adding a new rendering layer:**
```typescript
// 1. Check the list above — extend an existing layer if one fits
// 2. Otherwise create utils/pixi/YourLayer.ts extending PixiLayer
// 3. Wire it up in hooks/usePixiRenderer.ts (camera, per-frame update, map change cleanup)
// 4. Use zIndex.ts constants and textureManager.getTexture()
```

**Adding particle effects:**
```typescript
// 1. Weather-style particles: extend WeatherLayer
// 2. Tile-triggered looping animations: add a sprite sheet for AnimationLayer (see the add-animation skill)
// 3. A genuinely new effect system: new PixiLayer subclass, wired in usePixiRenderer
```

## Workflow

### Option 1: Add Tile Rendering Layer

**Use case**: Add a new tile-aligned layer. `utils/TextureManager.ts` and `utils/pixi/TileLayer.ts` already exist — read `TileLayer.ts` as the worked example rather than recreating it.

#### Step 1: Read the existing layers

`utils/pixi/PixiLayer.ts` (base class) and `utils/pixi/TileLayer.ts`. [resources/reference.md](resources/reference.md#tilelayer-implementation) has a simplified illustration of the same ideas.

#### Step 2: Create your layer class

Create `utils/pixi/YourLayer.ts` extending `PixiLayer`.

Key features:
- Sprite reuse (avoids creating new sprites)
- Viewport culling (hide off-screen tiles)
- Camera updates
- Deterministic tile variation

#### Step 3: Integrate (illustrative — the real wiring lives in `hooks/usePixiRenderer.ts`)

```typescript
import * as PIXI from 'pixi.js';
import { TileLayer } from './utils/pixi/TileLayer';

useEffect(() => {
  const initPixi = async () => {
    const app = new PIXI.Application();
    // antialias/resolution come from the device tier, not from art style
    const perfSettings = getCachedPerformanceSettings();
    await app.init({
      canvas: canvasRef.current!,
      antialias: perfSettings.antialias,
      resolution: perfSettings.resolution,
    });
    // Core + this map only, NOT every texture in the game — see the
    // "Texture Memory" section of CLAUDE.md.
    await textureManager.loadUrls(getResidentTextureUrls(currentMapId, season, characterId));
    
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

There is no generic `ParticleEffect` class or `particlePresets` file in the codebase. Weather particles live in `utils/pixi/WeatherLayer.ts` (configured from `data/weatherConfig.ts`) and tile animations in `utils/pixi/AnimationLayer.ts` — extend those first. The steps below sketch a standalone particle layer if neither fits.

#### Step 1: Create a particle layer

Create `utils/pixi/YourParticleLayer.ts` extending `PixiLayer` — see [resources/reference.md](resources/reference.md#particleeffect-implementation) for an illustrative implementation.

#### Step 2: Define presets

Keep presets beside the layer, or in `data/` next to `data/weatherConfig.ts`:
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
- [ ] `make verify` clean (typecheck + full test suite). **Never `npm test`** — watch mode, never exits; use `make test` or `npm run test:run` for tests alone. The suite is fully green, so any failure is a real regression
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
