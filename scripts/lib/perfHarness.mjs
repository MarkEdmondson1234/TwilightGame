/**
 * Shared harness for the headless performance scripts.
 *
 * Boots the game the way a player does (saved character, Play, skip the
 * season cutscene, wait for textures), teleports between maps through the
 * game's own transition path, pins the in-game clock and weather so runs are
 * comparable, and reads the in-page performance monitor.
 *
 * Used by scripts/perf-test.js (ad-hoc measurement, device profiles) and
 * scripts/perf-ci.mjs (the CI gate). Keep the two on this one boot recipe:
 * the harness "teleporting" by calling mapManager.loadMap() directly once
 * meant every bear_cave number CI reported was a village measurement.
 */

import puppeteer from 'puppeteer';

/** Chrome flags for a headless run that can draw the WebGL world (SwiftShader). */
export const LAUNCH_ARGS = [
  '--enable-precise-memory-info', // Enable detailed memory metrics
  '--disable-gpu-vsync', // Disable vsync for consistent measurements
  '--disable-frame-rate-limit', // Remove frame rate cap
  '--enable-webgl', // Enable WebGL for PixiJS
  '--use-gl=angle', // Use ANGLE for WebGL (works better with PixiJS)
  '--use-angle=swiftshader', // Software rendering backend for ANGLE
  '--no-sandbox', // Required for some CI environments
  '--disable-dev-shm-usage', // Fixes memory issues in Docker/CI
];

/**
 * Launch Chrome for a measurement run.
 *
 * CDP round-trips queue behind real frames, and on a slow CI runner those
 * frames take seconds — an end-of-test screenshot can then exceed Puppeteer's
 * default 180s protocolTimeout and kill the whole run before results are
 * written (seen 2026-09-04 on main). 10 min bounds a genuinely stuck call
 * while absorbing that; the workflow's timeout-minutes is the outer bound.
 */
export function launchBrowser({ headed = false } = {}) {
  return puppeteer.launch({
    headless: headed ? false : 'new',
    protocolTimeout: 600_000,
    args: LAUNCH_ARGS,
  });
}

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

export function log(message, colour = 'reset') {
  console.log(`${colours[colour]}${message}${colours.reset}`);
}


/**
 * Ask the GPU what it actually is.
 *
 * `gl.RENDERER` is masked to "WebKit WebGL" for fingerprinting reasons, so it
 * tells you nothing; WEBGL_debug_renderer_info gives the real string. This
 * matters because every fps number this script produces is only meaningful on
 * hardware. On SwiftShader (CI) the frame time is the software rasteriser's,
 * not the game's, and reporting it as a grade invents a finding.
 *
 * Detecting it here rather than keying off `GITHUB_ACTIONS` means the gate
 * re-arms itself automatically the day these tests move to a GPU runner.
 */
export const SOFTWARE_RENDERER_MARKERS = ['swiftshader', 'llvmpipe', 'software', 'lavapipe', 'mesa offscreen'];

export async function detectRenderer(page) {
  const info = await page.evaluate(() => {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) return { available: false, name: 'none' };
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      return {
        available: true,
        name: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
        vendor: ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) : '',
      };
    } catch (e) {
      return { available: false, name: 'error', error: e.message };
    }
  });

  const name = String(info.name || 'unknown');
  const software = SOFTWARE_RENDERER_MARKERS.some((m) => name.toLowerCase().includes(m));

  return { ...info, name, software };
}

export async function waitForGame(page) {
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

  // Get past the title screen — see dismissTitleScreen for why this matters
  await dismissTitleScreen(page);

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

export async function waitForTexturesLoaded(page, timeoutMs = 30000) {
  log('  Waiting for textures to load...', 'dim');
  const startTime = Date.now();
  let lastLoadedCount = 0;
  let stableCount = 0;
  const MIN_TEXTURES = 10; // Lowered - some textures should load quickly if WebGL works

  // First, check if WebGL/PixiJS is available
  const webglStatus = await page.evaluate(() => {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      return {
        webglAvailable: !!gl,
        renderer: gl ? gl.getParameter(gl.RENDERER) : 'none',
      };
    } catch (e) {
      return { webglAvailable: false, error: e.message };
    }
  });

  log(`  WebGL: ${webglStatus.webglAvailable ? 'available' : 'NOT available'} (${webglStatus.renderer || 'unknown'})`, 'dim');

  // If WebGL isn't available, skip texture check with a warning (don't fail)
  if (!webglStatus.webglAvailable) {
    log(`  ⚠ WebGL not available in headless Chrome - skipping texture check`, 'yellow');
    log(`    Performance metrics will be collected but may not reflect WebGL rendering`, 'yellow');
    return;
  }

  // Poll for textures to finish loading (with shorter timeout since we know WebGL works)
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
    // Don't fail hard - just warn. PixiJS may have failed to initialize in headless Chrome.
    log(`  ⚠ No textures loaded after ${timeoutMs / 1000}s - PixiJS may not be working in headless mode`, 'yellow');
    log(`    This is expected in some CI environments. Performance metrics will still be collected.`, 'dim');
  } else if (finalStats.loaded < MIN_TEXTURES) {
    log(`  ⚠ Only ${finalStats.loaded} textures loaded (expected ${MIN_TEXTURES}+)`, 'yellow');
  } else {
    log(`  ✓ Textures loaded (${finalStats.loaded} total)`, 'dim');
  }
}

export async function skipCharacterCreation(page) {
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

/**
 * Click through the title screen, and skip the season cutscene if Play starts one.
 *
 * These tests used to ignore the splash entirely and still measure the game,
 * but only because the splash's z-index class was never generated by Tailwind,
 * leaving it stacked below the canvas where it cost nothing. With that fixed it
 * is a full-screen background image composited over every frame, plus an
 * animate-pulse button — worth roughly 15 fps of the ~21 fps this software
 * renderer manages, i.e. the numbers stopped describing the game at all.
 *
 * Measuring what the player actually sees means starting where they start:
 * press Play, skip the cutscene, then measure.
 */
export async function dismissTitleScreen(page) {
  const clicked = await page.evaluate(() => {
    const play = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent && b.textContent.trim() === 'Play'
    );
    if (!play) return false;
    play.click();
    return true;
  });

  if (!clicked) {
    log('  No title screen present', 'dim');
    return;
  }
  log('  Title screen dismissed (Play)', 'dim');

  // Play only starts the season cutscene when the season has actually turned,
  // so skip conditionally rather than assuming one is running.
  const skipped = await page.evaluate(() => {
    const manager = window.cutsceneManager;
    if (!manager || !manager.getState().isPlaying) return false;
    manager.endCutscene();
    return true;
  });
  if (skipped) log('  Season cutscene skipped', 'dim');

  try {
    await page.waitForFunction(
      () => {
        const stillOnTitle = Array.from(document.querySelectorAll('button')).some(
          (b) => b.textContent && b.textContent.trim() === 'Play'
        );
        const cutscenePlaying = !!(window.cutsceneManager && window.cutsceneManager.getState().isPlaying);
        return !stillOnTitle && !cutscenePlaying;
      },
      { timeout: 15000 }
    );
  } catch (e) {
    log('  Warning: title screen/cutscene did not clear in 15s', 'yellow');
  }
}

export async function verifyInGame(page) {
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

export async function navigateToMap(page, mapId) {
  log(`Navigating to map: ${mapId}`, 'cyan');

  // Teleport through the game's own transition path (window.debugTeleport,
  // bound by App.tsx). Calling mapManager.loadMap() directly, as this used to,
  // changes the manager but not React's map state: the HUD label changed and
  // the scene kept drawing the village, and every "bear_cave" number this
  // harness ever reported was a village measurement.
  const result = await page.evaluate((targetMap) => {
    if (typeof window.debugTeleport !== 'function') {
      return { success: false, error: 'window.debugTeleport not available' };
    }
    try {
      window.debugTeleport(targetMap);
      const currentMap = window.mapManager?.getCurrentMap();
      return {
        success: true,
        mapId: currentMap?.id || 'unknown',
        mapSize: currentMap ? `${currentMap.width}x${currentMap.height}` : 'unknown',
      };
    } catch (e) {
      return { success: false, error: e.message };
    }
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

export async function logCurrentGameState(page) {
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
export async function setupTestCharacter(page, url) {
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

export async function pinWorld(page, { hour = 10, weather = 'clear' } = {}) {
  const applied = await page.evaluate(({ hour, weather }) => {
    const tm = window.TimeManager;
    const gs = window.gameState;
    if (!tm || !gs) return null;
    tm.setTimeOverride({ season: 'Spring', day: 5, hour, minute: 0 });
    gs.setAutomaticWeather(false);
    gs.setWeather(weather);
    return { time: tm.getCurrentTime().timeOfDay, weather: gs.getWeather() };
  }, { hour, weather });
  if (applied) {
    log(`  World pinned: spring day 5, ${hour}:00 (${applied.time}), weather ${applied.weather}`, 'dim');
  } else {
    log('  Warning: could not pin world time/weather (globals missing)', 'yellow');
  }
}

export async function getMetrics(page) {
  return await page.evaluate(() => {
    const monitor = window.__PERF_MONITOR__;
    if (!monitor) return null;
    return monitor.getMetrics();
  });
}

/** Background walker for the 'movement' scenario: one key held at a time, turning every second. */
const WALK_KEYS = ['KeyW', 'KeyD', 'KeyS', 'KeyA'];
let walker = null;

export function startWalker(page) {
  let i = 0;
  let held = null;
  const step = async () => {
    try {
      if (held) await page.keyboard.up(held);
      held = WALK_KEYS[i++ % WALK_KEYS.length];
      await page.keyboard.down(held);
    } catch {
      // page gone — stopWalker will clear the timer
    }
  };
  walker = { timer: setInterval(step, 1000), release: async () => { if (held) await page.keyboard.up(held).catch(() => {}); } };
  void step();
}

export async function stopWalker() {
  if (!walker) return;
  clearInterval(walker.timer);
  await walker.release();
  walker = null;
}
