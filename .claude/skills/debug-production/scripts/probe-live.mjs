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
 * Note: PixiJS does not initialise under headless SwiftShader, so the world
 * renders black. This probe is for startup/console/network evidence only —
 * it cannot tell you whether anything looks right on screen.
 */
import puppeteer from 'puppeteer';

const DEFAULT_URL = 'https://code.markedmondson.me/TwilightGame/';

/** Each group must produce at least one matching line in a healthy startup. */
const MARKERS = [
  { name: 'firebase module + config', pattern: /\[Firebase\] (App initialized|Not configured|Package not installed)/ },
  { name: 'firebase init outcome', pattern: /\[App\] Firebase (, auth, and sync manager initialized|not configured or disabled|initialization failed)/ },
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
const url = arg('--url', DEFAULT_URL);
const waitMs = Number(arg('--wait', '35')) * 1000;
const showAll = args.includes('--all');
const filter = new RegExp(
  arg('--filter', 'Firebase|Presence|Multiplayer|SharedFarm|Auth|Sentry|error|failed'),
  'i'
);

const lines = [];
const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
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
      : `\n${missing} marker(s) missing. A missing marker is the bug, not a gap in this probe: ` +
          'find the function that must log one of those lines and work out how it returned early.'
  );
} finally {
  await browser.close();
}
