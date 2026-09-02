/**
 * Art Review — before/after contact sheets for changed artwork.
 *
 * All the artwork in this game is hand-drawn, and the optimiser resizes it on
 * every build. That makes a whole class of change invisible in a normal diff: a
 * PR can quietly halve a sprite's resolution, or pad a non-square image out to a
 * square (which shifts where the art sits inside its texture), and the review
 * shows only "Binary files differ".
 *
 * This renders the two versions side by side so a human can actually look.
 *
 * Usage:
 *   node scripts/art-review.mjs                       # vs origin/main
 *   node scripts/art-review.mjs --base HEAD~1
 *   node scripts/art-review.mjs --out /tmp/review --limit 20
 *
 * Writes <out>/sheet-N.png plus <out>/summary.md. Prints the sheet paths on
 * stdout, one per line, so CI can pass them straight to `gh pr comment --attach`.
 *
 * Only assets whose DIMENSIONS changed get a sheet. A re-compressed image at the
 * same size cannot have changed shape or sharpness in a way worth eyeballing,
 * and including them buries the ones that matter.
 *
 * LIMIT: this compares files on disk, not rendered output. A file can change
 * here while the game looks identical (if the PR also repointed assets.ts at it
 * from the unoptimised original), and the game can change while no file here
 * does (sprites are scaled to their SPRITE_METADATA box, not to their own
 * dimensions). Treat it as "look at these", not as a verdict.
 */

import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const IMAGE_RE = /\.(png|jpe?g|gif|webp)$/i;
/** Only artwork. Anything else that lives under public/ is not art to review. */
const WATCHED_DIRS = ['public/assets', 'public/assets-optimized'];
/** GitHub rejects attachments over 10MB; stay well under after PNG compression. */
const MAX_SHEET_BYTES = 8 * 1024 * 1024;

function arg(flag, fallback) {
  const i = process.argv.indexOf(flag);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const BASE = arg('--base', 'origin/main');
const OUT = arg('--out', 'art-review');
const LIMIT = Number(arg('--limit', '16'));
const CELL = Number(arg('--cell', '240'));

/** Files changed between BASE and the working tree, restricted to artwork. */
function changedAssets() {
  const out = execFileSync(
    'git',
    ['diff', '--name-status', `${BASE}...HEAD`, '--', ...WATCHED_DIRS],
    { encoding: 'utf8' }
  );
  return out
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [status, ...rest] = line.split('\t');
      // Renames report as R100<TAB>old<TAB>new — the last field is always current.
      return { status: status[0], file: rest[rest.length - 1] };
    })
    .filter(({ status, file }) => status !== 'D' && IMAGE_RE.test(file));
}

/** The version of `file` at BASE, or null when the file is new. */
function blobAtBase(file) {
  try {
    return execFileSync('git', ['show', `${BASE}:${file}`], {
      encoding: 'buffer',
      maxBuffer: 256 * 1024 * 1024,
      // A new file makes git print "exists on disk, but not in <ref>" and exit
      // non-zero. That is the expected path for every added asset, so silence it
      // rather than filling the log with fatals that are not failures.
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch {
    return null;
  }
}

async function describe(buffer) {
  if (!buffer) return null;
  try {
    const { width, height } = await sharp(buffer).metadata();
    return { width, height, bytes: buffer.length, pixels: width * height };
  } catch {
    return null;
  }
}

/**
 * A checkerboard, so transparent regions are visible rather than reading as
 * white. Padding round a sprite is exactly the kind of change this tool exists
 * to surface, and on a white background it is invisible.
 */
function checkerboard(size) {
  const sq = 12;
  return Buffer.from(
    `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
       <rect width="${size}" height="${size}" fill="#f2efe9"/>
       <pattern id="c" width="${sq * 2}" height="${sq * 2}" patternUnits="userSpaceOnUse">
         <rect width="${sq}" height="${sq}" fill="#e2ded5"/>
         <rect x="${sq}" y="${sq}" width="${sq}" height="${sq}" fill="#e2ded5"/>
       </pattern>
       <rect width="${size}" height="${size}" fill="url(#c)"/>
     </svg>`
  );
}

const escapeXml = (s) =>
  s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]);

/** One asset rendered as [before][after] with a caption underneath. */
async function renderRow(entry, width) {
  const { file, before, after, beforeBuf, afterBuf } = entry;
  const CAPTION = 52;
  const cell = CELL;
  const gap = 12;

  const fit = async (buf) =>
    buf
      ? sharp(buf)
          .resize(cell, cell, { fit: 'inside', withoutEnlargement: true })
          .toBuffer()
      : null;

  const [bImg, aImg] = await Promise.all([fit(beforeBuf), fit(afterBuf)]);
  const board = await sharp(checkerboard(cell)).png().toBuffer();

  const name = file.replace(/^public\/assets(-optimized)?\//, '');
  const dim = (d) => (d ? `${d.width}x${d.height}` : '—');
  const kb = (d) => (d ? `${(d.bytes / 1024).toFixed(0)}KB` : '—');
  const change = before && after ? (before.pixels / after.pixels).toFixed(1) : null;
  const verdict = !before
    ? 'new file'
    : after.pixels < before.pixels
      ? `${change}x fewer pixels`
      : after.pixels > before.pixels
        ? `${(after.pixels / before.pixels).toFixed(1)}x more pixels`
        : 'same size';

  const caption = Buffer.from(
    `<svg width="${width}" height="${CAPTION}" xmlns="http://www.w3.org/2000/svg">
       <text x="0" y="18" font-family="ui-monospace,SFMono-Regular,Menlo,monospace"
             font-size="14" fill="#1c1c1c">${escapeXml(name)}</text>
       <text x="0" y="40" font-family="-apple-system,Helvetica,sans-serif"
             font-size="13" fill="#666">${escapeXml(
               `before ${dim(before)} ${kb(before)}   →   after ${dim(after)} ${kb(after)}   ·   ${verdict}`
             )}</text>
     </svg>`
  );

  const rowHeight = cell + CAPTION + 8;
  const composites = [{ input: caption, left: 0, top: cell + 8 }];
  for (const [img, left] of [
    [bImg, 0],
    [aImg, cell + gap],
  ]) {
    composites.push({ input: board, left, top: 0 });
    if (img) {
      const m = await sharp(img).metadata();
      composites.push({
        input: img,
        left: left + Math.floor((cell - m.width) / 2),
        top: Math.floor((cell - m.height) / 2),
      });
    }
  }

  return {
    height: rowHeight,
    buffer: await sharp({
      create: { width, height: rowHeight, channels: 3, background: '#ffffff' },
    })
      .composite(composites)
      .png()
      .toBuffer(),
  };
}

async function buildSheet(entries, index) {
  const width = CELL * 2 + 12;
  const header = 46;
  const rows = [];
  for (const entry of entries) rows.push(await renderRow(entry, width));

  const height = header + rows.reduce((t, r) => t + r.height + 10, 0);
  const title = Buffer.from(
    `<svg width="${width}" height="${header}" xmlns="http://www.w3.org/2000/svg">
       <rect width="${width}" height="${header}" fill="#1c1c1c"/>
       <text x="12" y="19" font-family="-apple-system,Helvetica,sans-serif" font-size="14"
             font-weight="600" fill="#fff">Changed artwork — left: ${escapeXml(BASE)}, right: this branch</text>
       <text x="12" y="36" font-family="-apple-system,Helvetica,sans-serif" font-size="12"
             fill="#aaa">Checkerboard = transparency. Sheet ${index}.</text>
     </svg>`
  );

  const composites = [{ input: title, left: 0, top: 0 }];
  let y = header;
  for (const row of rows) {
    composites.push({ input: row.buffer, left: 0, top: y });
    y += row.height + 10;
  }

  const out = path.join(OUT, `sheet-${index}.png`);
  await sharp({ create: { width, height, channels: 3, background: '#ffffff' } })
    .composite(composites)
    .png({ compressionLevel: 9 })
    .toFile(out);
  return out;
}

async function main() {
  const changed = changedAssets();
  if (changed.length === 0) {
    console.error('[art-review] no artwork changed');
    return;
  }

  const entries = [];
  for (const { file } of changed) {
    if (!fs.existsSync(file)) continue;
    const afterBuf = fs.readFileSync(file);
    const beforeBuf = blobAtBase(file);
    const [before, after] = await Promise.all([describe(beforeBuf), describe(afterBuf)]);
    if (!after) continue;
    entries.push({ file, before, after, beforeBuf, afterBuf });
  }

  // Only dimension changes get pictures — see the header comment.
  const resized = entries
    .filter((e) => e.before && (e.before.width !== e.after.width || e.before.height !== e.after.height))
    .sort((a, b) => b.before.pixels / b.after.pixels - a.before.pixels / a.after.pixels);
  const added = entries.filter((e) => !e.before);
  const recompressed = entries.length - resized.length - added.length;

  fs.mkdirSync(OUT, { recursive: true });

  const shown = resized.slice(0, LIMIT);
  const sheets = [];
  for (let i = 0; i < shown.length; i += 8) {
    const sheet = await buildSheet(shown.slice(i, i + 8), sheets.length + 1);
    if (fs.statSync(sheet).size > MAX_SHEET_BYTES) {
      console.error(`[art-review] ${sheet} exceeds the attachment limit; lower --cell`);
    }
    sheets.push(sheet);
  }

  // Committed bytes, NOT download size: a new optimised file counts fully here
  // even though it replaces an original the game was downloading before. Calling
  // it "download size" would read as a regression when it is usually the opposite.
  const bytes = (list, key) => list.reduce((t, e) => t + (e[key]?.bytes ?? 0), 0);
  const deltaKb = ((bytes(entries, 'after') - bytes(entries, 'before')) / 1024).toFixed(0);

  const lines = [
    '## Art review',
    '',
    `\`${changed.length}\` artwork files changed against \`${BASE}\`.`,
    '',
    `| | count |`,
    `|---|---|`,
    `| Resolution changed (shown below) | ${resized.length} |`,
    `| New files | ${added.length} |`,
    `| Re-compressed, same dimensions | ${recompressed} |`,
    `| Change in committed asset bytes | ${Number(deltaKb) > 0 ? '+' : ''}${deltaKb} KB |`,
    '',
  ];

  if (resized.length === 0) {
    lines.push(
      'No artwork changed dimensions, so nothing can have changed shape or sharpness.',
      ''
    );
  } else {
    lines.push(
      shown.length < resized.length
        ? `Showing the ${shown.length} largest resolution changes of ${resized.length}. Full list:`
        : 'Every resolution change:',
      '',
      '<details><summary>All resolution changes</summary>',
      '',
      '| asset | before | after |',
      '|---|---|---|',
      ...resized.map(
        (e) =>
          `| \`${e.file.replace(/^public\//, '')}\` | ${e.before.width}x${e.before.height} | ${e.after.width}x${e.after.height} |`
      ),
      '',
      '</details>',
      ''
    );
    // Reference each sheet by exactly the path passed to `gh --attach`, or gh
    // will not recognise it as already-referenced and will append the images in
    // a lump at the end instead of placing them here.
    for (const sheet of sheets) lines.push(`![Changed artwork](${sheet})`, '');
    lines.push(
      '> Left is the base branch, right is this PR. Checkerboard shows transparency —',
      '> padding appearing or disappearing around a sprite changes where the art sits',
      '> inside its texture, which moves it on screen.',
      '>',
      '> **This compares files, not what the game draws.** A file can change here while the',
      '> game looks identical (the PR may also have repointed `assets.ts` at it from the',
      "> unoptimised original), and it can be unchanged here while the game's appearance",
      '> shifts (a sprite is scaled to its SPRITE_METADATA box, not to its own dimensions).',
      '> Only an in-game screenshot settles that.',
      ''
    );
  }

  fs.writeFileSync(path.join(OUT, 'summary.md'), lines.join('\n'));
  console.error(
    `[art-review] ${changed.length} changed, ${resized.length} resized, ${sheets.length} sheet(s) -> ${OUT}`
  );
  for (const sheet of sheets) console.log(sheet);
}

await main();
