#!/usr/bin/env node
/**
 * The CI performance gate.
 *
 * Boots the game once, visits each map in perf/budgets.json, and measures the
 * numbers that are a property of the code rather than of the machine running
 * it: how much the scene asks the renderer to draw (sprites, nodes, textures,
 * texture MB, filter and mask passes) and how much work a frame does (App
 * renders, scene rebuilds, NPC draws, save flushes). Each is compared with a
 * ceiling committed in the budgets file. Over the ceiling fails the job and
 * names the row; under it, a PR that improved things lowers the ceiling in the
 * same diff, so the history of gains lives in git.
 *
 * What it deliberately does not do:
 *
 * - Grade frame rate. CI has no GPU; Chrome draws with SwiftShader and this
 *   game is GPU render-bound, so four runs of identical code once spanned 1.4
 *   to 49.6 fps. It is recorded in the results for the curious, never gated.
 * - Compare against the previous run. A floating baseline ratchets: a
 *   regression that lands becomes tomorrow's normal, and a slow runner day
 *   reads as a regression. A ceiling in the repo does neither.
 * - Sample by the clock. The old harness sampled every 500 ms for a fixed
 *   window and produced "No performance data collected" when a slow runner
 *   managed no frames inside it. This one waits for a number of *frames*
 *   (with a generous time cap) — a slow runner takes longer, not nothing.
 *
 * Usage:
 *   node scripts/perf-ci.mjs                 # measure, compare, write report; exit 1 on a breach
 *   node scripts/perf-ci.mjs --update        # rewrite the budgets from this run (see HEADROOM)
 *   node scripts/perf-ci.mjs --map village   # one map only
 *   node scripts/perf-ci.mjs --url http://localhost:4000/TwilightGame/
 *
 * Writes perf-results.json and perf-report.md; touches `regression-detected`
 * on a breach (the workflow's final step keys on it).
 */

import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  log,
  launchBrowser,
  detectRenderer,
  waitForGame,
  navigateToMap,
  setupTestCharacter,
  pinWorld,
  getMetrics,
  startWalker,
  stopWalker,
} from './lib/perfHarness.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const args = process.argv.slice(2);
const getArg = (name) => {
  const i = args.indexOf(`--${name}`);
  return i !== -1 ? args[i + 1] : null;
};
const hasArg = (name) => args.includes(`--${name}`);

const URL = getArg('url') || 'http://localhost:4000/TwilightGame/';
const BUDGETS_PATH = resolve(ROOT, getArg('budgets') || 'perf/budgets.json');
const ONLY_MAP = getArg('map');
const UPDATE = hasArg('update');

/** Frames to let a map settle after a teleport before reading its resting scene. */
const SETTLE_FRAMES = 60;
const SETTLE_MAX_MS = 20_000;
/**
 * The measurement window per map: at least this many frames (the per-frame
 * rates' sample size) AND this many seconds (the per-second and per-minute
 * rates' — a save flush every ~5 s read as 30/min over a 2 s window), up to
 * the cap. A fast machine hits the seconds first, a slow runner the frames.
 */
const MEASURE_FRAMES = 240;
const MEASURE_MIN_MS = 15_000;
const MEASURE_MAX_MS = 60_000;
/** Below this many frames the work rates are too noisy to gate; scene counts still are. */
const MIN_FRAMES_FOR_RATES = 60;
/**
 * When --update rewrites a ceiling, leave room above the measured value so
 * run-to-run jitter does not fail the next run. Scene counts are read at rest
 * and vary only by a wandering NPC or two, so 10% plus a small floor. Work
 * rates come from a walking window whose route varies (the walker is blocked
 * by different walls each run), so they get 50% plus a floor — their job is
 * to catch a per-frame regression (60/s where 10/s was), not a 10% drift.
 */
const HEADROOM_COUNTS = 0.1;
const HEADROOM_RATES = 0.5;

/**
 * The gated metrics: how each is derived from a map's measurement, and how a
 * ceiling is rounded when written by --update.
 */
const METRICS = [
  { key: 'spritesDrawn', label: 'Sprites drawn (at rest)', unit: '', round: 1, floor: 5 },
  { key: 'nodes', label: 'Stage nodes (at rest)', unit: '', round: 1, floor: 5 },
  { key: 'textures', label: 'Textures (at rest)', unit: '', round: 1, floor: 2 },
  { key: 'textureMB', label: 'Texture memory (at rest)', unit: ' MB', round: 1, floor: 4 },
  { key: 'filteredNodes', label: 'Filtered nodes', unit: '', round: 1, floor: 0 },
  { key: 'maskedNodes', label: 'Masked nodes', unit: '', round: 1, floor: 0 },
  // Per second, not per frame: React's player snapshot is on a clock (≤10 Hz
  // while walking), so per-frame renders rise as the runner's fps falls.
  { key: 'appRendersPerSec', label: 'App renders /s', unit: '', round: 0.5, floor: 3, rate: true },
  { key: 'sceneRebuildsPerSec', label: 'Scene rebuilds /s', unit: '', round: 0.1, floor: 1, rate: true },
  { key: 'npcDrawsPerFrame', label: 'NPC draws /frame', unit: '', round: 0.01, floor: 0.1, rate: true },
  { key: 'saveFlushesPerMin', label: 'Save flushes /min', unit: '', round: 1, floor: 6, rate: true },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Poll the monitor until it has counted `frames` frames since its last reset, or the cap. */
async function waitForFrames(page, frames, maxMs) {
  const start = Date.now();
  let metrics = null;
  while (Date.now() - start < maxMs) {
    metrics = await getMetrics(page);
    if (metrics && metrics.frameCount >= frames) return metrics;
    await sleep(500);
  }
  return metrics;
}

async function resetMonitor(page) {
  await page.evaluate(() => window.__PERF_MONITOR__?.reset());
}

/** Measure one map. */
async function measureMap(page, mapId, spec, isFirst) {
  log(`\n▶ ${mapId}`, 'cyan');
  if (!isFirst || mapId !== 'village') {
    await navigateToMap(page, mapId);
  }
  await pinWorld(page, { hour: spec.hour ?? 10, weather: spec.weather ?? 'clear' });

  // Let the map settle (textures land, first draws happen), then read the
  // scene cost AT REST. Read at the walk's peak it depended on where the
  // walker happened to wander (witch hut nodes 1045 → 1896 between two runs
  // of the same code); at the spawn point it is a property of the map.
  await resetMonitor(page);
  const settled = await waitForFrames(page, SETTLE_FRAMES, SETTLE_MAX_MS);
  if (!settled) throw new Error(`${mapId}: the performance monitor returned nothing`);
  const scene = settled.scene;
  log(`  settled after ${settled.frameCount} frames`, 'dim');

  // Then the work rates over a walking window.
  await resetMonitor(page);
  if (spec.walk !== false) startWalker(page);
  let last = null;
  const start = Date.now();
  while (Date.now() - start < MEASURE_MAX_MS) {
    const m = await getMetrics(page);
    if (m) {
      last = m;
      if (m.frameCount >= MEASURE_FRAMES && Date.now() - start >= MEASURE_MIN_MS) break;
    }
    await sleep(500);
  }
  await stopWalker();

  if (!last) throw new Error(`${mapId}: the performance monitor returned nothing`);
  const frames = last.frameCount;
  const seconds = last.uptime;
  const perFrame = (n) => (frames > 0 ? n / frames : 0);
  const perSec = (n) => (seconds > 0 ? n / seconds : 0);

  const values = {
    spritesDrawn: scene.visibleSprites,
    nodes: scene.nodes,
    textures: scene.textures,
    textureMB: Math.round(scene.textureMB * 10) / 10,
    filteredNodes: scene.filteredNodes ?? 0,
    maskedNodes: scene.maskedNodes ?? 0,
    appRendersPerSec: round(perSec(last.work.appRenders), 0.01),
    sceneRebuildsPerSec: round(perSec(last.work.sceneRebuilds), 0.01),
    npcDrawsPerFrame: round(perFrame(last.work.npcDraws), 0.001),
    saveFlushesPerMin: round(perSec(last.work.saveFlushes) * 60, 0.1),
  };
  const context = {
    frames,
    seconds: Number(seconds.toFixed(1)),
    fps: last.fps, // recorded, never gated: CI draws in software
    worstFrameMs: last.maxFrameTime,
    darknessUploadsPerSec: round(perSec(last.work.darknessUploads), 0.01), // too noisy to gate (boot-time lerp)
  };
  log(
    `  ${frames} frames in ${context.seconds}s — sprites ${values.spritesDrawn}, nodes ${values.nodes}, ` +
      `textures ${values.textures} (${values.textureMB} MB), App ${values.appRendersPerSec}/s, ` +
      `rebuilds ${values.sceneRebuildsPerSec}/s`,
    'dim'
  );
  return { values, context };
}

/** Round to a step, without the binary float residue (1.7000000000000002). */
function round(value, step) {
  const decimals = step >= 1 ? 0 : step >= 0.1 ? 1 : step >= 0.01 ? 2 : 3;
  return Number((Math.round(value / step) * step).toFixed(decimals));
}

/** A ceiling for a measured value: headroom, then rounded up to the metric's step. */
function ceilingFor(metric, value) {
  const headroom = metric.rate ? HEADROOM_RATES : HEADROOM_COUNTS;
  const withRoom = Math.max(value * (1 + headroom), value + metric.floor);
  const decimals = metric.round >= 1 ? 0 : metric.round >= 0.1 ? 1 : 2;
  return Number((Math.ceil(withRoom / metric.round) * metric.round).toFixed(decimals));
}

function compare(mapId, values, context, budget) {
  const rows = [];
  let breached = false;
  for (const metric of METRICS) {
    const value = values[metric.key];
    const ceiling = budget?.[metric.key];
    let status = 'ok';
    if (ceiling === undefined) status = 'no budget';
    else if (metric.rate && context.frames < MIN_FRAMES_FOR_RATES) status = 'too few frames';
    else if (value > ceiling) {
      status = 'OVER';
      breached = true;
    }
    rows.push({ metric, value, ceiling, status });
  }
  return { mapId, rows, breached, context };
}

function fmt(metric, v) {
  if (v === undefined || v === null) return '—';
  const decimals = metric.round >= 1 ? 0 : metric.round >= 0.1 ? 1 : 2;
  return `${Number(v).toFixed(decimals)}${metric.unit}`;
}

function renderReport(results, renderer, budgetsPath) {
  const lines = ['## Performance Test Results', ''];
  const anyBreach = results.some((r) => r.breached);
  lines.push(
    anyBreach
      ? '❌ **Over budget.** A ceiling in `perf/budgets.json` was exceeded — the rows marked OVER below.'
      : '✅ **Within budget.** Every gated number is at or under its ceiling in `perf/budgets.json`.'
  );
  lines.push('');
  lines.push(
    `Renderer: \`${renderer.name}\`${renderer.software ? ' (software — frame rate recorded, not gated)' : ''}. ` +
      'Gated metrics are counts of work per frame and per scene, which read the same on any machine. ' +
      'Improved a number? Lower its ceiling in the same PR.'
  );
  for (const r of results) {
    lines.push('', `### ${r.mapId}`, '');
    lines.push(
      `_${r.context.frames} frames over ${r.context.seconds}s; ${r.context.fps} fps, worst frame ${r.context.worstFrameMs} ms (not gated)_`,
      ''
    );
    lines.push('| Metric | Value | Ceiling | |', '|---|---:|---:|---|');
    for (const row of r.rows) {
      const mark = row.status === 'OVER' ? '❌ OVER' : row.status === 'ok' ? '✅' : `⚪ ${row.status}`;
      lines.push(`| ${row.metric.label} | ${fmt(row.metric, row.value)} | ${fmt(row.metric, row.ceiling)} | ${mark} |`);
    }
  }
  lines.push('', `_Budgets: \`${budgetsPath}\`. Harness: \`scripts/perf-ci.mjs\`._`);
  return lines.join('\n');
}

async function main() {
  const budgets = existsSync(BUDGETS_PATH) ? JSON.parse(readFileSync(BUDGETS_PATH, 'utf8')) : { maps: {} };
  const mapIds = Object.keys(budgets.maps).filter((id) => !ONLY_MAP || id === ONLY_MAP);
  if (mapIds.length === 0) {
    log(`No maps to measure (budgets: ${BUDGETS_PATH}${ONLY_MAP ? `, --map ${ONLY_MAP}` : ''})`, 'red');
    process.exit(2);
  }

  log('\n🎮 TwilightGame performance gate\n', 'cyan');
  log(`URL: ${URL}`, 'dim');
  log(`Maps: ${mapIds.join(', ')}`, 'dim');

  const browser = await launchBrowser();
  const results = [];
  const measured = {};
  let renderer = { name: 'unknown', software: true };
  try {
    const page = await browser.newPage();
    page.on('pageerror', (err) => log(`  PAGE ERROR: ${err.message}`, 'red'));
    await page.setViewport({ width: 1280, height: 720 });
    await setupTestCharacter(page, URL);
    // 'load', not 'networkidle2': the game keeps the network busy (presence,
    // on-demand textures) and idle never comes.
    await page.goto(URL, { waitUntil: 'load', timeout: 60_000 });
    await waitForGame(page);
    renderer = await detectRenderer(page);
    log(`Renderer: ${renderer.name}${renderer.software ? ' (software)' : ''}`, 'dim');

    let first = true;
    for (const mapId of mapIds) {
      const spec = budgets.maps[mapId];
      const { values, context } = await measureMap(page, mapId, spec, first);
      first = false;
      measured[mapId] = { values, context };
      results.push(compare(mapId, values, context, spec.ceilings));
    }
    // One picture of the last map, so a run that measured a blank canvas is
    // visible in the artifacts rather than silently "within budget".
    await page.screenshot({ path: resolve(ROOT, 'perf-screenshot.png') });
  } finally {
    await stopWalker();
    await browser.close();
  }

  if (UPDATE) {
    for (const mapId of mapIds) {
      const spec = budgets.maps[mapId];
      spec.ceilings = spec.ceilings ?? {};
      for (const metric of METRICS) {
        spec.ceilings[metric.key] = ceilingFor(metric, measured[mapId].values[metric.key]);
      }
    }
    writeFileSync(BUDGETS_PATH, JSON.stringify(budgets, null, 2) + '\n');
    log(`\nBudgets rewritten: ${BUDGETS_PATH}`, 'green');
  }

  writeFileSync(
    resolve(ROOT, 'perf-results.json'),
    JSON.stringify({ timestamp: new Date().toISOString(), renderer, maps: measured }, null, 2)
  );
  const report = renderReport(results, renderer, 'perf/budgets.json');
  writeFileSync(resolve(ROOT, 'perf-report.md'), report);
  console.log('\n' + report + '\n');

  const flag = resolve(ROOT, 'regression-detected');
  const breached = results.some((r) => r.breached);
  if (breached && !UPDATE) {
    writeFileSync(flag, '');
    process.exit(1);
  }
  if (existsSync(flag)) unlinkSync(flag);
}

main().catch((err) => {
  log(`\nperf-ci failed: ${err.message}`, 'red');
  process.exit(1);
});
