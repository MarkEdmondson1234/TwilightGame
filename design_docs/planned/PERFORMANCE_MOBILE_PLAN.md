# Performance Plan: Smooth on Every Device

**Created:** 2026-09-17
**Status:** In progress — days 1–3 shipped 2026-09-17 (see Progress below).
Fresh session? Read [`PERFORMANCE_HANDOVER.md`](./PERFORMANCE_HANDOVER.md) first.
**Supersedes:** the "Game Performance Issues" half of
[`PERFORMANCE_OPTIMISATIONS.md`](./PERFORMANCE_OPTIMISATIONS.md) (March 2026). Its
AI-maintainability half still stands. Status of its items is in §9.

The game now runs on the old iPad and the iPhone, but it is still jerky. This
document is the result of a full read of the render loop, the PixiJS layers, the
asset pipeline, the startup path and the background work, cross-checked against
two weeks of real-device telemetry from Sentry. It lists what is actually
costing frames, ranks the fixes, and proposes the architectural changes that
would make the game fast everywhere rather than tuned for one device.

---

## 1. Summary

**The jerkiness has four separate causes, and the biggest one is not the GPU.**

| # | Cause | Evidence | Fix class |
|---|-------|----------|-----------|
| 1 ✅ | **The whole React tree re-renders every frame**, and each of those renders **rebuilds the entire PixiJS scene** because of a one-line object allocation. | `App.tsx:1942`, `usePixiRenderer.ts:880-897`; iPad hits exactly 30 fps in a room with 4 sprites (§2) | Low-hanging (one line) + architectural (§6A) |
| 2 ✅ | **Three GPU features that are ruinous on mobile**: a live blur filter on every shadow, a full-viewport canvas re-uploaded to the GPU per frame for darkness, and a full-screen mask on fog. | `ShadowLayer.ts:301-308`, `DarknessLayer.ts:355-357,540`, `WeatherLayer.ts:347` | Low-hanging (each is a small change) |
| 3 ✅ | **Memory pressure**: ~440 MB of decoded audio, ~300 MB of textures, ~144 MB of duplicate character bitmaps, all resident at once on an iPad. | `AudioManager.ts:392-420`, `assetPreloader.ts:109-124`, `tests/mapTextureBudget` output | Low-hanging + pipeline (§6C) |
| 4 ✅ | **Stalls**: first-draw texture uploads after a transition, a full-save `JSON.stringify` to localStorage every second while walking, 2–4 s texture batches. | Sentry `game.operation`: `texture_batch` 0.4–4.7 s, `local_save` up to 257 ms; worst frames 800–1095 ms in the village on iPad | Pipeline + persistence |

**Recommended order:** §4 (a day of one-line and small fixes, most of the win),
then §5 (a few days), then §6 (the architecture, one sprint per area). Each
step has a measurement attached in §7 so it can be proven rather than assumed.

## Progress

**Day 1 (the frame) — done 2026-09-17**, §4 items 1, 2, 3, 11, 12, 16, 17.
Measured with a CPU profile of a headless village session under 4× CPU
throttling (`Emulation.setCPUThrottlingRate`), inclusive main-thread ms per
second; the software GPU makes fps meaningless here but CPU attribution is
sound (§7). Before → after:

| Function | Idle | Walking |
|---|---|---|
| React (`performWorkOnRoot`) | 224 → **56** | 552 → 627 (unchanged, see below) |
| `renderTiles` | 25.6 → **0** | 91.5 → **10.3** |
| `renderSprites` | 9.3 → **0** | 30.8 → **3.2** |
| `getLavaLakeAnchor` | 11.8 → 0.7 | 8.7 → 1.9 |
| `cullSprites` | 4.3 → 0 | 13.9 → 1.8 |

Idle is now one App render a second (the NPC-list sync, the HUD clock), and
the scene is no longer rebuilt on any frame where nothing moved. The walking
column is unchanged because the player position still goes through React
state every moving frame (cause B), which is the §6A refactor and its own PR;
each App render costs ~19 ms at 4× throttle, so on the iPad it is a dropped
frame per step until that lands.

**Day 2 (the GPU) — done 2026-09-17**, §4 items 4, 5, 6, 7, 13, plus the CI gate.

- Shadows are tinted soft-disc sprites from one shared 64 px texture instead of
  a `Graphics` with its own `BlurFilter`: zero filter passes, and they now
  batch with everything else. Off-screen shadows in the 10-tile scan margin are
  culled (89 of 159 in the village at rest were off screen).
- The darkness overlay composites at a fraction of the viewport (0.25 on
  mobile, 0.5 on desktop; `darknessCompositeScale` in the tier) and the flicker
  tick no longer re-uploads on top of a camera-frame composite. The lit
  village checks out visually at both scales.
- The fog/mist sprite mask is gone (it only vignetted the screen corners).
- Phones never get the HIGH render profile (`resolution` 1.5, no MSAA, 8-step
  glows), whatever their core count; the tier label is unchanged for Sentry.
- Weather particle pools and emit rates scale with the tier (0.4 on mobile).
- **The CI performance gate can now see this kind of change.** Scene cost
  gains `filteredNodes`/`maskedNodes` (any non-zero from a zero baseline is a
  regression), and a new **work-rate** table counts App commits, scene
  rebuilds, NPC draws, darkness uploads and save flushes at the source
  (`WorkCounters` in `utils/PerformanceMonitor.ts`) and grades them like scene
  cost. The harness pins the in-game clock and weather (`--time`, `--weather`)
  so runs are comparable, and the `movement` scenario walks *during* the
  measurement (it used to finish walking before sampling began). Day one, which
  the old gate read as "neutral", reads on this gate as App commits idle
  60 → ~1 /s, scene rebuilds idle 25 → 0 /s, save flushes 60 → 12 /min.
- Found on the way: the harness "teleported" by calling `mapManager.loadMap()`
  directly, which changes the manager but not React's map state. It only ever
  appeared to work because the scene was being rebuilt every frame; every
  `bear_cave` and `witch_hut` number CI has reported so far was a village
  measurement. It now goes through the real transition (`window.debugTeleport`).

**Day 3 (memory) — done 2026-09-17**, §4 items 8, 9, 10 (the last as a
device variant rather than a global downsize).

- **Audio on demand.** `loadBatch(audioAssets, ['sfx'])` at boot; music and
  ambience are fetched and decoded on first `playMusic`/`playAmbient` (the
  existing pending queues start them when they land), loads are capped at four
  at a time, and stopped tracks beyond `AUDIO.MAX_IDLE_STREAMS` are released.
  Removes ~400 MB of decoded PCM from every session.
- **One character, no bitmap cache.** The preloader fetched both characters
  and every costume as decoded `HTMLImageElement`s and kept them in a Map for
  the session (~144 MB), while the GPU path decoded the selected one again.
  It now warms the HTTP cache for the selected character's worn outfit only.
- **Half-size player and NPC sprites on phones.** The optimiser writes a
  `@half` sibling (512px) for every PNG under `character*/` and `npcs/`;
  `TextureManager` resolves the logical URL to it when the tier's
  `halfResolutionSprites` is set (mobile, and LOW desktops). Player pinned set
  64 → 16 MB, village NPCs 86 → 22 MB on a phone; desktop art and dialogue
  portraits are unchanged. `tests/textureVariants.test.ts` fails if a sprite
  lands without its sibling.

---

## 2. What the devices are actually doing (Sentry, last 14 days)

The game already reports one-minute performance windows to Sentry
(`utils/sessionDiagnostics.ts`). Query with the exact field names, e.g.
`tags[performance.fps,number]`, on the EU region. This is what the two mobile
devices reported, plus the owner's Mac for contrast.

**Devices seen:**

| Device | UA | Cores | DPR | Tier | Renderer resolution | Viewport (CSS px) |
|---|---|---|---|---|---|---|
| iPad | iOS 17.7, Chrome (WKWebView) | 4 | 2 | MEDIUM | 1.5 | 1366×904 |
| iPhone | iOS 18.7, Firefox (WKWebView) | 4 | 3 | MEDIUM | 1.5 | 844×330 |
| Mac | Firefox | 8 | 2 | HIGH | 2 | 1416×704 |

**Frame rates by map (aggregate fps / worst frame in the window / drawn sprites):**

| Map | iPad | iPhone | Mac |
|---|---|---|---|
| mums_kitchen, shop, seed_shed, home_upstairs (4 sprites) | **29.8–30.0 fps**, worst 66–253 ms | — | 60 fps, worst 19 ms |
| greenhouse (~210 sprites) | 22.3–22.7 fps, worst 54–359 ms | — | 52–60 fps |
| cave / lava (160–830 sprites) | 27–29.7 fps, worst 87–481 ms | — | 60 fps |
| forest (460 sprites) | 15.6–19.8 fps, worst 88–360 ms | — | — |
| **village (500–1350 sprites)** | **7.5–29.7 fps**, worst 100–**1095 ms** | 30–33 fps, worst 75–345 ms | 18.6–55.7 fps, worst 37–159 ms |

Three things stand out.

1. **The iPad sits at exactly 30.0 fps for whole minutes in rooms with four
   sprites.** A GPU-bound scene would not do that; an empty kitchen is not a
   fill problem. Either every frame costs 17–33 ms of CPU and vsync halves the
   rate, or the device is in Low Power Mode (which caps rAF at 30). The F3
   overlay's frame time will tell them apart in ten seconds. Given §3, the
   first is expected: the per-frame React render plus a scene rebuild is more
   than 16 ms on an A9/A10-class CPU.
2. **Even the kitchen has 100–250 ms stalls.** Those are not rendering; they
   are timers and uploads (§3.4).
3. **The village drops to 7–8 fps with 1,200+ drawn sprites** on the iPad. The
   wider mobile zoom shows roughly twice as many tiles as the Mac's viewport
   (1,234 vs 750 sprites for the same map), and every visible tile is two to
   three draw objects (§3.2). Even the Mac does not hold 60 there.

**Operation stalls (`game.operation`):** `texture_batch` 400 ms–4.7 s per map
transition (2.0 s on the iPad for `home_upstairs`); `local_save` normally 0–2 ms
but 108 ms and 257 ms on the Mac in `personal_garden`; `cloud_upload` up to
73 s (asynchronous, not a frame cost, but it is the whole save including
photos).

The earlier headless work (`scripts/perf-test.js`, memory note
"forest-perf-investigation") is fill-rate bound under SwiftShader and cannot
see any of the CPU-side problems above. Real-device numbers come from Sentry;
CPU attribution needs a real browser profile (§7).

---

## 3. Root causes, in detail

### 3.1 The CPU frame: React renders and rebuilds the world every frame

**Cause A — every App render rebuilds the whole scene.** `App.tsx:1942`:

```ts
effectiveGridOffset: effectiveGridOffset ?? { x: 0, y: 0 },
```

On every tiled map `getRoomTransform()` returns `gridOffset: undefined`
(`utils/backgroundRoomLayout.ts:189`), so this line allocates a fresh object on
every App render. Inside `usePixiRenderer` that object is in the dependency
array of the main render effect (`hooks/usePixiRenderer.ts:880-897`), the camera
effect (`:1033-1044`) and, via the same mechanism, the NPC effect. The render
effect calls `renderTiles`, `renderSprites`, `renderItems`, `renderShadows` and
`darknessLayer.update`; none of them early-out when nothing changed. The camera
effect reads `canvasRef.current.clientWidth` (a forced synchronous layout on a
DOM React has just mutated) and calls `updateLights`, which re-composites
darkness. So **every App render is a full scene rebuild.** Without this line the
render effect would run only when `visibleRange` crosses a tile boundary,
roughly every twelfth frame while walking.

**Cause B — App renders every frame while walking.** `usePlayerMovement.ts:147`
puts the new player position through `useState` on every moving frame. The
3,377-line `App` (89 hook calls, 26 effects) re-renders, and `playerPos` fans
out into `useCamera`, `roomTransform`, `useVFX` (whose `triggerVFX` callback is
rebuilt per frame, invalidating `magicEffectCallbacks`), `useAmbientVFX` (which
**tears down and recreates its 1 s interval every frame**, so the ambient check
can never fire while walking), `useInteractionController`,
`useProximityQuestTriggers`, and every un-memoised child: HUD, QuickSlotBar,
GameUIControls, TouchControls, TransitionIndicators (memo defeated by an inline
arrow at `App.tsx:2425`).

**Cause C — App renders every frame while any NPC walks, even if the player is
idle.** `NPCManager.ts:1009` emits `NPC_MOVED` whenever any NPC advanced this
frame; `hooks/useGameEvents.ts:60` turns that into `setNpcUpdateTrigger`. The
village has many wanderers, so App renders at 60 Hz standing still. Each render
also rebuilds `allNPCs` (`App.tsx:2051-2067`) and re-runs `NPCLayer.renderNPCs`,
which clears and redraws up to 32 concentric glow circles for glowing NPCs and
`await`s a texture load inline in its loop (`NPCLayer.ts:203`).

**Cause D — stamina goes through `gameState.notify()` every frame.**
`App.tsx:1462` → `StaminaManager.drainStamina` → `gameState.setStamina` →
`notify()` (`GameState.ts:367-370`). Every frame while walking, on lava, on a
bench, or **whenever the in-game hour is ≥21 or <5 even standing still**. The
HUD subscriber does `setState({ ...newState })` (a shallow copy of the whole
save) so the HUD with its SVG clocks re-renders per frame; `StaminaBar` sets
state per frame; and `notify()` unconditionally schedules `saveState()`, which
coalesces to **one `JSON.stringify` of the entire game state plus a synchronous
`localStorage.setItem` per second for as long as stamina is changing**. Saves
with photographs carry 24 base64 JPEGs, so that can be a 0.5–1 MB string every
second. This is the 100–250 ms stall in an empty kitchen.

**Cause E — CloudShadows is a second React render loop.**
`components/CloudShadows.tsx:192-208` runs its own rAF calling `setTime` every
frame, re-rendering a handful of divs with `filter: blur(20px)` and per-frame
`left/top` writes, over the WebGL canvas, on the 10 maps with `hasClouds`. A
moving blurred DOM layer over a canvas is close to the worst case for the iOS
compositor.

**Cause F — the gameLoop is recreated on every dialogue open/close.**
`App.tsx:1483-1495` lists `activeNPC`, `isCutscenePlaying`, `activeChainPopup`,
`currentMapId`, `ui.miniGame` as deps; the effect at `:1585-1609` then cancels
the rAF, clears the farm interval, **flushes and stops the shared-farm
Firestore listener**, and restarts all of it. Every conversation in the village
pays a Firestore flush and re-subscribe exactly as the dialogue box opens.

**Smaller per-frame costs in the loop** (`App.tsx:1372-1490`): `checkSeasonChange`
(a `getCurrentTime()` per frame), `getLavaLakeAnchor` (three radius scans on
every map), `getRestingFurnitureEffect` (filters all placed items per frame),
cutscene and fairy checks per frame, `getCurrentMapNPCs()` re-filtered three or
more times per frame inside `updateNPCs`, a 441-tile collision window per moving
NPC per frame.

### 3.2 The GPU frame: three expensive features and a lot of overdraw

| Feature | Where | Why it hurts on mobile |
|---|---|---|
| **A `PIXI.BlurFilter` on every shadow** | `ShadowLayer.ts:301-308`, quality 2 | Each visible shadow is its own render-to-texture, 4 blur passes and a composite, every frame. Tens of shadows in the village = hundreds of passes. The only filter in the codebase and almost certainly the single largest GPU cost. Only LOW tier disables it; both mobile devices are MEDIUM. |
| **Darkness re-uploaded to the GPU per camera frame** | `DarknessLayer.ts:474-548`, `updateLights` `:355-357`, flicker timer `:596-604` | A full-viewport Canvas2D (plus 200 px margin) is filled, one radial gradient per light drawn, then `texture.source.update()` = a full `texImage2D` (≈5–8 MB) **every camera frame and again at 20 Hz** from the flicker timer. Torches are `activeTime: 'always'`, so every cave and mine walk pays this at 60 fps. |
| **Fog/mist rendered through a sprite mask** | `WeatherLayer.ts:323-348` | A sprite mask routes the full-screen fog through `MaskFilter`: a full-viewport render-to-texture plus filter pass per frame. The mask itself is built by a per-pixel JS loop over W×H on every setup and resize. |
| **Tile overdraw** | `TileLayer.ts:442` ("always render background colour first"), `_base` layer `:338` | Every tile draws a colour `Graphics` under its sprite, and `_base` tiles add a third layer: 2–3× viewport fill before anything interesting draws. Room maps stack 4–7 full-viewport 1920×1080 layers. |
| **Additive glow quads and 32-disc glow Graphics** | `DarknessLayer.ts:566`, `NPCLayer.ts:161-171`, `SpriteLayer.ts:345-355` | Blend-mode changes break batching; the NPC glow is rebuilt every `renderNPCs` call (per frame, per Cause C). |
| **Weather particles** | `WeatherLayer.ts:262-292, 440-500` | Rain pools 1,000 full `PIXI.Sprite`s, storm 1,200, in a plain `Container` (not a `ParticleContainer`); ~200–360 alive at once, `Math.random()` per particle per frame. Not tier-scaled. |
| **MSAA and 2× resolution on "HIGH" mobile** | `performanceTier.ts:145,241`, `usePixiRenderer.ts:333` | Safari never exposes `deviceMemory`, so it defaults to 4; any phone with ≥6 cores (every iPhone from the 8/X onward) is classed HIGH: `resolution: 2`, `antialias: true`, 32-step glows, blurred shadows. The memory policy already keys on `isMobile` for exactly this reason; the render policy does not. |
| `preserveDrawingBuffer: true` | `usePixiRenderer.ts:344` | Defeats framebuffer discard on tile-based mobile GPUs every frame. Only needed for `canvas.toDataURL()` screenshots. |

**Draw calls are not the tile layer's problem.** Pixi 8 binds 16 textures per
draw and batches simple Graphics fills with sprites, so a village viewport is a
handful of draws. What breaks batches and multiplies passes is the list above.
The memory note on the forest ("depth-sort coarsening: dead end, flat within
noise") still holds; do not re-run that experiment.

### 3.3 Memory: three budgets, only one of them counted

| Resident set | Size | Where |
|---|---|---|
| **All 53 audio files, decoded to float32 PCM at boot** | **≈440 MB** (1,477 s of audio, 1,197 s stereo, at 44.1 kHz; ~480 MB if iOS runs the context at 48 kHz) | `gameInitializer.ts:217-223` → `AudioManager.loadBatch` `:392-420`, `Promise.all` with no concurrency cap |
| Village texture set (core + map, winter) | 299 MB | `tests/mapTextureBudget.test.ts` (ceiling 320 MB; `debug_npcs` is 316 MB and ships to production) |
| Both characters + every outfit decoded as `HTMLImageElement`s and **held forever** | ≈144 MB (36 × 1024² PNGs) | `utils/assetPreloader.ts:18,38,109-124`; the GPU path then decodes the selected one **again** via `Assets.load` |
| Room background layers | 32–55 MB per room (4–7 × 1920×1080 at 7.9 MB) | **Not counted by the budget test** (`mapTextureSet.ts:216-218` skips `map.layers`) |

Add the JS heap, the compositor and the browser itself and an iPad session is
plausibly over a gigabyte. This is the most likely explanation for the
"intermittent iPhone gameplay reloads" in `docs/MOBILE_CRASH_INVESTIGATION.md`
(WebKit kills the content process silently under memory pressure; no JS event
fires). It is not proven, but §4 removes ~600 MB of it for a day's work and the
`game.performance` heap field will show whether the reloads stop.

**Textures are five to eight times larger than the pixels they cover.** The
player is 1024² drawn at 154 px (6.7× oversampled at resolution 1); NPCs the
same; 29 `SPRITE_METADATA` entries are ≥4× and five are 8× (`stone_column`,
`lava_lake`, `cave_lake`, `mine_crystal` at 1024² for a 2×2 footprint). With
mipmaps turned off on mobile to save memory, this is also the worst case for
texture-cache locality: every screen pixel samples a distant texel. Smaller
textures save 75% of memory *and* restore cache behaviour, where dropping
mipmaps saved 33% and cost it.

Dead weight still shipped: `character1/{up,down,left,right}.png` 2048² sheets
(16 MB each, consumer `spriteSheetLoader.ts` has no importers),
`cutscenes/fox_picnic{1,2}.png` at 2100², 97 references to unoptimised
`/assets/` paths including `goblin01.gif` (2048², 16 MB on the GPU as a dialogue
portrait) and the five cobweb overlays in `cottageInterior.ts:63`. `dist/` is
832 MB because `public/assets/` originals (552 MB) are copied next to
`assets-optimized/`.

### 3.4 Stalls

- **First-draw texture upload.** `Assets.load` decodes off-thread (good) but
  `texImage2D` happens lazily at first bind. After a transition the village's
  173 textures upload one by one as they scroll into view: 4 MB per 1024²
  sprite, 8 MB per room layer, several ms each on an A9/A10. Nothing warms the
  GPU during the loading screen (`usePixiRenderer.ts:905-916` awaits `loadUrls`
  but never binds).
- **Texture batches of 0.4–4.7 s per transition** with 173 separate HTTP
  requests at 6 concurrent on mobile. No atlases exist for world art (only the
  cave-drip and weather-vane strips).
- **The 1 Hz full save** (Cause D) and, when photos exist, its size.
- **Eviction on the forest→village transition**: 187 + 213 MB exceeds the
  384 MB mobile budget, so `evictExcept` synchronously destroys ~100 textures.
- **Animated GIFs as DOM `<img>` over the canvas** (`AnimationOverlay.tsx`,
  mounted three times; `dragonfly_stream.gif` has 209 frames at 512²). WebKit
  decodes GIF frames on the main thread and every flip invalidates the layer.
- **Startup**: 2.75 MB of JS (804 KB gzipped) in one chunk, then Firebase
  (824 KB raw) downloaded and initialised **and a Firestore fetch awaited**
  before any sprite loads (`gameInitializer.ts:167-172`); three procedural maps
  generated and thrown away (`maps/index.ts:88-90`); `runSelfTests` validates
  collision on every NPC and transition of all 32 maps; every map validated
  twice (register and load).

---

## 4. Low-hanging fruit (small, high impact, do first)

Ordered by impact ÷ effort. "Verify" is what should change in Sentry or the F3
overlay when it lands.

| # | Change | File | Effort | Expected effect | Verify |
|---|---|---|---|---|---|
| 1 | **Hoist `{ x: 0, y: 0 }` to a module constant** (or `useMemo`) and key the Pixi effects on `gridOffset.x/y` numbers, not the object. | `App.tsx:1942`, `usePixiRenderer.ts:880-897, 1033-1044` | S (one line + deps) | Stops the full tile/sprite/shadow/darkness/NPC rebuild and the forced layout on every frame on every tiled map. Likely the largest single CPU win. | Kitchen on iPad leaves the 30 fps ceiling (if not Low Power Mode); village worst frame drops. |
| 2 | **Emit `NPC_MOVED` only on spawn/despawn/season/animation-state change.** Have `NPCLayer` poll `npcManager.getCurrentMapNPCs()` from `updateAnimations` the way `RemotePlayerLayer` already does (CLAUDE.md multiplayer rule 1). Keep a ≤10 Hz throttled React trigger for the DOM indicators. | `NPCManager.ts:1009`, `useGameEvents.ts:60`, `usePixiRenderer.ts:257-304, 1107-1136` | M | Removes the idle-time 60 Hz App render on every map with wanderers. | Idle in village: App render count (React DevTools profiler) goes from 60/s to ~0. |
| 3 | **Accumulate stamina in `StaminaManager` and commit to `gameState` at most once per second** (or on a ≥1-point change). Same for the late-night drain. | `utils/StaminaManager.ts:71-88`, `App.tsx:1462` | S | Ends the per-frame HUD and StaminaBar renders and the continuous 1 Hz full-save serialise. | `local_save` operations become rare; kitchen worst frame <50 ms. |
| 4 | **Replace the per-shadow `BlurFilter` with a pre-blurred radial-gradient texture** drawn as a tinted `Sprite` (build once with Canvas2D exactly as `DarknessLayer.ts:183-198` does). Stop-gap: `enableShadows: false` when `isMobile`. | `ShadowLayer.ts:263-308` | S | Zero filter passes; shadows batch with everything else; the per-pass `clear()+ellipse()+fill()` goes too. Largest GPU win. | Village fps on iPad; GPU time in a Safari timeline. |
| 5 ✅ | **Darkness: composite at ¼ resolution on mobile and on one clock.** `updateLights` stores positions and sets a dirty flag; the existing 20 Hz flicker tick is the sole caller of `_compositeDarkness`. Skip when nothing changed. | `DarknessLayer.ts:337-363, 474-548, 596-604` | S | Upload shrinks 16×, and from 60+20 Hz to ≤20 Hz. Caves, mines and the village at night. | Cave fps on iPad. |
| 6 ✅ | **Drop the fog/mist sprite mask** (at least on mobile); bake any edge feather into the fog PNG alpha. | `WeatherLayer.ts:323-348` | S | Removes a full-screen RTT + filter per frame and the W×H JS loop on setup/resize. | Fog/mist weather fps. |
| 7 ✅ | **Never give mobile the HIGH render profile.** When `isMobile && tier === HIGH`, return MEDIUM render settings (`resolution ≤ 1.5`, `antialias: false`, `glowSteps: 8`) with the HIGH memory policy. Add a `tests/performanceTier.test.ts` case. | `utils/performanceTier.ts:183-248` | S | Reaches every iPhone 8/X or newer, which today gets 2× resolution + MSAA + 32-step glows + blurred shadows. | `game.session_start` on iPhones shows `graphics.resolution: 1.5`. |
| 8 ✅ | **Load audio lazily.** `loadBatch` only SFX at boot; ambient/music per map on `playAmbient`/`playMusic` (the `pendingAmbients`/`pendingMusic` queues already handle "requested before loaded"). Cap concurrency. Convert stereo ambients to mono. | `gameInitializer.ts:217-223`, `AudioManager.ts:392-420` | S–M | Frees ~400 MB from every session and removes 53 fetches competing with the 6-slot texture loader at boot. | `game.performance` JS heap; iPhone reloads stop. |
| 9 ✅ | **Preload only the selected character and worn outfit, and drop `imageCache`.** `getCoreTextureUrls` already scopes correctly. | `utils/assetPreloader.ts:18,38,109-124`, `gameInitializer.ts:205` | S | ~144 MB of duplicate bitmaps gone; faster boot. | Same. |
| 10 ✅ | **Downsize player and NPC frames to 512².** | `scripts/optimize-assets.js:57-58` (`SPRITE_SIZE`, `NPC_SIZE`) | S (re-run optimiser) | Player pinned set 64 → 16 MB; village NPCs 86 → 22 MB; forest/lake sets −75%. Still ≥1.7× at resolution 2. Fixes the mipmap-less cache thrash for the sprites drawn every frame. Review with `npm run art-review`. | Budget test totals; village fps. |
| 11 ✅ | **Read `playerPos` from a ref in `useAmbientVFX` and `useVFX`** so the interval is created once and `triggerVFX` is stable. | `hooks/useAmbientVFX.ts:107-170`, `hooks/useVFX.ts:38-63` | S | Fixes both the per-frame interval churn and the "ambient VFX never fires while walking" bug; stabilises `magicEffectCallbacks`. | — |
| 12 ✅ | **gameLoop deps → refs** (`activeNPC`, `isCutscenePlaying`, `activeChainPopup`, `ui.miniGame`; the file already does this for `currentMapIdRef`), and split the rAF effect from the shared-sync lifecycle. | `App.tsx:1483-1495, 1585-1609` | S–M | No Firestore flush/re-subscribe and no rAF restart on every conversation. | Open/close dialogue in the village: no `stopSharedSync` log. |
| 13 ✅ | **Scale weather by tier**: multiply `maxParticles`/`emitRate` by ~0.4 on mobile; drop the per-particle `Math.random()` alpha jitter there. | `WeatherLayer.ts:262-292, 440-463`, `data/weatherConfig.ts:200-247` | S | Rain/storm on a 2–4 core device. | Rain fps on iPad. |
| 14 | **Firebase off the boot critical path**: start `safeInitializeFirebase` and `globalEventManager.initialise()` in parallel with asset loading; do not await them before the first map. | `gameInitializer.ts:167-172` | S | Removes an 824 KB download, init, and a network round-trip from time-to-first-frame. | Splash-to-world time on iPad. |
| 15 | **Do not generate three procedural maps or register `debugNPCs` at boot; validate maps once, not twice; move `runSelfTests`' cross-map position validation into `tests/`.** | `maps/index.ts:67, 88-90`, `MapManager.ts:24-27, 59`, `utils/testUtils.ts:13-35` | S | Hundreds of ms off boot on a throttled CPU. | Same. |
| 16 ✅ | **Throttle in-loop checks** to tile changes or a few Hz: `checkSeasonChange`, `getLavaLakeAnchor` (only on maps with lava), `getRestingFurnitureEffect` (on tile change or `PLACED_ITEMS_CHANGED`), cutscene and fairy checks; cache `getCurrentMapNPCs()` once per frame inside `updateNPCs`. | `App.tsx:1394-1449`, `NPCManager.ts:654-663` | S each | Small individually, worthwhile together on a slow CPU. | — |
| 17 ✅ | **Early-return the remote-player pass when there are no remote players and no local emote/chat.** | `usePixiRenderer.ts:270-303` | S | Removes a Promise + Set allocation per frame in single-player. | — |
| 18 | **Delete dead weight**: `PixiLayerManager.ts` (unreferenced), `spriteSheetLoader.ts` + the 2048² `character1/{up,down,left,right}.png` sheets, and stop copying `public/assets/` originals into `dist/` once the 97 unoptimised references are moved to the optimiser. | see §3.3 | S | Deploy 832 MB → ~300 MB; `goblin01.gif` alone is 16 MB of GPU. | `du -sh dist`. |

Items 1–3 together are what §2's "30 fps in an empty kitchen" is about. Items
4–7 are the GPU. Items 8–10 are the memory. Everything else is hygiene that
adds up.

---

## 5. Medium changes (days each, still local)

| # | Change | Where | Why |
|---|---|---|---|
| M1 | **Move CloudShadows, WeatherTintOverlay, AnimationOverlay GIFs and ForegroundParallax into the Pixi stage.** Cloud shadows become a few tinted sprites with a pre-blurred soft-ellipse texture moved in `updateAnimations`; the tint becomes a `Z_WEATHER_TINT` graphic (one already exists in `DarknessLayer`); the four GIFs (313 frames) become `AnimatedSprite`s from atlases, with `dragonfly_stream` cut to ~30 frames. | `components/CloudShadows.tsx`, `WeatherTintOverlay.tsx`, `AnimationOverlay.tsx`, `ForegroundParallax.tsx` | Removes every per-frame DOM layer over the canvas: the blur re-rasterisation, the `mix-blend-mode` composite, main-thread GIF decode, and the second React render loop. |
| M2 | **Cap multi-tile sprite textures at ≤2× their tile footprint** with per-footprint rules in the optimiser (2×2 → 256, 3×3 → 384, 4×4 → 512, 6×6 → 768); `magical_lake` 2048 → 1024. | `scripts/optimize-assets.js` | −108 MB across the sprite set, −12 MB for the lake; better cache locality. Check with `npm run art-review`. |
| M3 | **Warm the GPU during the loading screen.** After `loadUrls(keep)` resolves, bind each kept texture once (`renderer.texture.bind(source)` or Pixi's prepare system) before the transition ends. | `usePixiRenderer.ts:905-916` | Walking into a new area never pays `texImage2D` mid-frame. |
| M4 | **Count room layers in the budget test and ship 1280×720 room variants for mobile**; crop the mostly-transparent overlays (cobwebs, boulders, mess) to sprites instead of six full-screen 7.9 MB layers. | `utils/mapTextureSet.ts:216-218`, `tests/mapTextureBudget.test.ts`, `scripts/optimize-assets.js` | Room maps are 4–7× full-screen fill at DPR-scaled resolution, uncounted. |
| M5 | **TileLayer fill and rebuild cost.** (a) An `opaque: true` hint on `TILE_LEGEND` entries whose sprite fully covers the tile (floors, paths, rock, water) to skip the colour `Graphics` and `_base` render underneath: roughly halves viewport fill on interiors and mines. (b) Cache `getTileData` per `(x,y)` for one `renderTiles` pass (it is fetched up to six times per soil tile) and pass a pre-fetched `GameTime` to `ColorResolver.getTileColor` (it calls `getCurrentTime()` twice per tile). (c) Store `{x,y}` on each entry in `cullSprites` instead of regex+split+`Number` per sprite per pass, fix the regex so `_fence_top`, `_soil`, `_base_visible` stop resolving to NaN, and early-out when `visibleRange` is unchanged. | `utils/pixi/TileLayer.ts:170-213, 229-325, 442, 1067-1085`, `utils/mapUtils.ts:247`, `utils/ColorResolver.ts:188,199` | `renderTiles` still runs on every tile-boundary crossing and every texture arrival after fix 1. |
| M6 | **Per-map sprite margin.** `SpriteLayer` and `ShadowLayer` expand the scan by the *global* max sprite size (16 tiles → a 10-tile margin on every side), so a 20×12 viewport becomes 40×32 = 1,280 `getTileData` allocations, twice, per pass, on every map. Compute the max per map at load, or precompute an anchor index `Map<"x,y", SpriteMetadata>` per map and walk anchors instead of tiles. | `SpriteLayer.ts:121-122`, `ShadowLayer.ts:214-215`, `utils/viewportUtils.ts:61` | Turns two large allocation scans into a walk over actual anchors. |
| M7 | **Photos out of the main save blob.** Store `dataUrl`s under their own localStorage keys (as paintings already are) and reference by id. | `inventoryManager.ts:698-728`, `GameState.ts:1016-1022` | The save stays 20–100 KB; the 5-minute cloud upload stops shipping megabytes of base64. |
| M8 | **Code-split the initial bundle**: `React.lazy` HelpBrowser + ChatBubble (react-markdown, 155 KB), DevTools/SpriteMetadataEditor/DebugOverlay (48 KB), minigame components behind the registry (135 KB), the Anthropic SDK (70 KB); pre-parse the 15 YAML chains to JSON at build time (drops `yaml`, 98 KB, and the runtime parse); add `modulepreload` for Pixi's `WebGLRenderer`/`browserAll`/`SharedSystems` chunks to kill the waterfall. | `vite.config.ts`, `App.tsx:14,22-23`, `minigames/registry.ts`, `utils/eventChainLoader.ts` | ~450 KB raw / ~130 KB gzipped off the initial parse; 1.5–3 s of parse time on A9/A10 silicon today. |
| M9 | **Service worker**: version `CACHE_NAME` per deploy (inject `VITE_APP_VERSION`) or use stale-while-revalidate for static assets, and add an LRU/size cap. | `public/sw.js` | Returning players currently keep old art forever, and iOS CacheStorage fills with 300+ MB. |
| M10 | **Memo the always-mounted children** (`HUD`, `QuickSlotBar`, `GameUIControls`, `TouchControls`, `PresenceIndicator`, `ChatPanel`) and `useCallback` the inline arrows that defeat `TransitionIndicators`' memo; `useGameState` should select fields and compare before `setState`. | `App.tsx:2425, 2568-2681`, `hooks/useGameState.ts:17-19` | Only matters while App still renders per frame; cheap insurance after §6A. |
| M11 | **Replace `preserveDrawingBuffer: true`** with `renderer.extract` for screenshots (it renders to a render texture and does not need the flag). | `usePixiRenderer.ts:344` | Restores framebuffer discard on tile-based mobile GPUs. Needs a real-GPU A/B; the win is plausible but unmeasured. |

---

## 6. Architecture: what would make it fast everywhere

The fixes above remove the specific mistakes. These six changes remove the
*classes* of mistake, so the next feature does not reintroduce them.

### 6A. Simulation and rendering leave React; React becomes a UI layer at ≤10 Hz

**Today** the position of the player, of every NPC, the camera, and stamina all
pass through React state at frame rate, and the Pixi layers are driven by
`useEffect` dependency arrays. Every hot-path bug in §3.1 is a consequence of
that: an object identity, a dependency array, or a subscriber that calls
`setState` too often. The repo already knows the right pattern; CLAUDE.md's
first multiplayer rule ("never put remote player positions through React
state") and `RemotePlayerLayer` polling the manager per frame are exactly it.

**Target:**

- A single `FrameState` object held in refs (player position, direction,
  animation frame, camera, visible range, stamina, time) written by the game
  loop and read directly by the Pixi layers inside `updateAnimations`. The
  camera is computed in the loop and applied to containers there; the
  `cameraX/cameraY` React effect goes away.
- `PlayerSprite.update`, `NPCLayer.renderNPCs`, `TileLayer`/`SpriteLayer` culling
  and `DarknessLayer.updateLights` are called from the loop with dirty flags,
  not from effects.
- React receives a **throttled snapshot** (tile change, or 10–15 Hz) for the
  things that genuinely need it: HUD, indicators, menus, interaction prompts.
  `usePlayerMovement` writes the ref every frame and the state on a timer.
- `gameState.notify()` splits into "state changed" (listeners, throttled) and
  "mark dirty for save"; high-frequency fields (stamina) commit on a cadence.
  `useGameState` selects fields.
- EventBus events that can fire at frame rate (`NPC_MOVED`) either stop
  existing or are coalesced to one per animation frame with no React subscriber.

**Guard:** a test that renders App with a fake rAF, walks for 60 frames, and
asserts the App render count is ≤ some small number. That is the invariant
that keeps this from regressing.

### 6B. A retained, dirty-flagged scene

**Today** the render effect rebuilds every layer whenever any of thirteen deps
changes, and the layers do not remember what they drew. A texture arriving, a
farm plot growing, or a tile-boundary crossing re-walks everything.

**Target:**

- Each layer keeps `lastRange`, `lastSeason`, `lastWeather`, etc. and early-outs.
- Tiles: build the map's tile display once per map load (or in chunks), keep
  a `Map<index, TileEntry>` with coordinates, and on range change only toggle
  visibility on entries entering/leaving the range. Colour backgrounds become
  one `Graphics` per colour run (or per map) rather than ~900 objects.
- Sprites and shadows: a per-map anchor index; range changes iterate anchors.
- Farm plots, placed items and texture arrivals update only the entries they
  touch (they already carry a position).
- Depth sorting stays as is (the forest note proved it is not the bottleneck).

### 6C. A resource pipeline that fits the device

**Today** there is one asset size for every device, no atlases, all audio
decoded up front, and two budgets (audio, room layers) that no test counts.

**Target:**

- **Resolution variants** from the optimiser: `@1x` (half size) for every
  category, selected in `TextureManager.loadTexture` by `isMobile`/renderer
  resolution. Halves resident texture memory on phones without touching
  desktop.
- **A footprint rule**: no texture larger than 2× the pixels it will cover at
  the highest resolution the tier allows. Encode as a test over
  `SPRITE_METADATA` × optimised dimensions so a new asset that breaks it fails
  CI, the same way `mapTextureBudget` does today.
- **Per-biome atlases** for tiles and small sprites (`spritesmith` is already a
  devDependency): one request and one GPU texture per biome instead of 100+,
  and Pixi batches across the whole tile layer.
- **Audio on demand, per map**, with a decoded-audio budget in the same
  diagnostics as textures.
- **The budget test counts everything resident**: core set, map set, room
  layers, decoded audio, and the character bitmaps, against a per-tier ceiling
  (256 MB LOW, 384 MB MEDIUM).
- **GPU warm-up during the loading screen** so first draw never uploads.
- **WebP alongside PNG** for download size only (no GPU change; not a
  jerkiness fix, but 30–50% less to fetch on a phone).

### 6D. Every moving picture is drawn by Pixi

**Today** four effects live in the DOM over the canvas (cloud shadows, weather
tint, GIF animations, foreground parallax), each costing a compositor layer,
and one of them runs its own React render loop.

**Target:** one renderer. Effects are Pixi sprites/graphics updated in
`updateAnimations`, tier-scaled like everything else. The DOM is for UI only.
A lint-style test that greps `components/` for `requestAnimationFrame`
outside a known allow-list would keep it that way.

### 6E. A quality policy, not a device guess

**Today** the tier is a guess from user-agent, core count and a memory value
Safari never reports; it picks a handful of settings at boot and never
revisits them; and several expensive features are not gated at all.

**Target:**

- `isMobile` is a hard cap on the *render* profile (never HIGH), as it already
  is on the memory profile.
- Every expensive feature reads a knob from the tier: shadows (off / blur-free
  sprite / blurred), fog mask, darkness composite scale and rate, particle
  scale, glow steps *and* rebuild rate, antialias, resolution.
- **Adaptive step-down:** the session diagnostics already compute fps and
  stall counts per window. If the first 10 s after world-ready average under
  ~40 fps or show ≥5 stalls, drop one quality step (shadows → off, resolution
  → 1, particles → 0.5) and record the decision in `game.session_start` so
  Sentry shows how often it fires. This is what makes "runs well on all
  devices" true for devices nobody tested.
- A user-facing "Graphics: Auto / Low / High" toggle in Settings, persisted,
  for the cases where the heuristic is wrong.

### 6F. Startup does only what the first frame needs

Firebase, global events, YAML parsing, the Anthropic client, dev tools,
minigames, the help browser and markdown are all in the critical path today,
alongside three throw-away procedural maps and a validation pass that belongs
in CI. Target: the first frame needs the map registry, the current map, the
core textures and the player. Everything else loads after world-ready, in
priority order, behind `React.lazy`/dynamic import, with `modulepreload` hints
for what is known to be needed next.

---

## 7. How to measure (so each change is proven)

- **Real devices, via Sentry.** `message:game.performance` with fields
  `tags[performance.fps,number]`, `tags[performance.worst_frame_ms,number]`,
  `tags[performance.visible_sprites,number]`, `game.map`, `graphics.tier`,
  `device.user_agent`, `regionUrl: https://de.sentry.io`. Compare the same
  device and map before and after a deploy (release = `VITE_APP_VERSION`).
  `message:game.operation` for `texture_batch` and `local_save` durations.
- **Success criteria for this plan:**
  - iPad interiors: 60 fps if not in Low Power Mode, worst frame < 50 ms.
  - iPad village: ≥ 30 fps sustained, worst frame < 150 ms.
  - iPhone village: ≥ 45 fps.
  - No `local_save` over 20 ms; no `texture_batch` over 1.5 s on the iPad.
  - Resident memory (textures + audio + bitmaps) under 384 MB on MEDIUM.
- **CPU attribution needs a real browser profile.** Safari Web Inspector
  (Timelines → JavaScript & Events) connected to the iPad, or Chrome DevTools
  Performance with 4× CPU throttling on desktop: "Scripting" is §3.1,
  "Rendering/GPU" is §3.2. The headless harness cannot see either (memory
  note: it is fill-rate bound under SwiftShader and only validates
  fill-reducing changes).
- **Quick local checks:** F3 overlay frame time in `mums_kitchen` (should be
  ~16 ms, not 17–33); React DevTools profiler render count while idle in the
  village (should be ~0/s after §4 items 1–3); `npx vitest run
  tests/mapTextureBudget.test.ts` for the texture totals; `npm run
  art-review` after any optimiser change.
- **A first quick test the owner can do today:** on the iPad, in the kitchen,
  check whether Low Power Mode is on. If it is off and F3 shows 30 fps, the
  frame is CPU-bound and §4 items 1–3 are the fix.

---

## 8. Suggested sequencing

1. **Day 1 – the frame.** §4 items 1, 3, 11, 12, 16, 17. One PR. Measure kitchen
   and village on the iPad.
2. **Day 2 – the GPU.** §4 items 4, 5, 6, 7, 13. One PR. Measure village, cave,
   fog.
3. **Day 3 – the memory.** §4 items 8, 9, 10, 18 and §5 M2. Re-run the budget
   test and art review. Watch for the iPhone reloads stopping.
4. **Day 4 – NPCs and startup.** §4 items 2, 14, 15; §5 M3.
5. **Sprint – §6A** (React out of the frame) with its render-count test.
6. **Sprint – §6B + §6C** (retained scene, resolution variants, atlases, budget
   test that counts everything).
7. **Sprint – §6D + §6E** (effects into Pixi, quality policy with adaptive
   step-down and a settings toggle), then §6F and the remaining §5 items.

Every PR: `make verify`, `npm run lint`, and a Sentry before/after on the same
device and map.

---

## 9. Status of the March 2026 items

| Item | Status |
|---|---|
| #1 Duplicate render effects in `usePixiRenderer` | **Done** — single effect at `:799-898`. |
| #2 `SPRITE_METADATA.find()` in collision | **Done** — `metadataCache` in `useCollisionDetection.ts:43,57` and `NPCManager.ts:408,421`. |
| #3 gameLoop recreated on dialogue/transition | **Not done** — `App.tsx:1483-1495`; see §4 item 12. |
| #4 `cullSprites` string parsing | **Not done** — `TileLayer.ts:1067-1085`; regex still wrong; see §5 M5(c). |
| #5 `PlayerSprite.update()` async per frame | Still async (`PlayerSprite.ts:75`); trivial cost, folded into §6A. |
| #6 `checkSeasonChange()` at 60 fps | **Not done** — `App.tsx:1394`; see §4 item 16. |
| #7 `getCurrentTime()` many times per render | Partly — once in the render effect; still twice per tile in `ColorResolver`; see §5 M5(b). |
| #8 Glow redrawn on camera move | Still rebuilt per `renderNPCs` call (`NPCLayer.ts:161-171`); see §4 item 2. |
| #9 Camera memo recomputes every frame | Partly — idle is fixed (`usePlayerMovement.ts:151` returns `prevPos`); moving still allocates by design; superseded by §6A. |
| #10 `calculateTileTransforms` per tile per render | **Not done**; folded into §6B. |
| #11 `notify()` always schedules `saveState()` | Partly — coalesced to one 1 s timer (`GameState.ts:329-338`), but stamina keeps it firing continuously; see §4 item 3. |

**Do not re-run:** coarsening depth-sort precision in the forest. It was A/B'd
under 6× throttle and was flat within noise (memory note
"forest-perf-investigation"). The forest is bound by tree fill and the CPU
costs above, not by sorting.
