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

import puppeteer from 'puppeteer';
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

// Check if running in GitHub Actions
const isGitHubActions = process.env.GITHUB_ACTIONS === 'true' || CONFIG.github;

// ANSI colour codes for terminal output
const colours = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
};

function log(message, colour = 'reset') {
  console.log(`${colours[colour]}${message}${colours.reset}`);
}

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

async function waitForGame(page) {
  log('Waiting for game to initialise...', 'dim');

  // First wait for the page to fully load
  try {
    await page.waitForFunction(
      () => document.readyState === 'complete',
      { timeout: 10000 }
    );
    log('  Page loaded', 'dim');
  } catch (e) {
    log('  Page load timeout, continuing...', 'yellow');
  }

  // Wait a bit for React to hydrate
  await new Promise(r => setTimeout(r, 2000));

  // Check for and skip character creation screen
  await skipCharacterCreation(page);

  // Check what elements are on the page
  const pageInfo = await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    const divs = document.querySelectorAll('div').length;
    const hasPerf = typeof window.__PERF_MONITOR__ !== 'undefined';
    const hasMapManager = typeof window.mapManager !== 'undefined';
    return {
      hasCanvas: !!canvas,
      divCount: divs,
      hasPerfMonitor: hasPerf,
      hasMapManager: hasMapManager,
    };
  });

  // Always log in headless mode since we can't see the browser
  log(`  Canvas: ${pageInfo.hasCanvas}, Divs: ${pageInfo.divCount}, PerfMonitor: ${pageInfo.hasPerfMonitor}, MapManager: ${pageInfo.hasMapManager}`, 'dim');

  // Wait for the canvas OR a substantial DOM OR the mapManager to be ready
  // The mapManager being ready indicates the game has fully initialized
  await page.waitForFunction(
    () => {
      const canvas = document.querySelector('canvas');
      const divs = document.querySelectorAll('div').length;
      const hasMapManager = typeof window.mapManager !== 'undefined';
      const hasPerfMonitor = typeof window.__PERF_MONITOR__ !== 'undefined';
      // Game is ready if: canvas exists, OR lots of divs, OR mapManager is ready
      return canvas || divs > 50 || (hasMapManager && hasPerfMonitor);
    },
    { timeout: 30000 }
  );
  log('  Game container found', 'dim');

  // Wait for performance monitor to be available (should already be true but double-check)
  await page.waitForFunction(
    () => typeof window.__PERF_MONITOR__ !== 'undefined',
    { timeout: 5000 }
  );
  log('  Performance monitor ready', 'dim');

  // Wait for all textures to finish loading
  await waitForTexturesLoaded(page);

  // Wait a bit for the game loop to start
  await new Promise(r => setTimeout(r, 1000));

  log('Game initialised!', 'green');
}

async function waitForTexturesLoaded(page, timeoutMs = 60000) {
  log('  Waiting for textures to load...', 'dim');
  const startTime = Date.now();
  let lastLoadedCount = 0;
  let stableCount = 0;
  const MIN_TEXTURES = 50; // Expect at least 50 textures for a fully loaded game

  // Poll for textures to finish loading
  // Consider "loaded" when: no pending loads AND loaded count is stable AND count > MIN_TEXTURES
  while (Date.now() - startTime < timeoutMs) {
    const stats = await page.evaluate(() => {
      if (typeof window.textureManager !== 'undefined' && window.textureManager.getStats) {
        return window.textureManager.getStats();
      }
      return { loaded: 0, loading: 0 };
    });

    const elapsed = Math.round((Date.now() - startTime) / 1000);

    // Check if loading is complete (no pending AND count is stable AND count >= MIN_TEXTURES)
    if (stats.loading === 0 && stats.loaded >= MIN_TEXTURES) {
      if (stats.loaded === lastLoadedCount) {
        stableCount++;
        if (stableCount >= 3) { // Stable for 1.5 seconds (3 x 500ms checks)
          log(`  ✓ All textures loaded (${stats.loaded} textures) in ${elapsed}s`, 'dim');
          return;
        }
      } else {
        stableCount = 0;
      }
      lastLoadedCount = stats.loaded;
    } else if (stats.loading > 0) {
      // Actively loading
      stableCount = 0;
      lastLoadedCount = stats.loaded;
      // Log progress every 2 seconds
      if (elapsed > 0 && elapsed % 2 === 0) {
        log(`    Loading: ${stats.loading} pending, ${stats.loaded} loaded... (${elapsed}s)`, 'dim');
      }
    } else if (stats.loaded > 0 && stats.loaded < MIN_TEXTURES) {
      // Some textures loaded but not enough yet - more may be coming
      stableCount = 0;
      lastLoadedCount = stats.loaded;
      if (elapsed > 0 && elapsed % 3 === 0) {
        log(`    Partial: ${stats.loaded}/${MIN_TEXTURES} textures (${elapsed}s)`, 'dim');
      }
    } else if (stats.loaded === 0) {
      // Still waiting for texture loading to start (React useEffect hasn't run yet)
      stableCount = 0;
      if (elapsed > 0 && elapsed % 5 === 0) {
        log(`    Waiting for React to initialise textures... (${elapsed}s)`, 'dim');
      }
    }

    await new Promise(r => setTimeout(r, 500));
  }

  // Timeout - check final stats
  const finalStats = await page.evaluate(() => {
    if (typeof window.textureManager !== 'undefined') {
      return window.textureManager.getStats();
    }
    return { loaded: 0, loading: 0 };
  });

  if (finalStats.loading > 0) {
    log(`  ⚠ Texture loading timeout (${finalStats.loading} still pending, ${finalStats.loaded} loaded)`, 'yellow');
  } else if (finalStats.loaded === 0) {
    log(`  ✗ FAIL: No textures loaded after ${timeoutMs / 1000}s - this indicates a loading issue!`, 'red');
    throw new Error('Texture loading failed - textureManager reports 0 textures');
  } else if (finalStats.loaded < MIN_TEXTURES) {
    log(`  ⚠ Only ${finalStats.loaded} textures loaded (expected ${MIN_TEXTURES}+)`, 'yellow');
  } else {
    log(`  ✓ Textures loaded (${finalStats.loaded} total)`, 'dim');
  }
}

async function skipCharacterCreation(page) {
  log('  Checking for character creation screen...', 'dim');

  // Try multiple times to find and click start button
  let attempts = 0;
  const maxAttempts = 5;

  while (attempts < maxAttempts) {
    const clicked = await page.evaluate(() => {
      // Look for buttons with common start game text
      const buttons = Array.from(document.querySelectorAll('button'));
      const startButton = buttons.find(
        (btn) =>
          btn.textContent?.toLowerCase().includes('start') ||
          btn.textContent?.toLowerCase().includes('play') ||
          btn.textContent?.toLowerCase().includes('begin') ||
          btn.textContent?.toLowerCase().includes('confirm')
      );

      if (startButton) {
        startButton.click();
        return true;
      }
      return false;
    });

    if (clicked) {
      log('  Clicked start button', 'dim');
      await new Promise((r) => setTimeout(r, 1500));

      // Verify we're in the game by checking for game elements
      const inGame = await verifyInGame(page);
      if (inGame) {
        log('  Verified: Now in game world', 'dim');
        return;
      }
    }

    attempts++;
    await new Promise((r) => setTimeout(r, 500));
  }

  // Check if we're already in game
  const inGame = await verifyInGame(page);
  if (inGame) {
    log('  Already in game world', 'dim');
  } else {
    log('  Warning: Could not verify game state', 'yellow');
  }
}

async function verifyInGame(page) {
  return await page.evaluate(() => {
    // Check for signs we're in the actual game:
    // 1. MapManager has a current map loaded
    // 2. No character creator modal visible
    // 3. Game container exists

    const hasMapManager = typeof window.mapManager !== 'undefined';
    const hasCurrentMap = hasMapManager && window.mapManager.getCurrentMap();
    const hasCharacterCreator = document.querySelector('[class*="character-creator"]') ||
                                 document.querySelector('button')?.textContent?.toLowerCase().includes('start');

    // We're in game if we have a map and no character creator
    return hasCurrentMap && !hasCharacterCreator;
  });
}

async function navigateToMap(page, mapId) {
  log(`Navigating to map: ${mapId}`, 'cyan');

  // Use the game's map manager to teleport to a specific map
  const result = await page.evaluate((targetMap) => {
    // Access the mapManager through the window (if exposed)
    if (typeof window.mapManager !== 'undefined') {
      try {
        window.mapManager.loadMap(targetMap);
        const currentMap = window.mapManager.getCurrentMap();
        return {
          success: true,
          mapId: currentMap?.id || 'unknown',
          mapSize: currentMap ? `${currentMap.width}x${currentMap.height}` : 'unknown',
        };
      } catch (e) {
        return { success: false, error: e.message };
      }
    }
    return { success: false, error: 'mapManager not available' };
  }, mapId);

  if (result.success) {
    log(`  Loaded map: ${result.mapId} (${result.mapSize})`, 'dim');
    // Wait for new map's textures to load
    await waitForTexturesLoaded(page, 15000);
    await new Promise((r) => setTimeout(r, 500));
  } else {
    log(`  Could not navigate to ${mapId}: ${result.error}`, 'yellow');
  }
}

async function logCurrentGameState(page) {
  const state = await page.evaluate(() => {
    const mapManager = window.mapManager;
    const currentMap = mapManager?.getCurrentMap();

    return {
      hasMapManager: !!mapManager,
      currentMapId: currentMap?.id || 'none',
      mapSize: currentMap ? `${currentMap.width}x${currentMap.height}` : 'N/A',
      hasPerfMonitor: typeof window.__PERF_MONITOR__ !== 'undefined',
    };
  });

  log(`  Game state: Map=${state.currentMapId} (${state.mapSize}), PerfMonitor=${state.hasPerfMonitor}`, 'dim');
  return state;
}

/**
 * Set up a test character in localStorage to skip character creation
 * This needs to be done BEFORE navigating to the game
 */
async function setupTestCharacter(page, url) {
  // Navigate to the origin first to set localStorage
  const origin = new URL(url).origin;
  await page.goto(origin, { waitUntil: 'domcontentloaded' });

  // Pre-made test character and game state
  const testGameState = {
    selectedCharacter: {
      characterId: 'character1',
      name: 'TestPlayer',
      skin: 'light',
      hairStyle: 'short',
      hairColor: 'brown',
      eyeColor: 'blue',
      clothesStyle: 'shirt',
      clothesColor: 'green',
      shoesStyle: 'boots',
      shoesColor: 'brown',
      glasses: 'none',
      weapon: 'sword',
    },
    gold: 100,
    forestDepth: 0,
    caveDepth: 0,
    currentMapId: 'village',
    playerPosition: { x: 15, y: 15 },
  };

  await page.evaluate((state) => {
    localStorage.setItem('twilight_game_state', JSON.stringify(state));
  }, testGameState);

  log('  Injected test character into localStorage', 'dim');
}

async function getMetrics(page) {
  return await page.evaluate(() => {
    const monitor = window.__PERF_MONITOR__;
    if (!monitor) return null;
    return monitor.getMetrics();
  });
}

async function runScenario(page, scenario) {
  log(`Running scenario: ${scenario}`, 'cyan');

  switch (scenario) {
    case 'idle':
      // Just let the game run
      break;

    case 'movement':
      // Simulate player movement (WASD)
      await page.keyboard.down('KeyW');
      await new Promise((r) => setTimeout(r, 1000));
      await page.keyboard.up('KeyW');
      await page.keyboard.down('KeyD');
      await new Promise((r) => setTimeout(r, 1000));
      await page.keyboard.up('KeyD');
      await page.keyboard.down('KeyS');
      await new Promise((r) => setTimeout(r, 1000));
      await page.keyboard.up('KeyS');
      await page.keyboard.down('KeyA');
      await new Promise((r) => setTimeout(r, 1000));
      await page.keyboard.up('KeyA');
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

    // Final snapshot values
    finalMetrics: samples[samples.length - 1],
  };
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
`;

  // Write to GitHub step summary if available
  if (process.env.GITHUB_STEP_SUMMARY) {
    writeFileSync(process.env.GITHUB_STEP_SUMMARY, summary, { flag: 'a' });
    console.log('Wrote summary to GITHUB_STEP_SUMMARY');
  }

  // Output annotations for warnings/errors
  if (results.fps.avg < 30) {
    console.log(`::error::Critical: Average FPS (${results.fps.avg}) is below 30 fps`);
  } else if (results.fps.avg < 45) {
    console.log(`::warning::Average FPS (${results.fps.avg}) is below target (45 fps)`);
  }

  if (results.jank.maxFrameTime > 100) {
    console.log(`::warning::High jank detected: ${results.jank.maxFrameTime}ms worst frame`);
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

  // Return pass/fail status
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
    browser = await puppeteer.launch({
      headless: CONFIG.headed ? false : 'new',
      args: [
        '--enable-precise-memory-info', // Enable detailed memory metrics
        '--disable-gpu-vsync', // Disable vsync for consistent measurements
        '--disable-frame-rate-limit', // Remove frame rate cap
        '--enable-webgl', // Enable WebGL for PixiJS
        '--use-gl=angle', // Use ANGLE for WebGL (works better with PixiJS)
        '--use-angle=swiftshader', // Software rendering backend for ANGLE
        '--no-sandbox', // Required for some CI environments
        '--disable-dev-shm-usage', // Fixes memory issues in Docker/CI
      ],
    });

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

    // Log current game state
    await logCurrentGameState(page);

    // Navigate to specific map if requested, otherwise use village for CI
    const targetMap = CONFIG.map || (isGitHubActions ? 'village' : null);
    if (targetMap) {
      await navigateToMap(page, targetMap);
      await logCurrentGameState(page);
    }

    // Warmup period
    log(`Warming up for ${CONFIG.warmupMs / 1000}s...`, 'dim');
    await new Promise((r) => setTimeout(r, CONFIG.warmupMs));

    // Run scenario
    await runScenario(page, CONFIG.scenario);

    // Collect performance data
    log(`Collecting metrics for ${CONFIG.durationMs / 1000}s...`, 'dim');
    const samples = await collectPerformanceData(page, CONFIG.durationMs);

    // Cleanup scenario
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
