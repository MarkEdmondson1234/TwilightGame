# Performance Profiling Reference

Detailed technical reference for the game performance profiling system.

## Architecture

### PerformanceMonitor (utils/PerformanceMonitor.ts)

The in-game performance monitor tracks metrics using frame-to-frame timing:

```typescript
// In the game loop
performanceMonitor.tick(); // Call once per frame

// Get current metrics
const metrics = performanceMonitor.getMetrics();
// Returns: { fps, avgFrameTime, maxFrameTime, frameTimeVariance, heapUsed, ... }

// Take a snapshot for comparison
performanceMonitor.takeSnapshot('before-change');
// ... make changes ...
performanceMonitor.takeSnapshot('after-change');
```

### Puppeteer Test Runner (scripts/perf-test.js)

Headless browser automation that:
1. Launches Chrome (headless or visible)
2. Navigates to the game
3. Skips character creation automatically
4. Optionally navigates to specific maps
5. Runs test scenarios (movement, stress, etc.)
6. Collects metrics via `window.__PERF_MONITOR__`
7. Outputs results and comparison

## Metrics Explained

### FPS (Frames Per Second)

Calculated from frame-to-frame timing:
```
FPS = 1000 / avgFrameTime
```

Target: 60 FPS (16.67ms per frame)

### Frame Time Statistics

- **avgFrameTime**: Mean time between frames
- **minFrameTime**: Best case (fastest frame)
- **maxFrameTime**: Worst case (slowest frame) - indicates jank
- **frameTimeVariance**: Standard deviation - indicates consistency

### Memory Metrics

Uses Chrome's `performance.memory` API:
- **heapUsed**: Current JS heap usage (bytes)
- **heapTotal**: Total allocated heap (bytes)
- **growth**: Change in heap over test duration (indicates leaks)

## Test Scenarios

### idle
Just let the game run. Measures baseline performance.

### movement
Simulates WASD movement in all 4 directions (1s each).

### continuous-movement
Holds down W+D throughout the test. Good for sustained load testing.

### explore
Moves around the map in a square pattern. Tests rendering different areas.

### diagonal
Tests diagonal movement (W+D, then S+A). Common player behaviour.

### stress
Rapid key presses to stress the input system.

### npc
Walks and interacts with NPCs using E key.

## Map Navigation

Maps can be tested by ID:
```bash
node scripts/perf-test.js --map village
node scripts/perf-test.js --map deep_forest
node scripts/perf-test.js --map witch_hut
```

The script accesses `window.mapManager.loadMap(mapId)` to navigate.

## Baseline Comparison

### Creating a Baseline

```bash
npm run perf:baseline
# or with custom settings:
node scripts/perf-test.js --duration 30000 --scenario movement --save my-baseline.json
```

### Comparing Against Baseline

```bash
npm run perf:compare
# or with custom baseline:
node scripts/perf-test.js --compare my-baseline.json
```

### Regression Thresholds

The comparison reports regression if:
- FPS drops by more than 10%
- Frame time increases by more than 10%
- Max frame time (jank) increases by more than 50%

Exit code: 0 = OK, 1 = regression detected

## CI Integration

### GitHub Actions Workflow

The project includes a full CI workflow at `.github/workflows/performance.yml` that:

1. **Runs on every PR and push to main**
2. **Injects a test character** - Skips character creation automatically
3. **Tests on village map** (30x30) with movement scenario
4. **Compares against baseline** - Downloaded from previous main branch runs
5. **Posts PR comments** - Shows regression report with emoji indicators
6. **Updates baseline on merge** - New baseline uploaded for future comparisons

### NPM Scripts for CI

```bash
# Run CI-style test (used by GitHub Actions)
npm run perf:ci

# Generate markdown report from results
npm run perf:report
```

### Manual Baseline Workflow

```bash
# 1. Create baseline before changes
npm run perf:baseline

# 2. Make code changes...

# 3. Compare against baseline
npm run perf:compare
```

### Regression Thresholds

The CI reports regression if:
- **FPS** drops by more than 10%
- **Frame Time** increases by more than 15%
- **Jank (max frame)** increases by more than 50%
- **Memory growth** increases by more than 25%

## Troubleshooting

### Headless Mode Issues

If headless mode fails but headed works:
1. Enable WebGL: Already configured with `--use-gl=swiftshader`
2. Check for CORS issues in console
3. Try `--no-sandbox` flag (already included)

### Inconsistent Results

1. Increase warmup time: `--warmup 10000`
2. Increase test duration: `--duration 30000`
3. Close other applications
4. Run multiple tests and average results

### Memory Leaks

If memory growth > 10MB over 30s test:
1. Check for event listener accumulation
2. Look for growing arrays/objects
3. Review sprite creation/destruction
4. Check for circular references

## Files Reference

| File | Purpose |
|------|---------|
| `utils/PerformanceMonitor.ts` | In-game metrics tracking singleton |
| `scripts/perf-test.js` | Puppeteer test runner |
| `utils/gameInitializer.ts` | Exposes mapManager and perfMonitor to window |
| `perf-baseline.json` | Saved baseline (git-ignored recommended) |

## Global Window Objects

Available for testing:
- `window.__PERF_MONITOR__` - PerformanceMonitor instance
- `window.mapManager` - MapManager for navigation
- `window.gameState` - GameState for game data
