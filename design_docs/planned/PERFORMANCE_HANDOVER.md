# Performance Work: Handover

**Written:** 2026-09-17, end of the first session
**For:** whoever picks this up in a fresh session (human or agent)
**Plan:** [`PERFORMANCE_MOBILE_PLAN.md`](./PERFORMANCE_MOBILE_PLAN.md) is the
full investigation and the ranked list; its **Progress** section is the source
of truth for what is done. This document is the short version: where things
stand, how to measure, what to do next and in what order, and the traps that
cost time today.

---

## 1. Where things stand

Three PRs merged to `main` today, all deployed to production
(code.markedmondson.me/TwilightGame):

| PR | What | Measured effect |
|---|---|---|
| #136 | **Day 1, the CPU frame.** Scene no longer rebuilt on every App render (a `{x:0,y:0}` allocated per render sat in the Pixi effects' deps); NPC layer polls the manager per frame instead of re-rendering App on `NPC_MOVED`; stamina commits on a cadence instead of `notify()` per frame; game loop reads UI state through a ref; ambient/VFX hooks stable; throttled world checks. | Under 4× CPU throttle: React work idle 224 → 56 ms/s, `renderTiles` idle 25.6 → 0, walking 91.5 → 10.3 ms/s. |
| #138 | **Day 2, the GPU.** Shadows are soft-disc sprites (no `BlurFilter`), darkness composites at 0.25× (mobile) / 0.5× (desktop) on one clock, fog mask removed, phones never get the HIGH render profile, particles scale by tier. Plus the **CI gate** (see §3) and a harness fix. | Filtered nodes 30 → 0, darkness uploads per frame ≤1 at 1/16 the bytes. |
| #139 | **Day 3, memory.** Music/ambience decoded on first play (was ~440 MB of PCM at boot); preloader scoped to the selected character with no bitmap cache (was ~144 MB); phones load `@half` (512 px) player and NPC sprites (player pinned 64 → 16 MB, village NPCs 86 → 22 MB); dead 2048² sprite sheets removed. | Roughly 600 MB less resident on a phone. |

| #141 | **Day 4, §6A.** The player position, direction and animation frame live in refs; React gets a ≤10 Hz snapshot. Camera and room transform computed per frame by the loop (`utils/viewFrame.ts`, `hooks/useViewFrame.ts`) and applied to Pixi, the DOM world layer and the pointer maths from the ref; `usePixiRenderer`'s camera and player effects are gone. | CI `movement` scenario: App renders 0.955 → **0.08 /frame** (36 → 4.3 /s). Unit guard: 10 commits per second of walking. |

| #142 | **Day 5, §5 M10.** Always-mounted children memoised with stable props; `useGameState` selects and compares; `CloudShadows` drives its divs from its rAF via refs, camera from `viewFrameRef`. `perf-cpu-profile.mjs --tsx` lists every component function; anonymous frames are attributed by line. | React while walking 325 → **109 ms/s**, idle 90 → **13 ms/s** (4× throttle). |

**Not yet confirmed on a real device.** Every number above is from the
headless profile or arithmetic. Sentry will show the truth within a session of
play on today's release: see §2.

---

## 2. How to measure (three tools, each for a different question)

1. **Real devices → Sentry** (the only ground truth). Query logs on the EU
   region (`regionUrl: https://de.sentry.io`, org `twilightgame`, project
   `javascript-react`) for `message:game.performance` with fields
   `tags[performance.fps,number]`, `tags[performance.worst_frame_ms,number]`,
   `tags[performance.visible_sprites,number]`, `game.map`, `graphics.tier`,
   `device.user_agent`. Compare the same device and map across releases.
   Yesterday's baseline (before any of this): iPad **30.0 fps locked** in a
   4-sprite kitchen, **7.5–29.7 fps** in the village with worst frames up to
   1095 ms; iPhone 30–33 fps in the village. Also `message:game.operation` for
   `texture_batch` (0.4–4.7 s) and `local_save` durations.
2. **CPU attribution → `scripts/perf-cpu-profile.mjs`** (new today). V8
   sampling profile under 4× throttle, idle and walking, aggregated by function
   name. `--tsx` adds every component function, which is how to see what a
   React commit is spent on; anonymous frames are labelled `(anonymous:line)`
   with the line in the *served* file (`curl localhost:4000/TwilightGame/App.tsx`
   to map it back — Vite's transform shifts lines slightly). Run against `main` and the branch (serve `main` from a scratch
   worktree on another port) and put both tables in the PR. Headless fps
   cannot see CPU changes (SwiftShader is fill-bound); this can. Add
   `--who-sets-state` to see which code asks React to re-render.
3. **Regression gate → CI's performance job** (`scripts/perf-test.js` +
   `scripts/perf-report.js`). Grades **counts**, not timings: scene cost
   (sprites, nodes, textures, texture MB, depth, **filtered nodes, masked
   nodes**) and **work rates** (App commits/frame, scene rebuilds/s, NPC
   draws/frame, darkness uploads/s, save flushes/s). Counters live in
   `utils/PerformanceMonitor.ts` (`WorkCounters`) and are incremented at the
   source. The harness pins the in-game clock and weather (`--time 10`,
   `--weather clear`; use `--time 22` for the lit village) and the `movement`
   scenario walks during the measurement. Baseline comparison starts working
   for a metric once a `main` run has recorded it.

The number that mattered most, **App renders /frame while walking**, went from
≈0.8–1.0 to ≈0.08 with §6A (PR #141). What is left of it is the snapshot
cadence (`TIMING.PLAYER_SNAPSHOT_MS`) and tile-change commits; the next lever
is making each of those commits cheap (§5 M10, memoise the always-mounted
children).

---

## 3. Next, in order

### A. §6A — the player position leaves React state per frame — DONE (PR #141)

Kept here because the shape matters for what follows. What landed:
`usePlayerMovement` writes refs only; `useMovementController` commits a
snapshot on tile change / every 100 ms / on stop; `computeViewFrame()` is the
one camera+room-transform function, evaluated per frame by the loop
(`viewFrameRef`, which also drives the DOM world layer's transform and click
mapping) and from the snapshot by React; `usePixiRenderer.syncView()` /
`syncPlayer()` replace the camera and player effects.
**Follow-ups it leaves open:** ~~memoise App's always-mounted children (M10)~~
done (PR #142); move `visibleRange` to the loop (§6B);
the overlays inside the DOM world layer (stamina bar, rest "z"s, indicators)
are positioned from the snapshot and can trail the player by ≤ half a tile
while walking — M1 (draw them in Pixi) is the real fix.

The original brief, for reference:

**Why it's structural:** `hooks/usePlayerMovement.ts:147` does
`onSetPlayerPos(prev => next)` every moving frame; `playerPos` is a `useState`
in `hooks/useMovementController.ts`; the 3,400-line App re-renders, and
`playerPos` fans into `useCamera`, `roomTransform`, indicators, interaction
hooks and every un-memoised child. The Pixi side already reads
`playerPosRef` for collision and `frameParamsRef` in `usePixiRenderer`.

**Target shape** (details in the plan, §6A):

- The game loop writes position/direction/animation frame/camera into refs and
  the Pixi layers read them in `updateAnimations` (the pattern
  `RemotePlayerLayer` and now `NPCLayer` use). Camera moves containers there;
  the `cameraX/cameraY` React effect in `usePixiRenderer` goes away.
- React gets a **throttled snapshot** (on tile change, or ≤10–15 Hz) for HUD,
  indicators, menus, interaction prompts. `setPlayerPos` runs on that cadence.
- `useGameState` selects fields and compares before `setState`.
- Then memo the always-mounted children (plan §5 M10) — cheap once App no
  longer renders per frame.

**Guard to add:** a test that renders App with a fake rAF, walks 60 frames and
asserts App commit count ≤ a small number. `performanceMonitor.count('appRenders')`
already exists for it. Watch the CI work-rate row `App renders` drop.

**Traps:** `roomTransform` (App.tsx) is memoised on `playerPos` and drives
background-image rooms' pan; `useStablePoint` in `usePixiRenderer` already
pins its identity, but the pan must still update per frame for those rooms,
so it belongs in the ref path too. `TransitionIndicators` and
`NPCInteractionIndicators` compute screen positions from `playerPos` at render;
at 10–15 Hz they are fine.

### B. Plan §5, the medium items (days each; pick by payoff)

- **M1** effects into Pixi: `CloudShadows` (own rAF + `setState` per frame +
  `blur(20px)` DOM divs on 10 maps), `WeatherTintOverlay` (`mix-blend-mode`
  over the canvas), `AnimationOverlay` GIFs (main-thread decode;
  `dragonfly_stream.gif` has 209 frames), `ForegroundParallax`.
- **M3** GPU warm-up during the loading screen (bind each kept texture after
  `loadUrls` in `usePixiRenderer`'s residency effect) — kills the first-draw
  upload hitch after transitions.
- **M2** cap multi-tile sprite textures at 2× footprint in the optimiser
  (−108 MB); **M4** count room layers in the budget test and ship 1280×720
  room variants for mobile (extend the `@half` mechanism in
  `utils/textureVariants.ts`).
- **M5/M6** TileLayer fill and rebuild cost, per-map sprite margin.
- **M7** photos out of the main save blob; **M8** code-split the initial
  bundle (react-markdown, DevTools, minigames, Anthropic SDK, YAML → JSON);
  **M9** service-worker cache versioning; **M11** drop
  `preserveDrawingBuffer`.
- Plan §4 items still open: **14** Firebase off the boot critical path,
  **15** no procedural maps / `debugNPCs` / double validation at boot,
  **18** stop shipping `public/assets/` originals (dist is 832 MB).

### C. Plan §6, the rest of the architecture (sprints)

§6B retained dirty-flagged scene, §6C resolution variants for every category
plus atlases plus a budget test that counts audio and room layers, §6D all
effects drawn by Pixi, §6E quality policy with adaptive step-down and a
settings toggle, §6F minimal startup.

---

## 4. Traps that cost time today

- **Other agents switch this working tree's branch mid-session.** Main was
  checked out under me between two commands. Always `git branch --show-current`
  before committing; never `git add -A`. Uncommitted edits survive a switch,
  commits on a branch do not follow.
- **`mapManager.loadMap()` does not change the map React renders.** The
  harness "teleported" this way for months and every `bear_cave`/`witch_hut`
  CI number was a village measurement; it only looked right because the scene
  was rebuilt every frame. Use `window.debugTeleport(mapId)` (bound by App).
- **SwiftShader cannot render the lit cave** (0.4 fps: full-screen additive
  glow fill). CI measures caves by day (`--time 10`). For darkness work,
  screenshot at `--time 22` and judge visually; the counters still count.
- **StrictMode double-renders in dev.** Count App *commits* with an
  effect, not renders in the body (already done for `appRenders`).
- **New NPC or costume sprites need `npm run optimize-assets`** or
  `tests/textureVariants.test.ts` fails (no `@half` sibling). The optimiser
  is idempotent for existing files; only new siblings appear.
- **No PixiJS filters in world layers**: `tests/pixiFilterBudget.test.ts`
  bans them under `utils/pixi`, `hooks`, `components`. Bake effects into
  textures (see `ShadowLayer`'s soft disc, `DarknessLayer`'s glow gradient).
- **Chrome extension for in-browser checks was not connected today**; the
  headless harness (`scripts/perf-test.js --scenario idle --duration 3000`
  plus `perf-screenshot.png`) is a fine substitute for "does it still
  render". Delete `perf-screenshot.png` afterwards; it is not tracked.
- **`Darkness uploads` in the work-rate table is noise for a few seconds after
  boot.** The harness pins the clock to `--time` *after* the game has booted at
  the real in-game hour, and the darkness layer then lerps toward the pinned
  value at 20 composites/s — the 5 s warm-up does not always outlast it. It
  read 9.5/s on one branch run and 11.4/s on a `main` idle run minutes later
  with nothing changed. Compare it only between long-warm-up idle runs.
- **The stamina test's clock**: `Date.now()` mocked at a fixed value puts the
  in-game hour past bedtime, so a frame applies two drains. Tolerances in
  `tests/staminaCommitCadence.test.ts` account for it.
- **Full test runs time out under load.** Two dev servers plus headless Chrome
  running alongside `make verify` produced 5 s timeouts in unrelated tests.
  Rerun the file alone before believing a failure.

---

## 5. Working agreement

- Branch from `main`, one PR per day/sprint, `make verify` and `npm run lint`
  green, CI's `verify` job is the merge gate (`performance` is advisory and
  slow, ~20 min). Merge when green without asking; `main` auto-deploys.
- Every perf PR carries a before/after: the CPU profile tables for CPU work,
  the CI work-rate rows for anything the gate can see, a screenshot for
  anything visual.
- Update the plan's **Progress** section and tick the items in its §4 table.
- British English in anything user-facing; hand-drawn art stays linear-scaled;
  memory policy keys on `isMobile`, not the tier.
