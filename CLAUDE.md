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

- `App.tsx` - Main game loop, player movement, collision detection, rendering, camera system, map transitions
- `constants.ts` - Game constants (`TILE_SIZE`, `PLAYER_SIZE`), tile legend with all tile types
- `types.ts` - TypeScript types including `TileType`, `Position`, `Direction`, `MapDefinition`, `Transition`, `ColorScheme`
- `utils/mapUtils.ts` - Tile data access via MapManager
- `utils/testUtils.ts` - Startup sanity checks

### Map System (`maps/`)

- `maps/MapManager.ts` - **Single source of truth** for all map data, transitions, and current map state
- `maps/index.ts` - Map registry, initialization, handles RANDOM_* map generation
- `maps/gridParser.ts` - Converts character-based grid strings to TileType arrays
- `maps/colorSchemes.ts` - Color scheme definitions for different map themes
- `maps/procedural.ts` - Random map generators (forest, cave, shop)
- `maps/definitions/` - Designed map files (homeInterior, village, etc.)

### Components

- `components/HUD.tsx` - Heads-up display
- `components/DebugOverlay.tsx` - Debug information (toggle with F3)
- `components/DebugInfoPanel.tsx` - Debug panel component
- `components/Modal.tsx` - Modal component

### Game Systems

**Player System** (`App.tsx:9-106`):
- Movement: WASD/Arrow keys, normalized diagonal movement at `PLAYER_SPEED` (0.1 tiles/frame)
- Animation: 4-frame walk cycle per direction (frame 0 = idle), controlled by `ANIMATION_SPEED_MS` (150ms)
- Collision: Checks all tiles within player bounding box using `getTileData()`, independent X/Y axis collision

**Map System** (`maps/MapManager.ts`):
- Manages multiple maps (both designed and procedurally generated)
- Handles map transitions when player steps on transition tiles
- Applies color schemes dynamically per map theme
- Supports both grid-based designed maps (child-friendly) and procedural generation
- Starting map: `home_interior` (small indoor room)
- Hub map: `village` (30x30 outdoor area with multiple exits)
- Random maps: forest, cave, shop (generated on demand with `RANDOM_*` IDs)

**Tile System**:
- 13 tile types: outdoor (grass, rock, water, path), indoor (floor, wall, carpet), transitions (doors), furniture (table, chair)
- Child-friendly grid codes: `G`=grass, `R`=rock, `#`=wall, `F`=floor, `D`=door, etc.
- Color schemes override tile colors per map theme (indoor, village, forest, cave, water_area, shop)
- See `MAP_GUIDE.md` for map creation instructions

**Transition System** (`App.tsx:115-126`):
- Detects when player position matches a transition tile
- Loads target map and teleports player to spawn point
- Supports transitions to specific maps or random map generation
- Each transition defines: from position, tile type, target map ID, spawn point

**Camera System**:
- Follows player with centered viewport
- Clamped to current map boundaries (varies per map)

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
