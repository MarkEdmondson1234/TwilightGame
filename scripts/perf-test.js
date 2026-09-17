#!/usr/bin/env node

/**
 * Headless Performance Test Script
 *
 * Runs the game in headless Chrome and collects performance metrics.
 * Use this to detect performance regressions after code changes.
 *
 * Usage:
 *   node scripts/perf-test.js              # Basic test (5s warmup, 10s measurement)
 *   node scripts/perf-test.js --duration 30000   # Longer measurement (30s)
 *   node scripts/perf-test.js --scenario movement  # Run movement test
 *   node scripts/perf-test.js --save results.json  # Save results to file
 *   node scripts/perf-test.js --compare baseline.json  # Compare against baseline
 *   node scripts/perf-test.js --headed     # Show browser window for debugging
 *
 * Requirements:
 *   npm install puppeteer (will be added to devDependencies)
 *   Dev server must be running: npm run dev
 */

import {
  log,
  launchBrowser,
  detectRenderer,
  waitForGame,
  waitForTexturesLoaded,
  navigateToMap,
  logCurrentGameState,
  setupTestCharacter,
  pinWorld,
  getMetrics,
  startWalker,
  stopWalker,
} from './lib/perfHarness.mjs';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Parse command line arguments
const args = process.argv.slice(2);
const getArg = (name) => {
  const index = args.indexOf(`--${name}`);
  return index !== -1 ? args[index + 1] : null;
};
const hasArg = (name) => args.includes(`--${name}`);

const CONFIG = {
  url: getArg('url') || 'http://localhost:4000/TwilightGame/',
  warmupMs: parseInt(getArg('warmup') || '5000', 10),
  durationMs: parseInt(getArg('duration') || '10000', 10),
  time: getArg('time') || '10', // in-game hour to pin (see pinWorld)
  weather: getArg('weather') || 'clear',
  scenario: getArg('scenario') || 'idle',
  map: getArg('map'), // e.g., 'village', 'deep_forest', 'witch_hut'
  saveFile: getArg('save'),
  compareFile: getArg('compare'),
  headed: hasArg('headed'),
  verbose: hasArg('verbose'),
  github: hasArg('github'), // GitHub Actions output mode
  device: getArg('device'), // Device profile: 'ipad', 'ipad-mini', 'android-budget'
  cpuThrottle: parseInt(getArg('cpu') || '1', 10), // CPU throttle factor (1 = no throttle, 4 = 4x slower)
};

// Device profiles for simulating older/slower devices
const DEVICE_PROFILES = {
  'ipad': {
    name: 'iPad Air 2 / iPad Mini 4 (2014-2015)',
    viewport: {
      width: 1024,  // CSS pixels (2048 physical / 2 DPR)
      height: 768,
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      isLandscape: true,
    },
    cpuThrottle: 4, // A8X chip ~4x slower than modern chips
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 12_5_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.1.2 Mobile/15E148 Safari/604.1',
  },
  'ipad-mini': {
    name: 'iPad Mini 4 (2015)',
    viewport: {
      width: 1024,
      height: 768,
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      isLandscape: true,
    },
    cpuThrottle: 4, // A8 chip
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 12_5_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.1.2 Mobile/15E148 Safari/604.1',
  },
  'ipad-old': {
    name: 'iPad 4th Gen (2012) - Very Slow',
    viewport: {
      width: 1024,
      height: 768,
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      isLandscape: true,
    },
    cpuThrottle: 6, // A6X chip - very old
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 10_3_4 like Mac OS X) AppleWebKit/603.3.8 (KHTML, like Gecko) Version/10.0 Mobile/14G61 Safari/602.1',
  },
  'android-budget': {
    name: 'Budget Android Tablet (2020)',
    viewport: {
      width: 1280,
      height: 800,
      deviceScaleFactor: 1.5,
      isMobile: true,
      hasTouch: true,
      isLandscape: true,
    },
    cpuThrottle: 4, // Budget MediaTek/Snapdragon
    userAgent: 'Mozilla/5.0 (Linux; Android 10; SM-T510) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Safari/537.36',
  },
};

// The GPU we ended up on, filled in once the page is open. Read by
// analyseResults so every saved result records what measured it.
let RENDERER = { available: false, name: 'unknown', software: false };

// Scene cost sampled once after warmup, before the scenario moves anything.
let AT_REST = null;

// Check if running in GitHub Actions
const isGitHubActions = process.env.GITHUB_ACTIONS === 'true' || CONFIG.github;


// ANSI colour codes for terminal output (log() itself lives in lib/perfHarness.mjs)
const colours = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
};

function logMetric(name, value, unit = '', threshold = null) {
  let colour = 'reset';
  if (threshold !== null) {
    if (typeof threshold === 'object') {
      // { good: 60, warn: 30 } - higher is better
      colour = value >= threshold.good ? 'green' : value >= threshold.warn ? 'yellow' : 'red';
    } else {
      // Single number - lower is better
      colour = value <= threshold ? 'green' : value <= threshold * 1.5 ? 'yellow' : 'red';
    }
  }
  console.log(`  ${name.padEnd(20)} ${colours[colour]}${value}${unit}${colours.reset}`);
}




async function runScenario(page, scenario) {
  log(`Running scenario: ${scenario}`, 'cyan');

  switch (scenario) {
    case 'idle':
      // Just let the game run
      break;

    case 'movement':
      // Walk for the whole measurement window, not just before it. This used
      // to press W/D/S/A for a second each and return, so the 15 s that were
      // then measured were of a player standing still — and "movement" graded
      // an idle scene. The walker below runs until cleanupScenario() and turns
      // every second so the player paces a small square rather than wandering
      // off the map.
      startWalker(page);
      break;

    case 'continuous-movement':
      // Keep moving throughout the test
      await page.keyboard.down('KeyW');
      await page.keyboard.down('KeyD');
      break;

    case 'stress':
      // Rapid input to stress the system
      for (let i = 0; i < 50; i++) {
        await page.keyboard.press('KeyW');
        await page.keyboard.press('KeyD');
        await page.keyboard.press('KeyS');
        await page.keyboard.press('KeyA');
      }
      break;

    case 'explore':
      // Move around exploring the map for extended period
      const directions = ['KeyW', 'KeyD', 'KeyS', 'KeyA'];
      for (let i = 0; i < 10; i++) {
        const dir = directions[i % 4];
        await page.keyboard.down(dir);
        await new Promise((r) => setTimeout(r, 500));
        await page.keyboard.up(dir);
        await new Promise((r) => setTimeout(r, 100));
      }
      break;

    case 'diagonal':
      // Diagonal movement (common in games)
      await page.keyboard.down('KeyW');
      await page.keyboard.down('KeyD');
      await new Promise((r) => setTimeout(r, 2000));
      await page.keyboard.up('KeyW');
      await page.keyboard.up('KeyD');
      await page.keyboard.down('KeyS');
      await page.keyboard.down('KeyA');
      await new Promise((r) => setTimeout(r, 2000));
      await page.keyboard.up('KeyS');
      await page.keyboard.up('KeyA');
      break;

    case 'npc':
      // Walk to and interact with NPCs (uses E key)
      await page.keyboard.down('KeyW');
      await new Promise((r) => setTimeout(r, 500));
      await page.keyboard.up('KeyW');
      await page.keyboard.press('KeyE');
      await new Promise((r) => setTimeout(r, 500));
      await page.keyboard.press('KeyE');
      break;

    default:
      log(`Unknown scenario: ${scenario}`, 'yellow');
  }
}

async function collectPerformanceData(page, durationMs) {
  const samples = [];
  const startTime = Date.now();

  // Reset the monitor to start fresh
  await page.evaluate(() => {
    window.__PERF_MONITOR__.reset();
  });

  // Collect samples every 500ms
  while (Date.now() - startTime < durationMs) {
    const metrics = await getMetrics(page);
    if (metrics) {
      samples.push(metrics);
      if (CONFIG.verbose) {
        log(`  FPS: ${metrics.fps} | Frame: ${metrics.avgFrameTime}ms | Heap: ${(metrics.heapUsed / 1024 / 1024).toFixed(1)}MB`, 'dim');
      }
    }
    await new Promise((r) => setTimeout(r, 500));
  }

  return samples;
}

function analyseResults(samples) {
  if (samples.length === 0) {
    return null;
  }

  // Calculate aggregates
  const fpsSamples = samples.map((s) => s.fps).filter((f) => f > 0);
  const frameTimeSamples = samples.map((s) => s.avgFrameTime).filter((f) => f > 0);
  const maxFrameTimeSamples = samples.map((s) => s.maxFrameTime).filter((f) => f > 0);
  const heapSamples = samples.map((s) => s.heapUsed).filter((h) => h > 0);

  const avg = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
  const min = (arr) => Math.min(...arr);
  const max = (arr) => Math.max(...arr);
  const p95 = (arr) => {
    const sorted = [...arr].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length * 0.95)];
  };

  return {
    timestamp: new Date().toISOString(),
    duration: CONFIG.durationMs,
    scenario: CONFIG.scenario,
    sampleCount: samples.length,

    // Provenance. A result carries the renderer that produced it so a consumer
    // can refuse to compare a SwiftShader run against a GPU run — the single
    // mistake that made this whole suite report noise as regressions.
    renderer: RENDERER,
    device: CONFIG.device || null,
    cpuThrottle: (CONFIG.device ? DEVICE_PROFILES[CONFIG.device]?.cpuThrottle : CONFIG.cpuThrottle) || 1,

    fps: {
      avg: Math.round(avg(fpsSamples) * 10) / 10,
      min: Math.round(min(fpsSamples) * 10) / 10,
      max: Math.round(max(fpsSamples) * 10) / 10,
    },

    frameTime: {
      avg: Math.round(avg(frameTimeSamples) * 100) / 100,
      min: Math.round(min(frameTimeSamples) * 100) / 100,
      max: Math.round(max(frameTimeSamples) * 100) / 100,
      p95: Math.round(p95(frameTimeSamples) * 100) / 100,
    },

    jank: {
      maxFrameTime: Math.round(max(maxFrameTimeSamples) * 100) / 100,
      p95MaxFrameTime: Math.round(p95(maxFrameTimeSamples) * 100) / 100,
    },

    memory: heapSamples.length > 0 ? {
      avgMB: Math.round((avg(heapSamples) / 1024 / 1024) * 10) / 10,
      maxMB: Math.round((max(heapSamples) / 1024 / 1024) * 10) / 10,
      growthMB: Math.round(((heapSamples[heapSamples.length - 1] - heapSamples[0]) / 1024 / 1024) * 10) / 10,
    } : null,

    // Scene cost — the hardware-independent half of the results, and the only
    // half CI can compare run to run. `peak` rather than `avg` because a budget
    // is about the worst moment: the frame that drops on an old iPad is the one
    // with the most sprites resident, not the average one.
    scene: sceneSummary(samples),

    // The reproducible one — see where AT_REST is captured.
    sceneAtRest: AT_REST,

    // Work rates — how often the code did something expensive during the
    // scenario, from counters incremented at the source (WorkCounters in
    // utils/PerformanceMonitor.ts). Counts, like scene cost, so they compare
    // across machines; expressed per second and per frame because some work
    // scales with time (a tile-boundary crossing at walking speed) and some
    // with frames (a React render per moving frame).
    work: workSummary(samples),

    // Final snapshot values
    finalMetrics: samples[samples.length - 1],
  };
}

/**
 * Reduce the per-sample scene counts to a peak + median per field.
 *
 * Counts move as the player walks (sprites cull in and out), so a single sample
 * is noisy in a way a total is not. Median describes the steady state, peak
 * describes what the device actually has to survive.
 */
function sceneSummary(samples) {
  const scenes = samples.map((s) => s.scene).filter(Boolean);
  if (scenes.length === 0) return null;

  const median = (arr) => {
    const sorted = [...arr].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
  };

  const fields = ['nodes', 'sprites', 'visibleSprites', 'containers', 'maxDepth', 'textures', 'textureMB', 'filteredNodes', 'maskedNodes'];
  const out = {};
  for (const field of fields) {
    const values = scenes.map((s) => s[field] ?? 0);
    out[field] = {
      median: Math.round(median(values) * 10) / 10,
      peak: Math.round(Math.max(...values) * 10) / 10,
    };
  }
  return out;
}

/**
 * Turn the cumulative work counters into rates over the sampled window.
 * Returns null when the build predates the counters (older baselines).
 */
function workSummary(samples) {
  const first = samples.find((s) => s.work);
  const last = [...samples].reverse().find((s) => s.work);
  if (!first || !last || first === last) return null;
  const seconds = (last.timestamp - first.timestamp) / 1000;
  const frames = (last.frameCount ?? 0) - (first.frameCount ?? 0);
  if (seconds <= 0) return null;
  const out = {};
  for (const key of Object.keys(last.work)) {
    const delta = (last.work[key] ?? 0) - (first.work[key] ?? 0);
    out[key] = {
      total: delta,
      perSecond: Math.round((delta / seconds) * 100) / 100,
      perFrame: frames > 0 ? Math.round((delta / frames) * 1000) / 1000 : null,
    };
  }
  out.frames = frames;
  out.seconds = Math.round(seconds * 10) / 10;
  return out;
}

function printResults(results) {
  log('\n========================================', 'cyan');
  log('         PERFORMANCE RESULTS           ', 'cyan');
  log('========================================\n', 'cyan');

  log(`Scenario: ${results.scenario}`, 'blue');
  log(`Duration: ${results.duration / 1000}s (${results.sampleCount} samples)\n`, 'dim');

  log('FPS:', 'yellow');
  logMetric('Average', results.fps.avg, ' fps', { good: 55, warn: 30 });
  logMetric('Minimum', results.fps.min, ' fps', { good: 45, warn: 20 });
  logMetric('Maximum', results.fps.max, ' fps');

  log('\nFrame Time:', 'yellow');
  logMetric('Average', results.frameTime.avg, ' ms', 20);
  logMetric('P95', results.frameTime.p95, ' ms', 33);
  logMetric('Maximum', results.frameTime.max, ' ms', 50);

  log('\nJank (Frame Spikes):', 'yellow');
  logMetric('Worst Frame', results.jank.maxFrameTime, ' ms', 50);
  logMetric('P95 Worst', results.jank.p95MaxFrameTime, ' ms', 33);

  if (results.memory) {
    log('\nMemory:', 'yellow');
    logMetric('Average Heap', results.memory.avgMB, ' MB');
    logMetric('Max Heap', results.memory.maxMB, ' MB');
    logMetric('Growth', results.memory.growthMB, ' MB', 10);
  }

  if (results.scene) {
    log('\nScene Cost (hardware-independent):', 'yellow');
    logMetric('Sprites (peak)', results.scene.sprites.peak);
    logMetric('  ...drawn', results.scene.visibleSprites.peak);
    logMetric('Containers (peak)', results.scene.containers.peak);
    logMetric('Nodes (peak)', results.scene.nodes.peak);
    logMetric('Tree depth', results.scene.maxDepth.peak);
    logMetric('Textures (peak)', results.scene.textures.peak);
    logMetric('Texture memory', results.scene.textureMB.peak, ' MB');
    logMetric('Filtered nodes', results.scene.filteredNodes?.peak ?? 0);
    logMetric('Masked nodes', results.scene.maskedNodes?.peak ?? 0);
  }
  if (results.work) {
    log('\nWork Rates (hardware-independent):', 'yellow');
    const w = results.work;
    log(`  App renders          ${w.appRenders.perFrame} /frame  (${w.appRenders.perSecond} /s)`);
    log(`  Scene rebuilds       ${w.sceneRebuilds.perSecond} /s`);
    log(`  NPC draws            ${w.npcDraws.perFrame} /frame`);
    log(`  Darkness uploads     ${w.darknessUploads.perSecond} /s`);
    log(`  Save flushes         ${Math.round(w.saveFlushes.perSecond * 60 * 10) / 10} /min`);
  }

  log('\n========================================\n', 'cyan');

  // GitHub Actions output
  if (isGitHubActions) {
    printGitHubSummary(results);
  }
}

function printGitHubSummary(results) {
  // Output GitHub Actions Job Summary
  const summary = `
## Performance Test Results

| Metric | Value | Status |
|--------|-------|--------|
| **FPS (avg)** | ${results.fps.avg} fps | ${results.fps.avg >= 55 ? ':white_check_mark:' : results.fps.avg >= 30 ? ':warning:' : ':x:'} |
| **FPS (min)** | ${results.fps.min} fps | ${results.fps.min >= 45 ? ':white_check_mark:' : results.fps.min >= 20 ? ':warning:' : ':x:'} |
| **Frame Time (avg)** | ${results.frameTime.avg} ms | ${results.frameTime.avg <= 20 ? ':white_check_mark:' : results.frameTime.avg <= 33 ? ':warning:' : ':x:'} |
| **Jank (worst)** | ${results.jank.maxFrameTime} ms | ${results.jank.maxFrameTime <= 50 ? ':white_check_mark:' : ':warning:'} |
${results.memory ? `| **Memory Growth** | ${results.memory.growthMB} MB | ${results.memory.growthMB <= 10 ? ':white_check_mark:' : ':warning:'} |` : ''}
${results.scene ? `| **Sprites (peak)** | ${results.scene.sprites.peak} | :heavy_minus_sign: |
| **Textures (peak)** | ${results.scene.textures.peak} (${results.scene.textureMB.peak} MB) | :heavy_minus_sign: |` : ''}

${results.renderer?.software ? `> Renderer: \`${results.renderer.name}\` — **software**. Frame timings above describe the CI rasteriser, not the game.` : `> Renderer: \`${results.renderer?.name || 'unknown'}\``}
`;

  // Write to GitHub step summary if available
  if (process.env.GITHUB_STEP_SUMMARY) {
    writeFileSync(process.env.GITHUB_STEP_SUMMARY, summary, { flag: 'a' });
    console.log('Wrote summary to GITHUB_STEP_SUMMARY');
  }

  // Output annotations for warnings/errors.
  //
  // Frame-timing annotations are suppressed on a software renderer. They used to
  // fire on every CI run — "Critical: Average FPS (1.4) is below 30" — which is
  // true of SwiftShader and says nothing about the game. An annotation that is
  // always red is an annotation nobody reads, so it took the real ones with it.
  if (results.renderer?.software) {
    console.log(
      `::notice::Frame timings measured on a software renderer (${results.renderer.name}) — recorded, but not graded. Scene-cost counters are the comparable metrics.`
    );
  } else {
    if (results.fps.avg < 30) {
      console.log(`::error::Critical: Average FPS (${results.fps.avg}) is below 30 fps`);
    } else if (results.fps.avg < 45) {
      console.log(`::warning::Average FPS (${results.fps.avg}) is below target (45 fps)`);
    }

    if (results.jank.maxFrameTime > 100) {
      console.log(`::warning::High jank detected: ${results.jank.maxFrameTime}ms worst frame`);
    }
  }

  if (results.memory && results.memory.growthMB > 20) {
    console.log(`::warning::High memory growth: ${results.memory.growthMB}MB during test`);
  }

  // Set output variables
  console.log(`::set-output name=fps::${results.fps.avg}`);
  console.log(`::set-output name=frame_time::${results.frameTime.avg}`);
  console.log(`::set-output name=jank::${results.jank.maxFrameTime}`);
}

function compareResults(current, baseline) {
  log('\n========================================', 'cyan');
  log('        COMPARISON VS BASELINE         ', 'cyan');
  log('========================================\n', 'cyan');

  const compare = (name, curr, base, unit, lowerIsBetter = true) => {
    const diff = curr - base;
    const pct = base !== 0 ? ((diff / base) * 100).toFixed(1) : 'N/A';
    const improved = lowerIsBetter ? diff < 0 : diff > 0;
    const colour = Math.abs(diff / base) < 0.05 ? 'yellow' : improved ? 'green' : 'red';
    const sign = diff > 0 ? '+' : '';
    console.log(
      `  ${name.padEnd(20)} ${curr}${unit} vs ${base}${unit}  ${colours[colour]}(${sign}${diff.toFixed(2)}${unit}, ${sign}${pct}%)${colours.reset}`
    );
  };

  log('FPS (higher is better):', 'yellow');
  compare('Average', current.fps.avg, baseline.fps.avg, ' fps', false);
  compare('Minimum', current.fps.min, baseline.fps.min, ' fps', false);

  log('\nFrame Time (lower is better):', 'yellow');
  compare('Average', current.frameTime.avg, baseline.frameTime.avg, ' ms', true);
  compare('P95', current.frameTime.p95, baseline.frameTime.p95, ' ms', true);

  log('\nJank (lower is better):', 'yellow');
  compare('Worst Frame', current.jank.maxFrameTime, baseline.jank.maxFrameTime, ' ms', true);

  if (current.memory && baseline.memory) {
    log('\nMemory (lower is better):', 'yellow');
    compare('Max Heap', current.memory.maxMB, baseline.memory.maxMB, ' MB', true);
    compare('Growth', current.memory.growthMB, baseline.memory.growthMB, ' MB', true);
  }

  log('\n========================================\n', 'cyan');

  // Return pass/fail status.
  //
  // Frame timings only compare within the same renderer class. Comparing a GPU
  // baseline to a SwiftShader run (or two SwiftShader runs to each other, where
  // the spread across identical code was 1.4 to 49.6 fps) produces a verdict
  // with no relationship to the code under test.
  if (current.renderer?.software || baseline.renderer?.software) {
    log('Frame timings not compared: software renderer involved.', 'yellow');
    log('RESULT: PERFORMANCE OK (timings advisory)', 'green');
    return true;
  }

  const fpsRegression = current.fps.avg < baseline.fps.avg * 0.9;
  const frameTimeRegression = current.frameTime.avg > baseline.frameTime.avg * 1.1;
  const jankRegression = current.jank.maxFrameTime > baseline.jank.maxFrameTime * 1.5;

  if (fpsRegression || frameTimeRegression || jankRegression) {
    log('RESULT: PERFORMANCE REGRESSION DETECTED', 'red');
    return false;
  } else {
    log('RESULT: PERFORMANCE OK', 'green');
    return true;
  }
}

async function main() {
  // Show help if requested
  if (hasArg('help') || hasArg('h')) {
    log('\n🎮 TwilightGame Performance Test\n', 'cyan');
    log('Usage: node scripts/perf-test.js [options]\n', 'reset');
    log('Options:', 'yellow');
    log('  --url URL            Dev server URL (default: http://localhost:4000)', 'dim');
    log('  --warmup MS          Warmup time in ms (default: 5000)', 'dim');
    log('  --duration MS        Test duration in ms (default: 10000)', 'dim');
    log('  --scenario NAME      Test scenario (default: idle)', 'dim');
    log('  --map ID             Map to test on (e.g., village, deep_forest)', 'dim');
    log('  --save FILE          Save results to JSON file', 'dim');
    log('  --compare FILE       Compare results against baseline JSON', 'dim');
    log('  --headed             Show browser window', 'dim');
    log('  --verbose            Show detailed output', 'dim');
    log('\nDevice Throttling:', 'yellow');
    log('  --device NAME        Emulate device (ipad, ipad-mini, ipad-old, android-budget)', 'dim');
    log('  --cpu N              CPU throttle factor (1=none, 4=4x slower, 6=6x slower)', 'dim');
    log('\nDevice Profiles:', 'yellow');
    log('  ipad               iPad Air 2 / iPad Mini 4 (4x CPU throttle)', 'dim');
    log('  ipad-mini          iPad Mini 4 (4x CPU throttle)', 'dim');
    log('  ipad-old           iPad 4th Gen 2012 (6x CPU throttle) - very slow', 'dim');
    log('  android-budget     Budget Android Tablet (4x CPU throttle)', 'dim');
    log('\nScenarios:', 'yellow');
    log('  idle               Just let the game run (default)', 'dim');
    log('  movement           Move in all 4 directions', 'dim');
    log('  continuous-movement  Keep moving diagonally', 'dim');
    log('  explore            Explore around the map', 'dim');
    log('  diagonal           Diagonal movement patterns', 'dim');
    log('  stress             Rapid input stress test', 'dim');
    log('  npc                Walk and interact with NPCs', 'dim');
    log('\nExamples:', 'yellow');
    log('  npm run perf                              # Basic test', 'dim');
    log('  npm run perf -- --map village --duration 30000', 'dim');
    log('  npm run perf -- --scenario stress --headed', 'dim');
    log('  npm run perf:baseline                     # Save baseline', 'dim');
    log('  npm run perf:compare                      # Compare to baseline', 'dim');
    log('  npm run perf:ipad                         # Test on old iPad (throttled)', 'dim');
    log('  npm run perf:ipad -- --headed             # Watch throttled test', 'dim');
    log('  npm run perf -- --cpu 4 --scenario stress # Custom throttle', 'dim');
    log('');
    process.exit(0);
  }

  log('\n🎮 TwilightGame Performance Test\n', 'cyan');
  log(`URL: ${CONFIG.url}`, 'dim');
  log(`Warmup: ${CONFIG.warmupMs / 1000}s | Duration: ${CONFIG.durationMs / 1000}s`, 'dim');
  log(`Scenario: ${CONFIG.scenario}${CONFIG.map ? ` on map: ${CONFIG.map}` : ''}`, 'dim');
  log(`Mode: ${CONFIG.headed ? 'Headed (visible)' : 'Headless'}`, 'dim');

  // Device throttling info
  const deviceProfile = CONFIG.device ? DEVICE_PROFILES[CONFIG.device] : null;
  if (deviceProfile) {
    log(`Device: ${deviceProfile.name}`, 'yellow');
    log(`  CPU Throttle: ${deviceProfile.cpuThrottle}x slowdown`, 'dim');
    log(`  Viewport: ${deviceProfile.viewport.width}x${deviceProfile.viewport.height} @ ${deviceProfile.viewport.deviceScaleFactor}x DPR`, 'dim');
  } else if (CONFIG.cpuThrottle > 1) {
    log(`CPU Throttle: ${CONFIG.cpuThrottle}x slowdown`, 'yellow');
  }
  log('');

  let browser;
  try {
    // Launch browser
    log('Launching browser...', 'dim');
    browser = await launchBrowser({ headed: CONFIG.headed });

    const page = await browser.newPage();

    // Listen for page errors
    page.on('pageerror', err => {
      log(`  PAGE ERROR: ${err.message}`, 'red');
    });

    // In verbose mode, log browser console messages
    if (CONFIG.verbose) {
      page.on('console', msg => {
        const text = msg.text();
        if (text.includes('TextureManager') || text.includes('PixiJS')) {
          log(`  BROWSER: ${text}`, 'dim');
        }
      });
    }

    // Get device profile if specified
    const profile = CONFIG.device ? DEVICE_PROFILES[CONFIG.device] : null;

    // Set viewport - use device profile or default game size
    if (profile) {
      await page.setViewport(profile.viewport);
      await page.setUserAgent(profile.userAgent);
      log(`  Applied ${profile.name} viewport and user agent`, 'dim');
    } else {
      await page.setViewport({ width: 1280, height: 720 });
    }

    // Apply CPU throttling via Chrome DevTools Protocol
    const cpuThrottleFactor = profile?.cpuThrottle || CONFIG.cpuThrottle;
    if (cpuThrottleFactor > 1) {
      const client = await page.createCDPSession();
      await client.send('Emulation.setCPUThrottlingRate', { rate: cpuThrottleFactor });
      log(`  Applied ${cpuThrottleFactor}x CPU throttling`, 'dim');
    }

    // Enable performance metrics
    await page.setCacheEnabled(false);

    // Inject pre-made character into localStorage to skip character creation
    log('Setting up test character...', 'dim');
    await setupTestCharacter(page, CONFIG.url);

    // Navigate to game
    log(`Navigating to ${CONFIG.url}...`, 'dim');
    try {
      // Use 'load' instead of 'networkidle2' since PixiJS texture loading keeps connections open
      await page.goto(CONFIG.url, { waitUntil: 'load', timeout: 60000 });
    } catch (error) {
      log(`\nError: Could not connect to ${CONFIG.url}`, 'red');
      log('Make sure the dev server is running: npm run dev\n', 'yellow');
      process.exit(1);
    }

    // Wait for game to initialise
    await waitForGame(page);

    RENDERER = await detectRenderer(page);
    log(`  Renderer: ${RENDERER.name}${RENDERER.software ? ' (SOFTWARE — frame timings are not comparable to real hardware)' : ''}`,
        RENDERER.software ? 'yellow' : 'dim');

    // Log current game state
    await logCurrentGameState(page);

    // Navigate to specific map if requested, otherwise use village for CI
    const targetMap = CONFIG.map || (isGitHubActions ? 'village' : null);
    if (targetMap) {
      await navigateToMap(page, targetMap);
      await logCurrentGameState(page);
    }

    // Pin the world clock and the weather. In-game time follows the real clock,
    // so an unpinned run measures whatever hour CI happened to start at: at
    // night the village lamp is lit and the darkness overlay uploads on every
    // camera frame, by day it does nothing; rain adds a thousand particles. The
    // scene-cost and work-rate gates are only comparable run to run if every
    // run sees the same world. `--time HH` and `--weather X` override for
    // measuring a specific condition (e.g. `--time 22` for the lit village).
    await pinWorld(page, { hour: parseInt(CONFIG.time, 10), weather: CONFIG.weather });

    // Warmup period
    log(`Warming up for ${CONFIG.warmupMs / 1000}s...`, 'dim');
    await new Promise((r) => setTimeout(r, CONFIG.warmupMs));

    // Scene cost at rest: map loaded, textures settled, player still on the spawn
    // tile. This is the one measurement in the whole run that is genuinely
    // reproducible, because it does not depend on how far the scripted movement
    // got — and on a 1.4 fps software renderer, "hold W for one second" covers a
    // very different distance than it does at 60 fps. Everything measured during
    // the scenario inherits that variance; this does not.
    AT_REST = await page.evaluate(() => window.__PERF_MONITOR__?.getMetrics()?.scene ?? null);
    if (AT_REST) {
      log(`  Scene at rest: ${AT_REST.visibleSprites}/${AT_REST.sprites} sprites drawn, ` +
          `${AT_REST.textures} textures (${AT_REST.textureMB} MB), depth ${AT_REST.maxDepth}`, 'dim');
    }

    // Run scenario
    await runScenario(page, CONFIG.scenario);

    // Collect performance data
    log(`Collecting metrics for ${CONFIG.durationMs / 1000}s...`, 'dim');
    const samples = await collectPerformanceData(page, CONFIG.durationMs);

    // Cleanup scenario
    await stopWalker(page);
    if (CONFIG.scenario === 'continuous-movement') {
      await page.keyboard.up('KeyW');
      await page.keyboard.up('KeyD');
    }

    // Take screenshot at end of test (overwrites previous)
    const screenshotPath = resolve(process.cwd(), 'perf-screenshot.png');
    await page.screenshot({ path: screenshotPath, fullPage: false });
    log(`Screenshot saved: ${screenshotPath}`, 'dim');

    // Analyse results
    const results = analyseResults(samples);

    if (!results) {
      log('Error: No performance data collected', 'red');
      process.exit(1);
    }

    // Print results
    printResults(results);

    // Save results if requested
    if (CONFIG.saveFile) {
      const filepath = resolve(process.cwd(), CONFIG.saveFile);
      writeFileSync(filepath, JSON.stringify(results, null, 2));
      log(`Results saved to: ${filepath}`, 'green');
    }

    // Compare with baseline if requested
    let passed = true;
    if (CONFIG.compareFile) {
      const baselinePath = resolve(process.cwd(), CONFIG.compareFile);
      if (existsSync(baselinePath)) {
        const baseline = JSON.parse(readFileSync(baselinePath, 'utf-8'));
        passed = compareResults(results, baseline);
      } else {
        log(`Baseline file not found: ${baselinePath}`, 'yellow');
      }
    }

    await browser.close();

    // Exit with appropriate code
    process.exit(passed ? 0 : 1);
  } catch (error) {
    log(`\nError: ${error.message}`, 'red');
    if (CONFIG.verbose) {
      console.error(error);
    }
    if (browser) {
      await browser.close();
    }
    process.exit(1);
  }
}

main();
