#!/usr/bin/env node
/**
 * Load the deployed game in headless Chrome and report what its console says.
 *
 * The point is not the logs it prints but the ones it *cannot* find. A startup
 * step that returns early without logging leaves no error, no exception and no
 * Sentry event — the only trace is a marker that never appeared. MARKERS below
 * lists the lines a healthy startup must produce; anything reported as MISSING
 * is a step that silently did not happen.
 *
 * Usage (from the repo root, so node resolves puppeteer):
 *   node .claude/skills/debug-production/scripts/probe-live.mjs
 *   node .claude/skills/debug-production/scripts/probe-live.mjs --url http://localhost:4000 --wait 20
 *   node .claude/skills/debug-production/scripts/probe-live.mjs --filter 'Presence|Multiplayer'
 *   node .claude/skills/debug-production/scripts/probe-live.mjs --all
 *
 * Note: this probe reports console, network and startup markers. It does NOT
 * screenshot, because the game boots to a splash screen that covers the canvas
 * until "Play" is clicked.
 *
 * It is *not* true that PixiJS cannot render headlessly — this file used to say
 * so, and the claim cost a lot of wasted debugging. PixiJS initialises fine and
 * the world renders. To capture it: click the Play button, wait ~15s, then
 * screenshot. On a machine with no GPU (CI), Chrome also needs
 * `--enable-unsafe-swiftshader`, which is passed below.
 */
import puppeteer from 'puppeteer';

const DEFAULT_URL = 'https://code.markedmondson.me/TwilightGame/';

/** Each group must produce at least one matching line in a healthy startup. */
const MARKERS = [
  { name: 'firebase module + config', pattern: /\[Firebase\] (App initialized|Not configured|Package not installed)/ },
  { name: 'firebase init outcome', pattern: /\[App\] Firebase(, auth, and sync manager initialized| not configured or disabled| initialization failed)/ },
  { name: 'presence transport', pattern: /\[Presence\] Realtime Database/ },
  { name: 'event chains', pattern: /\[App\] Initialised event chain system/ },
  { name: 'audio', pattern: /\[App\] Audio system initialised/ },
  { name: 'renderer', pattern: /\[usePixiRenderer\] Initialized/ },
];

const args = process.argv.slice(2);
const arg = (flag, fallback) => {
  const i = args.indexOf(flag);
  return i === -1 ? fallback : args[i + 1];
};
const rawUrl = arg('--url', DEFAULT_URL);

/**
 * Ask the page to log. `debugLog()` is off in production unless a `debug`
 * parameter says otherwise, and the markers below are mostly its output.
 */
function withDebugLogging(target) {
  const parsed = new URL(target);
  if (!parsed.searchParams.has('debug')) parsed.searchParams.set('debug', 'all');
  return parsed.toString();
}
const url = withDebugLogging(rawUrl);
const waitMs = Number(arg('--wait', '35')) * 1000;
const showAll = args.includes('--all');
const filter = new RegExp(
  arg('--filter', 'Firebase|Presence|Multiplayer|SharedFarm|Auth|Sentry|error|failed'),
  'i'
);

const lines = [];
// --enable-unsafe-swiftshader lets Chrome fall back to software WebGL when no GPU
// is present (CI). Without it WebGL is refused there and PixiJS genuinely cannot
// start — which is how the "PixiJS never initialises headlessly" myth began.
const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--enable-unsafe-swiftshader'],
});
try {
  const page = await browser.newPage();
  page.on('console', (m) => lines.push({ kind: m.type(), text: m.text() }));
  page.on('pageerror', (e) => lines.push({ kind: 'pageerror', text: e.message }));
  page.on('requestfailed', (r) => {
    if (/googleapis|firebase|google|sentry/i.test(r.url())) {
      lines.push({ kind: 'reqfail', text: `${r.url().slice(0, 120)} ${r.failure()?.errorText}` });
    }
  });

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await new Promise((resolve) => setTimeout(resolve, waitMs));

  // Deduplicate: a per-frame warning can repeat a thousand times and bury the
  // one line that matters. Keep first-seen order and show a count instead.
  const seen = new Map();
  for (const [i, l] of lines.entries()) {
    if (!(showAll || filter.test(l.text) || l.kind !== 'log')) continue;
    const key = `${l.kind}:${l.text.slice(0, 220)}`;
    const entry = seen.get(key);
    if (entry) entry.count += 1;
    else seen.set(key, { index: i, kind: l.kind, text: l.text.slice(0, 220), count: 1 });
  }

  console.log(`===== ${url} — ${lines.length} console lines, ${seen.size} unique shown =====`);
  for (const e of seen.values()) {
    const repeat = e.count > 1 ? ` (x${e.count})` : '';
    console.log(String(e.index).padStart(4), `[${e.kind}]`, e.text + repeat);
  }

  console.log('\n===== STARTUP MARKERS =====');
  let missing = 0;
  for (const marker of MARKERS) {
    const hit = lines.find((l) => marker.pattern.test(l.text));
    if (hit) {
      console.log(`  ok      ${marker.name}`);
    } else {
      missing += 1;
      console.log(`  MISSING ${marker.name}  <- a startup step returned without logging`);
    }
  }
  console.log(
    missing === 0
      ? '\nAll startup markers present.'
      : `\n${missing} marker(s) missing. Usually that means a startup step returned ` +
          'without logging — find the function that owes the line and work out how it ' +
          'returned early. Before concluding that, check the line still exists: gating a ' +
          'log behind debugLog() removes a marker without breaking anything, and a whole ' +
          'group going missing at once looks far more like a refactor than an outage.'
  );
} finally {
  await browser.close();
}
