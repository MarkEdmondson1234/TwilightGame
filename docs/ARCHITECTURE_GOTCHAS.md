# Architecture Gotchas

Hard-won knowledge about non-obvious architectural decisions. If you're debugging a problem and can't find the root cause, check here first — these are the patterns that have repeatedly tripped up both humans and AI assistants.

---

## 1. Screen-to-Tile Coordinate Pipeline

**The #1 source of "offset" bugs.** Clicks feel misaligned from tiles? Read this section.

### How clicks become tile positions

```
User clicks on screen
    │
    ▼
useMouseControls.ts — getBoundingClientRect() gives screen-relative pixels
    │
    ▼
screenToTile.ts — converts screen pixels → world tile coordinates
    │
    ├── Standard tiled rooms:
    │     worldX = (screenX / zoom + cameraX) / TILE_SIZE
    │
    └── Background-image rooms:
          worldX = (screenX / zoom - gridOffset.x) / effectiveTileSize
    │
    ▼
actionHandlers.ts / forageHandlers.ts — uses tile position to find interactions
```

### The two rendering modes

The game has **two fundamentally different** rendering pipelines:

| | Standard tiled rooms | Background-image rooms |
|---|---|---|
| **Examples** | Village, forest, caves | Shop, cottage interior, Mum's kitchen |
| **How it works** | PixiJS renders each tile, camera scrolls | Pre-drawn image centered in viewport |
| **Coordinate conversion** | Uses `cameraX/Y` and `TILE_SIZE` | Uses `gridOffset` and `effectiveTileSize` |
| **Map property** | `renderMode: undefined` or `'tiled'` | `renderMode: 'background-image'` |
| **Zoom handling** | PixiJS stage.scale handles it | Must manually factor zoom into gridOffset |

### Critical rule: effectiveGridOffset must include zoom

`effectiveGridOffset` (in App.tsx) calculates where the centered background image sits on screen. The formula must include ALL scaling factors:

```
imageWidth = baseWidth × layerScale × viewportScale × zoom
offsetX = (viewportSize.width - imageWidth) / 2
```

**Why zoom matters**: PixiJS `stage.scale.set(zoom)` scales the rendered image. At zoom=2, the image occupies twice the screen pixels. If `gridOffset` doesn't account for this, `screenToTile` produces coordinates that are offset by a factor of zoom — clicks land on the wrong tile.

**Historical bug**: `effectiveGridOffset` was originally calculated without `zoom`, causing all interactions in background-image rooms (farming, foraging, NPC clicks) to be offset. This was the "stubborn offset bug" that persisted across many fix attempts because:
- It only manifested in background-image rooms (not in the village/forest)
- The offset grew with zoom level, making it seem intermittent
- Fixes that adjusted `screenToTile` alone couldn't work because `gridOffset` was wrong upstream

### The dependency array matters

The `effectiveGridOffset` useMemo must recalculate when ANY of these change:
- `currentMap`, `currentMapId` — map geometry
- `viewportScale` — responsive scaling
- `viewportSize` — window resize
- `zoom` — user zoom level

Missing `zoom` from the dependency array was part of the original bug — the offset was stale after zoom changes.

### CSS `transform: scale()` silently breaks pointer maths

The same class of bug appears inside UI panels, not just the game canvas. A responsive
panel that scales itself down on narrow viewports:

```typescript
const scale = Math.min(1, (windowWidth * 0.95) / TARGET_WIDTH);
<div style={{ width: TARGET_WIDTH, transform: `scale(${scale})` }}>
```

...will place things in the wrong spot if the pointer maths uses raw client pixels:

```typescript
// ❌ WRONG — rect is the SCALED box, but the coordinates are used as unscaled ones
const rect = el.getBoundingClientRect();
const x = e.clientX - rect.left;   // at scale 0.8, a click at the visual centre
const y = e.clientY - rect.top;    // lands at 80% of the intended position
```

`getBoundingClientRect()` returns post-transform (scaled) dimensions, so the offset it
produces is in *screen* pixels while the layout coordinates it gets compared against are
in *unscaled* pixels. Divide by the effective scale:

```typescript
// ✅ CORRECT — derive the real scale from the rect rather than trusting a state variable
const rect = el.getBoundingClientRect();
const scale = rect.width / UNSCALED_WIDTH;
const x = (e.clientX - rect.left) / scale;
const y = (e.clientY - rect.top) / scale;
```

**Drag deltas need the same treatment** — `pos.x - startX` is a screen-pixel delta, so it
must also be divided by the scale before being applied to a layout coordinate.

This bites hardest on iPad, where a narrow viewport means the scale is essentially always
below 1, so the bug is invisible on a desktop dev machine at full width.

### Testing coordinate fixes

If you change anything in the coordinate pipeline, test in BOTH room types:
1. **Standard room** (village): click on an NPC, click on a farm plot
2. **Background-image room** (shop, cottage): click on an NPC, click on interactable objects
3. **At different zoom levels**: zoom in/out and repeat both tests
4. **At a narrow viewport**: shrink the window until any responsive `transform: scale()`
   kicks in, then repeat — this is what an iPad sees

---

## 2. Click Detection and UI Layers

### The pointer-events trap

Many HUD elements use `pointer-events: none` so they don't block game interaction:

```tsx
<div className="absolute left-2 z-[1000] pointer-events-none">
  <Wallet />  {/* Visual only, clicks pass through */}
</div>
```

**The problem**: When a click passes through a `pointer-events: none` element, `e.target` is the element BEHIND it (usually the canvas). The `isUIElement()` check then inspects the canvas's z-index (~0), which is below Z_HUD (1000), so it returns false. The click processes as a game interaction.

**The fix**: Use `document.elementsFromPoint(clientX, clientY)` which returns ALL elements at a position regardless of `pointer-events`. This catches HUD overlays even when they don't directly receive the click.

```typescript
// ✅ CORRECT — checks all elements at click position
const elementsAtPoint = document.elementsFromPoint(clientX, clientY);
for (const el of elementsAtPoint) {
  const zIndex = parseInt(getComputedStyle(el).zIndex, 10);
  if (!isNaN(zIndex) && zIndex >= Z_HUD) return true; // UI layer
}

// ❌ WRONG — only checks e.target ancestor chain (misses pointer-events:none layers)
let el = e.target;
while (el) { /* check zIndex... */ el = el.parentElement; }
```

### React synthetic events vs native DOM events

React's `e.stopPropagation()` only stops React's synthetic event system. It does NOT prevent native DOM `addEventListener` handlers from firing. Since `useMouseControls` uses native `addEventListener` on the game container, React `stopPropagation()` in UI components won't block game clicks.

**This means**: You cannot rely on `stopPropagation()` in React components to prevent game interactions. The `isUIElement()` check in `useMouseControls` is the gatekeeper.

### Z-index layers (from zIndex.ts)

Always import constants from `zIndex.ts`. Key ranges:

| Z-range | Purpose | Must block clicks? |
|---------|---------|-------------------|
| 0–99 | Game world (tiles, sprites) | No |
| 100–199 | Player/NPC level | No |
| 400–499 | Radial menu, action prompts | Yes |
| 1000–1099 | HUD elements | Should block if interactive |
| 2000–2099 | Modals, dialogue, shop | Must block |
| 3000+ | Toast, loading, errors | Must block |

**Rule**: Any overlay at Z_HUD (1000) or above that has interactive content MUST either:
- Use `pointer-events: auto` on the container, OR
- Be detected by `isUIElement()` via `elementsFromPoint`

---

## 3. Loading Screen Overlay

### The z-index must cover everything

The "Enter Game" overlay renders AFTER the game world is fully initialized. This means all game elements (NPCs, HUD, transitions, books) are live underneath it. The overlay z-index must be above ALL game elements:

```tsx
// ✅ CORRECT — Z_LOADING = 3500, covers everything
<div className={`fixed inset-0 bg-black ${zClass(Z_LOADING)}`}>

// ❌ WRONG — z-[150] is below HUD (1000), dialogue (2010), etc.
<div className="fixed inset-0 bg-black z-[150]">
```

**Historical bug**: The overlay used `z-[150]`, so NPC speech bubbles (z-2010), HUD elements (z-1000), and interactive books rendered on top of the loading screen and were clickable before the player pressed "Enter Game".

**Rule**: Never hardcode z-index values. Import from `zIndex.ts`. If a new layer is needed, add a constant there.

---

## 4. Ambient Audio and React Effect Lifecycle

### Each ambient sound owns its own effect

The audio system uses separate `useEffect` hooks for each ambient category:

| Effect | Sounds | Dependencies |
|--------|--------|-------------|
| Weather ambient | rain, storm, blizzard | `currentWeather`, `currentMapId` |
| Birds | ambient_birds | `currentMapId`, `currentWeather` |
| Cave wind | ambient_cave_wind | `currentMapId` |
| Stream | ambient_running_stream | `currentMapId`, `currentWeather` |
| Countryside | ambient_countryside_summer | `currentMapId`, `currentWeather` |
| Lava | ambient_lava | `currentMapId` |

### Never blanket-stop sounds you don't own

**Critical rule**: Each effect should ONLY stop the sounds it manages.

```typescript
// ✅ CORRECT — weather effect only stops weather sounds
audioManager.stopAmbient('ambient_rain_light', 1000);
audioManager.stopAmbient('ambient_thunderstorm', 1000);
audioManager.stopAmbient('ambient_blizzard', 1000);

// ❌ WRONG — weather effect stops birds, stream, countryside too
audioManager.stopAmbient('ambient_birds', 1000);       // Owned by birds effect!
audioManager.stopAmbient('ambient_countryside_summer', 1000); // Owned by countryside effect!
```

**Why this matters**: When `currentMapId` changes, React runs ALL cleanup functions first, then ALL effects in definition order. If the weather effect (defined first) stops birds, and then the birds effect (defined later) tries to play them:

1. Weather effect stops birds (1000ms fade starts)
2. Birds effect calls `playAmbient('ambient_birds')`
3. `playAmbient` checks `activeAmbients` → key was deleted by `stopAmbient` → starts new instance
4. But the old instance is still fading out, creating audio overlap OR the new instance gets interrupted

**Historical bug**: The weather effect blanket-stopped ALL ambient sounds (including non-weather ones) on every map/weather change. This caused silence on map transitions because non-weather ambient was killed before its own effect could re-evaluate.

### AudioManager stop/play interaction

`stopAmbient(key)` immediately removes the key from `activeAmbients` (synchronous) but fades out the audio over `fadeOutMs` (asynchronous). `playAmbient(key)` checks `activeAmbients.has(key)` — if the key was removed by a recent stop, it starts a fresh instance. This is intentional: stop-then-play creates a crossfade rather than silence.

### Adding ambient to new map types

When adding a new map type that needs ambient audio:

1. Add a new `useEffect` in `useEnvironmentController.ts` (follow the existing pattern)
2. Check `audioManager.hasSound(key)` before playing (sound might not be loaded)
3. Stop in the cleanup function and the else branch
4. Depend on `currentMapId` (and `currentWeather` if weather-sensitive)
5. **Do NOT** add stop calls for this sound in the weather effect

```typescript
// Template for new ambient
useEffect(() => {
  const shouldPlay = /* condition based on currentMapId */;

  if (shouldPlay) {
    if (audioManager.hasSound('ambient_my_new_sound')) {
      audioManager.playAmbient('ambient_my_new_sound');
    }
  } else {
    audioManager.stopAmbient('ambient_my_new_sound', 1000);
  }

  return () => {
    audioManager.stopAmbient('ambient_my_new_sound', 500);
  };
}, [currentMapId, currentWeather]);
```

---

## 5. Background-Image Room Rendering

### How it differs from tiled rooms

Background-image rooms use pre-drawn artwork instead of tile-by-tile rendering. The image is centered in the viewport with an invisible collision grid overlaid.

```
┌───────────── Viewport ──────────────┐
│                                     │
│    ┌──── Centered Image ────┐       │
│    │  ┌── Collision Grid ──┐│       │
│    │  │ . . . . . . . . .  ││       │
│    │  │ . . NPC . . . . .  ││       │
│    │  │ . . . . . . . . .  ││       │
│    │  └────────────────────┘│       │
│    └────────────────────────┘       │
│         ↑ gridOffset.x             │
└─────────────────────────────────────┘
```

### Key properties

- **`gridOffset`**: Screen-pixel offset from viewport origin to image top-left corner
- **`effectiveTileSize`**: `TILE_SIZE × viewportScale × layerScale` — how big each tile is on screen
- **`layers`**: Array of image layers (back, NPC, front) composited in order
- **`centered`**: Flag on image layers indicating viewport centering

### Common mistakes

1. **Forgetting zoom in gridOffset** — see Section 1
2. **Placing NPCs using pixel coordinates** — NPCs use tile coordinates, not pixels
3. **Testing only at zoom=1** — offset bugs only manifest when zoomed
4. **Assuming camera works the same** — background-image rooms don't scroll; camera is effectively fixed

---

## 6. PixiJS Mask Lifecycle — destroy order matters

**Symptom:** the game white-screens into the ErrorBoundary with
`can't access property "measurable", this.mask is null` (Firefox wording; other browsers phrase
it differently). It comes from deep inside PixiJS — `AlphaMask.addLocalBounds` → `addMaskLocalBounds`,
which does `mask.measurable = true` on a mask that is gone.

**Root cause:** assigning `sprite.mask = maskSprite` attaches an `AlphaMask` **effect** to `sprite`
that holds a reference to `maskSprite`. If you then `maskSprite.destroy()` **without** first setting
`sprite.mask = null`, the effect is left pointing at freed memory, and Pixi's next bounds/culling
pass dereferences it and throws. The only user of masks today is `utils/pixi/WeatherLayer.ts` (the
feathered fog edge), so this surfaces as a weather/fog crash — often after a weather transition or a
resize while fog is active.

**Don't hand-roll it — use the helper.** All mask assignment goes through
[`utils/pixi/maskUtils.ts`](../utils/pixi/maskUtils.ts):

```typescript
import { attachMask, disposeMask } from './maskUtils';

attachMask(target, maskSprite, parent);          // addChild(mask) THEN target.mask = mask
this.maskSprite = disposeMask(target, maskSprite); // target.mask = null THEN mask.destroy(); returns null
```

`tests/pixiMaskSafety.test.ts` fails the build if any file outside `maskUtils.ts` assigns `.mask =`
directly, so the funnel can't be bypassed.

**The rules these helpers encode (why they exist):**
- **Null the reference before destroying the mask sprite** — never the reverse (`disposeMask`).
- **Never overwrite a masked sprite without tearing the old one down first.** A setup function that
  reassigns `this.fooSprite = new Sprite(...)` must call its null-safe teardown at the *top*.
- **Add the mask to the display tree before assigning it** — Pixi measures it through the scene
  graph (`attachMask`).

`WeatherLayer` is the reference user: `setupFog()` calls `clearFog()` first, and both `clearFog()`
and `_applyFogMask()` go through `disposeMask`/`attachMask`.

---

## 7. Quick Debugging Checklist

When something feels "off" with interactions:

- [ ] **Which room type?** Check `renderMode` in the map definition
- [ ] **Zoom level?** Does the bug disappear at zoom=1? → Coordinate pipeline issue
- [ ] **Click or keyboard?** If keyboard works but click doesn't → `isUIElement` or coordinate issue
- [ ] **Check `effectiveGridOffset`** — does it include zoom? Is zoom in the dependency array?
- [ ] **Check `screenToTile`** — are both branches (tiled vs background-image) correct?
- [ ] **Check z-index** — is the overlay using a constant from `zIndex.ts`?
- [ ] **Check `elementsFromPoint`** — is the UI detection using position-based checking?
- [ ] **Is a parent using `transform: scale()`?** If clicks drift proportionally to how narrow
      the window is, divide pointer offsets and drag deltas by the effective scale

When ambient audio is silent:

- [ ] **Is the sound loaded?** Check `audioManager.hasSound(key)` in console
- [ ] **Does the map match any effect condition?** Check all ambient effects in `useEnvironmentController.ts`
- [ ] **Is another effect stopping this sound?** Search for `stopAmbient('your_key')` across ALL effects
- [ ] **Is the weather effect blanket-stopping?** It should ONLY stop weather-specific sounds
