# AI Maintainability Improvements

This document tracks changes to make the codebase easier for AI assistants to maintain, reducing bugs and improving feature development speed.

## Overview

**Goal**: Reduce cognitive load when navigating the codebase, eliminate type holes, centralise common patterns, and improve test coverage.

**Priority**: Critical > High > Medium

## Critical Priority

### 1. App.tsx Decomposition (1,591 lines → ~500 lines)

**Problem**: App.tsx is 3x over the 500-line guideline with 34 `useState` calls and 75+ hooks. Finding specific logic requires reading through a massive file.

**Current State**:
- Game loop orchestration
- PixiJS initialization and management
- Camera system
- All UI state (modals, dialogs, menus)
- Input coordination
- Map transition handling

**Solution**: Extract to focused hooks:

| New Hook | Responsibility | Est. Lines |
|----------|---------------|------------|
| `hooks/usePixiApp.ts` | PixiJS app lifecycle, stage setup | ~150 |
| `hooks/useCamera.ts` | Camera position, viewport bounds, culling | ~100 |
| `hooks/useGameLoop.ts` | RAF loop, delta time, tick dispatch | ~80 |
| `hooks/useUIState.ts` | Modal, dialog, menu state management | ~120 |
| `hooks/useMapTransition.ts` | Map loading, transition animations | ~100 |

**Files to modify**:
- `App.tsx` - Extract logic, keep as orchestrator
- Create 5 new hook files

**Verification**:
- `npx tsc --noEmit` passes
- Game runs without console errors
- HMR still works

---

### 2. Eliminate `any` Types (10 occurrences)

**Problem**: Each `any` is a potential runtime bug that TypeScript can't catch.

| File | Line | Current | Fix |
|------|------|---------|-----|
| `GameState.ts` | 88 | `[schemeName: string]: any` | Import `ColorScheme` type properly |
| `GameState.ts` | 216-218 | `item: any` | Use `InventoryItem` type |
| `GameState.ts` | 590 | `scheme: any` | Use `ColorScheme` type |
| `MapManager.ts` | 207 | `transition: any` | Use `Transition` type |
| `WeatherManager.ts` | 31, 35 | `gameState: any` | Create `IGameState` interface |
| `actionHandlers.ts` | 604 | `data?: any` | Define `InteractionData` type |
| `TileLayer.ts` | 527 | `tileData: any` | Use `TileData` type |

**Solution for circular imports** (GameState ↔ ColorScheme):
```typescript
// types/gameState.ts
export interface IGameState {
  getCurrentMapId(): string;
  getCustomColorSchemes(): Record<string, ColorScheme>;
  // ... other methods used externally
}
```

---

### 3. Extract Tile Coordinate Utilities

**Problem**: Same tile coordinate patterns repeated in 4+ files:
```typescript
// Appears everywhere:
const playerTileX = Math.floor(playerPos.x);
const playerTileY = Math.floor(playerPos.y);

// Adjacent tiles calculation duplicated:
const adjacentTiles = [
  { x: playerTileX, y: playerTileY },
  { x: playerTileX - 1, y: playerTileY },
  { x: playerTileX + 1, y: playerTileY },
  { x: playerTileX, y: playerTileY - 1 },
  { x: playerTileX, y: playerTileY + 1 },
];
```

**Solution**: Add to `utils/mapUtils.ts`:
```typescript
/**
 * Convert world position to tile coordinates
 */
export function getTileCoords(pos: Position): Position {
  return {
    x: Math.floor(pos.x),
    y: Math.floor(pos.y),
  };
}

/**
 * Get adjacent tiles (including current position)
 * Returns: [current, left, right, up, down]
 */
export function getAdjacentTiles(pos: Position): Position[] {
  const tile = getTileCoords(pos);
  return [
    tile,
    { x: tile.x - 1, y: tile.y },
    { x: tile.x + 1, y: tile.y },
    { x: tile.x, y: tile.y - 1 },
    { x: tile.x, y: tile.y + 1 },
  ];
}

/**
 * Get tiles in a radius (for area effects)
 */
export function getTilesInRadius(center: Position, radius: number): Position[] {
  const tiles: Position[] = [];
  const centerTile = getTileCoords(center);
  for (let dx = -radius; dx <= radius; dx++) {
    for (let dy = -radius; dy <= radius; dy++) {
      tiles.push({ x: centerTile.x + dx, y: centerTile.y + dy });
    }
  }
  return tiles;
}
```

**Files to update**:
- `utils/actionHandlers.ts` (2+ occurrences)
- `utils/farmManager.ts`
- `components/DebugInfoPanel.tsx`
- `utils/positionValidator.ts`

---

## High Priority

### 4. Centralise Animation Timing Constants

**Problem**: Magic numbers for timing scattered across files:
```typescript
// Found in multiple files:
280   // NPC frame duration (forestNPCs, villageNPCs)
800   // Dialogue delay
1000  // Transition duration
3000  // Weather check interval
10000 // Various timeouts
150   // Player animation frame
```

**Solution**: Add to `constants.ts`:
```typescript
/**
 * Animation and timing constants (in milliseconds)
 */
export const TIMING = {
  // Player
  PLAYER_FRAME_MS: 150,

  // NPCs
  NPC_FRAME_MS: 280,
  NPC_IDLE_DELAY_MS: 800,

  // UI
  DIALOGUE_DELAY_MS: 800,
  TOAST_DURATION_MS: 3000,
  MODAL_TRANSITION_MS: 200,

  // Game systems
  MAP_TRANSITION_MS: 1000,
  WEATHER_CHECK_MS: 3000,
  AUTOSAVE_INTERVAL_MS: 60000,

  // Farming
  WATER_ANIMATION_MS: 500,
  HARVEST_ANIMATION_MS: 300,
} as const;
```

**Files to update**: Search for these numbers and replace with constants.

---

### 5. NPC Factory Base Template

**Problem**: 2,027 lines across 3 NPC files with repeated patterns:
- `utils/npcs/forestNPCs.ts` (1,007 lines)
- `utils/npcs/villageNPCs.ts` (734 lines)
- `utils/npcs/homeNPCs.ts` (286 lines)

**Solution**: Create `utils/npcs/createNPC.ts`:
```typescript
export interface NPCConfig {
  id: string;
  name: string;
  position: Position;
  spriteSheet: string;
  frameCount: number;
  dialogueLines: string[];
  movementPattern?: 'stationary' | 'wander' | 'patrol';
  patrolPath?: Position[];
}

export function createNPC(config: NPCConfig): NPC {
  // Common animation state setup
  // Common sprite configuration
  // Common dialogue structure
  return npc;
}
```

**Expected savings**: ~800-1,000 lines (40-50% reduction)

---

### 6. Improve Test Coverage

**Current state**: 4 test files covering only data transformations

**Missing critical tests**:

| System | Test File | Priority |
|--------|-----------|----------|
| Map transitions | `tests/mapTransitions.test.ts` | HIGH |
| Collision detection | `tests/collision.test.ts` | HIGH |
| Save/Load cycle | `tests/saveLoad.test.ts` | HIGH |
| NPC interactions | `tests/npcInteraction.test.ts` | MEDIUM |
| Inventory operations | `tests/inventory.test.ts` | MEDIUM |

**Example test structure**:
```typescript
// tests/mapTransitions.test.ts
describe('Map Transitions', () => {
  it('should teleport player to correct position on transition');
  it('should preserve player state across transitions');
  it('should handle invalid transition targets gracefully');
  it('should regenerate random maps with same seed');
});
```

---

## Medium Priority

### 7. Error Handling System

**Problem**: 18 `try-catch` blocks that only log, no recovery or user notification.

**Solution**: Create `utils/errorHandler.ts`:
```typescript
export enum ErrorSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  FATAL = 'fatal',
}

export interface GameError {
  message: string;
  context: string;
  severity: ErrorSeverity;
  originalError?: Error;
}

export function handleError(
  error: Error,
  context: string,
  options?: {
    severity?: ErrorSeverity;
    showToast?: boolean;
    fallback?: () => void;
  }
): void {
  const severity = options?.severity ?? ErrorSeverity.ERROR;

  // Always log
  console[severity === ErrorSeverity.INFO ? 'log' : 'error'](
    `[${context}]`, error.message
  );

  // Optionally show toast
  if (options?.showToast) {
    // Use toast system
  }

  // Run fallback if provided
  options?.fallback?.();
}
```

---

### 8. Static Data as JSON

**Problem**: Large data files as TypeScript:
- `data/items.ts` (1,164 lines)
- `data/spriteMetadata.ts` (851 lines)
- `data/tiles.ts` (820 lines)

**Solution**: Convert to JSON with TypeScript types:
```
data/
  items.json         # Raw data
  items.ts           # Type definitions + loader
  spriteMetadata.json
  spriteMetadata.ts
```

**Benefits**:
- Faster compilation
- Easier to edit (JSON tooling)
- Can validate with JSON Schema
- Can generate from external sources

---

## Implementation Order

1. **Extract tile utilities** (30 min) - Quick win, reduces duplication
2. **Fix `any` types** (1 hour) - Catches bugs at compile time
3. **Add TIMING constants** (30 min) - Quick win, improves readability
4. **Extract App.tsx hooks** (2-3 hours) - Major improvement, careful work
5. **Add critical tests** (2 hours) - Prevents regressions
6. **NPC factory template** (2 hours) - Large savings but lower priority
7. **Error handling system** (1 hour) - Nice to have
8. **Static data migration** (2 hours) - Nice to have

---

## Progress Log

| Date | Change | Impact |
|------|--------|--------|
| 2025-12-29 | Added tile coordinate utilities to `mapUtils.ts` | Reduced duplication in actionHandlers.ts |
| 2025-12-29 | Fixed `any` types in GameState.ts, WeatherManager.ts, actionHandlers.ts, TileLayer.ts | 10 type holes fixed |
| 2025-12-29 | Added `TIMING` constants to `constants.ts` | Centralised 15+ timing values |
| 2025-12-29 | Updated TileLayer.ts to use `TIMING.DEFAULT_TILE_ANIMATION_MS` | Example migration |
| 2025-12-29 | Created `hooks/usePixiRenderer.ts` stub | Architecture outline for next extraction |

---

## Verification Checklist

After each change:
- [ ] `npx tsc --noEmit` passes
- [ ] Game loads without console errors
- [ ] Player can move and interact
- [ ] Map transitions work
- [ ] HMR updates correctly
