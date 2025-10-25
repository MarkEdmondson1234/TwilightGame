# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A peaceful top-down exploration and crafting game engine built with React, Vite, and TypeScript. Inspired by Stardew Valley, it features tile-based movement, sprite animation, collision detection, and a **multi-map system** supporting both designed and procedurally generated maps with transitions. Currently uses placeholder graphics with support for custom artwork.

## Language and Localisation

**IMPORTANT**: This game uses **British English** exclusively.

- Use "mum" not "mom"
- Use "colour" not "color" (in dialogue/UI text, not code)
- Use "traveller" not "traveler"
- Use "favourite" not "favorite"
- Avoid Americanisms like "wanna", "gonna", "gotta"
- When writing dialogue, use proper British spelling and phrasing

This applies to all user-facing text including: dialogue, item descriptions, UI labels, and documentation.

## Development Commands

- `npm install` - Install dependencies
- `npm run dev` - Start development server (Vite on port 3000)
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
- **Future Systems**: When adding inventory, crafting, NPCs, etc., create a single authoritative manager/utility for that data

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

## Documentation

Detailed documentation is located in the [`docs/`](docs/) folder:
- [`docs/MAP_GUIDE.md`](docs/MAP_GUIDE.md) - Map creation guide
- [`docs/ASSETS.md`](docs/ASSETS.md) - Asset management and guidelines
- [`docs/FARMING.md`](docs/FARMING.md) - Farming system documentation
- [`docs/TIME_SYSTEM.md`](docs/TIME_SYSTEM.md) - Time/calendar system (seasons, days, years)
- [`docs/COORDINATE_GUIDE.md`](docs/COORDINATE_GUIDE.md) - Position system reference

**In-Game Help Browser**: Press **F1** while playing to access all documentation in a browsable interface with markdown rendering.

## Code Organization

### Core Files

- `App.tsx` - Main component: rendering, camera system, game loop orchestration (771 lines)
- `constants.ts` - Game constants (`TILE_SIZE`, `PLAYER_SIZE`), tile legend with all tile types
- `types.ts` - TypeScript types including `TileType`, `Position`, `Direction`, `MapDefinition`, `Transition`, `ColorScheme`

### Hooks (`hooks/`)

Custom React hooks for game systems:

- `hooks/useKeyboardControls.ts` - Keyboard input handling (F-keys, WASD, E, R, tool switching)
- `hooks/useTouchControls.ts` - Touch control handling (direction pad, action button)
- `hooks/useCollisionDetection.ts` - Player collision detection (tiles and multi-tile sprites)
- `hooks/usePlayerMovement.ts` - Player movement logic (input processing, animation, position updates)
- `hooks/useTouchDevice.ts` - Touch device detection

### Utilities (`utils/`)

Pure functions and game systems:

- `utils/gameInitializer.ts` - Game startup (palette, maps, assets, inventory, farm plots)
- `utils/actionHandlers.ts` - Shared action logic (mirror, NPC, transition, farming interactions)
- `utils/mapUtils.ts` - Tile data access via MapManager
- `utils/testUtils.ts` - Startup sanity checks
- `utils/tileRenderUtils.ts` - Tile transform calculations
- `utils/farmManager.ts` - Farm plot management
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
- `components/DebugOverlay.tsx` - Debug information (toggle with F3)
- `components/DebugInfoPanel.tsx` - Debug panel component
- `components/CharacterCreator.tsx` - Character customization UI
- `components/DialogueBox.tsx` - NPC dialogue display
- `components/ColorSchemeEditor.tsx` - Runtime color scheme editing
- `components/HelpBrowser.tsx` - In-game documentation browser (F1)
- `components/Modal.tsx` - Modal component

### Game Systems

**Input System** (`hooks/useKeyboardControls.ts`, `hooks/useTouchControls.ts`):
- Keyboard: WASD/arrows for movement, E/Enter for actions, F-keys for UI, 1-9 for tools/seeds
- Touch: On-screen D-pad and action button for mobile devices
- Shared action handlers in `utils/actionHandlers.ts` eliminate code duplication
- Architecture: Input hooks → Action handlers → Game state updates

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
- All sprites use `imageRendering: 'pixelated'` for pixel art
- Background colors from color scheme show through transparent PNGs

### Image Optimization

- **Script**: `npm run optimize-assets` - Uses Sharp to optimize all images
- **Source**: Original high-quality images in `/public/assets/`
- **Output**: Optimized images in `/public/assets-optimized/` (typically 95-99% size reduction)
- **Automatic**: Optimization runs automatically before `npm run build`
- **Asset References**: Always import from optimized versions in `assets.ts` when available
- **What it optimizes**:
  - Character sprite sheets (combines multiple frames into single sheets)
  - Tile images (resizes to 64x64, optimizes compression)
  - NPC sprites (optimizes SVGs or PNGs)
- **When to run manually**: After adding new assets to `/public/assets/`
- **Exception for multi-tile sprites**: Large furniture sprites (beds, sofas) should use original high-res images to avoid distortion from 64x64 resize

### Multi-Tile Sprite Guidelines

Multi-tile sprites (furniture, large objects) require special handling:

1. **Single Anchor Point**: Use only ONE grid character (e.g., `@` for sofa) in map definitions
   - ❌ WRONG: `@@@` creates 3 duplicate overlapping sprites
   - ✅ CORRECT: `@` single anchor automatically renders full 3-tile wide sprite

2. **Asset References**: For multi-tile sprites, use original high-res images (not optimized versions)
   - Add comment: `// Use original high-res`
   - Example: `sofa: new URL('./public/assets/tiles/sofa.png', import.meta.url).href`

3. **Sprite Metadata**: Configure in `SPRITE_METADATA` array in `constants.ts`
   - Set dimensions to match natural aspect ratio (don't distort image)
   - Use `isForeground: false` to avoid CSS transforms (renders in clean background layer)
   - Set collision boxes separately from visual dimensions

4. **Example Setup**:
   ```typescript
   // Sofa: 2732x2048 image → 3 tiles wide × 2.25 tiles tall (preserves aspect ratio)
   {
     tileType: TileType.SOFA,
     spriteWidth: 3, spriteHeight: 2.25,  // Visual size (natural ratio)
     offsetX: 0, offsetY: -1.25,
     image: tileAssets.sofa,
     isForeground: false,  // No CSS transforms
     collisionWidth: 3, collisionHeight: 1,  // Functional collision area
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
10. **Watch file sizes**: Refactor files that exceed 500 lines (see Code Maintenance Guidelines above)
11. **Extract, don't expand**: When adding features, create new focused files rather than growing existing ones

## Testing with Chrome DevTools MCP

Claude Code has access to Chrome DevTools via MCP (Model Context Protocol) tools for browser-based testing:

**Available Testing Capabilities:**
- Open the game at `http://localhost:3000` using `mcp__chrome-devtools__new_page`
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

## Technical Notes

- React 19.2.0 with functional components and hooks
- TypeScript strict mode
- Vite dev server with HMR
- No test framework currently configured
- Position coordinates are in tile units (not pixels)
- `TILE_SIZE` constant converts between tile units and pixel rendering
