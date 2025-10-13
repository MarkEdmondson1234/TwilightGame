# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A peaceful top-down exploration and crafting game engine built with React, Vite, and TypeScript. Inspired by Stardew Valley, it features tile-based movement, sprite animation, collision detection, and a procedurally generated map. Currently uses placeholder graphics with support for custom artwork.

## Development Commands

- `npm install` - Install dependencies
- `npm run dev` - Start development server (Vite on port 3000)
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## Core Architecture Principles

### Single Source of Truth (SSoT)

**Critical**: Shared data must have exactly one authoritative location. All code must read from that single source.

- **Map Data**: `utils/mapUtils.ts` exports `getTileData(x, y)` - the ONLY function permitted to read raw `MAP_DATA` and `TILE_LEGEND`
  - Physics engine, renderer, and debug overlays all use this function
  - Never access `MAP_DATA` or `TILE_LEGEND` directly from other files
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

## Code Organization

### Core Files

- `App.tsx` - Main game loop, player movement, collision detection, rendering, camera system
- `constants.ts` - All game constants, tile definitions, player sprites, procedural map generation
- `types.ts` - TypeScript types (`TileType`, `Position`, `Direction`, `TileData`)
- `utils/mapUtils.ts` - Single source of truth for map data access
- `utils/testUtils.ts` - Startup sanity checks

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

**Map System** (`constants.ts:82-123`):
- Procedurally generated 50x30 tile world with rock borders
- Random patches of water (5 patches, 4-8 tiles), paths (8 patches, 3-6 tiles), rocks (20 clusters, 1-3 tiles)
- Fixed interactable locations: Shop Door at (10,10), Mine Entrance at (20,40)
- Supports tile variations for visual diversity

**Camera System** (`App.tsx:126-127`):
- Follows player with centered viewport
- Clamped to map boundaries

## Asset Management

See `ASSETS.md` for complete asset guidelines. Key points:

- Assets go in `/assets/player/` and `/assets/tiles/`
- Player sprites: `[direction]_[frame].png` (e.g., `down_0.png`, `right_2.png`)
- Tile sprites: `[tileName]_[variation].png` (e.g., `grass_0.png`, `rock_1.png`)
- All sprites use `imageRendering: 'pixelated'` for pixel art
- Currently using placeholder URLs from placehold.co

## Development Guidelines

1. **Always run sanity checks** (`runSelfTests()`) after modifying core systems
2. **Never bypass SSoT**: Use `getTileData()` for all map access
3. **Add constants to `constants.ts`**: Never hardcode values
4. **Test new systems**: Add checks to `testUtils.ts` for new features
5. **Preserve game loop**: Player movement uses `requestAnimationFrame` - be careful with state updates
6. **Follow existing patterns**: Independent X/Y collision, deterministic tile variation selection

## Technical Notes

- React 19.2.0 with functional components and hooks
- TypeScript strict mode
- Vite dev server with HMR
- No test framework currently configured
- Position coordinates are in tile units (not pixels)
- `TILE_SIZE` constant converts between tile units and pixel rendering
