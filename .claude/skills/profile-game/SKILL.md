---
name: profile-game
description: Profile game performance using headless Chrome. Use when user asks to check performance, profile the game, detect regressions, or measure FPS.
---

# Profile Game Performance

Run automated performance tests on the game using headless Chrome and Puppeteer.

## Quick Start

```bash
# Basic performance test (requires dev server running)
npm run perf

# Save a baseline before making changes
npm run perf:baseline

# Compare current performance against baseline
npm run perf:compare
```

## When to Use This Skill

Invoke this skill when:
- User asks to "check performance" or "profile the game"
- User wants to detect performance regressions
- User asks about FPS, frame time, or memory usage
- Before/after making significant code changes
- User mentions slowdowns or crashes

## Workflow

### 1. Ensure Dev Server is Running

The performance tests require the dev server to be running:

```bash
npm run dev
```

Wait for it to start (usually on port 4000 or 4001).

### 2. Run Performance Test

**Basic test (10 seconds):**
```bash
npm run perf
```

**With movement simulation:**
```bash
npm run perf:movement
```

**Stress test (rapid input):**
```bash
npm run perf:stress
```

**Visible browser for debugging:**
```bash
npm run perf:headed
```

### 3. Baseline Comparison Workflow

**Before making changes:**
```bash
npm run perf:baseline
```
This saves results to `perf-baseline.json`.

**After making changes:**
```bash
npm run perf:compare
```
This compares current performance against the baseline and warns if there are regressions.

### 4. Advanced Options

Run with custom parameters:
```bash
node scripts/perf-test.js --help
```

**Common options:**
- `--url URL` - Dev server URL (default: http://localhost:4000)
- `--duration MS` - Test duration in ms (default: 10000)
- `--scenario NAME` - Test scenario (idle, movement, stress, explore, diagonal, npc)
- `--map ID` - Map to test on (e.g., village, deep_forest)
- `--save FILE` - Save results to JSON file
- `--compare FILE` - Compare against baseline
- `--headed` - Show browser window
- `--verbose` - Detailed output

**Examples:**
```bash
# Test village map with movement for 30 seconds
node scripts/perf-test.js --map village --scenario movement --duration 30000

# Stress test with visible browser
node scripts/perf-test.js --scenario stress --headed --verbose

# Save results for specific test
node scripts/perf-test.js --scenario movement --save perf-movement.json
```

## Interpreting Results

### FPS (Frames Per Second)
- **60+ fps**: Excellent
- **45-60 fps**: Good
- **30-45 fps**: Acceptable
- **<30 fps**: Poor - needs optimization

### Frame Time
- **<16.7ms**: Hitting 60fps target
- **16.7-33ms**: 30-60fps range
- **>33ms**: Below 30fps, noticeable stuttering

### Jank (Frame Spikes)
- **<50ms worst frame**: Good
- **50-100ms**: Occasional hitches
- **>100ms**: Noticeable freezes

### Memory
- **Growth <10MB**: Normal
- **Growth >10MB**: Potential memory leak

## Available npm Scripts

| Script | Description |
|--------|-------------|
| `npm run perf` | Basic 10s test |
| `npm run perf:baseline` | Save 15s baseline |
| `npm run perf:compare` | Compare to baseline |
| `npm run perf:movement` | Test with movement |
| `npm run perf:stress` | Rapid input stress |
| `npm run perf:headed` | Visible browser |
| `npm run perf:village` | Test village map |
| `npm run perf:help` | Show all options |

## Troubleshooting

### "Could not connect to URL"
Dev server isn't running. Start it with `npm run dev`.

### "Waiting failed: timeout exceeded"
Game failed to initialise. Try with `--headed` to see what's happening.

### Canvas: false in headless
Normal for headless mode - PixiJS canvas may not render but game loop still runs.

### Inaccurate FPS readings
Allow warmup period (default 5s). Use longer duration for stable readings.

## Files

- `scripts/perf-test.js` - Puppeteer test runner
- `utils/PerformanceMonitor.ts` - In-game metrics tracking
- `perf-baseline.json` - Saved baseline (created by perf:baseline)
