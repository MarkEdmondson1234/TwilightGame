# Farming System Refactoring

This document outlines improvements to the farming system for better usability and AI coding maintainability.

## Overview

**Goal**: Simplify the farming system by removing redundant data, extracting magic numbers to constants, and making types more predictable.

**Current State**:
- `utils/farmManager.ts` (615 lines) - Core manager, well-structured SSoT
- `data/crops.ts` (537 lines) - Crop definitions with TESTING_MODE flag
- `types/farm.ts` (48 lines) - Type definitions with optional fields

**Priority**: Critical > High > Medium

---

## Critical Priority

### 1. Add Growth Stage Threshold Constants

**Problem**: Magic numbers in [farmManager.ts:542-546](../../utils/farmManager.ts#L542-L546):
```typescript
if (progress < 0.33) return SEEDLING;
else if (progress < 0.66) return YOUNG;
else return ADULT;
```

These thresholds control visual growth stages but are hardcoded, making balance tweaks difficult.

**Solution**: Add to `constants.ts`:
```typescript
/**
 * Growth stage thresholds (0-1 progress)
 * Controls when crops visually transition between stages
 */
export const GROWTH_THRESHOLDS = {
  SEEDLING_TO_YOUNG: 0.33,  // 0-33% = seedling
  YOUNG_TO_ADULT: 0.66,      // 33-66% = young, 66-100% = adult
} as const;
```

**Files to modify**:
- `constants.ts` - Add constants
- `utils/farmManager.ts` - Import and use constants

**Verification**:
- `npx tsc --noEmit` passes
- Crops still show 3 growth stages

---

### 2. Replace TESTING_MODE with Environment Variable

**Problem**: [crops.ts:86](../../data/crops.ts#L86):
```typescript
export const TESTING_MODE = true; // TODO: Set to false for production
```

This flag must be manually changed before production. Forgetting to change it means crops grow in 2 minutes instead of 2+ real hours - completely broken gameplay.

**Solution**: Use Vite environment variable:
```typescript
/**
 * Testing mode: When true, crops grow in real minutes (for testing)
 * When false, crops grow based on in-game time (for production)
 *
 * Set via: VITE_TESTING_MODE=true in .env or command line
 * Default: true in development, false in production
 */
export const TESTING_MODE = import.meta.env.DEV ||
  import.meta.env.VITE_TESTING_MODE === 'true';
```

**Files to modify**:
- `data/crops.ts` - Replace hardcoded flag with env check
- `.env.example` (create if needed) - Document the variable

**Verification**:
- In dev: `TESTING_MODE` is true (fast growth)
- In prod build: `TESTING_MODE` is false (game-time growth)
- Can override with `VITE_TESTING_MODE=true npm run dev`

---

### 3. Make Quality/Fertiliser Fields Required

**Problem**: [farm.ts:45-46](../../types/farm.ts#L45-L46):
```typescript
quality?: 'normal' | 'good' | 'excellent';  // Optional
fertiliserApplied?: boolean;                 // Optional
```

These optional fields force defensive coding throughout:
- `plot.quality ?? 'normal'` at lines 389, 411
- `quality: undefined` reset at line 438

**Solution**: Make fields required with explicit defaults:

**In `types/farm.ts`**:
```typescript
export interface FarmPlot {
  // ... existing fields ...

  // Quality system (always set, not optional)
  quality: 'normal' | 'good' | 'excellent';
  fertiliserApplied: boolean;
}
```

**In `farmManager.ts`** - Update all plot creation:
```typescript
// In tillSoil() - add defaults
const plot: FarmPlot = {
  // ... existing fields ...
  quality: 'normal',
  fertiliserApplied: false,
};

// In harvestCrop() - explicit reset (not undefined)
const updatedPlot: FarmPlot = {
  ...plot,
  quality: 'normal',
  fertiliserApplied: false,
};
```

**Files to modify**:
- `types/farm.ts` - Remove `?` from quality/fertiliserApplied
- `utils/farmManager.ts` - Update tillSoil(), harvestCrop(), clearDeadCrop()

**Verification**:
- `npx tsc --noEmit` passes (will catch any missing assignments)
- Existing farm plots in saves load correctly (migration handled by default values)

---

## High Priority

### 4. Add Debug Logging Flag

**Problem**: 13+ `console.log` statements in farmManager.ts:
```typescript
console.log(`[FarmManager] Tilled soil at ${position.x},${position.y}`);
console.log(`[FarmManager] Planted ${cropId} at...`);
// etc.
```

At 50+ farm plots, updating every 2 seconds will spam the console.

**Solution**: Add debug flag to `constants.ts`:
```typescript
/**
 * Debug flags for verbose logging
 * Set to true during development when debugging specific systems
 */
export const DEBUG = {
  FARM: import.meta.env.DEV && false,  // Toggle for farm system
  NPC: import.meta.env.DEV && false,   // Toggle for NPC system
  MAP: import.meta.env.DEV && false,   // Toggle for map transitions
} as const;
```

**In `farmManager.ts`**:
```typescript
import { DEBUG } from '../constants';

// Replace:
console.log(`[FarmManager] Tilled soil at...`);

// With:
if (DEBUG.FARM) console.log(`[FarmManager] Tilled soil at...`);
```

**Files to modify**:
- `constants.ts` - Add DEBUG flags
- `utils/farmManager.ts` - Wrap 13+ log statements

**Verification**:
- Console is clean in normal operation
- Can enable `DEBUG.FARM = true` for debugging

---

### 5. Remove Unused Game-Time Fields

**Problem**: [farm.ts:34-39](../../types/farm.ts#L34-L39) has redundant fields:
```typescript
plantedAtDay: number | null;      // Game day (used only for debug)
plantedAtHour: number | null;     // Game hour (used only for debug)
lastWateredDay: number | null;    // Game day (used only for debug)
lastWateredHour: number | null;   // Game hour (used only for debug)
stateChangedAtDay: number;        // Game day (used only for debug)
stateChangedAtHour: number;       // Game hour (used only for debug)
```

The actual growth calculations use real timestamps (`plantedAtTimestamp`, etc.). These game-time fields are only used in `getPlotInfo()` for debug display.

**Impact on AI**: Confusing which timestamp system to use. Comments say "Uses TimeManager" but code uses `Date.now()`.

**Solution**: Remove game-time fields, calculate them on-demand for debug:

**In `types/farm.ts`**:
```typescript
export interface FarmPlot {
  mapId: string;
  position: Position;
  state: FarmPlotState;
  cropType: string | null;

  // Real timestamps for calculations (milliseconds since epoch)
  plantedAtTimestamp: number | null;
  lastWateredTimestamp: number | null;
  stateChangedAtTimestamp: number;

  // Quality system
  quality: 'normal' | 'good' | 'excellent';
  fertiliserApplied: boolean;
}
```

**In `getPlotInfo()`** - Calculate game time on-demand:
```typescript
// Calculate game time from real timestamp for debug display
const plantedGameTime = plot.plantedAtTimestamp
  ? TimeManager.getTimeAtTimestamp(plot.plantedAtTimestamp)
  : null;
```

**Files to modify**:
- `types/farm.ts` - Remove 6 game-time fields
- `utils/farmManager.ts` - Update all plot creation and getPlotInfo()

**Verification**:
- `npx tsc --noEmit` passes
- Debug overlay (F3) still shows correct info
- Existing saves may need migration (or accept data loss for debug fields)

---

### 6. Extract Quality Progression Helper

**Problem**: [farmManager.ts:365-370](../../utils/farmManager.ts#L365-L370):
```typescript
let newQuality: 'normal' | 'good' | 'excellent' = 'good';
if (plot.quality === 'good') {
  newQuality = 'excellent';
}
```

Hardcoded progression logic that should use the existing `CropQuality` enum.

**Solution**: Add to `data/crops.ts`:
```typescript
/**
 * Quality progression when fertiliser is applied
 * normal → good → excellent (max)
 */
export const QUALITY_PROGRESSION: Record<CropQuality, CropQuality> = {
  [CropQuality.NORMAL]: CropQuality.GOOD,
  [CropQuality.GOOD]: CropQuality.EXCELLENT,
  [CropQuality.EXCELLENT]: CropQuality.EXCELLENT, // Already max
};

/**
 * Get the next quality level after applying fertiliser
 */
export function getNextQuality(current: CropQuality): CropQuality {
  return QUALITY_PROGRESSION[current];
}
```

**In `farmManager.ts`**:
```typescript
import { getNextQuality, CropQuality } from '../data/crops';

// In applyFertiliser():
const currentQuality = (plot.quality ?? 'normal') as CropQuality;
const newQuality = getNextQuality(currentQuality);
```

**Files to modify**:
- `data/crops.ts` - Add progression map and helper
- `utils/farmManager.ts` - Use helper in applyFertiliser()

**Verification**:
- Fertiliser still upgrades quality correctly
- Quality caps at 'excellent'

---

## Medium Priority

### 7. Add Plot Validation

**Problem**: [farmManager.ts:32-35](../../utils/farmManager.ts#L32-L35):
```typescript
registerPlot(plot: FarmPlot): void {
  const key = this.getPlotKey(plot.mapId, plot.position);
  this.plots.set(key, plot);
}
```

No validation - could register invalid plots (null timestamps, invalid states).

**Solution**: Add validation:
```typescript
registerPlot(plot: FarmPlot): void {
  // Validate required fields
  if (!plot.mapId || !plot.position) {
    console.warn('[FarmManager] Invalid plot: missing mapId or position');
    return;
  }

  // Validate timestamp consistency
  if (plot.state !== FarmPlotState.FALLOW &&
      plot.state !== FarmPlotState.TILLED &&
      plot.plantedAtTimestamp === null) {
    console.warn('[FarmManager] Invalid plot: growing state without plantedAtTimestamp');
  }

  const key = this.getPlotKey(plot.mapId, plot.position);
  this.plots.set(key, plot);
}
```

**Files to modify**:
- `utils/farmManager.ts` - Add validation to registerPlot()

---

### 8. Remove Duplicate Growth Calculation

**Problem**: Growth progress calculated in two places:
- [farmManager.ts:531-539](../../utils/farmManager.ts#L531-L539)
- [crops.ts:499-504](../../data/crops.ts#L499-L504)

**Solution**: Delete `getGrowthProgress()` from crops.ts (currently unused) OR have farmManager import and use it.

**Recommendation**: Keep it in crops.ts (data layer), have farmManager call it.

**Files to modify**:
- `utils/farmManager.ts` - Import `getGrowthProgress` from crops.ts
- OR `data/crops.ts` - Delete unused function

---

### 9. Document Wilting→Ready Edge Case

**Problem**: [farmManager.ts:154](../../utils/farmManager.ts#L154) allows wilting crops to mature:
```typescript
if (plot.state === FarmPlotState.PLANTED ||
    plot.state === FarmPlotState.WATERED ||
    plot.state === FarmPlotState.WILTING) {  // ← Can mature while wilting!
```

This is intentional (forgiving gameplay) but counter-intuitive.

**Solution**: Add comment explaining the design decision:
```typescript
// Note: Wilting crops CAN mature. This is intentional - it's forgiving gameplay
// that allows players to salvage neglected crops. The crop still dies if not
// harvested before deathGracePeriod expires.
if (plot.state === FarmPlotState.PLANTED ||
    plot.state === FarmPlotState.WATERED ||
    plot.state === FarmPlotState.WILTING) {
```

---

## Implementation Order

| Step | Task | Effort | Impact |
|------|------|--------|--------|
| 1 | Add `GROWTH_THRESHOLDS` constant | 10 min | High - removes magic numbers |
| 2 | Replace `TESTING_MODE` with env var | 15 min | Critical - prevents prod bugs |
| 3 | Make quality/fertiliser required | 30 min | High - cleaner types |
| 4 | Add `DEBUG.FARM` logging flag | 20 min | Medium - cleaner console |
| 5 | Remove game-time fields | 45 min | Medium - simpler types |
| 6 | Extract quality progression helper | 15 min | Low - cleaner logic |
| 7 | Add plot validation | 15 min | Low - defensive coding |
| 8 | Remove duplicate growth calc | 10 min | Low - DRY |
| 9 | Document wilting edge case | 5 min | Low - clarity |

**Total estimated time**: ~2.5 hours

---

## Verification Checklist

After each change:
- [ ] `npx tsc --noEmit` passes
- [ ] Game loads without console errors
- [ ] Farm plots display correctly
- [ ] Can till, plant, water, harvest
- [ ] Crops grow through 3 visual stages
- [ ] Fertiliser improves quality
- [ ] Wilting/death mechanics work
- [ ] Debug overlay shows correct info (F3)

---

## Progress Log

| Date | Change | Impact |
|------|--------|--------|
| 2025-12-31 | Added `GROWTH_THRESHOLDS` constant to constants.ts | Removed magic numbers 0.33/0.66 from growth stage calc |
| 2025-12-31 | Replaced `TESTING_MODE` with environment variable | Auto-enabled in dev, auto-disabled in prod builds |
| 2025-12-31 | Made quality/fertiliserApplied fields required | Eliminated null coalescing throughout codebase |
| 2025-12-31 | Added `DEBUG` flags to constants.ts | Clean console - farm logging now opt-in |
| 2025-12-31 | Added `QUALITY_PROGRESSION` and `getNextQuality()` | Cleaner quality upgrade logic |
| 2025-12-31 | Added plot validation in `registerPlot()` | Catches invalid plot data early |
| 2025-12-31 | Removed unused `getGrowthProgress()` from crops.ts | Eliminated duplicate code |
| 2025-12-31 | Documented wilting→ready edge case | Clear design intent for AI agents |

---

## Notes

**Strengths to preserve**:
- SSoT pattern (FarmManager is the only source)
- Lazy state calculation (efficient, not per-frame)
- Comprehensive tests in `tests/farmManager.test.ts`
- Flexible crop system (easy to add new crops)
- Well-documented in `docs/FARMING.md`

**Out of scope** (future work):
- Multi-harvest crops (mentioned in design doc)
- Crop deterioration after harvest
- Server-side timestamp validation (for multiplayer)
- Inventory capacity limits
