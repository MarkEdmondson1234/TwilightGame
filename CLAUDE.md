# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A peaceful top-down exploration and crafting game engine built with React, Vite, and TypeScript. Inspired by Stardew Valley, it features tile-based movement, sprite animation, collision detection, and a **multi-map system** supporting both designed and procedurally generated maps with transitions. All artwork is meticulously hand-drawn and rendered with smooth linear scaling to preserve artistic quality.

## Firebase Cloud Saves

Firebase provides cloud saves via Firestore and cross-player features (NPC gossip sharing).

**Status:** Infrastructure fully present, UI active. Gracefully disabled when `firebase` package or env vars are missing.

**Key files:**

- `firebase/safe.ts` — **Safe wrapper** (import from here, not `firebase/index`) — stubs when package missing
- `firebase/config.ts` — Firebase init, checks `VITE_FIREBASE_*` env vars
- `firebase/authService.ts` — Email/password and Google auth
- `firebase/cloudSaveService.ts` — Save/load game state to Firestore
- `firebase/sharedDataService.ts` — Cross-player NPC gossip sharing
- `firebase/syncManager.ts` — Local↔Cloud save synchronisation
- `firebase/communityGardenService.ts` — Shared farm plots (+ `claimPlot` harvest transactions)
- `firebase/presenceService.ts` — **Multiplayer presence** (Realtime Database, not Firestore)
- `firebase/realtimeConfig.ts` — Realtime Database init (`VITE_FIREBASE_DATABASE_URL`)
- `components/HelpBrowser.tsx` — Account & Cloud Saves UI (F1 → Settings)
- `components/dialogue/UnifiedDialogueBox.tsx` — Unified scripted + AI dialogue (gossip injection into NPC conversations happens here)

**Setup:** Copy `.env.example` to `.env.local` and fill in Firebase credentials. Use the `setup-firebase` skill for guided setup.

**Without Firebase:** The game works fully offline. Firebase features silently disable when the package or env vars are missing.

**IMPORTANT — Safe imports:** Components must import from `firebase/safe` (not `firebase/index`) to avoid crashing when the `firebase` npm package is not installed:

```typescript
// ✅ CORRECT — safe, works without firebase installed
import { getAuthService, type AuthState } from '../firebase/safe';
import { getSharedDataService } from '../firebase/safe';
const auth = getAuthService();
const shared = getSharedDataService();

// ❌ WRONG — crashes if firebase package is not installed
import { authService } from '../firebase/index';
import { sharedDataService } from '../firebase/sharedDataService';
```

## Error Reporting (Sentry)

Remote error/crash reporting, so a real player's failed login or sync is visible without someone having to notice something looks broken and paste console output.

**Status:** Silently disabled when `VITE_SENTRY_DSN` is unset — same no-op pattern as Firebase above.

**Key file:** `utils/errorReporting.ts` (uses `@sentry/react`) — `initErrorReporting()` (called once in `index.tsx`), `reportError(error, category, extra?)`, `reportMessage(message, category, extra?)`, plus the once-per-page-session variants `reportErrorOnce`/`reportMessageOnce` (same signature + optional `key`; for sites that fire repeatedly — one issue is signal, a thousand identical events is quota burn), `setErrorReportingUser(uid)`, plus `onUncaughtError`/`onRecoverableError` (React 19's `createRoot()` error hooks — wired in `index.tsx`). Categories: `'auth' | 'sync' | 'shared_farm' | 'presence' | 'game_crash' | 'persistence' | 'map' | 'shared_world' | 'combat'` — `persistence` is data durability outside the syncManager pipeline (local saves, domain loads, diary/painting durability, save-data self-heals); `map` is map-authoring/integrity problems that survive validation; `combat` is a fight that ended in a state the game cannot act on (screen closed with no fight registered, beaten goblin not on the map, no floor for its passage) — each is "we won and nothing happened" to a player, and none of them throw.

**Reading errors back:** query the **Sentry MCP server** — the DSN is write-only ingest and cannot read issues. Org `twilightgame`, project `javascript-react`, and note the org is on the **EU region**, so pass `regionUrl: 'https://de.sentry.io'`; omitting it can return empty results that look exactly like "no errors reported". The `debug-production` skill covers the full workflow, and `setup-sentry-mcp` covers the one-time connection setup (token + gitignored `.mcp.json` + restart — shared by Claude Code and Pi).

**Player identity:** `setErrorReportingUser()` is called from `firebase/authService.ts`'s `notifyListeners()` — the one place every auth change funnels through — so Sentry can answer "how many distinct players hit this" rather than reporting `Users Impacted: 0` for everything. **Only the Firebase uid is sent**; never email, display name or character name, and `sendDefaultPii` stays off (it would attach IP addresses). This is a children's game — keep it that way when adding context.

**Noise filtering:** `ignoreErrors: [/AbortError/]` drops fetch cancellations, which are normal on navigation and map transitions. They were 85 of the first 87 events ever reported here, across 3 issues with 0 users impacted, and buried a real auth bug underneath.

**Wired into:** `components/ErrorBoundary.tsx` (`componentDidCatch`), `index.tsx` (`onUncaughtError`/`onRecoverableError` — NOT `onCaughtError`, which would double-report what ErrorBoundary already catches), `components/HelpBrowser.tsx` (auth actions), `firebase/syncManager.ts` (`uploadToCloud`/`downloadFromCloud`/`getCloudSyncMeta` — reported once at the source, not at every caller, since multiple call sites funnel through the same methods), `utils/farmManager.ts` (aggregate shared-farm write failures per flush, not per-plot), `utils/CharacterData.ts` (save/load failures — silent data loss otherwise), `utils/CookingManager.ts` (progress-without-unlock self-heal), `maps/MapManager.ts` (validation failures and spawn fallbacks — "player may be stuck" is its own issue), `App.tsx`'s mini-game close handler (a combat screen closing with no registered fight, a beaten goblin that is off-map or has no floor for its passage — the "we won and nothing happened" branches, which were silent for months), `services/diaryService.ts` and `utils/paintingImageService.ts` (durability of user content).

**Abrupt session ends (iOS memory kills):** iOS kills a tab that runs out of memory without running any code — the player sees the page refresh back to the title screen and Sentry sees silence after the last log. `utils/sessionHeartbeat.ts` writes a heartbeat to `localStorage` every 2 s (map, the operation in flight, resident texture MB, uptime, foreground/hidden) and marks it clean on `pagehide`; the next boot reports an unclean record as `game.session_abrupt_end` (log) and, for a foreground death, a `game_crash` issue titled "Previous session ended abruptly in <map> during <operation>". Query `message:game.session_abrupt_end` with the `previous.*` fields. Guarded by `tests/sessionHeartbeat.test.ts`.

**Service worker:** `public/sw.js` names its cache from the build (`scripts/stamp-sw.mjs` replaces `__APP_VERSION__` after `vite build`), so every deploy is a new worker that drops the old caches; `utils/serviceWorkerUpdates.ts` re-checks for a new worker whenever the tab comes back into view and reloads onto a new build only while the tab is hidden. Before this a phone played a build nine hours old (`index.html` is network-first, but the cached shell is served when the first request after waking fails). `tests/serviceWorkerVersion.test.ts` guards the placeholder, the build step and the update policy.

**Slow-minute attribution:** `utils/sessionDiagnostics.ts` merges `utils/diagnosticsRuntimeContext.ts` (NPC count, remote players, weather, season) into any one-minute performance window with ≥5 frames over 50ms (`SLOW_MINUTE_STALLS`) — event-triggered, so healthy sessions pay nothing. The getter is injected via `setSlowMinuteContext()` (registered from `gameInitializer.ts`) rather than imported, because GameState imports sessionDiagnostics and a direct import would be a cycle. The threshold is pinned in `tests/sessionDiagnostics.test.ts`.

**Deliberately not enabled:** performance tracing (`browserTracingIntegration`, `tracesSampleRate: 0`) and session replay (`replayIntegration`) — both are in Sentry's default React setup guide, but are a separate quota and, for replay, a bigger privacy footprint (recording gameplay sessions) than plain error reporting needs. Add them later if actually wanted.

**Setup:** Sign up at sentry.io (free tier), create a React project, copy the DSN into `.env.local` as `VITE_SENTRY_DSN`. For production, add the same value as a `VITE_SENTRY_DSN` GitHub Actions secret (see `.github/workflows/deploy.yml`, which passes it through the build the same way Firebase secrets are, plus `VITE_APP_VERSION` set to `github.sha` so errors can be traced back to the deploy that shipped them).

**Source maps:** wired in `vite.config.ts` via `@sentry/vite-plugin`, so production traces show real file and line numbers instead of minified `Ri()`/`wW()`. It is **opt-in on `SENTRY_AUTH_TOKEN`** — unset, the plugin is omitted entirely and the build behaves as before (forks and contributors are unaffected). Three things to preserve, each guarded by `tests/sentryBuildConfig.test.ts` because each fails silently: the plugin `release` must match the SDK's (both `VITE_APP_VERSION`) or maps never associate with events; `url` must stay `https://de.sentry.io` (EU region — the US default uploads to the wrong place without erroring); and the token must **never** gain a `VITE_` prefix, which would inline an org-write-capable secret into the public bundle. Maps are deleted after upload (`filesToDeleteAfterUpload`) since GitHub Pages serves everything in `dist/`.

**Setup for source maps:** Sentry → Settings → Auth Tokens → new token with `project:releases` scope → add as a `SENTRY_AUTH_TOKEN` GitHub Actions secret (and optionally `.env.local` for local production builds).

## Multiplayer (Shared World)

Players can inhabit the same maps at once — see each other walk around, and emote. Design and
implementation notes: [`design_docs/planned/MULTIPLAYER.md`](design_docs/planned/MULTIPLAYER.md).

**Status:** Implemented, inert until `VITE_FIREBASE_DATABASE_URL` is set. Toggle with
`MULTIPLAYER_ENABLED` in `constants.ts`. Without it the game is exactly single-player.

**Key files:**

- `multiplayer/` — pure logic: `wire.ts` (encode/validate), `interpolation.ts`, `publishPolicy.ts`,
  `emotes.ts`, `RemotePlayerManager.ts` (SSoT for other players — mirrors `NPCManager`)
- `multiplayer/gifts.ts` + `firebase/giftService.ts` + `hooks/useGiftsController.ts` — giving one
  another items. Transport is **Firestore, not RTDB** where chat and presence live: a gift is
  durable state, so it must survive the recipient being mid-transition or offline. One document
  per undelivered gift; the recipient deletes it as the delivery receipt, which is what makes
  delivery exactly-once. A gifted wreath or painting carries only its `decorationId` — the
  artwork itself travels via the shared picture store (`shared/world/paintings`), because
  DecorationManager state is per-account and the recipient has never seen the giver's.
- `utils/interactions/providers/remotePlayers.ts` — right-click another player to wave, emote,
  chat or give a gift. **Context-menu only, on purpose**: a left-click near someone must still mean "walk
  there", since players stand on doors, farm plots and shop counters. Inert without presence
  (`getRemotePlayers()` is empty), so it needs no `MULTIPLAYER_ENABLED` gate of its own.
- `hooks/useMultiplayerController.ts` — the domain controller; App.tsx only wires it
- `multiplayer/battle.ts` + `firebase/battleService.ts` + `hooks/useBattleController.ts` —
  **shared battles**: one player fights the goblin, the others watch and cheer, and the
  victory opens the lava passage for everyone standing in the cave
- `multiplayer/sharedMaps.ts` — the single `isSharedMap()` predicate, procedural maps included
- `utils/pixi/RemotePlayerLayer.ts` — rendering (mirrors `NPCLayer`)
- `database.rules.json` — RTDB security rules

**Rules that are easy to break:**

1. **Never put remote player positions through React state.** They change every frame.
   `usePixiRenderer`'s per-frame `updateAnimations()` polls `remotePlayerManager` directly; the
   EventBus trigger fires only on join/leave. (The local player works the same way now — see
   the Player System notes below.)
2. **The emote list is duplicated in `multiplayer/emotes.ts` and `database.rules.json` on purpose** —
   the rules enforce the closed vocabulary server-side. `tests/emoteVocabulary.test.ts` fails if the
   two lists drift.
   Free-text chat now exists alongside emotes (`multiplayer/chat.ts`), enabled deliberately by the
   owner for a group of children who know each other. It is **not** moderated: what protects players
   is that the world is accounts-only, messages are attributed and length-capped in the rules, and
   nothing is stored durably against a player. Anyone who creates an account can join and type, so
   if that group ever widens, restrict the shared world before widening it.
   `tests/chatRules.test.ts` fails if the client and server-side length caps drift.
3. **Anything in the shared simulation must be deterministic.** Time and weather already are.
   NPC wander and fairy spawns use `utils/seededRandom.ts` keyed on `(id, time slot)`.
   Reintroducing `Math.random()` there silently desyncs what two players see —
   `tests/determinism.test.ts` guards it.
4. **Procedural maps are shared too, and that rests entirely on determinism.**
   The forest, the mines and the lava levels rotate on a daily seed
   (`dailyProceduralSeed()` in `maps/index.ts` — `hash(kind:UTC-date:depth)`, the
   real calendar day, not the two-hour in-game one), so the map id `forest_<seed>`
   names one world that every player rebuilds from scratch. That makes the id usable
   as a presence room key. It also means **every random choice in
   `maps/procedural.ts` must come from the local seeded `rng()`/`rand()`, never
   `Math.random()`**, and the generators must stay pure functions of `(seed, depth)`
   rather than reading `gameState`. A stray `Math.random()` here does not throw and
   does not look wrong — the forest generates perfectly, it is just a _different_
   forest from your friend's. `tests/proceduralDeterminism.test.ts` scans the source
   for exactly that. Depth is the other half of the seed, so it has to reset
   consistently: `maps/proceduralDepth.ts` (guarded by
   `tests/proceduralDepth.test.ts`) lists the maps that keep you inside a chain and
   resets on leaving any of them.
5. **`multiplayer/sharedMaps.ts` is the one predicate for "do other players exist
   here."** Presence, chat, NPC speech, shared placement and battles all import
   `isSharedMap` from it. Do not re-add a local copy — they drifted before.
   `shop_<seed>` is deliberately excluded: its exit points back at whichever map the
   individual player came from.
6. **Every controller that joins a per-map room must retry on sign-in.** Firebase
   restores the session _after_ the game has loaded its first map, so a controller
   keyed only on `[currentMapId]` runs while `isAvailable()` is false, leaves the
   room and never comes back — a player who resumes standing in the village is
   silently in no room for the whole session, and walking out and back in "fixes"
   it, which makes it look intermittent. This is what made NPC conversations and
   shared furniture look broken. Copy the `authTick` pattern from
   `useMultiplayerController`; `tests/sharedWorldAuthRetry.test.ts` fails without it.
7. **Presence timestamps are server time; never compare them with `Date.now()`.**
   `multiplayer/serverClock.ts` holds RTDB's `.info/serverTimeOffset` and
   `serverNow()` is the clock to judge a record's `t` by. A tablet running five
   minutes fast otherwise sees every live player as a ghost and stands alone in
   a village everyone else can see her in — nothing throws, nothing logs.
   Every dropped inbound record and any clock more than
   `MULTIPLAYER.CLOCK_SKEW_WARN_MS` out is reported to Sentry (`presence`), as is
   a placed item whose picture could not be fetched (`shared_world`, with a
   `reason` naming which side lost it) and a picture that never reached the
   cloud (`persistence`). `tests/sharedWorldObservability.test.ts` guards all of it.
8. **Shared battles: the mini-game imports no Firebase.** `CombatEncounter` emits
   `BATTLE_PROGRESSED`/`BATTLE_ENDED` on the EventBus and `useBattleController` owns
   the transport. Only the fighter's client simulates the fight; spectators get a
   summary panel (`components/BattleSpectator.tsx`) and a cheer button, and a cheer
   restores a little of the fighter's stamina. **The winner chooses the lava-passage
   tile and publishes it** — everyone else opens it there via `utils/lavaEntrance.ts`
   rather than recomputing, or one cave ends up with two entrances.

## Language and Localisation

**IMPORTANT**: This game uses **British English** exclusively.

- Use "mum" not "mom"
- Use "colour" not "color" (in dialogue/UI text, not code)
- Use "traveller" not "traveler"
- Use "favourite" not "favorite"
- Avoid Americanisms like "wanna", "gonna", "gotta"
- When writing dialogue, use proper British spelling and phrasing

This applies to all user-facing text including: dialogue, item descriptions, UI labels, and documentation.

## Art Style and Rendering

**CRITICAL**: This game features hand-drawn artwork, NOT pixel art.

- **All sprites are hand-drawn** - Every asset is meticulously created as smooth, detailed artwork
- **Always use linear (smooth) scaling** - NEVER use nearest-neighbor or pixelated rendering
- **No `imageRendering: 'pixelated'`** - This CSS property must NEVER be added to any elements
- **PixiJS uses `scaleMode: 'linear'`** - All textures in TextureManager use smooth scaling with mipmaps
- **Preserve artistic quality** - The rendering system is designed to show artwork as beautifully as it was created

When adding new rendering code:

- ✅ DO: Use linear/smooth scaling for all images
- ✅ DO: Enable mipmaps for high-quality downscaling
- ❌ DON'T: Use nearest-neighbor scaling (causes unwanted pixelation)
- ❌ DON'T: Add `imageRendering: 'pixelated'` CSS properties
- ❌ DON'T: Use `SCALE_MODES.NEAREST` in PixiJS

## Touch/iPad Support

**IMPORTANT**: All game features must work on both keyboard AND touch devices (iPad).

When implementing new features:

- **Keyboard controls**: Add key bindings to `hooks/useKeyboardControls.ts`
- **Touch controls**: Add corresponding touch handlers to `hooks/useTouchControls.ts`
- **Touch UI**: Add buttons to `components/TouchControls.tsx` if the feature needs a dedicated button

**Input Architecture:**

- Shared action logic goes in `utils/actionHandlers.ts` (used by both keyboard and touch)
- Both input hooks should call the same action handler functions
- Touch buttons should be optional props (render only when callback provided)

**Example - Adding a new action:**

1. Create handler in `utils/actionHandlers.ts`: `handleNewAction(playerPos, mapId)`
2. Add to keyboard: F key in `useKeyboardControls.ts`
3. Add to touch hook: `handleNewActionPress()` in `useTouchControls.ts`
4. Add button: Optional `onNewActionPress` prop in `TouchControls.tsx`
5. Wire up in `App.tsx`: Pass callbacks to both hooks and component

## Development Commands

**Makefile Commands** (recommended):

- `make` or `make help` - Show all available commands
- `make install` - Install dependencies
- `make dev` - Start development server (Vite on port 4000)
- `make build` - Build for production
- `make preview` - Preview production build
- `make optimize-assets` - Optimise images using Sharp
- `make verify` - **Typecheck + run all tests. Run this before calling any change done.**
  CI's `verify` job additionally runs `npm run lint`, which fails on errors (warnings are
  fine). If you added or moved files, run `npm run lint` too — a green `make verify` is not
  the same gate.
- `make typecheck` - Check TypeScript only
- `make test` - Run all tests once
- `make clean` - Remove build artifacts
- `make reload` - **Restart dev server** (fixes HMR cascade hangs)
- `make test-game` - Open game in browser for testing

> ⚠️ **Do NOT run `npm test`** — that is `vitest` in **watch mode** and never exits, which will
> hang your session. Use `make verify`, `make test`, or `npm run test:run`.

### Handling HMR Cascade Hangs

**IMPORTANT**: When many files change at once (git sync, Claude making multiple edits), Vite's Hot Module Replacement can overwhelm the browser, causing it to hang.

**Symptoms:**

- Browser becomes unresponsive
- Game won't load (infinite loading)
- JavaScript consuming high CPU

**Solution - Use `make reload`:**

```bash
make reload
```

This command:

1. Stops any running Vite servers
2. Clears Vite's cache
3. Restarts a fresh dev server
4. Reminds you to hard-refresh the browser (Cmd+Shift+R)

**When to use:**

- After git pull/sync brings in many file changes
- When the browser hangs after Claude makes multiple file edits
- If HMR updates seem to be piling up in the console
- Whenever the game won't load after code changes

**If `make reload` + a hard refresh doesn't fix it:** you may have more than one dev server process
running (its kill step can fail to find an already-running server started from a different
terminal, so the reload starts a second one on the next free port instead of replacing the first —
your browser tab then talks to whichever stale instance it's already connected to). This produces
"impossible" bugs, not hangs — the same code reading two different answers depending on which
process handles the request. See [`docs/ARCHITECTURE_GOTCHAS.md`](docs/ARCHITECTURE_GOTCHAS.md#7-split-brain-dev-servers--make-reload-didnt-actually-kill-the-old-one)
for how to spot and clear duplicate processes.

**NPM Commands** (cross-platform - works on macOS, Linux, Windows):

- `npm install` - Install dependencies
- `npm run dev` - Start development server (Vite on port 4000)
- `npm run dev:start` - Kill existing servers and start fresh
- `npm run dev:reload` - **Full reload with cache clear** (fixes HMR hangs)
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run optimize-assets` - Optimise images using Sharp (automatically runs before build)
- `npm run art-review` - Render before/after contact sheets of any artwork changed
  against `origin/main`, into `art-review/`

## Reviewing Artwork Changes

Every asset change reviews as "Binary files differ", so a PR can halve a
sprite's resolution or change its padding — which moves the art inside its
texture — with nothing to look at. `scripts/art-review.mjs` renders the two
versions side by side on a checkerboard (so transparency changes are visible).

`.github/workflows/art-review.yml` runs it on PRs touching `public/assets**` or
the optimiser and posts the result. Inline images need an `ART_REVIEW_TOKEN`
secret — a **classic** personal access token; GitHub's attachment upload rejects
the Actions `GITHUB_TOKEN` with "unsupported authentication type". Without the
secret the comment still posts, linking the sheets in the workflow artifact.

**It compares files, not rendered output.** A file can change while the game
looks identical, and the game can change while no file does (sprites are scaled
to their `SPRITE_METADATA` box, not their own dimensions). To settle appearance,
screenshot both branches — see "Comparing rendered output" in the
`debug-production` skill.

## Core Architecture Principles

### Single Source of Truth (SSoT)

**Critical**: Shared data must have exactly one authoritative location. All code must read from that single source.

- **Map Data**: `maps/MapManager.ts` is the single source of truth for all map data
  - `utils/mapUtils.ts` exports `getTileData(x, y)` which queries MapManager
  - Physics engine, renderer, and debug overlays all use `getTileData()`
  - Never access map data directly - always use MapManager
- **Current Systems**: MapManager handles all map loading, transitions, and color schemes
- **Character Data**: `utils/CharacterData.ts` is the unified persistence API for all character-specific data
- **Items**: `data/items.ts` defines ALL items - crops, ingredients, tools, food, potions. It is a thin facade: the definitions live in per-category modules under `data/items/` (`seeds.ts`, `crops.ts`, `ingredients.ts`, `potions.ts`, `furniture.ts`, …). The header of `data/items.ts` maps category → module, so add a new item to the right module rather than opening the whole catalogue. Everything still imports from `data/items`.

### Item and Recipe SSoT

**CRITICAL**: Each item must have exactly ONE definition. Never create duplicate items with different IDs.

**Common SSoT Violations to Avoid:**

- ❌ Creating `potatoes` (INGREDIENT) when `crop_potato` (CROP) already exists
- ❌ Creating `tomato_fresh` (INGREDIENT) when `crop_tomato` (CROP) already exists
- ❌ Using `cane_sugar` in recipes when the item is defined as `sugar`

**When Adding Items to Recipes or Shops:**

1. Check if the item already exists in `data/items.ts`
2. Use the EXACT `id` from the existing definition
3. If a crop needs to be purchasable, add `buyPrice` to the crop - don't create a duplicate INGREDIENT

**When Adding New Items:**

1. Check for similar items first — `grep` the `data/items/` modules, or read the category → module table in the `data/items.ts` header
2. Add the definition to the matching `data/items/<category>.ts` module (NOT to the `data/items.ts` facade)
3. Use consistent naming: `crop_*` for crops, `seed_*` for seeds, `food_*` for cooked food
4. Ensure the `id`, `name`, and object key all match exactly

**Automated Tests**: Run `npx vitest run tests/itemSSoT.test.ts` to catch:

- Recipe ingredients that don't exist in ITEMS
- Shop items that don't exist in ITEMS
- Duplicate displayNames (potential duplicates)
- Crops used in recipes but missing `buyPrice` when sold in shop

### Character Data Persistence (CharacterData API)

**All character-related persistence** (inventory, farming, cooking, friendships, and each
manager's own domain) goes through `characterData` in `utils/CharacterData.ts` — e.g.
`characterData.saveInventory(items, tools)`, `characterData.saveFarmPlots(plots)` — **never**
`gameState.save*` directly. Its header documents the domains and the `load('domain')` pattern.

Managers (CookingManager, FriendshipManager, …) track state locally as the source of truth,
load from `characterData` once in `initialise()`, save via `characterData` on change, and never
read GameState during a save — reading GameState and writing it back is the stale-data bug this
API exists to prevent. (A few managers — Cooking, Magic, Decoration — still *load* via
`gameState.load*State()`; don't copy that.)

### DRY Principle

All constants and values are defined once in central locations:

- `constants.ts` - Game constants (`TILE_SIZE`, `MAP_WIDTH`, `MAP_HEIGHT`, `PLAYER_SIZE`, etc.)
- All reusable logic must be extracted to utility functions
- Never use magic numbers - always define as named constants

### Automated Sanity Checks

The game tests fundamental assumptions on startup:

- `utils/testUtils.ts` contains `runSelfTests()` - runs on app initialization
- Current checks: collision engine validates against defined constants
- When adding new systems, add corresponding sanity checks to `testUtils.ts`

### Map Validation

**IMPORTANT**: All maps are validated at registration and loading time. The `validateMapDefinition()` function in `maps/gridParser.ts` catches common issues:

**What It Checks:**

- Grid dimensions match declared `width` and `height`
- All grid rows have consistent width
- `spawnPoint` is within map bounds
- Transition `fromPosition` values are within map bounds
- NPC positions are within map bounds

**When It Runs:**

- At map registration (`mapManager.registerMap()`) - catches issues at startup
- At map loading (`mapManager.loadMap()`) - catches issues during transitions

**When Creating/Modifying Maps:**

1. Check browser console for validation messages
2. Fix any ❌ ERRORS before testing (these break gameplay)
3. Review ⚠️ WARNINGS (NPCs may appear in walls)
4. Ensure transition `toPosition` values are valid for the TARGET map (not just the source)

**Common Mistakes:**

- Transition spawn positions that exceed target map bounds
- Grid string rows that don't match declared dimensions
- NPCs placed in wall tiles (walkable area only: rows with `.` or `F`)

## Documentation

Detailed documentation is located in the [`docs/`](docs/) folder:

- [`docs/ARCHITECTURE_GOTCHAS.md`](docs/ARCHITECTURE_GOTCHAS.md) - **READ FIRST** — Non-obvious bugs & root causes (coordinate pipeline, click detection, audio lifecycle, z-index traps)
- [`docs/MAP_GUIDE.md`](docs/MAP_GUIDE.md) - Map creation guide
- [`docs/ASSETS.md`](docs/ASSETS.md) - Asset management and guidelines
- [`docs/FARMING.md`](docs/FARMING.md) - Farming system documentation
- [`docs/TIME_SYSTEM.md`](docs/TIME_SYSTEM.md) - Time/calendar system (seasons, days, years)
- [`docs/COORDINATE_GUIDE.md`](docs/COORDINATE_GUIDE.md) - Position system reference
- [`docs/SAVE_SYSTEM.md`](docs/SAVE_SYSTEM.md) - Save system and localStorage documentation
- [`docs/SEASONAL_NPC_LOCATIONS.md`](docs/SEASONAL_NPC_LOCATIONS.md) - Seasonal NPC positioning and map transitions

**In-Game Help Browser**: Press **F1** while playing to access all documentation in a browsable interface with markdown rendering.

## Code Organization

**Where things live** (root-level files are historical; new code goes in a folder):

| Path | What |
| --- | --- |
| `App.tsx` | Main component (~3,500 lines — **over the 500-line rule**). **Read its navigation header first**: it maps every subsystem to the hook that owns it. Add logic to that `use*Controller`/hook and only *wire* it here |
| `GameState.ts` | Persistent game state singleton (~155 methods) — prefer a focused manager + `characterData` for new state |
| `constants.ts` | Game constants, `TIMING`, `DEBUG` flags; re-exports `TILE_LEGEND`/`SPRITE_METADATA` |
| `types/` (via `types.ts`) | Shared types: `TileType` (`types/core.ts`, append-only numeric enum), `Position`, `MapDefinition`, … |
| `assets.ts` | Every asset URL, grouped by kind (`groceryAssets`, `npcAssets`, …) |
| `hooks/` | Input (`useKeyboardControls`, `useTouchControls`, `useMouseControls`), movement/collision, and the domain controllers: `useMovementController`, `useInteractionController`, `useEnvironmentController`, `useMultiplayerController` |
| `utils/` | Managers (`farmManager`, `inventoryManager`, `StaminaManager`, `TimeManager`, `FriendshipManager`, …) and pure logic: `gameInitializer`, `actionHandlers`, `CharacterData`, `EventBus`, `seededRandom`, `mapUtils`, `testUtils` |
| `utils/interactions/` | Click interaction providers — [README](utils/interactions/README.md) |
| `utils/pixi/` | PixiJS layers — [README](utils/pixi/README.md) |
| `maps/` | `MapManager` (SSoT), `index.ts` (registry + daily procedural seeds), `gridParser`, `colorSchemes`, `procedural.ts`, `definitions/` |
| `data/` | Items (`data/items/<category>.ts`), tiles (`tiles.ts`), sprite metadata, recipes, shops, cutscenes, quests |
| `components/` | React UI: `HUD`, `TouchControls`, `RadialMenu`, `dialogue/UnifiedDialogueBox`, `HelpBrowser` (F1), `DebugOverlay` (F3), … |
| `minigames/` | Self-contained mini-games (`add-minigame` skill) |
| `firebase/`, `multiplayer/` | Cloud saves and shared world (see above) |

### Game Systems

**Input System** (`hooks/useKeyboardControls.ts`, `hooks/useTouchControls.ts`, `hooks/useMouseControls.ts`):

- **Mouse**: Click anywhere to interact with objects, NPCs, tiles
  - Single interaction: Auto-executes immediately
  - Multiple interactions: Radial menu appears with options in a circle
  - Disabled on touch devices (to avoid conflicts with touch controls)
  - **An interaction that would be destructive or surprising as a one-click auto-execute must
    opt out**: set `requireConfirmation: true` on the interaction, or `confirmPickup: true` on
    the item definition. Both force the radial menu even when the interaction is the only one
    available. A placed bed offering only "Pick Up" is how clicking a bed to sleep in it
    carried the bed off instead — `tests/furnitureActions.test.ts` guards that case.
- **Right-click (desktop) / long-press (touch)** is the "what can I do here?" gesture, and
  the deliberate counterweight to left-click, which both walks the player _and_ fires a lone
  interaction outright — so it can never be used to simply look. On yourself it opens the
  emote wheel; anywhere else it shows every interaction and auto-executes none, however few
  there are. Providers see this as `ctx.isContextMenu` and may then offer actions the held
  tool does not allow, switching tools via `onSelectTool` — see
  [`utils/interactions/README.md`](utils/interactions/README.md), and `providers/farming.ts`
  which is why the feature exists (till/water/plant were invisible unless the right tool was
  already in hand).
- **Long-press is right-click on touch, and there is one implementation**:
  `utils/longPress.ts` (pure tracker) and `hooks/useLongPress.ts` (React props). Do not
  hand-roll another timer. Two things it gets right that a fresh one will not:
  `TIMING.LONG_PRESS_SLOP_PX` of drift tolerance, because a child holding still still
  wobbles and cancelling on the first `touchmove` made the gesture fail about a third of the
  time; and `consumeTap()`, without which the click the browser synthesises after the hold
  also fires. Any surface that gains a long press also needs the `no-touch-callout` class
  (`src/styles/global.css`), or iOS answers the hold with its own callout instead.
- **Inventory**: left-click/tap **selects a slot and nothing else**. Every action that
  consumes, places, applies or deletes an item lives behind **right-click** (desktop) or
  **long-press** (touch), and is defined in `utils/inventoryActions.ts` — not inline in
  App.tsx. Add a new item action there. The **quick slot bar shows the same nine slots**
  and routes to the same menu via `openItemActionMenu` in App.tsx — keep them in step, or
  the bar becomes the one place an item is visible but cannot be acted on.
- **Shop**: left-click trades **one**; right-click/long-press opens the quantity picker.
  This is deliberately the inverse of what it used to be — the picker appeared for any
  stack over one, so buying a single packet of seeds cost a slider, a plus button and a
  confirm, while the rare bulk purchase paid nothing extra. `tests/shopClickQuantity.test.tsx`
  guards it, because a regression here spends the player's gold on a single click.
- **Keyboard**: WASD/arrows for movement, E/Enter for actions, F-keys for UI, 1-9 for tools/seeds (legacy support)
- **Touch**: On-screen D-pad and action button for mobile devices
- Shared action handlers in `utils/actionHandlers.ts` eliminate code duplication
- Architecture: Input hooks → Action handlers → Game state updates

**Interaction System** (`utils/interactions/`, `components/RadialMenu.tsx`):

- **Read [`utils/interactions/README.md`](utils/interactions/README.md) before adding an interaction.**
- Each interaction kind is one provider in `utils/interactions/providers/`, listed in
  `registry.ts`. Adding one = provider file + registry line + `InteractionType` union entry.
- **Providers must be side-effect free at collection time** — `getAvailableInteractions()` runs
  on every click just to see what is _possible_. Mutate state only inside `execute`.
- Registry order is the radial menu order; `exclusive: true` suppresses later providers (shop counters).

**Player System** (`hooks/usePlayerMovement.ts`, `hooks/useCollisionDetection.ts`):

- Movement: Frame-rate independent delta-time based movement (5.0 tiles/second)
- Animation: 4-frame walk cycle per direction (frame 0 = idle), 150ms between frames
- Collision: Independent X/Y axis collision, supports both regular tiles and multi-tile sprites
- Boundary: Clamped to current map bounds
- Architecture: Isolated collision detection and movement logic in dedicated hooks
- **The player's position, direction and animation frame live in refs, not React state.**
  `usePlayerMovement` writes `playerPosRef`/`directionRef`/`animationFrameRef` every frame;
  PixiJS (`usePixiRenderer.syncPlayer`/`syncView`), the DOM world layer's transform and the
  pointer maths (`viewFrameRef` from `hooks/useViewFrame.ts`) read them per frame. React's
  `playerPos`/`cameraX` are a **snapshot** committed on a tile change, at most every
  `TIMING.PLAYER_SNAPSHOT_MS` while walking, and once on stopping — enough for the HUD,
  indicators and menus. An App render costs ~19 ms on an iPad, so a per-frame `setState`
  on the player is a dropped frame per step; `tests/playerPosSnapshot.test.tsx` fails if one
  comes back. The two exceptions that do commit every frame are the DOM renderer
  (`USE_PIXI_RENDERER` off) and rooms with `useDOMPlayer` (house2), where React draws the
  player itself.

**Maps and tiles:** all map data flows through `MapManager` (read tiles via `getTileData()`).
New games start in `village` (the hub); old saves pointing at the removed `home_interior` are
migrated to `mums_kitchen` (`utils/gameInitializer.ts`). Procedural maps (forest, mines, lava,
shop) have ids `<kind>_<seed>` on a daily seed — see Multiplayer rule 4. Tiles are defined in
`TILE_LEGEND` (`data/tiles.ts`) with child-friendly grid codes (`G` grass, `#` wall, `F` floor,
`D` door, …); colours come from the map's colour scheme via `ColorResolver`. See
`docs/MAP_GUIDE.md`. Startup order (`utils/gameInitializer.ts`): palette → self-tests → maps →
assets → inventory → farm plots.

**Camera System** (`App.tsx`):

- Follows player with centered viewport
- Clamped to current map boundaries (varies per map) — except on touch devices on tiled maps,
  where it may scroll past the bottom and side edges by the touch controls' footprint
  (`getCameraOverscroll` in `utils/touchLayout.ts`), so exits on the edge rows come up from
  under the quick bar and D-pad (#157). Guarded by `tests/touchCameraOverscroll.test.ts`.
- **Touch zoom floor follows the screen height** (`getWorldMinZoom` in `utils/touchLayout.ts`): a
  touch screen too short to show ~12 tiles at 50% may zoom out further (down to 0.3), so a small
  iPhone in Chrome (568×260) sees what an ordinary phone does. Touch controls size by height tier
  (`getTouchLayoutTier`: regular / compact < 600 / tiny < 340) and the D-pad can be tucked away
  (`utils/dpadPreference.ts`) — every footprint comes from `touchLayout.ts`; never place a touch
  control with numbers of its own. Plan: `design_docs/planned/MOBILE_UX_SMALL_SCREENS.md`.
- Viewport culling: Only renders visible tiles for performance

## EventBus System (`utils/EventBus.ts`)

Type-safe pub/sub that decouples managers from React: managers emit after changing state;
components/hooks subscribe and read fresh state from the manager or `gameState`.

- **The event list is the `GameEvent` enum** (~56 events) and its payloads are the
  `EventPayloads` interface, both in `utils/EventBus.ts`. Check there before adding one.
- **Adding an event:** add to `GameEvent`, add its payload to `EventPayloads`, emit with
  `eventBus.emit(GameEvent.X, payload)` **after** the state change.
- **Subscribing:** `useEffect(() => eventBus.on(GameEvent.X, handler), [])` — `on()` returns
  the unsubscribe function, so returning it is the cleanup.
- Use specific events (not a generic "state changed"); keep payloads minimal.
- Logging: `DEBUG.EVENTS` in `constants.ts` is `import.meta.env.DEV && false` — drop `&& false`
  locally to log every event.

## PixiJS Rendering System

The world renders with PixiJS v8 (WebGL) behind `USE_PIXI_RENDERER` in `constants.ts` (on; the
DOM renderer is a fallback still used by rooms with `useDOMPlayer`). `hooks/usePixiRenderer.ts`
owns the application; the layers live in `utils/pixi/` — **read
[`utils/pixi/README.md`](utils/pixi/README.md) before adding or changing a layer** (it lists all
~25 existing layers and the reuse/culling/z-order rules). Use the `add-pixi-component` skill to
add one. Debug overlay: F3.

### Texture Memory (read before touching asset loading)

**A texture costs `width x height x 4` bytes of GPU memory, whatever the PNG
weighs on disk.** A 40KB file at 2048x2048 is 16MB resident. This arithmetic —
not download size — is what has to fit on a phone, and getting it wrong does not
throw: iOS terminates the whole web content process, so the tab dies and Sentry
records at most a stray `TypeError: Load failed` from whichever fetch was in
flight. That exact bug shipped once; startup was loading every texture in the
game (434 files, ~1.2GB) plus 688MB of character sprites held in a Map that
never released.

**Textures are scoped to the current map.** `utils/mapTextureSet.ts` resolves:

- `getCoreTextureUrls(characterId)` — always resident: the selected player
  character, inventory icons, weather particles, cooking, farming soil states.
- `getTexturesForMap(mapId, season)` — the map's tile images, the multi-tile
  sprites those tiles trigger, and its NPCs' **world** sprites.

Three things that are easy to get wrong here:

1. **The resolver is a prefetch hint, not a contract.** It cannot see through
   `TileData.getImage()` (fruit trees pick sprites from runtime state), placed
   furniture, or a crop planted in thirty seconds. `textureManager.getTexture()`
   therefore _schedules the load on a miss_, and layers skip drawing that frame.
   Never make rendering depend on the set being exhaustive — every omission
   would become a permanently invisible sprite instead of a one-frame delay.
2. **Only the current season is loaded.** Loading all four quadrupled the cost
   of every tree. The season change effect re-prefetches.
3. **NPC dialogue portraits are not GPU textures.** `UnifiedDialogueBox`, `GiftModal`
   and `GlamourModal` render them as React `<img>`. They are among the largest
   art in the game, and counting them charged every map hundreds of megabytes it
   never used. Only `npc.sprite` and `animatedStates` frames are uploaded.
4. **Phones load half-size player and NPC sprites.** The optimiser writes a
   `name@half.png` sibling (512px) next to every PNG under `character*/` and
   `npcs/`, and `TextureManager` fetches it instead of the full file when the
   tier's `halfResolutionSprites` is set (`utils/textureVariants.ts`). Those
   frames are drawn at ~150–200 CSS px, so a 1024² frame (4 MB) was memory
   spent on detail a phone cannot show: the village's NPCs were 86 MB, the
   player's pinned frames 64 MB. Desktop keeps the full file, which also serves
   as the dialogue portrait. Room backgrounds under `rooms/` get the same
   treatment (1920×1080 → 960×540, 7.9 MB → 2 MB each). Code that sizes a
   sprite from `texture.width` must multiply by
   `textureManager.getVariantScale(url)`, or a phone draws it at half size.
   `tests/textureVariants.test.ts` fails if a sprite or room lands without its
   sibling — run `npm run optimize-assets`.
5. **Music and ambience are decoded on first play, not at boot.** `AudioManager`
   registers the whole catalogue but `loadBatch(audioAssets, ['sfx'])` fetches
   only effects; `playMusic`/`playAmbient` fetch their track on demand and start
   it when it lands, and stopped tracks beyond `AUDIO.MAX_IDLE_STREAMS` are
   dropped and re-decoded next time. The full set is ~1,500 s of audio, which
   decodes to ~440 MB of float PCM — more than the per-map texture budget,
   resident on every map, and uncounted by any budget. `tests/audioLazyLoad.test.ts`
   guards it.

**Device policy** lives in `utils/performanceTier.ts` and keys on `isMobile`,
**not** on `tier`. A modern iPhone lands on HIGH (6+ cores, and Safari does not
expose `navigator.deviceMemory` so it defaults to 4) — correct for render
quality, wrong for memory. Mobile drops mipmaps (~33% of every texture), gets a
tighter eviction budget, and caps concurrent loads at 6: firing all 434 requests
in one tick is what mobile WebKit answers by terminating them.

**Guarded by** `tests/mapTextureBudget.test.ts` (every map's textures resolve
case-sensitively, and no map exceeds the per-map ceiling) and
`tests/textureManager.test.ts` (concurrency cap, retry cap, eviction sparing
pinned textures).

**Sprite URL matching is a silent failure mode.** Custom character artwork
renders at 3x and SVG placeholders at 1x, chosen by pattern-matching the sprite
URL (`isCustomCharacterSprite()` in `utils/characterSprites.ts`). When the match
breaks, nothing throws and no texture 404s — the player simply renders at a
third of its size. Moving character art between directories has done this once
already; `tests/characterSpriteScale.test.ts` drives the real path builder into
the real detector so they cannot drift.

## Creating New Maps

See `MAP_GUIDE.md` for complete instructions. Quick reference:

1. Create file in `maps/definitions/yourMap.ts`
2. Draw map using grid codes (`G`=grass, `#`=wall, `F`=floor, `D`=door, etc.)
3. Use `parseGrid()` to convert string to TileType array
4. Define transitions for doors/exits
5. Choose color scheme (indoor, village, forest, cave, water_area, shop)
6. Register in `maps/index.ts`

Example: `G` for grass, `R` for rock, `#` for walls, `F` for floor, `D` for door

## Asset Management

See `ASSETS.md` for complete asset guidelines. Key points:

- Assets go in `/public/assets/` (organized into character1/, npcs/, tiles/, and farming/ subdirectories)
- Player sprites: per-character frame sets in `/public/assets/character{1,2}/base/` (frame counts in `utils/characterSprites.ts`); costumes under `characterN/outfits/<id>/` — see `utils/characterOutfits.ts`
- NPC sprites: PNGs in `/public/assets/npcs/` (a couple of legacy SVG placeholders remain)
- Tile sprites: `[tileName]_[variation].png` (e.g., `grass_0.png`, `rock_1.png`) in `/public/assets/tiles/`
- Farming sprites: In `/public/assets/farming/` (e.g., `fallow_soil_1.png`, `tilled.png`)
- All sprites use linear (smooth) scaling to preserve hand-drawn artwork quality
- Background colors from color scheme show through transparent PNGs

### Image Optimisation

`scripts/optimize-assets.js` (Sharp) writes `/public/assets/` → `/public/assets-optimized/`; it
runs before every build, and you run `npm run optimize-assets` after adding art. Size and quality
are chosen by **filename keyword** (`file.includes(...)` rules in `optimizeTiles()`) — a new file
that matches no rule silently gets the 256px tile default. The full size/quality table and how to
add a keyword are in [`docs/ASSETS.md`](docs/ASSETS.md#image-optimisation).

**Two rules that are not obvious:**

1. **NPCs use `fit: 'inside'`, everything else uses `fit: 'contain'`.** `contain` pads
   non-square art to a square, which moves the artwork inside its texture — and since sprites
   are stretched to their `SPRITE_METADATA` box, that changes how they look. Do **not** flip
   this globally: ~15 in-use sprites (sofa, mushroom house) have geometry tuned against the
   current padding.
2. **`withoutEnlargement` on the paths that use `inside`** — a 500×530 source was being upscaled
   to 1024×1024, quadrupling its GPU cost for no extra detail.

Always reference `/assets-optimized/` in `assets.ts`. If an asset must bypass the optimiser,
that is a bug in the optimiser, not a reason to reference `/assets/`: the original is what the
browser then downloads _and_ uploads to the GPU. Animated GIFs ship as sprite sheets
(`name.sheet.png` + `.sheet.json`), played by `utils/pixi/AnimationLayer.ts`.

### Tile Background Colors and ColorResolver

**IMPORTANT**: When tiles show wrong background colours (visible boxes that don't match the map's grass colour), the issue is almost NEVER the image transparency. Common mistakes to avoid:

1. **8-bit colormap PNGs DO have transparency** - Don't assume "8-bit colormap" means no alpha. The optimization script preserves transparency. NEVER switch to original large images as a "fix".

2. **The real issue is usually ColorResolver** - Tile background colours come from the color scheme, NOT the TILE_LEGEND `color` property directly. The system works as follows:
   - `ColorResolver.getTileColor(tileType)` resolves the correct colour from the map's color scheme
   - `TILE_TYPE_TO_COLOR_KEY` in `utils/ColorResolver.ts` maps tile types to scheme keys (e.g., FERN → 'grass')
   - When adding new tile types, add them to `TILE_TYPE_TO_COLOR_KEY` in ColorResolver.ts

3. **Rendering must use ColorResolver**:
   - ✅ CORRECT: `ColorResolver.getTileColor(renderTileData.type)`
   - ❌ WRONG: `renderTileData.color` (bypasses color scheme)

4. **When adding new decorative tiles** (trees, ferns, flowers):
   - Add entry to `TILE_TYPE_TO_COLOR_KEY` mapping to 'grass' (or appropriate key)
   - Set `baseType: TileType.GRASS` in TILE_LEGEND (for tiles with foreground sprites)
   - Use optimized assets (not originals) - they work fine

### Multi-Tile Sprite Guidelines

Multi-tile sprites (furniture, large objects) require special handling:

1. **Single Anchor Point**: Use only ONE grid character (e.g., `@` for sofa) in map definitions
   - ❌ WRONG: `@@@` creates 3 duplicate overlapping sprites
   - ✅ CORRECT: `@` single anchor automatically renders full 3-tile wide sprite

2. **Asset References**: Always reference `/assets-optimized/`, including for multi-tile sprites.
   - This used to say the opposite — "use original high-res images" — because the
     optimiser padded non-square art out to squares and shrank large sprites to
     256px, both of which visibly broke them. Those are optimiser bugs and are
     fixed: NPCs use `fit: 'inside'` (aspect preserved), and large multi-tile art
     has its own size rules.
   - Referencing an original costs the full source resolution in GPU memory —
     `width x height x 4` bytes. The five cat sprites alone were 21MB _each_.
   - If an asset genuinely looks wrong optimised, add a keyword rule in
     `scripts/optimize-assets.js` rather than pointing at `/assets/`.

3. **Sprite Metadata**: Configure in the `SPRITE_METADATA` array in `data/spriteMetadata.ts` (re-exported from `constants.ts`)
   - **CRITICAL**: Assume all sprite images uploaded are square (1:1 aspect ratio)
   - **Always preserve the original aspect ratio** when setting `spriteWidth` and `spriteHeight`
   - If a sprite is 1000×1000px (square), use equal dimensions like 6×6, NOT 6×5
   - Example: `cottage_small_spring.png` is square, so use `spriteWidth: 6, spriteHeight: 6` (not 6×5)
   - Stretching square images to rectangular dimensions makes them look distorted
   - Set collision boxes separately from visual dimensions
   - Use `depthLineOffset` to control where player/NPCs sort relative to the sprite

4. **Example Setup**:
   ```typescript
   // Sofa: 2732x2048 image → 3 tiles wide × 2.25 tiles tall (preserves aspect ratio)
   {
     tileType: TileType.SOFA,
     spriteWidth: 3, spriteHeight: 2.25,  // Visual size (natural ratio)
     offsetX: 0, offsetY: -1.25,
     image: tileAssets.sofa,
     collisionWidth: 3, collisionHeight: 1,  // Functional collision area
     // depthLineOffset: optional, defaults to collision box bottom
   }
   ```

## Code Maintenance Guidelines

**The 500-line rule.** No file should exceed ~500 lines, and no function ~100. Many already do
(69 files; `App.tsx`, `GameState.ts`, `maps/procedural.ts`, `utils/farmManager.ts`,
`hooks/usePixiRenderer.ts` are the worst) — **do not grow them further**. Extract, don't expand:
put new logic in a new focused file, or the matching `use*Controller` hook, and only wire it from
the big file.

Where things go:

- Input → `hooks/useKeyboardControls.ts` / `useTouchControls.ts`, sharing `utils/actionHandlers.ts`
- Related state + effects for one domain → a `use*Controller` hook (`useMovementController`,
  `useInteractionController`, `useEnvironmentController`, `useMultiplayerController`, …)
- Manager → component communication → EventBus, not callback props
- Startup → `utils/gameInitializer.ts`; render sections over ~100 lines → a component
- Naming: hooks `useX.ts`, components `PascalCase.tsx`, utilities `camelCase.ts`, constants
  `SCREAMING_SNAKE_CASE`

Code standards: strict TypeScript; no `any` (use `unknown` + guards); interfaces for data; discriminated unions
for state variants; refs (not state) for anything that changes every frame; comments explain
**why**.

### Testing and Validation

**Run `make verify` (typecheck + full test suite, ~20 s) before calling ANY change done.**
CI additionally runs `npm run lint`, which fails on errors — run it too if you added or moved
files. Several tests exist specifically to catch mistakes that are invisible until someone plays
the game (a mistyped asset path renders as nothing, an unregistered tile renders with a
wrong-coloured box, an out-of-bounds NPC spawns inside a wall).

```bash
make verify        # typecheck + all tests  ← the one you want
make test          # tests only
npm run test:run   # same, if make is unavailable
```

⚠️ Never run `npm test` — it is vitest in watch mode and will hang. Claude Code sessions are
protected by `.claude/hooks/guard-test-command.sh` (registered as a PreToolUse hook in
`.claude/settings.json`); other agents are not, so remember it.

**Expected baseline: the suite is fully green.** Every test passes on `main`. Any failure is a
real regression — yours or one you have just surfaced — so do not wave it through.

**What the tests guard:** [`tests/README.md`](tests/README.md) maps test files to the mistake
each catches (a curated subset — not every file is listed).

**When adding a feature:** constants in `constants.ts` (no magic numbers), types in `types/`,
and **a test for any invariant that could silently break** (an id that must exist, an asset that
must resolve, a registry that must stay in sync). Follow `tests/itemSSoT.test.ts`: collect every
violation and assert once, with a message that says how to fix it. Critical startup sanity
checks go in `utils/testUtils.ts` (`runSelfTests()`). Then test in the browser — no console
errors — and update `docs/` if an API changed.

## Reusable Utilities & Patterns

Check for an existing utility before writing one.

**Tile coordinates** (`utils/mapUtils.ts`) — use these instead of inline `Math.floor()` on
positions and hand-written 3×3 loops:

| Function                                  | Purpose                                             |
| ----------------------------------------- | --------------------------------------------------- |
| `getTileCoords(pos)`                      | World position → tile coordinates                   |
| `getAdjacentTiles(pos)`                   | Current tile + 4 cardinal neighbours                |
| `getSurroundingTiles(pos)`                | 8 neighbours (no centre)                            |
| `isSameTile(pos1, pos2)`                  | Same tile?                                          |
| `getTileDistance(pos1, pos2)`             | Manhattan distance between tiles                    |
| `getTilesInRadius(pos, radius)`           | All tiles in square radius                          |
| `findTileTypeNearby(x, y, types, radius)` | Position of a nearby tile type, if any              |
| `hasTileTypeNearby(x, y, types, radius)`  | Boolean version                                     |

**NPCs** — always build with the factories in `utils/npcs/createNPC.ts` (`createNPC`,
`createStaticNPC`, `createWanderingNPC`); they fill in animation timestamps, defaults and
optional properties. Never hand-construct an NPC object.

**Timing** — never magic numbers; use `TIMING.*` in `constants.ts` (`PLAYER_FRAME_MS` 150,
`NPC_FRAME_MS` 280, `DIALOGUE_DELAY_MS` 800, `MAP_TRANSITION_MS` 1000, `TOAST_DURATION_MS` 3000, …).

**Z-index** — never hardcode; import from `zIndex.ts` (`Z_PLAYER`, `Z_SPRITE_FOREGROUND`, `Z_HUD`,
…) and use `zClass(Z_X)` for Tailwind. Depth sorting: `Z_PLAYER + Math.floor(feetY)`, never
`feetY * 10` (escapes its range).

| Range     | Layer                | Range     | Layer              |
| --------- | -------------------- | --------- | ------------------ |
| -100..-1  | Parallax backgrounds | 400-499   | Game overlays      |
| 0-99      | World base, shadows  | 500-599   | Debug overlays     |
| 100-199   | Player/NPC/placed    | 1000-1099 | HUD, touch controls|
| 200-299   | Foreground sprites   | 2000-2099 | Modals, dialogue   |
| 300-399   | Weather              | 3000+     | Tooltip, toast, loading, error |

New utilities get a test in `tests/` (`/** @vitest-environment node */` for pure logic).

## Development Guidelines

1. **Validate changes**: After making code changes, ALWAYS run `make verify` (typecheck + full test suite) before considering the task complete. Never `npm test` — that is watch mode and hangs. If you added an invariant worth protecting, add a test for it too
2. **Always run sanity checks** (`runSelfTests()`) after modifying core systems - these run automatically on app startup
3. **Never bypass SSoT**: Use MapManager for map data, `getTileData()` for tile access
4. **Add constants to `constants.ts`**: Never hardcode values
5. **Test new systems**: Add checks to `testUtils.ts` for new features
6. **Preserve game loop**: Player movement uses `requestAnimationFrame` - be careful with state updates
7. **Follow existing patterns**: Independent X/Y collision, deterministic tile variation selection
8. **Map creation**: Use child-friendly grid codes, register all maps in `maps/index.ts`
9. **Color schemes**: Every map must reference a valid color scheme from `colorSchemes.ts`
10. **Check map validation**: After creating/modifying maps, check browser console for validation errors (see Map Validation section)
11. **Watch file sizes**: Refactor files that exceed 500 lines (see Code Maintenance Guidelines above)
12. **Extract, don't expand**: When adding features, create new focused files rather than growing existing ones

### Common Pitfalls (see [`docs/ARCHITECTURE_GOTCHAS.md`](docs/ARCHITECTURE_GOTCHAS.md) for full details)

These are the bugs that keep coming back. **Read the gotchas doc before touching these systems.**

- **Click offsets in background-image rooms**: `effectiveGridOffset` in App.tsx must multiply by `zoom`. If you touch the coordinate pipeline, test at zoom > 1 in BOTH room types (tiled AND background-image).
- **Clicks going through HUD**: `isUIElement()` in `useMouseControls.ts` must use `document.elementsFromPoint()`, not `e.target` traversal. HUD containers use `pointer-events: none`, so `e.target` is the canvas behind them.
- **Loading/modal overlays appearing behind game elements**: Always use z-index constants from `zIndex.ts` (e.g. `Z_LOADING = 3500`). Never hardcode `z-[150]` or similar — HUD is at 1000, dialogues at 2010.
- **Ambient audio going silent on map transitions**: Each ambient effect owns its own `stopAmbient` calls. The weather effect must ONLY stop weather sounds — never blanket-stop birds, stream, countryside, etc.
- **React `stopPropagation()` doesn't block native listeners**: `useMouseControls` uses native `addEventListener`. React `e.stopPropagation()` in UI components won't prevent game clicks.

## Claude Skills

**IMPORTANT**: Use these skills proactively when the user's request matches the skill's purpose. Skills provide step-by-step workflows for common tasks.

### Available Skills

| Skill                    | Trigger Phrases                                                                                | Purpose                                                                                    |
| ------------------------ | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| **dev-server**           | "start server", "launch game", "run dev"                                                       | Kill old servers, start fresh dev server                                                   |
| **profile-game**         | "check performance", "profile", "FPS", "slowdown"                                              | Run headless performance tests; for CPU-side changes use `scripts/perf-cpu-profile.mjs`  |
| **add-tile-sprite**      | "add tile", "new sprite", "add flower", "add tree"                                             | Add tile assets with keyword optimization                                                  |
| **add-npc-sprite**       | "add NPC", "new character", "add villager"                                                     | Add NPC sprites and factory functions                                                      |
| **add-character-sprite** | "player sprite", "character customization"                                                     | Add player character layers                                                                |
| **add-farming-sprite**   | "crop sprite", "farming", "soil", "plant"                                                      | Add farming system sprites                                                                 |
| **add-inventory-sprite** | "inventory sprite", "item image", "tool sprite"                                                | Add inventory item sprites (general items)                                                 |
| **add-grocery-item**     | "add ingredient", "grocery item", "cooking ingredient", "shop item"                            | Add grocery items as ingredients and shop inventory                                        |
| **add-animation**        | "add animation", "particle effect", "weather effect"                                           | Add GIF animations to tiles/weather                                                        |
| **add-pixi-component**   | "PixiJS", "WebGL", "particle system", "shader"                                                 | Add PixiJS rendering components                                                            |
| **add-minigame**         | "create mini-game", "add mini-game", "new activity"                                            | Create self-contained mini-games (2 files + 1 registry line)                               |
| **debug-production**     | "works locally but not deployed", "broken on the live site", "check Sentry", "can't reproduce" | Debug production-only bugs: Sentry via MCP, live console probe, deployed-bundle inspection |
| **setup-sentry-mcp**     | "set up Sentry", "Sentry MCP 401", "Sentry not connecting", "new machine setup"                | One-time Sentry MCP install for Claude Code + Pi: token, `.mcp.json`, restart, verify      |
| **setup-firebase**       | "set up Firebase", "cloud saves", "Firebase credentials"                                       | Guided Firebase setup (`.env.local`, rules deploy)                                         |
| **add-herb**             | "add herb", "perennial", "regrowable crop"                                                     | Add a herb crop to the farming system                                                      |
| **add-forageable-plant** | "forageable plant", "forage", "wild plant"                                                     | Add a multi-tile forageable plant (tile, sprite, forage provider, item)                    |
| **add-audio**            | "add sound", "music", "ambient audio", "sound effect"                                          | Add audio files and register them with AudioManager                                        |
| **replace-emoji**        | "replace emoji", "hand-drawn icon"                                                             | Map an emoji to a hand-drawn PNG icon                                                      |

## Technical Notes

- React 19.2.0 with functional components and hooks
- TypeScript, `strict: true`
- Vite dev server with HMR
- Vitest test suite in `tests/` — run with `make verify` (see Testing and Validation)
- Position coordinates are in tile units (not pixels)
- `TILE_SIZE` constant converts between tile units and pixel rendering
