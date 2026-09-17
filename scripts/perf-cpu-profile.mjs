#!/usr/bin/env node
/**
 * CPU profile of the game loop under CPU throttling — the measurement that
 * sees what the headless fps harness cannot.
 *
 * `npm run perf` renders through SwiftShader, so it is fill-rate bound and its
 * fps barely moved (39.7 → 42.5) for a change that removed most of the
 * per-frame CPU work. `page.metrics()` script time is no better there: the
 * software GL work counts as script. What does work is a V8 sampling profile
 * over a known window, aggregated by function name, with the CPU throttled to
 * stand in for an old iPad. It found the day-one wins in
 * design_docs/planned/PERFORMANCE_MOBILE_PLAN.md and is how the remaining §6A
 * work should be measured.
 *
 * Usage (dev server running):
 *   node scripts/perf-cpu-profile.mjs [url] [label] [--map village] [--throttle 4] [--window 10000]
 *
 * Prints, for a 10 s idle window and a 10 s walking window, the inclusive
 * main-thread ms per second of the functions that matter (React's
 * performWorkOnRoot, App, renderTiles, renderSprites, ...). Run it on main and
 * on the branch and put both tables in the PR. Function names survive because
 * the dev server serves unminified code — do not point it at a production build.
 *
 * With `--who-sets-state` it instead samples at 100 µs and prints the caller
 * chains above React's dispatchSetState, i.e. which code is asking React to
 * re-render during the idle window.
 */
import puppeteer from 'puppeteer';

const args = process.argv.slice(2);
const positional = args.filter((a) => !a.startsWith('--'));
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const url = positional[0] || 'http://localhost:4000/TwilightGame/';
const label = positional[1] || 'run';
const map = flag('map', 'village');
const throttle = Number(flag('throttle', '4'));
const WINDOW_MS = Number(flag('window', '10000'));
const whoSetsState = args.includes('--who-sets-state');

const WANT = [
  'performWorkOnRoot', 'App ', 'commitRoot', 'renderTiles', 'renderTile', 'renderSprites', 'renderShadows',
  'cullSprites', 'renderNPCs', 'renderItems', '_compositeDarkness', 'updateLights', 'flushSave',
  'renderRemotePlayers', 'getCurrentMapNPCs', 'isNPCVisible', 'checkAndTriggerCutscenes',
  'getLavaLakeAnchor', 'getRestingFurnitureEffect', 'updateNPCs', 'updatePlayerMovement',
];

const browser = await puppeteer.launch({
  headless: 'new',
  protocolTimeout: 600_000,
  args: ['--enable-precise-memory-info', '--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader', '--no-sandbox', '--disable-dev-shm-usage'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1366, height: 904 });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

// Same boot recipe as scripts/perf-test.js: a saved character so the creator
// is skipped, click Play, skip any season cutscene, wait for the world.
await page.goto(new URL(url).origin, { waitUntil: 'domcontentloaded' });
await page.evaluate(() => {
  localStorage.setItem('twilight_game_state', JSON.stringify({
    selectedCharacter: { characterId: 'character1', name: 'TestPlayer', skin: 'light', hairStyle: 'short', hairColor: 'brown', eyeColor: 'blue', clothesStyle: 'shirt', clothesColor: 'green', shoesStyle: 'boots', shoesColor: 'brown', glasses: 'none', weapon: 'sword' },
    gold: 100, forestDepth: 0, caveDepth: 0, currentMapId: 'village', playerPosition: { x: 15, y: 15 },
  }));
});
await page.goto(url, { waitUntil: 'networkidle2', timeout: 120000 });
await page.waitForFunction(() => Array.from(document.querySelectorAll('button')).some((b) => b.textContent?.trim() === 'Play'), { timeout: 60000 });
await page.evaluate(() => Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.trim() === 'Play').click());
await page.evaluate(() => { const m = window.cutsceneManager; if (m?.getState().isPlaying) m.endCutscene(); });
await page.waitForFunction(() => window.mapManager?.getCurrentMap() && !Array.from(document.querySelectorAll('button')).some((b) => b.textContent?.trim() === 'Play'), { timeout: 60000 });
if (map !== 'village') {
  await page.evaluate((m) => window.debugTeleport?.(m), map);
}
// Pin the world like perf-test.js does, so runs compare.
await page.evaluate(() => {
  window.TimeManager?.setTimeOverride({ season: 'Spring', day: 5, hour: 10, minute: 0 });
  window.gameState?.setAutomaticWeather(false);
  window.gameState?.setWeather('clear');
});
await new Promise((r) => setTimeout(r, 8000)); // settle textures

const client = await page.createCDPSession();
await client.send('Emulation.setCPUThrottlingRate', { rate: throttle });

const idle = () => new Promise((r) => setTimeout(r, WINDOW_MS));
const walking = async () => {
  await page.keyboard.down('KeyD');
  await new Promise((r) => setTimeout(r, WINDOW_MS / 2));
  await page.keyboard.up('KeyD');
  await page.keyboard.down('KeyA');
  await new Promise((r) => setTimeout(r, WINDOW_MS / 2));
  await page.keyboard.up('KeyA');
};

async function captureProfile(intervalUs, during) {
  await client.send('Profiler.enable');
  await client.send('Profiler.setSamplingInterval', { interval: intervalUs });
  await client.send('Profiler.start');
  const t0 = Date.now();
  await during();
  const dt = Date.now() - t0;
  const { profile } = await client.send('Profiler.stop');
  await client.send('Profiler.disable');
  const byId = new Map(profile.nodes.map((n) => [n.id, n]));
  const parent = new Map();
  for (const n of profile.nodes) for (const c of n.children || []) parent.set(c, n.id);
  const name = (n) => `${n.callFrame.functionName} @${n.callFrame.url.split('/').pop().split('?')[0]}`;
  return { profile, byId, parent, name, dt };
}

async function inclusiveTable(windowName, during) {
  const { profile, byId, parent, name, dt } = await captureProfile(500, during);
  const total = new Map();
  for (let i = 0; i < profile.samples.length; i++) {
    const t = profile.timeDeltas[i] || 0;
    const seen = new Set();
    let cur = profile.samples[i];
    while (cur !== undefined && !seen.has(cur)) {
      seen.add(cur);
      const key = name(byId.get(cur));
      total.set(key, (total.get(key) || 0) + t);
      cur = parent.get(cur);
    }
  }
  const rows = [...total].filter(([k]) => WANT.some((w) => k.includes(w))).sort((a, b) => b[1] - a[1]);
  console.log(`\n== ${label} ${windowName} (${dt} ms wall, ${throttle}x throttle, inclusive ms/s) ==`);
  for (const [k, v] of rows.slice(0, 25)) console.log(`${((v / 1000 / dt) * 1000).toFixed(1).padStart(7)}  ${k}`);
}

async function stateSetters(windowName, during) {
  const { profile, byId, parent, name } = await captureProfile(100, during);
  const counts = new Map();
  for (const id of profile.samples) {
    const chain = [];
    let cur = id;
    while (cur !== undefined) { chain.push(byId.get(cur)); cur = parent.get(cur); }
    const i = chain.findIndex((n) => /dispatchSetState|dispatchReducerAction|forceStoreRerender/.test(n.callFrame.functionName));
    if (i < 0) continue;
    const callers = chain.slice(i + 1, i + 5).map((n) => `${name(n)}:${n.callFrame.lineNumber}`).join(' < ');
    counts.set(callers, (counts.get(callers) || 0) + 1);
  }
  console.log(`\n== ${label} ${windowName}: samples inside setState, by caller chain ==`);
  for (const [k, v] of [...counts].sort((a, b) => b[1] - a[1]).slice(0, 15)) console.log(`${String(v).padStart(5)}  ${k}`);
}

if (whoSetsState) {
  await stateSetters('idle', idle);
  await stateSetters('walking', walking);
} else {
  await inclusiveTable('idle', idle);
  await inclusiveTable('walking', walking);
}
if (errors.length) console.log(`${label}\tPAGE ERRORS:`, errors);
await browser.close();
