# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A peaceful top-down exploration and crafting game engine built with React, Vite, and TypeScript. Inspired by Stardew Valley, it features tile-based movement, sprite animation, collision detection, and a **multi-map system** supporting both designed and procedurally generated maps with transitions. All artwork is meticulously hand-drawn and rendered with smooth linear scaling to preserve artistic quality.

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
- `make typecheck` - Check TypeScript for errors
- `make clean` - Remove build artifacts
- `make reload` - **Restart dev server** (fixes HMR cascade hangs)
- `make test-game` - Open game in browser for testing

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

**NPM Commands** (cross-platform - works on macOS, Linux, Windows):
- `npm install` - Install dependencies
- `npm run dev` - Start development server (Vite on port 4000)
- `npm run dev:start` - Kill existing servers and start fresh
- `npm run dev:reload` - **Full reload with cache clear** (fixes HMR hangs)
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run optimize-assets` - Optimise images using Sharp (automatically runs before build)

## Core Architecture Principles

### Single Source of Truth (SSoT)

**Critical**: Shared data must have exactly one authoritative location. All code must read from that single source.

- **Map Data**: `maps/MapManager.ts` is the single source of truth for all map data
  - `utils/mapUtils.ts` exports `getTileData(x, y)` which queries MapManager
  - Physics engine, renderer, and debug overlays all use `getTileData()`
  - Never access map data directly - always use MapManager
- **Current Systems**: MapManager handles all map loading, transitions, and color schemes
- **Character Data**: `utils/CharacterData.ts` is the unified persistence API for all character-specific data

### Character Data Persistence (CharacterData API)

**IMPORTANT**: All character-related data persistence (inventory, farming, cooking, friendships) MUST go through the `characterData` API.

```typescript
import { characterData } from './utils/CharacterData';

// Save inventory
characterData.saveInventory(items, tools);

// Save farm plots
characterData.saveFarmPlots(plots);

// Save friendships
characterData.saveFriendships(friendships);
```

**Why This Exists:**
- Prevents circular dependency bugs where managers read from GameState and write back stale data
- Provides consistent logging for debugging persistence issues
- Single point of control for all character data saves
- Type-safe with proper TypeScript interfaces

**DO NOT use gameState directly for saves:**
```typescript
// ❌ WRONG - bypasses CharacterData API
gameState.saveInventory(items, tools);
gameState.saveFarmPlots(plots);

// ✅ CORRECT - uses CharacterData API
characterData.saveInventory(items, tools);
characterData.saveFarmPlots(plots);
```

**Manager Pattern:**
Managers (CookingManager, FriendshipManager, etc.) should:
1. Track state locally as the single source of truth
2. Load from `characterData` once during `initialise()`
3. Save via `characterData` when state changes
4. Never read from GameState during save operations

**Available Domains:**
- `inventory` - Items and tools
- `farming` - Farm plots, current tool, selected seed
- `cooking` - Recipe book, unlocked recipes, progress
- `friendship` - NPC friendship levels and history

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

**Console Output:**
```
🗺️ Map Validation: mums_kitchen
Declared: 15x9, Actual grid: 15x9
❌ ERRORS:
  - Spawn point (15, 13) is out of bounds (0-14, 0-8)
⚠️ WARNINGS:
  - NPC "Mum" at (7, 4) is out of bounds
```

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
- [`docs/MAP_GUIDE.md`](docs/MAP_GUIDE.md) - Map creation guide
- [`docs/ASSETS.md`](docs/ASSETS.md) - Asset management and guidelines
- [`docs/FARMING.md`](docs/FARMING.md) - Farming system documentation
- [`docs/TIME_SYSTEM.md`](docs/TIME_SYSTEM.md) - Time/calendar system (seasons, days, years)
- [`docs/COORDINATE_GUIDE.md`](docs/COORDINATE_GUIDE.md) - Position system reference
- [`docs/SAVE_SYSTEM.md`](docs/SAVE_SYSTEM.md) - Save system and localStorage documentation
- [`docs/SEASONAL_NPC_LOCATIONS.md`](docs/SEASONAL_NPC_LOCATIONS.md) - Seasonal NPC positioning and map transitions

**In-Game Help Browser**: Press **F1** while playing to access all documentation in a browsable interface with markdown rendering.

## Code Organization

### Core Files

- `App.tsx` - Main component: rendering, camera system, game loop orchestration (~1,600 lines)
- `constants.ts` - Game constants (`TILE_SIZE`, `PLAYER_SIZE`), tile legend with all tile types, DEBUG flags
- `types.ts` - TypeScript types including `TileType`, `Position`, `Direction`, `MapDefinition`, `Transition`, `ColorScheme`

### Hooks (`hooks/`)

Custom React hooks for game systems:

- `hooks/useKeyboardControls.ts` - Keyboard input handling (F-keys, WASD, E, R, tool switching)
- `hooks/useTouchControls.ts` - Touch control handling (direction pad, action button)
- `hooks/useMouseControls.ts` - Mouse click handling (canvas click detection, coordinate mapping)
- `hooks/useCollisionDetection.ts` - Player collision detection (tiles and multi-tile sprites)
- `hooks/usePlayerMovement.ts` - Player movement logic (input processing, animation, position updates)
- `hooks/useTouchDevice.ts` - Touch device detection

**Domain Controllers** (consolidate related state and effects):
- `hooks/useMovementController.ts` - Player position, direction, animation, pathfinding, size effects
- `hooks/useInteractionController.ts` - NPC dialogue, radial menu, farm actions, canvas clicks
- `hooks/useEnvironmentController.ts` - Weather, time of day, ambient audio, item decay, movement effects

### Utilities (`utils/`)

Pure functions and game systems:

- `utils/gameInitializer.ts` - Game startup (palette, maps, assets, inventory, farm plots)
- `utils/actionHandlers.ts` - Shared action logic (mirror, NPC, transition, farming interactions)
- `utils/CharacterData.ts` - **Unified persistence API** for all character data (inventory, farming, cooking, friendships)
- `utils/EventBus.ts` - **Type-safe pub/sub event system** for decoupling managers from React components
- `utils/mapUtils.ts` - Tile data access via MapManager
- `utils/testUtils.ts` - Startup sanity checks
- `utils/tileRenderUtils.ts` - Tile transform calculations
- `utils/farmManager.ts` - Farm plot management
- `utils/StaminaManager.ts` - Stamina drain/restore with EventBus integration
- `utils/inventoryManager.ts` - Inventory management with EventBus integration
- `utils/characterSprites.ts` - Character sprite generation
- `utils/TimeManager.ts` - In-game time/calendar system

### Map System (`maps/`)

- `maps/MapManager.ts` - **Single source of truth** for all map data, transitions, and current map state
- `maps/index.ts` - Map registry, initialization, handles RANDOM_* map generation
- `maps/gridParser.ts` - Converts character-based grid strings to TileType arrays
- `maps/colorSchemes.ts` - Color scheme definitions for different map themes
- `maps/procedural.ts` - Random map generators (forest, cave, shop)
- `maps/definitions/` - Designed map files (homeInterior, village, etc.)

### Components (`components/`)

- `components/HUD.tsx` - Heads-up display (time, gold, tools, inventory)
- `components/TouchControls.tsx` - Mobile touch controls UI
- `components/RadialMenu.tsx` - Circular menu for multiple interaction options (click-based)
- `components/DebugOverlay.tsx` - Debug information (toggle with F3)
- `components/DebugInfoPanel.tsx` - Debug panel component
- `components/CharacterCreator.tsx` - Character customization UI
- `components/DialogueBox.tsx` - NPC dialogue display
- `components/HelpBrowser.tsx` - In-game documentation browser (F1)
- `components/Modal.tsx` - Modal component

### Game Systems

**Input System** (`hooks/useKeyboardControls.ts`, `hooks/useTouchControls.ts`, `hooks/useMouseControls.ts`):
- **Mouse**: Click anywhere to interact with objects, NPCs, tiles
  - Single interaction: Auto-executes immediately
  - Multiple interactions: Radial menu appears with options in a circle
  - Disabled on touch devices (to avoid conflicts with touch controls)
- **Keyboard**: WASD/arrows for movement, E/Enter for actions, F-keys for UI, 1-9 for tools/seeds (legacy support)
- **Touch**: On-screen D-pad and action button for mobile devices
- Shared action handlers in `utils/actionHandlers.ts` eliminate code duplication
- Architecture: Input hooks → Action handlers → Game state updates

**Interaction System** (`utils/actionHandlers.ts`, `components/RadialMenu.tsx`):
- Click-based: Primary interaction method - click on objects/tiles to interact
- `getAvailableInteractions()`: Returns all possible interactions at a position
- Interaction types: mirror, NPC, transition, cooking, farming (till, plant, water, harvest, clear), foraging, berry harvesting
- **Multi-seed planting**: When clicking tilled soil with seeds tool, radial menu shows all available seed types
- **Radial menu**: Circular menu that displays options around click point with icons and colours
- Each interaction has: label, icon (emoji), colour (hex), and execute callback

**Player System** (`hooks/usePlayerMovement.ts`, `hooks/useCollisionDetection.ts`):
- Movement: Frame-rate independent delta-time based movement (5.0 tiles/second)
- Animation: 4-frame walk cycle per direction (frame 0 = idle), 150ms between frames
- Collision: Independent X/Y axis collision, supports both regular tiles and multi-tile sprites
- Boundary: Clamped to current map bounds
- Architecture: Isolated collision detection and movement logic in dedicated hooks

**Map System** (`maps/MapManager.ts`):
- **Single Source of Truth**: All map data flows through MapManager
- Supports designed maps (grid-based) and procedurally generated maps (random seed-based)
- Handles map transitions when player activates transition tiles
- Applies color schemes dynamically per map theme
- Starting map: `home_interior` (small indoor room)
- Hub map: `village` (30x30 outdoor area with multiple exits)
- Random maps: forest, cave, shop (generated on demand with `RANDOM_*` IDs)

**Tile System** (`constants.ts`, `utils/tileRenderUtils.ts`):
- Tile data stored in `TILE_LEGEND` Record (not array - order-independent)
- 13+ tile types: outdoor (grass, rock, water, path), indoor (floor, wall, carpet), transitions (doors), furniture (table, chair, sofa, bed)
- Child-friendly grid codes: `G`=grass, `R`=rock, `#`=wall, `F`=floor, `D`=door, etc.
- Color schemes override tile colors per map theme (indoor, village, forest, cave, water_area, shop)
- Optional transforms (flip, rotate, scale, brightness) defined per tile type (opt-in model)
- See `MAP_GUIDE.md` for map creation instructions

**Action System** (`utils/actionHandlers.ts`):
- Mirror interaction: Opens character creator
- NPC interaction: Triggers dialogue or events
- Map transitions: Loads new map and teleports player
- Farming actions: Till, plant, water, harvest based on current tool
- Architecture: Reusable action functions shared between keyboard and touch input

**Initialization System** (`utils/gameInitializer.ts`):
- Game startup orchestration: palette → self-tests → maps → assets → inventory → farm plots
- Handles regeneration of random maps from saved seeds
- Initializes starter inventory for new players
- Runs all sanity checks before game starts

**Camera System** (`App.tsx`):
- Follows player with centered viewport
- Clamped to current map boundaries (varies per map)
- Viewport culling: Only renders visible tiles for performance

## EventBus System (`utils/EventBus.ts`)

**Type-safe pub/sub event system** that decouples managers from React components. Managers emit events when state changes, React components subscribe to update.

### Why EventBus?

- **Decoupling**: Managers don't need React callbacks passed in
- **Performance**: Components only re-render when relevant events fire (vs. polling or full state subscriptions)
- **Type Safety**: Each event has a typed payload via `EventPayloads` interface
- **Debug Mode**: Enable `DEBUG.EVENTS` in `constants.ts` to see all events in console (dev only)

### Available Events

| Event | Payload | Emitted By | Subscribers |
|-------|---------|------------|-------------|
| `STAMINA_CHANGED` | `{ value, maxValue }` | StaminaManager | StaminaBar |
| `INVENTORY_CHANGED` | `{ action }` | inventoryManager | App.tsx |
| `FARM_PLOT_CHANGED` | `{ position?, action? }` | farmManager | useGameEvents |
| `NPC_MOVED` | `{ npcId, position? }` | npcManager | useGameEvents |
| `NPC_SPAWNED` / `NPC_DESPAWNED` | `{ npcId, mapId }` | npcManager | useGameEvents |
| `PLACED_ITEMS_CHANGED` | `{ mapId, action? }` | gameState | useGameEvents |
| `WEATHER_CHANGED` | `{ weather, mapId }` | weatherManager | EnvironmentController |
| `TIME_CHANGED` | `{ hour, timeOfDay }` | TimeManager | EnvironmentController |

### Usage Examples

**Emitting events (in managers):**
```typescript
import { eventBus, GameEvent } from './EventBus';

// After changing stamina
eventBus.emit(GameEvent.STAMINA_CHANGED, {
  value: newStamina,
  maxValue: STAMINA.MAX,
});

// After inventory update
eventBus.emit(GameEvent.INVENTORY_CHANGED, { action: 'update' });
```

**Subscribing to events (in React components/hooks):**
```typescript
import { eventBus, GameEvent } from '../utils/EventBus';

useEffect(() => {
  // Returns unsubscribe function - use as cleanup
  return eventBus.on(GameEvent.STAMINA_CHANGED, (payload) => {
    setCurrent(payload.value);
  });
}, []);
```

### Adding New Events

1. **Add event type** to `GameEvent` enum in `utils/EventBus.ts`:
```typescript
export enum GameEvent {
  // ... existing events
  MY_NEW_EVENT = 'category:event_name',
}
```

2. **Define payload type** in `EventPayloads` interface:
```typescript
export interface EventPayloads {
  // ... existing payloads
  [GameEvent.MY_NEW_EVENT]: {
    someField: string;
    anotherField: number;
  };
}
```

3. **Emit from manager** when state changes:
```typescript
eventBus.emit(GameEvent.MY_NEW_EVENT, { someField: 'value', anotherField: 42 });
```

4. **Subscribe in components** that need to react:
```typescript
useEffect(() => {
  return eventBus.on(GameEvent.MY_NEW_EVENT, (payload) => {
    // Handle the event
  });
}, []);
```

### Debug Mode

Enable EventBus logging in development:
```typescript
// In constants.ts DEBUG object
EVENTS: import.meta.env.DEV,  // Logs all events to console in dev
```

Console output when enabled:
```
[EventBus] player:stamina_changed { value: 98.5, maxValue: 100 }
[EventBus] items:inventory_changed { action: 'update' }
```

### Best Practices

- **Emit after state change** - Always emit events AFTER updating the underlying state
- **Use specific events** - Don't use a generic "state changed" event; use specific events like `STAMINA_CHANGED`
- **Clean up subscriptions** - Return the unsubscribe function from `useEffect` to prevent memory leaks
- **Keep payloads minimal** - Include only what subscribers need; they can read full state from gameState

## PixiJS Rendering System

**Status**: Active (Feature-flagged with `USE_PIXI_RENDERER` in `constants.ts`)

PixiJS is a WebGL-based 2D rendering engine that provides 10-100x performance improvements over DOM-based rendering. The game uses PixiJS v8.14.0 for GPU-accelerated sprite rendering.

### Why PixiJS?

**Performance Benefits:**
- **10-100x faster rendering**: WebGL GPU acceleration vs DOM manipulation
- **Consistent 60 FPS**: Smooth gameplay on all devices
- **Scalability**: Support for thousands of sprites (vs ~500 with DOM)
- **Lower memory usage**: GPU textures vs DOM nodes
- **Future capabilities**: Particle effects, lighting, shaders, post-processing

**Current vs Future:**
- **DOM Renderer**: 30x30 map = ~1,800 DOM nodes, 30-45 FPS
- **PixiJS Renderer**: 30x30 map = 1 canvas element, 60 FPS

### Architecture

The PixiJS implementation uses a **class-based layer system** with three primary rendering layers:

```
┌─────────────────────────────────────────┐
│         React Component (App.tsx)       │
│  - State management                     │
│  - Game loop orchestration              │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│        PixiJS Application (Canvas)      │
│  - WebGL/Canvas Renderer                │
│  - Stage (root container)               │
└──────────────────┬──────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
┌───────▼────────┐   ┌────────▼────────┐
│  TileLayer     │   │  SpriteLayer    │
│  (z-index 0-1) │   │  (background    │
│  - Background  │   │   z-index 50)   │
│    colors      │   │  - Multi-tile   │
│  - Tile images │   │    sprites      │
└────────────────┘   │  (foreground    │
                     │   z-index 200)  │
        ┌────────────┴────────┐
        │                     │
┌───────▼────────┐   ┌────────▼────────┐
│  PlayerSprite  │   │  Future Layers  │
│  (z-index 100) │   │  - Particles    │
│  - Character   │   │  - Lighting     │
│    animation   │   │  - Effects      │
└────────────────┘   └─────────────────┘
```

### Core PixiJS Files

**Rendering Layers** (`utils/pixi/`):
- `TileLayer.ts` - Renders background tiles (colors and sprites), handles farm plot states
- `SpriteLayer.ts` - Renders multi-tile sprites (furniture, buildings, trees) in background/foreground
- `PlayerSprite.ts` - Renders player character with animation

**Utilities** (`utils/`):
- `TextureManager.ts` - Texture loading, caching, and management (PIXI.Texture instances)
- `ColorResolver.ts` - Converts palette colors to PixiJS hex format

**Constants** (`constants.ts`):
- `USE_PIXI_RENDERER` - Feature flag to toggle between PixiJS and DOM rendering

### Key Concepts

**Texture Management:**
- All images loaded as `PIXI.Texture` via `TextureManager`
- Textures cached and reused (no recreation on re-render)
- `scaleMode: 'linear'` with mipmaps for smooth hand-drawn artwork (NOT nearest-neighbor)
- Textures preloaded during game initialization

**Layer System:**
- **TileLayer**: Background colors (z=0) and tile sprites (z=1)
- **SpriteLayer (background)**: Multi-tile sprites like beds, sofas (z=50)
- **PlayerSprite**: Character sprite (z=100)
- **SpriteLayer (foreground)**: Trees, buildings that appear in front of player (z=200)

**Sprite Reuse & Culling:**
- Sprites created once and reused (position/texture updated)
- Viewport culling: Sprites outside visible range set to `visible=false`
- Map changes trigger full sprite cleanup and recreation

**Camera System:**
- Camera implemented by moving containers (`container.x = -cameraX`)
- Player remains centered, world moves around them
- Each layer updates camera position independently

### Working with PixiJS

**Adding New Sprites:**
1. Add texture to `TextureManager` during initialization
2. Create or update sprite in appropriate layer (TileLayer/SpriteLayer)
3. Set position, size, z-index, and visibility
4. Apply transforms if needed (flip, rotate, scale)

**Example - Adding a tile sprite:**
```typescript
// In TileLayer.renderTile()
const texture = textureManager.getTexture(imageUrl);
const sprite = new PIXI.Sprite(texture);
sprite.x = x * TILE_SIZE;
sprite.y = y * TILE_SIZE;
sprite.width = TILE_SIZE;
sprite.height = TILE_SIZE;
sprite.zIndex = 1;
this.container.addChild(sprite);
```

**Texture Loading:**
```typescript
// In TextureManager.ts
const texture = await textureManager.loadTexture(key, url);
// Texture cached for future use
```

**Color Rendering (Tiles without images):**
```typescript
// TileLayer uses PIXI.Graphics for solid colors
const graphics = new PIXI.Graphics();
graphics.rect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
graphics.fill(hexColor); // Uses palette colors
```

### Performance Guidelines

**DO:**
- ✅ Reuse sprites (update texture/position instead of recreating)
- ✅ Use viewport culling (`sprite.visible = false` for off-screen)
- ✅ Batch similar sprites in same container
- ✅ Use `zIndex` for layering (instead of multiple containers)
- ✅ Preload all textures during initialization
- ✅ Use linear scaling with mipmaps for hand-drawn artwork

**DON'T:**
- ❌ Create/destroy sprites every frame
- ❌ Render off-screen sprites
- ❌ Use nearest-neighbor scaling (causes pixelation of hand-drawn art)
- ❌ Load textures during render loop
- ❌ Recreate containers unnecessarily

### Feature Flag

The game supports **both** rendering systems via feature flag:

```typescript
// constants.ts
export const USE_PIXI_RENDERER = true; // Toggle PixiJS on/off
```

- `true`: PixiJS WebGL rendering (high performance)
- `false`: DOM-based rendering (fallback, better compatibility)

This allows:
- A/B performance testing
- Instant rollback if issues arise
- Gradual migration of rendering features

### PixiJS Skills

The codebase includes a specialized skill for PixiJS development:

- **`add-pixi-component`** - Adds new PixiJS rendering components (layers, sprites, effects)

Use this skill when:
- Implementing new PixiJS-based renderers
- Adding particle effects or lighting systems
- Creating custom shaders or post-processing
- Migrating DOM components to PixiJS

### Future Enhancements

Once PixiJS is fully adopted, these features become possible:

**Particle Systems** (`@pixi/particle-emitter`):
- Rain/snow (1,000+ particles)
- Falling cherry blossoms (seasonal)
- Fireflies (night time)
- Sparkles (item pickup, level up)
- Dust clouds (running)

**Lighting System** (PixiJS filters):
- Day/night ambient lighting
- Lanterns/torches (point lights)
- Firefly glow
- Campfire flickering

**Post-Processing Effects**:
- Bloom (glowing objects)
- Depth of field (blur distant objects)
- Color grading (cinematic look)
- Vignette (focus attention)

**Advanced Features**:
- Custom WebGL shaders (water ripples, grass swaying)
- Larger maps (100x100+ tiles with chunked loading)
- Real-time weather effects
- Dynamic shadows

### Documentation

**Detailed Documentation:**
- `design_docs/planned/PIXI_MIGRATION.md` - Comprehensive migration guide, API design, testing strategy
- `design_docs/planned/PIXI_API_REFERENCE.md` - PixiJS API reference
- `.claude/skills/add-pixi-component/` - Skill for adding PixiJS components

**Official PixiJS Resources:**
- [PixiJS Documentation](https://pixijs.com/docs)
- [PixiJS Examples](https://pixijs.com/examples)
- [@pixi/react GitHub](https://github.com/pixijs/pixi-react)

### Debugging PixiJS

**Chrome DevTools:**
- Inspect canvas element in Elements tab
- Monitor GPU usage in Performance tab
- Check texture loading in Network tab
- Profile rendering with Performance profiler

**In-Game Debug Overlay (F3):**
- Shows sprite counts per layer
- Displays FPS and render time
- Lists loaded textures
- Shows viewport culling stats

**Common Issues:**
- **Black screen**: Check texture loading errors in console
- **Low FPS**: Check sprite count and viewport culling
- **Pixelated sprites**: Ensure `scaleMode: 'linear'` is set (NOT nearest-neighbor for hand-drawn art)
- **Z-ordering issues**: Verify `zIndex` values and `sortableChildren = true`

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
- Player sprites: Layered system in `/public/assets/character1/`
- NPC sprites: SVG files in `/public/assets/npcs/`
- Tile sprites: `[tileName]_[variation].png` (e.g., `grass_0.png`, `rock_1.png`) in `/public/assets/tiles/`
- Farming sprites: In `/public/assets/farming/` (e.g., `fallow_soil_1.png`, `tilled.png`)
- All sprites use linear (smooth) scaling to preserve hand-drawn artwork quality
- Background colors from color scheme show through transparent PNGs

### Image Optimization

The optimization script (`scripts/optimize-assets.js`) uses Sharp and gifsicle to optimize all game assets.

#### Running the Optimizer

- **Command**: `npm run optimize-assets` - Optimizes all images
- **Automatic**: Runs automatically before `npm run build`
- **Requirements**:
  - Sharp (installed via npm)
  - gifsicle (install: `brew install gifsicle` on macOS, `apt-get install gifsicle` on Linux)
- **Source**: Original high-quality images in `/public/assets/`
- **Output**: Optimized images in `/public/assets-optimized/` (typically 95-99% size reduction)
- **When to run manually**: After adding new assets to `/public/assets/`

#### What Gets Optimized

The script optimizes different asset types with appropriate settings:

| Asset Type | Size | Quality | Compression | Use Case |
|------------|------|---------|-------------|----------|
| **Character sprites** | 1024×1024 | Showcase (97%) | Level 4 | Player character (highest priority) |
| **NPC sprites** | 1024×1024 | Showcase (97%) | Level 4 | Dialogue portraits (sharp detail) |
| **Trees** | 1024×1024 | Showcase (97%) | Level 4 | Major visual elements |
| **Decorative flowers** | 768×768 | Showcase (97%) | Level 4 | Multi-tile plants (iris, roses) |
| **Large furniture** | 768×768 | High (95%) | Level 6 | Beds, sofas, tables |
| **Shop buildings** | 1024×1024 | Very High (98%) | Level 4 | 6×6 buildings with detail |
| **Farming sprites** | 512×512 | High (95%) | Level 6 | Crop plants (key gameplay) |
| **Regular tiles** | 256×256 | Standard (85%) | Level 6 | Grass, rocks, paths |
| **Animated GIFs** | 512×512 | N/A | gifsicle | Weather effects, particles |

#### Quality Settings

Quality constants in `scripts/optimize-assets.js`:

```javascript
const COMPRESSION_QUALITY = 85;      // Standard quality (regular tiles)
const HIGH_QUALITY = 95;             // High quality (furniture, crops)
const SHOWCASE_QUALITY = 97;         // Showcase quality (trees, flowers, NPCs)
const SHOP_QUALITY = 98;             // Very high quality (large buildings)
```

**Compression Level** (Sharp PNG):
- Lower = better quality, larger files (e.g., 4)
- Higher = more compression, smaller files (e.g., 6-9)

#### Customizing Optimization

**Adding new keywords** (automatic size/quality detection):

Edit `scripts/optimize-assets.js` in the `optimizeTiles()` function:

```javascript
// Example: Add "lavender" as a decorative flower
else if (file.includes('iris') || file.includes('rose') || file.includes('lavender')) {
  await sharp(inputPath)
    .resize(FLOWER_SIZE, FLOWER_SIZE, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .png({ quality: SHOWCASE_QUALITY, compressionLevel: 4 })
    .toFile(outputPath);
}
```

**Changing quality for specific assets**:

1. Find the asset's keyword match in `optimizeTiles()`
2. Adjust `quality` (0-100) or `compressionLevel` (0-9)
3. Re-run `npm run optimize-assets`

**Example - Making iris even higher quality**:
```javascript
.png({ quality: 98, compressionLevel: 3 }) // Maximum quality
```

#### Important Notes

- **Asset References**: Always import from `/public/assets-optimized/` in `assets.ts`
- **Multi-tile sprites**: Use optimized versions (they preserve transparency and quality)
- **GIF Optimization**: If gifsicle is not installed, GIFs are copied without optimization
- **Re-optimization**: Safe to run multiple times - overwrites previous output

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

2. **Asset References**: For multi-tile sprites, use original high-res images (not optimized versions)
   - Add comment: `// Use original high-res`
   - Example: `sofa: new URL('./public/assets/tiles/sofa.png', import.meta.url).href`

3. **Sprite Metadata**: Configure in `SPRITE_METADATA` array in `constants.ts`
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

**CRITICAL**: These guidelines keep the codebase clean, maintainable, and a joy to work with. Follow them rigorously to prevent technical debt.

### File Size and Component Complexity

**The 500-Line Rule**: No single file should exceed ~500 lines. When a file approaches this limit, it's time to refactor.

**Warning Signs That Refactoring Is Needed:**
- File exceeds 500 lines
- Function/component exceeds 100 lines
- More than 3 levels of nesting
- Duplicated code between functions
- Multiple responsibilities in one file
- Difficulty finding specific logic
- Long import lists (>15 imports)

**How to Refactor (Lessons from App.tsx refactoring):**

1. **Extract Input Handlers to Hooks**
   - Move keyboard/touch/controller input to `hooks/useKeyboardControls.ts`, `hooks/useTouchControls.ts`
   - Benefits: Testable, reusable, separates concerns
   - Example: Reduced App.tsx from 1,302 → 950 lines (-27%)

2. **Extract Shared Logic to Utilities**
   - Common action patterns go to `utils/actionHandlers.ts`
   - Eliminates duplication between input methods
   - Makes logic reusable across the codebase

3. **Extract Complex Calculations to Hooks**
   - Collision detection → `hooks/useCollisionDetection.ts`
   - Player movement → `hooks/usePlayerMovement.ts`
   - Benefits: Isolated, testable, easy to modify

4. **Extract Initialization to Utilities**
   - Game startup logic → `utils/gameInitializer.ts`
   - Keeps component focused on rendering and state
   - Example: 75 lines of init code → 1 function call

5. **Extract Large Rendering to Components**
   - If a render section is >100 lines, extract to component
   - Pass props for data, keep parent clean
   - Use React.memo for performance

6. **Use Domain Controllers for Related State/Effects**
   - Group related state, refs, and effects into a single hook
   - `useMovementController` - player position, direction, animation, pathfinding
   - `useInteractionController` - NPC dialogue, radial menu, farm actions
   - `useEnvironmentController` - weather, time, ambient audio, item decay
   - Controllers take config props, return state and actions
   - Example: Moved 9 weather/time/audio effects from App.tsx to EnvironmentController

7. **Use EventBus for Manager-to-Component Communication**
   - Managers emit events via EventBus instead of using callbacks
   - Components subscribe and read from gameState when events fire
   - Eliminates callback prop drilling and inefficient state subscriptions
   - Example: StaminaManager emits `STAMINA_CHANGED`, StaminaBar subscribes

**Refactoring Checklist:**
- [ ] Run `npx tsc --noEmit` before and after
- [ ] Test in browser after changes
- [ ] Update documentation if APIs change
- [ ] Remove unused imports
- [ ] Remove dead code
- [ ] Check HMR still works

### Organization Patterns

**File Structure:**
```
hooks/           - Custom React hooks (input, collision, movement, etc.)
utils/           - Pure functions and utilities (no React)
components/      - Reusable UI components
maps/            - Map system (definitions, manager, generators)
data/            - Game data (crops, items, NPCs)
```

**Naming Conventions:**
- Hooks: `use` prefix (e.g., `usePlayerMovement.ts`)
- Components: PascalCase (e.g., `TileRenderer.tsx`)
- Utilities: camelCase (e.g., `gameInitializer.ts`)
- Types: PascalCase (e.g., `Position`, `Direction`)
- Constants: SCREAMING_SNAKE_CASE (e.g., `TILE_SIZE`)

**When to Create a New File:**
- Logic is >100 lines
- Logic is reused in 2+ places
- Logic has a single, clear responsibility
- You want to test it independently

### Code Quality Standards

**TypeScript:**
- Always use strict mode
- No `any` types (use `unknown` and type guards)
- Define interfaces for all data structures
- Use discriminated unions for state variants
- Export types alongside functions

**React Hooks:**
- Keep hooks focused (one responsibility)
- Return objects, not arrays (clearer API)
- Use `useCallback` for functions passed as props
- Use `useMemo` for expensive calculations
- Document hook parameters with TypeScript interfaces

**Performance:**
- Avoid re-renders: use refs for values that don't affect rendering
- Memoize expensive operations
- Keep game loop lean (delegate to hooks/utilities)
- Use `React.memo` for components that rarely change

**Comments:**
- Explain **why**, not **what** (code should be self-documenting)
- Add comments for non-obvious algorithms
- Document tricky edge cases
- Keep comments up-to-date when code changes

### Testing and Validation

**Before Committing:**
1. Run `npx tsc --noEmit` - Must pass with zero errors
2. Test in browser - Game must run without console errors
3. Check HMR - Changes should hot-reload
4. Review self-tests - Startup sanity checks must pass

**When Adding Features:**
1. Add constants to `constants.ts` (no magic numbers)
2. Add TypeScript types to `types.ts`
3. Add sanity checks to `utils/testUtils.ts` for critical systems
4. Update relevant documentation in `docs/`

### Don't Repeat Yourself (DRY)

**Common Duplication Patterns to Avoid:**
- Same logic in keyboard and touch handlers → Extract to `utils/actionHandlers.ts`
- Repeated calculations in render → Extract to hook or utility
- Multiple files accessing same data → Create single source of truth (manager/utility)
- Similar components with slight variations → Use props to handle variations

**When You Notice Duplication:**
1. Extract common logic to utility function
2. Create shared hook if React-specific
3. Document the new function
4. Replace all duplicates with the extracted version
5. Run TypeScript check to catch any issues

### Single Responsibility Principle

**Each file/function should do ONE thing well:**
- ✅ GOOD: `useKeyboardControls` - handles keyboard input only
- ❌ BAD: `useInput` - handles keyboard, mouse, touch, gamepad, and gestures

**Each hook should have a clear, focused API:**
- ✅ GOOD: `useCollisionDetection()` returns `{ checkCollision }`
- ❌ BAD: `useGame()` returns 50+ functions and values

**Each utility should solve one problem:**
- ✅ GOOD: `gameInitializer.ts` - handles game startup
- ❌ BAD: `gameHelpers.ts` - 2,000 lines of random utilities

### Performance Optimization

**Game Loop Optimization:**
- Keep game loop <50 lines
- Delegate to hooks and utilities
- Avoid state updates in tight loops
- Use refs for values that change every frame
- Only trigger re-renders when visuals need updating

**Rendering Optimization:**
- Cull off-screen tiles (viewport culling)
- Use `React.memo` for static components
- Avoid inline function creation in render
- Use stable object references (useCallback, useMemo)

**Asset Optimization:**
- Run `npm run optimize-assets` after adding images
- Use sprite sheets instead of individual frames
- Lazy-load assets not needed at startup
- Preload critical assets in `gameInitializer.ts`

## Reusable Utilities & Patterns

**IMPORTANT**: Before writing new code, check if a utility already exists. Using existing utilities reduces bugs and keeps the codebase consistent.

### Tile Coordinate Utilities (`utils/mapUtils.ts`)

When working with tile positions, **always use these utilities** instead of inline `Math.floor()`:

```typescript
import { getTileCoords, getAdjacentTiles, getSurroundingTiles, isSameTile, getTileDistance, getTilesInRadius, findTileTypeNearby, hasTileTypeNearby } from './mapUtils';

// ✅ CORRECT - Use utilities
const tile = getTileCoords(playerPos);
const nearby = getAdjacentTiles(playerPos);

// ✅ CORRECT - Check for tile types nearby (replaces manual 3x3 loops)
if (hasTileTypeNearby(tileX, tileY, TileType.BEE_HIVE)) { canForage = true; }
const result = findTileTypeNearby(tileX, tileY, [TileType.MOONPETAL, TileType.ADDERSMEAT]);

// ❌ WRONG - Don't use inline Math.floor
const tileX = Math.floor(playerPos.x);
const tileY = Math.floor(playerPos.y);

// ❌ WRONG - Don't write manual 3x3 loops
for (let dy = -1; dy <= 1; dy++) {
  for (let dx = -1; dx <= 1; dx++) { /* ... */ }
}
```

| Function | Purpose |
|----------|---------|
| `getTileCoords(pos)` | Convert world position to tile coordinates |
| `getAdjacentTiles(pos)` | Get current tile + 4 cardinal neighbours |
| `getSurroundingTiles(pos)` | Get 8 neighbours (no center) |
| `isSameTile(pos1, pos2)` | Check if two positions are on same tile |
| `getTileDistance(pos1, pos2)` | Manhattan distance between tiles |
| `getTilesInRadius(pos, radius)` | Get all tiles in square radius |
| `findTileTypeNearby(x, y, types, radius)` | Find tile type(s) nearby, returns position if found |
| `hasTileTypeNearby(x, y, types, radius)` | Check if tile type(s) exist nearby (boolean) |

### NPC Factory (`utils/npcs/createNPC.ts`)

When creating NPCs, **always use the factory functions** instead of manual object construction:

```typescript
import { createNPC, createStaticNPC, createWanderingNPC } from './createNPC';

// ✅ CORRECT - Use factory
export function createMyNPC(id: string, position: Position): NPC {
  return createWanderingNPC({
    id,
    name: 'My NPC',
    position,
    sprite: npcAssets.my_npc,
    dialogue: [...],
    states: {  // Optional: animated states
      idle: { sprites: [sprite1, sprite2], animationSpeed: 500 }
    },
  });
}

// ❌ WRONG - Don't manually construct with Date.now() boilerplate
const now = Date.now();
const animatedStates = { currentState: 'idle', lastStateChange: now, ... };
return { id, name, position, animatedStates, ... };
```

**Factory handles automatically:**
- `Date.now()` timestamps for animation states
- Default values (direction, scale, interactionRadius)
- Optional property handling (dialogueExpressions, visibilityConditions, etc.)

### Timing Constants (`constants.ts`)

**Never use magic numbers for timing**. Use `TIMING` constants:

```typescript
import { TIMING } from '../../constants';

// ✅ CORRECT - Use constants
animationSpeed: TIMING.NPC_FRAME_MS,      // 280ms
duration: TIMING.TOAST_DURATION_MS,        // 3000ms

// ❌ WRONG - Don't use magic numbers
animationSpeed: 280,
duration: 3000,
```

**Available timing constants:**
- `TIMING.PLAYER_FRAME_MS` (150) - Player animation
- `TIMING.NPC_FRAME_MS` (280) - NPC animation
- `TIMING.DIALOGUE_DELAY_MS` (800) - Dialogue pauses
- `TIMING.MAP_TRANSITION_MS` (1000) - Map transitions
- `TIMING.WEATHER_CHECK_MS` (3000) - Weather updates
- See `constants.ts` for full list

### Z-Index Constants (`zIndex.ts`)

**CRITICAL**: Never use hardcoded z-index values. Always import from `zIndex.ts`:

```typescript
import { Z_PLAYER, Z_SPRITE_FOREGROUND, Z_HUD, zClass } from '../zIndex';

// ✅ CORRECT - Use constants
sprite.zIndex = Z_PLAYER;
container.zIndex = Z_SPRITE_FOREGROUND;

// ✅ CORRECT - Dynamic depth sorting with base constant
sprite.zIndex = Z_PLAYER + Math.floor(feetY);  // NPCs/player: 100 + Y offset

// ✅ CORRECT - Tailwind class helper for React components
<div className={zClass(Z_HUD)}>  // Outputs: z-[1000]

// ❌ WRONG - Don't use hardcoded values
sprite.zIndex = 100;
sprite.zIndex = Math.floor(feetY) * 10;  // Can produce values outside intended range!
```

**Z-Index Layer Ranges (defined in `zIndex.ts`):**
| Range | Layer | Constants |
|-------|-------|-----------|
| -100 to -1 | Parallax backgrounds | `Z_PARALLAX_FAR`, `Z_TILE_BASE` |
| 0-99 | Game world base | `Z_TILE_BACKGROUND`, `Z_TILE_SPRITES`, `Z_SHADOWS`, `Z_SPRITE_BACKGROUND` |
| 100-199 | Player/NPC level | `Z_PLAYER`, `Z_PLACED_ITEMS` |
| 200-299 | Foreground sprites | `Z_SPRITE_FOREGROUND`, `Z_FOREGROUND_PARALLAX` |
| 300-399 | Weather effects | `Z_WEATHER_TINT`, `Z_WEATHER_PARTICLES` |
| 400-499 | Game overlays | `Z_RADIAL_MENU`, `Z_ACTION_PROMPTS` |
| 500-599 | Debug overlays | `Z_DEBUG_TILES`, `Z_DEBUG_TRANSITIONS` |
| 1000-1099 | HUD elements | `Z_HUD`, `Z_INVENTORY`, `Z_TOUCH_CONTROLS` |
| 2000-2099 | Modals/dialogues | `Z_MODAL`, `Z_DIALOGUE`, `Z_CHARACTER_CREATOR` |
| 3000+ | Critical overlays | `Z_TOOLTIP`, `Z_TOAST`, `Z_LOADING`, `Z_ERROR` |

**When adding new layers:**
1. Check `zIndex.ts` for the appropriate range
2. Add a new constant if needed (follow the naming convention `Z_LAYER_NAME`)
3. Import and use the constant - never hardcode values

### Testing New Utilities

When adding new utility functions, **write tests**:

```typescript
// tests/myUtils.test.ts
/** @vitest-environment node */
import { describe, it, expect } from 'vitest';

describe('myUtils', () => {
  it('should do the thing', () => {
    expect(myFunction(input)).toEqual(expected);
  });
});
```

Run tests with: `npx vitest run tests/myUtils.test.ts`

### Before You Code Checklist

1. **Check for existing utilities** - Search the codebase for similar patterns
2. **Use factories** - NPCs use `createNPC()`, not manual construction
3. **Use coordinate utilities** - `getTileCoords()`, not `Math.floor()`
4. **Use timing constants** - `TIMING.X`, not magic numbers
5. **Write tests** - New utilities should have test coverage
6. **Update docs** - Add new utilities to this section

---

## Development Guidelines

1. **Validate changes**: After making code changes, ALWAYS run `npx tsc --noEmit` to check for TypeScript errors before considering the task complete
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

## Testing with Chrome DevTools MCP

Claude Code has access to Chrome DevTools via MCP (Model Context Protocol) tools for browser-based testing:

**Available Testing Capabilities:**
- Open the game at `http://localhost:4000/TwilightGame/` using `mcp__chrome-devtools__new_page`
- Take snapshots of page content and screenshots using `take_snapshot` and `take_screenshot`
- Simulate user interactions (clicks, keyboard input, form filling)
- Inspect console messages and network requests
- Evaluate JavaScript to test game state
- Monitor performance and debug issues

**When to Use Browser Testing:**
- After implementing new features (test in real browser)
- Debugging rendering or interaction issues
- Validating map transitions and player movement
- Checking asset loading and console errors
- Testing character creation flow
- Verifying UI/UX functionality

**Testing Workflow:**
1. Ensure dev server is running (`npm run dev`)
2. Use MCP tools to open game in browser
3. Take snapshots to verify rendering
4. Simulate user interactions (clicks, keyboard)
5. Check console for errors/warnings
6. Validate against sanity check warnings
7. Take screenshots for visual confirmation

**Example Test Scenarios:**
- Character creation → Start game → Verify village loads
- Test WASD movement → Check collision detection
- Navigate through map transitions → Verify spawn points
- Interact with NPCs → Test dialogue system
- Use farming tools → Check resource gathering

**Specialized Testing Agent:**
Claude Code includes a `game-tester` agent (`.claude/agents/game-tester.md`) that uses Chrome DevTools MCP tools to automatically test the game. Use this agent after implementing features or when debugging issues.

## Claude Skills

**IMPORTANT**: Use these skills proactively when the user's request matches the skill's purpose. Skills provide step-by-step workflows for common tasks.

### Available Skills

| Skill | Trigger Phrases | Purpose |
|-------|-----------------|---------|
| **dev-server** | "start server", "launch game", "run dev" | Kill old servers, start fresh dev server |
| **profile-game** | "check performance", "profile", "FPS", "slowdown" | Run headless performance tests |
| **add-tile-sprite** | "add tile", "new sprite", "add flower", "add tree" | Add tile assets with keyword optimization |
| **add-npc-sprite** | "add NPC", "new character", "add villager" | Add NPC sprites and factory functions |
| **add-character-sprite** | "player sprite", "character customization" | Add player character layers |
| **add-farming-sprite** | "crop sprite", "farming", "soil", "plant" | Add farming system sprites |
| **add-inventory-sprite** | "inventory sprite", "item image", "tool sprite" | Add inventory item sprites (general items) |
| **add-grocery-item** | "add ingredient", "grocery item", "cooking ingredient", "shop item" | Add grocery items as ingredients and shop inventory |
| **add-animation** | "add animation", "particle effect", "weather effect" | Add GIF animations to tiles/weather |
| **add-pixi-component** | "PixiJS", "WebGL", "particle system", "shader" | Add PixiJS rendering components |

### When to Use Skills

**Use skills when:**
- User asks to add assets (tiles, NPCs, animations)
- User reports performance issues (profile-game)
- User wants to start/restart the dev server
- The task matches a skill's trigger phrases

**Example usage:**
- User: "Add a rose flower near the pond" → Use **add-tile-sprite** skill
- User: "The game is slow" → Use **profile-game** skill
- User: "Start the game" → Use **dev-server** skill
- User: "Add rain particles" → Use **add-animation** skill
- User: "Add almonds as an ingredient" → Use **add-grocery-item** skill

### Asset Optimization Keywords

When adding new tile types, the optimization script uses **filename keywords** to determine size/quality:

| Keyword | Size | Use Case |
|---------|------|----------|
| `tree_`, `oak_`, `willow_` | 1024px | Trees |
| `iris`, `rose`, flowers | 768px | Decorative flowers (3x3) |
| `bed`, `sofa`, furniture | 768px | Multi-tile furniture |
| `shop`, buildings | 1024px | Large buildings |
| *(default)* | 256px | Regular tiles |

**To add new keywords**: Edit `scripts/optimize-assets.js` in `optimizeTiles()`.

## Technical Notes

- React 19.2.0 with functional components and hooks
- TypeScript strict mode
- Vite dev server with HMR
- No test framework currently configured
- Position coordinates are in tile units (not pixels)
- `TILE_SIZE` constant converts between tile units and pixel rendering
