#!/usr/bin/env node
/**
 * Codemod for §2 of docs/PENDING_CLEANUP.md: convert bare console.log calls
 * to the category-gated debugLog helper (utils/debugLog.ts).
 *
 *   node scripts/convert-debug-log.mjs <file...> [--keep-guards=FLAG,FLAG]
 *
 * What it does per call site:
 *   console.log('[Tag] msg', extra)      → debugLog('Tag', 'msg', extra)
 *   console.log(`[Tag] msg ${x}`)        → debugLog('Tag', `msg ${x}`)
 *   console.log(                         → debugLog(
 *     '[Tag] msg',                             'Tag',
 *     extra                                    'msg',
 *   );                                         extra,
 *                                            );
 *   if (DEBUG.X) console.log(...)        → debugLog(...)   (dead guards only)
 *
 * Dead-guard unwrapping: DEBUG.* flags in constants.ts are hardcoded
 * `import.meta.env.DEV && false` — those logs are unreachable, and the
 * category flag revives them behind ?debug=<tag>. Live flags (default:
 * DEBUG.MULTIPLAYER, which uses runtimeDebug) keep their guards; only the
 * inner call is converted.
 *
 * Deliberately left for manual triage (reported with line numbers):
 *   - calls whose first argument is not a string/template literal
 *   - calls where the [Tag] prefix is not at the very start of the message
 *   - calls with no [Tag] prefix at all
 *   - `if (DEBUG.X) { ... }` blocks (may contain more than the log)
 *
 * The script never edits console.warn / console.error / console.debug.
 */
import fs from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const keepGuardFlags = new Set(['MULTIPLAYER']);
const files = [];

for (const a of argv) {
  if (a.startsWith('--keep-guards=')) {
    for (const f of a.slice('--keep-guards='.length).split(',')) {
      if (f) keepGuardFlags.add(f.trim().toUpperCase());
    }
  } else {
    files.push(a);
  }
}

if (files.length === 0) {
  console.error('usage: node scripts/convert-debug-log.mjs <file...> [--keep-guards=FLAG,FLAG]');
  process.exit(1);
}

const CALL_RE = /\bconsole\.(?:log|info)\(/g;

/** Walk from an opening paren to its matching close, respecting strings,
 *  template literals (incl. nested ${}), comments and nesting. */
function findMatchingParen(text, openIdx) {
  let depth = 0;
  let i = openIdx;
  while (i < text.length) {
    const ch = text[i];
    if (ch === '/' && text[i + 1] === '/') {
      while (i < text.length && text[i] !== '\n') i++;
      continue;
    }
    if (ch === '/' && text[i + 1] === '*') {
      const end = text.indexOf('*/', i + 2);
      i = end === -1 ? text.length : end + 2;
      continue;
    }
    if (ch === '"' || ch === "'") {
      i = skipString(text, i, ch);
      continue;
    }
    if (ch === '`') {
      i = skipTemplate(text, i);
      continue;
    }
    if (ch === '(') depth++;
    if (ch === ')') {
      depth--;
      if (depth === 0) return i;
    }
    i++;
  }
  return -1;
}

function skipString(text, start, quote) {
  let i = start + 1;
  while (i < text.length) {
    if (text[i] === '\\') {
      i += 2;
      continue;
    }
    if (text[i] === quote) return i + 1;
    if (text[i] === '\n') return i; // unterminated; bail
    i++;
  }
  return i;
}

function skipTemplate(text, start) {
  let i = start + 1;
  while (i < text.length) {
    if (text[i] === '\\') {
      i += 2;
      continue;
    }
    if (text[i] === '`') return i + 1;
    if (text[i] === '$' && text[i + 1] === '{') {
      let braceDepth = 1;
      i += 2;
      while (i < text.length && braceDepth > 0) {
        if (text[i] === '{') braceDepth++;
        else if (text[i] === '}') braceDepth--;
        else if (text[i] === '"' || text[i] === "'") {
          i = skipString(text, i, text[i]);
          continue;
        } else if (text[i] === '`') {
          i = skipTemplate(text, i);
          continue;
        }
        i++;
      }
      continue;
    }
    i++;
  }
  return i;
}

/** Split text[from..to) on top-level commas. */
function splitArgs(text, from, to) {
  const parts = [];
  let depth = 0;
  let start = from;
  let i = from;
  while (i < to) {
    const ch = text[i];
    if (ch === '/' && text[i + 1] === '/') {
      while (i < to && text[i] !== '\n') i++;
      continue;
    }
    if (ch === '/' && text[i + 1] === '*') {
      const end = text.indexOf('*/', i + 2);
      i = end === -1 ? to : end + 2;
      continue;
    }
    if (ch === '"' || ch === "'") {
      i = skipString(text, i, ch);
      continue;
    }
    if (ch === '`') {
      i = skipTemplate(text, i);
      continue;
    }
    if ('([{'.includes(ch)) depth++;
    else if (')]}'.includes(ch)) depth--;
    else if (ch === ',' && depth === 0) {
      parts.push({ start, end: i });
      start = i + 1;
    }
    i++;
  }
  parts.push({ start, end: to });
  return parts;
}

const PREFIX_RE = /^\s*\[([A-Za-z0-9 _-]+)\]\s*:?\s*/;

/** Build the debugLog(...) replacement for one call, or null if the site
 *  needs manual attention. */
function buildReplacement(text, nameStart, closeIdx) {
  const openIdx = text.indexOf('(', nameStart);
  const args = splitArgs(text, openIdx + 1, closeIdx);
  if (args.length === 0) return null;

  const first = args[0];
  const argText = text.slice(first.start, first.end).trim();

  const quote = argText[0];
  if (quote !== "'" && quote !== '"' && quote !== '`') return null;
  if (!argText.endsWith(quote)) return null;
  const inner = argText.slice(1, -1);
  const m = inner.match(PREFIX_RE);
  if (!m) return null;

  const tag = m[1];
  const rest = inner.slice(m[0].length);

  const pieces = [];
  if (rest.length > 0) pieces.push(quote + rest + quote);
  for (const a of args.slice(1)) {
    const t = text.slice(a.start, a.end).trim();
    if (t.length > 0) pieces.push(t);
  }

  return pieces.length === 0 ? `debugLog('${tag}')` : `debugLog('${tag}', ${pieces.join(', ')})`;
}

function lineOf(text, idx) {
  return text.slice(0, idx).split('\n').length;
}

function insertDebugLogImport(text, file) {
  if (/import\s*\{[^}]*debugLog[^}]*\}\s*from/.test(text)) return text;
  const rel =
    path.relative(path.dirname(file), path.resolve('utils/debugLog.ts')).replace(/\.ts$/, '') ||
    './debugLog';
  const importLine = `import { debugLog } from '${rel.startsWith('.') ? rel : './' + rel}';`;

  const lines = text.split('\n');
  let insertAt = -1; // index of the END of the last import statement
  let i = 0;
  while (i < lines.length) {
    if (/^import\s/.test(lines[i])) {
      // advance to the line that closes this import
      while (i < lines.length && !/from\s+'[^']*';/.test(lines[i])) i++;
      if (i >= lines.length) break;
      insertAt = i;
    } else if (/^\S/.test(lines[i]) && !lines[i].startsWith('//') && !lines[i].startsWith('/*')) {
      if (insertAt !== -1) break; // first non-import code line: stop
    }
    i++;
  }
  lines.splice(insertAt + 1, 0, importLine);
  return lines.join('\n');
}

let totalConverted = 0;
let totalGuards = 0;

for (const file of files) {
  let text = fs.readFileSync(file, 'utf8');

  // --- Pass 1: unwrap dead `if (DEBUG.X)` guards. ---
  let guards = 0;
  text = text.replace(
    /^[ \t]*if \(DEBUG\.([A-Za-z0-9_]+)\)[ \t]*\n[ \t]*console\.(log|info)\(/gm,
    (match, flag, call) => {
      if (keepGuardFlags.has(flag.toUpperCase())) return match;
      guards++;
      return `console.${call}(`;
    }
  );
  text = text.replace(/if \(DEBUG\.([A-Za-z0-9_]+)\) console\.(log|info)\(/g, (match, flag, call) => {
    if (keepGuardFlags.has(flag.toUpperCase())) return match;
    guards++;
    return `console.${call}(`;
  });

  // --- Pass 2: rewrite calls right-to-left so offsets stay stable. ---
  const manual = [];
  let converted = 0;
  for (;;) {
    // find the last convertible call site in the current text
    let best = -1;
    let m;
    CALL_RE.lastIndex = 0;
    while ((m = CALL_RE.exec(text)) !== null) {
      const lineStart = text.lastIndexOf('\n', m.index) + 1;
      const before = text.slice(lineStart, m.index);
      if (before.includes('//') || before.includes('*')) continue; // comment line
      best = m.index;
    }
    if (best === -1) break;

    const openIdx = text.indexOf('(', best);
    const closeIdx = findMatchingParen(text, openIdx);
    if (closeIdx === -1) {
      manual.push({ line: lineOf(text, best), reason: 'unbalanced paren', snippet: '' });
      text = text.slice(0, best) + 'c0ns0le' + text.slice(best + 'console'.length);
      continue;
    }

    const replacement = buildReplacement(text, best, closeIdx);
    if (!replacement) {
      const firstArg = text
        .slice(openIdx + 1, closeIdx)
        .trim()
        .split('\n')[0]
        .slice(0, 70);
      manual.push({ line: lineOf(text, best), reason: 'manual', snippet: firstArg });
      text = text.slice(0, best) + 'c0ns0le' + text.slice(best + 'console'.length);
      continue;
    }

    text = text.slice(0, best) + replacement + text.slice(closeIdx + 1);
    converted++;
  }
  text = text.replace(/c0ns0le/g, 'console');

  if (converted === 0 && guards === 0) {
    console.log(`${file}: nothing to do`);
    continue;
  }

  if (converted > 0) text = insertDebugLogImport(text, file);

  fs.writeFileSync(file, text);

  console.log(`${file}: ${converted} converted, ${guards} guards unwrapped`);
  totalConverted += converted;
  totalGuards += guards;
  for (const mm of manual) {
    console.log(`  MANUAL ${file}:${mm.line} ${mm.reason} :: ${mm.snippet}`);
  }
}

console.log(`\ntotal: ${totalConverted} converted, ${totalGuards} guards unwrapped`);