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

## Important: Software vs Hardware WebGL

Headless Chrome uses **software WebGL rendering** (SwiftShader) because there's no GPU available. This means:

| Mode | Expected FPS | Use Case |
|------|-------------|----------|
| **Headless (Software)** | 4-15 FPS | CI/CD, regression detection, consistent baselines |
| **Headed (Hardware GPU)** | 45-60 FPS | Real-world performance, final verification |

**The headless tests are valuable for:**
- Detecting **relative regressions** (if FPS drops 50%, something is wrong)
- Running in **CI/CD** where no GPU is available
- Providing **consistent baselines** across different machines

**For real FPS numbers**, use `--headed` to run with actual GPU.

## Current Baseline Results (Software WebGL)

| Map | Avg FPS | Frame Time | Notes |
|-----|---------|------------|-------|
| Village | 10 fps | 121ms | Main hub, many sprites |
| Bear Cave | 12.4 fps | 83ms | Smaller map |
| Witch Hut | 3.7 fps | 274ms | Most complex map |

### Device-Throttled Tests (Simulated Old Devices)

| Device | Map | Avg FPS | CPU Throttle |
|--------|-----|---------|--------------|
| iPad Air 2 | Village | 7.3 fps | 4x |
| iPad 4th Gen | Bear Cave | ~57 fps* | 6x |
| iPad 4th Gen | Witch Hut | 0.2 fps | 6x |

*Note: Results vary based on test conditions

## Workflow

### 1. Ensure Dev Server is Running

```bash
npm run dev
```

Wait for it to start (usually on port 4000).

### 2. Run Performance Test

**Basic test (10 seconds):**
```bash
npm run perf
```

**Multi-map tests:**
```bash
npm run perf:bear    # Test bear_cave map
npm run perf:witch   # Test witch_hut map
```

**Device-throttled tests (simulate old iPads):**
```bash
npm run perf:ipad        # iPad Air 2 (4x CPU throttle)
npm run perf:ipad-old    # iPad 4th Gen (6x CPU throttle)
npm run perf:bear:ipad   # Bear cave on old iPad
npm run perf:witch:ipad  # Witch hut on old iPad
```

**Visible browser with real GPU:**
```bash
npm run perf:headed
```

### 3. Baseline Comparison Workflow

**Before making changes:**
```bash
npm run perf:baseline
```

**After making changes:**
```bash
npm run perf:compare
```

### 4. Device Throttling Options

Simulate slower devices using CPU throttling:

```bash
# Specific device profiles
node scripts/perf-test.js --device ipad        # iPad Air 2 (4x throttle)
node scripts/perf-test.js --device ipad-old    # iPad 4th Gen (6x throttle)
node scripts/perf-test.js --device android-budget  # Budget Android (4x throttle)

# Custom CPU throttle
node scripts/perf-test.js --cpu 4  # 4x slower
node scripts/perf-test.js --cpu 6  # 6x slower
```

### 5. Advanced Options

```bash
node scripts/perf-test.js --help
```

**Options:**
- `--url URL` - Dev server URL (default: http://localhost:4000/TwilightGame/)
- `--duration MS` - Test duration in ms (default: 10000)
- `--scenario NAME` - Test scenario (idle, movement, stress, explore, diagonal, npc)
- `--map ID` - Map to test (village, bear_cave, witch_hut, etc.)
- `--device NAME` - Device profile (ipad, ipad-old, android-budget)
- `--cpu N` - CPU throttle factor (1=none, 4=4x slower, 6=6x slower)
- `--save FILE` - Save results to JSON file
- `--compare FILE` - Compare against baseline
- `--headed` - Show browser window (uses real GPU)
- `--verbose` - Detailed output with browser console logs

**Examples:**
```bash
# Test village with movement for 30 seconds
node scripts/perf-test.js --map village --scenario movement --duration 30000

# Stress test on old iPad simulation
node scripts/perf-test.js --device ipad-old --scenario stress

# Save baseline for bear cave
node scripts/perf-test.js --map bear_cave --save perf-bear-baseline.json
```

## Interpreting Results

### FPS (Frames Per Second) - Hardware GPU
- **60+ fps**: Excellent
- **45-60 fps**: Good
- **30-45 fps**: Acceptable
- **<30 fps**: Poor - needs optimization

### FPS - Software WebGL (Headless CI)
- **10+ fps**: Good (relative baseline)
- **5-10 fps**: Acceptable
- **<5 fps**: Map may be too complex

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
| `npm run perf:headed` | Visible browser (real GPU) |
| `npm run perf:village` | Test village map |
| `npm run perf:bear` | Test bear_cave map |
| `npm run perf:witch` | Test witch_hut map |
| `npm run perf:ipad` | iPad Air 2 simulation |
| `npm run perf:ipad-old` | iPad 4th Gen simulation |
| `npm run perf:bear:ipad` | Bear cave on old iPad |
| `npm run perf:witch:ipad` | Witch hut on old iPad |
| `npm run perf:help` | Show all options |

## Troubleshooting

### "Could not connect to URL"
Dev server isn't running. Start it with `npm run dev`.

### "Texture loading failed - textureManager reports 0 textures"
PixiJS failed to initialize. This was caused by incompatible WebGL flags and has been fixed. If it recurs, check browser launch arguments in `scripts/perf-test.js`.

### "Waiting failed: timeout exceeded"
Game failed to initialise. Try with `--headed` to see what's happening.

### Very low FPS in headless mode
This is normal! Headless Chrome uses software WebGL rendering (SwiftShader) which is 5-10x slower than real GPU. Use the numbers for **relative comparisons**, not absolute performance.

### Inaccurate FPS readings
Allow warmup period (default 5s). Use longer duration for stable readings.

## CI/CD Integration

The performance tests run automatically in GitHub Actions on every push/PR. See `.github/workflows/performance.yml`.

**CI runs these tests:**
1. Village baseline with movement (15s)
2. Bear cave and witch hut maps (10s each)
3. Device-throttled tests (iPad simulations)

Results are posted as PR comments and artifacts.

## Files

- `scripts/perf-test.js` - Puppeteer test runner
- `scripts/perf-report.js` - Report generator for CI
- `utils/PerformanceMonitor.ts` - In-game metrics tracking
- `perf-baseline.json` - Saved baseline (created by perf:baseline)
- `.github/workflows/performance.yml` - CI workflow
