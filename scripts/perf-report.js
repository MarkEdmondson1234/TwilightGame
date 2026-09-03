#!/usr/bin/env node

/**
 * Performance Report Generator
 *
 * Generates a markdown report from performance test results.
 * Used by GitHub Actions to post PR comments.
 *
 * WHY THE FPS GRADE NO LONGER GATES
 * ---------------------------------
 * This report used to award a letter grade from average FPS and fail the build
 * when FPS fell 10% below a stored baseline. Both were measuring the CI runner.
 *
 * The evidence: four consecutive main-branch runs, on effectively identical
 * code, reported 49.6, 7.5, 1.5 and 1.4 fps -- a 35x spread -- with worst-frame
 * times between 1.9s and 3.7s. That is structural, not flaky. CI launches Chrome
 * with `--use-angle=swiftshader` on a GPU-less shared runner, and this game is
 * GPU render-bound, so the suite measured in software the one axis it cannot
 * represent, then graded the answer against a scale where 58 fps is an A. The
 * grade was F on every run that mattered: arithmetic, not a finding.
 *
 * A gate whose verdict is uncorrelated with the diff is worse than no gate. It
 * teaches everyone to scroll past a red X, and takes the real failures with it.
 *
 * So on a software renderer, frame timings are recorded and shown but never
 * graded and never gating. The gate moves to SCENE COST -- how many sprites,
 * nodes and textures the map asks the renderer to draw. Those are counts, equal
 * on a Mac, an iPad and SwiftShader, and per the forest-perf investigation they
 * are the real lever on device frame rate.
 *
 * On a GPU runner the timing grade returns by itself: the switch is the actual
 * WEBGL_debug_renderer_info string, not a CI environment variable.
 *
 * Usage:
 *   node scripts/perf-report.js
 *
 * Reads:
 *   - perf-results.json (required)
 *   - perf-baseline.json (optional, for comparison)
 *
 * Outputs:
 *   - perf-report.md (markdown report)
 *   - regression-detected (empty file if regression found)
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';

// Thresholds for regression detection
const THRESHOLDS = {
  fps: {
    regressionPct: -10, // 10% drop in FPS is a regression
    warningPct: -5,     // 5% drop triggers warning
  },
  frameTime: {
    regressionPct: 15,  // 15% increase is a regression
    warningPct: 10,     // 10% increase triggers warning
  },
  jank: {
    regressionPct: 50,  // 50% increase in worst frame is regression
    warningPct: 25,     // 25% increase triggers warning
  },
  memory: {
    regressionPct: 25,  // 25% more memory growth is regression
    warningPct: 15,     // 15% increase triggers warning
  },
};

/**
 * Scene-cost budgets -- the metrics that actually gate.
 *
 * `minAbs` is there because a percentage on a small count is noise: 3 textures
 * to 4 is +33% and means nothing. A field must clear BOTH the percentage and the
 * absolute delta, so the gate stays quiet about rounding and speaks up about a
 * map that grew a thousand sprites.
 */
const SCENE_BUDGETS = {
  sprites: { label: 'Sprites (drawn)', regressionPct: 20, warningPct: 10, minAbs: 25 },
  nodes: { label: 'Scene nodes', regressionPct: 20, warningPct: 10, minAbs: 40 },
  textures: { label: 'Textures', regressionPct: 20, warningPct: 10, minAbs: 4 },
  textureMB: { label: 'Texture memory', regressionPct: 20, warningPct: 10, minAbs: 8, unit: ' MB' },
  maxDepth: { label: 'Tree depth', regressionPct: 25, warningPct: 15, minAbs: 2 },
};

function loadJson(filename) {
  try {
    return JSON.parse(readFileSync(filename, 'utf-8'));
  } catch {
    return null;
  }
}

function formatChange(current, baseline, higherIsBetter = false) {
  if (!baseline) return '';

  const diff = current - baseline;
  const pct = baseline !== 0 ? ((diff / baseline) * 100).toFixed(1) : 'N/A';
  const sign = diff > 0 ? '+' : '';
  const improved = higherIsBetter ? diff > 0 : diff < 0;

  let emoji = '';
  if (Math.abs(diff / baseline) < 0.02) {
    emoji = ''; // No significant change
  } else if (improved) {
    emoji = ' :white_check_mark:';
  } else {
    emoji = ' :warning:';
  }

  return ` (${sign}${pct}%${emoji})`;
}

function getRegressionStatus(current, baseline, thresholds, higherIsBetter = false) {
  if (!baseline) return 'neutral';

  const pctChange = ((current - baseline) / baseline) * 100;
  const effectivePct = higherIsBetter ? -pctChange : pctChange;

  if (effectivePct >= thresholds.regressionPct) return 'regression';
  if (effectivePct >= thresholds.warningPct) return 'warning';
  if (effectivePct <= -thresholds.warningPct) return 'improvement';
  return 'neutral';
}

function getStatusEmoji(status) {
  switch (status) {
    case 'regression': return ':x:';
    case 'warning': return ':warning:';
    case 'improvement': return ':white_check_mark:';
    default: return ':heavy_minus_sign:';
  }
}

/**
 * Scene-cost status, with the absolute-delta floor applied.
 */
function getSceneStatus(current, baseline, budget) {
  if (baseline === undefined || baseline === null || baseline === 0) return 'neutral';
  if (Math.abs(current - baseline) < budget.minAbs) return 'neutral';
  return getRegressionStatus(current, baseline, budget, false);
}

/**
 * Frame timings only compare between two runs on the same class of renderer --
 * and at the same CPU throttle, since a throttled run is a different machine.
 */
function timingsAreComparable(results, baseline) {
  if (!baseline) return false;
  if (results.renderer?.software || baseline.renderer?.software) return false;
  return (results.cpuThrottle || 1) === (baseline.cpuThrottle || 1);
}

/**
 * Prefer the at-rest snapshot: it does not depend on how far the scripted
 * movement travelled, which itself depends on the frame rate we do not trust.
 */
function sceneOf(run) {
  if (run?.sceneAtRest) return run.sceneAtRest;
  if (run?.scene) {
    return Object.fromEntries(Object.entries(run.scene).map(([k, v]) => [k, v.peak]));
  }
  return null;
}

/**
 * The scene-cost table. Counts, so they mean the same thing on every machine.
 */
function sceneTable(rows, hasBaseline, results) {
  if (rows.length === 0) {
    return '\n> :warning: No scene-cost data in this result. The stage was never registered\n' +
      '> with the performance monitor, so this run graded nothing. Check that\n' +
      '> usePixiRenderer still calls `performanceMonitor.attachStage`.\n';
  }

  const where = results.sceneAtRest ? 'at rest, after map load' : 'peak during scenario';
  let out = `
### Scene Cost (${where})

What the map asks the renderer to draw. These are counts, so they read the same
on a laptop, an iPad and a CI software rasteriser — which is why they, and not
frame rate, decide whether this check passes.

| Metric | Current | ${hasBaseline ? 'Baseline | Change | ' : ''}Status |
|--------|---------|${hasBaseline ? '---------|--------|' : ''}--------|
`;
  for (const row of rows) {
    const unit = row.budget.unit || '';
    const baseCell = hasBaseline
      ? `${row.base ?? 'n/a'}${row.base != null ? unit : ''} | ${row.base != null ? formatChange(row.current, row.base) : ''} | `
      : '';
    out += `| **${row.budget.label}** | ${row.current}${unit} | ${baseCell}${getStatusEmoji(row.status)} |\n`;
  }
  return out;
}

function softwareCaveat(results) {
  return `
> Measured on \`${results.renderer.name}\`, a **software rasteriser** on a shared
> CI runner with no GPU. This game is GPU render-bound, so the numbers below
> describe the runner, not the code in this PR — across four main-branch runs of
> effectively identical code they ranged from 1.4 to 49.6 fps. Kept for the
> record, **never graded, never gating**.
>
> For a real frame rate, profile on hardware: \`npm run perf:headed\`.
`;
}

function generateReport(results, baseline) {
  const hasBaseline = !!baseline;
  const software = !!results.renderer?.software;
  const gradeTimings = timingsAreComparable(results, baseline);
  let hasRegression = false;
  let hasWarning = false;

  // Scene cost -- the part that gates, because it is the part CI can measure.
  const scene = sceneOf(results);
  const baseScene = hasBaseline ? sceneOf(baseline) : null;
  const sceneRows = [];
  if (scene) {
    for (const [key, budget] of Object.entries(SCENE_BUDGETS)) {
      const current = scene[key] ?? 0;
      const base = baseScene ? baseScene[key] : null;
      const status = getSceneStatus(current, base, budget);
      if (status === 'regression') hasRegression = true;
      if (status === 'warning') hasWarning = true;
      sceneRows.push({ budget, current, base, status });
    }
  }

  // Frame timings -- graded only when both runs came off a real GPU.
  const fpsStatus = gradeTimings
    ? getRegressionStatus(results.fps.avg, baseline.fps.avg, THRESHOLDS.fps, true)
    : 'neutral';
  const frameTimeStatus = gradeTimings
    ? getRegressionStatus(results.frameTime.avg, baseline.frameTime.avg, THRESHOLDS.frameTime)
    : 'neutral';
  const jankStatus = gradeTimings
    ? getRegressionStatus(results.jank.maxFrameTime, baseline.jank.maxFrameTime, THRESHOLDS.jank)
    : 'neutral';

  if ([fpsStatus, frameTimeStatus, jankStatus].includes('regression')) hasRegression = true;
  if ([fpsStatus, frameTimeStatus, jankStatus].includes('warning')) hasWarning = true;

  // Heap is CPU-side and so survives the software renderer, but a shared runner
  // makes it noisy enough to warn rather than gate.
  const memoryStatus = hasBaseline && results.memory && baseline.memory
    ? getRegressionStatus(results.memory.growthMB, baseline.memory.growthMB, THRESHOLDS.memory)
    : 'neutral';
  if (memoryStatus === 'regression' || memoryStatus === 'warning') hasWarning = true;

  // Overall status
  let overallStatus = ':white_check_mark: **PASSED**';
  if (hasRegression) {
    overallStatus = ':x: **REGRESSION DETECTED**';
  } else if (hasWarning) {
    overallStatus = ':warning: **WARNINGS**';
  }

  let report = `## Performance Test Results

${overallStatus}

**Scenario:** ${results.scenario} | **Duration:** ${results.duration / 1000}s | **Samples:** ${results.sampleCount}
**Renderer:** \`${results.renderer?.name || 'unknown'}\`${software ? ' — **software rasteriser, no GPU**' : ''}${(results.cpuThrottle || 1) > 1 ? ` | **CPU throttle:** ${results.cpuThrottle}x` : ''}
${sceneTable(sceneRows, hasBaseline, results)}
### Frame Timings${software ? ' — advisory only' : ''}
${software ? softwareCaveat(results) : ''}

| Metric | Current | ${gradeTimings ? 'Baseline | Change |' : ''} Status |
|--------|---------|${gradeTimings ? '---------|--------|' : ''} ------ |
| **FPS (avg)** | ${results.fps.avg} fps | ${gradeTimings ? `${baseline.fps.avg} fps | ${formatChange(results.fps.avg, baseline.fps.avg, true)} |` : ''} ${getStatusEmoji(fpsStatus)} |
| **FPS (min)** | ${results.fps.min} fps | ${gradeTimings ? `${baseline.fps.min} fps | ${formatChange(results.fps.min, baseline.fps.min, true)} |` : ''} |
| **Frame Time (avg)** | ${results.frameTime.avg} ms | ${gradeTimings ? `${baseline.frameTime.avg} ms | ${formatChange(results.frameTime.avg, baseline.frameTime.avg)} |` : ''} ${getStatusEmoji(frameTimeStatus)} |
| **Frame Time (P95)** | ${results.frameTime.p95} ms | ${gradeTimings ? `${baseline.frameTime.p95} ms | ${formatChange(results.frameTime.p95, baseline.frameTime.p95)} |` : ''} |
| **Jank (worst)** | ${results.jank.maxFrameTime} ms | ${gradeTimings ? `${baseline.jank.maxFrameTime} ms | ${formatChange(results.jank.maxFrameTime, baseline.jank.maxFrameTime)} |` : ''} ${getStatusEmoji(jankStatus)} |
`;

  // Heap gets its own table: it is CPU-side, so it stays comparable across
  // renderers even when the timings above are not, and it must not inherit the
  // timing table's column count.
  if (results.memory) {
    const memBase = hasBaseline && baseline.memory;
    report += `
### Memory

| Metric | Current | ${memBase ? 'Baseline | Change |' : ''} Status |
|--------|---------|${memBase ? '---------|--------|' : ''} ------ |
| **Growth** | ${results.memory.growthMB} MB | ${memBase ? `${baseline.memory.growthMB} MB | ${formatChange(results.memory.growthMB, baseline.memory.growthMB)} |` : ''} ${getStatusEmoji(memoryStatus)} |
| **Heap (max)** | ${results.memory.maxMB} MB | ${memBase ? `${baseline.memory.maxMB} MB | ${formatChange(results.memory.maxMB, baseline.memory.maxMB)} |` : ''} |
`;
  }

  // Performance grade.
  //
  // A letter grade derived from FPS needs a GPU to grade. On a software
  // rasteriser it only ever restated the runner's speed, so it is withheld
  // rather than guessed -- an honest "n/a" beats a confident F.
  if (software) {
    report += `
### Performance Grade: **n/a — no GPU on this runner**

The scene-cost budget above is what gated this run. To grade the frame rate,
measure it on hardware: \`npm run perf:headed\`.
`;
  } else {
    let grade = 'A';
    if (results.fps.avg < 30) grade = 'F';
    else if (results.fps.avg < 45) grade = 'D';
    else if (results.fps.avg < 55) grade = 'C';
    else if (results.fps.avg < 58) grade = 'B';

    report += `
### Performance Grade: **${grade}**

| Grade | FPS Range | Description |
|-------|-----------|-------------|
| A | 58+ fps | Excellent |
| B | 55-58 fps | Good |
| C | 45-55 fps | Acceptable |
| D | 30-45 fps | Poor |
| F | <30 fps | Unplayable |

<sub>Measured on \`${results.renderer?.name || 'unknown'}\`.</sub>

`;
  }

  if (hasRegression) {
    report += `
### :x: Regression Details

Performance has degraded compared to baseline. Please investigate the following:

`;
    for (const row of sceneRows.filter((r) => r.status === 'regression')) {
      const pct = (((row.current - row.base) / row.base) * 100).toFixed(1);
      report += `- **${row.budget.label}** grew ${pct}% (${row.base} → ${row.current}${row.budget.unit || ''}) — ` +
        `more work per frame on every device, which is the thing that actually shows up as lag.\n`;
    }
    if (fpsStatus === 'regression') {
      report += `- **FPS dropped** by ${(((baseline.fps.avg - results.fps.avg) / baseline.fps.avg) * 100).toFixed(1)}%\n`;
    }
    if (frameTimeStatus === 'regression') {
      report += `- **Frame time increased** by ${(((results.frameTime.avg - baseline.frameTime.avg) / baseline.frameTime.avg) * 100).toFixed(1)}%\n`;
    }
    if (jankStatus === 'regression') {
      report += `- **Jank (frame spikes) increased** by ${(((results.jank.maxFrameTime - baseline.jank.maxFrameTime) / baseline.jank.maxFrameTime) * 100).toFixed(1)}%\n`;
    }
    if (memoryStatus === 'regression') {
      report += `- **Memory growth increased** by ${(((results.memory.growthMB - baseline.memory.growthMB) / baseline.memory.growthMB) * 100).toFixed(1)}%\n`;
    }
  }

  if (!hasBaseline) {
    report += `
> :information_source: No baseline available for comparison. This run will become the baseline on merge to main.
`;
  } else if (!gradeTimings && !software) {
    report += `
> :information_source: Frame timings not compared: the baseline was recorded on a
> different machine class (\`${baseline.renderer?.name || 'unknown'}\`, throttle
> ${baseline.cpuThrottle || 1}x). Scene-cost counters are machine-independent and
> were compared.
`;
  }

  report += `
---
<sub>Generated by TwilightGame Performance CI | ${new Date().toISOString()}</sub>
`;

  return { report, hasRegression };
}

// Main
const results = loadJson('perf-results.json');
const baseline = loadJson('perf-baseline.json');

if (!results) {
  console.error('Error: perf-results.json not found');
  process.exit(1);
}

const { report, hasRegression } = generateReport(results, baseline);

writeFileSync('perf-report.md', report);
console.log('Generated perf-report.md');

if (hasRegression) {
  writeFileSync('regression-detected', '');
  console.log('Regression detected - created regression-detected marker');
}

// Print summary to console
const summaryScene = sceneOf(results);
console.log('\n--- Performance Summary ---');
console.log(`Renderer: ${results.renderer?.name || 'unknown'}${results.renderer?.software ? ' (software — timings advisory)' : ''}`);
if (summaryScene) {
  console.log(
    `Scene: ${summaryScene.sprites} sprites, ${summaryScene.nodes} nodes, ` +
    `${summaryScene.textures} textures (${summaryScene.textureMB}MB), depth ${summaryScene.maxDepth}`
  );
}
console.log(`FPS: ${results.fps.avg} (min: ${results.fps.min})`);
console.log(`Frame Time: ${results.frameTime.avg}ms (P95: ${results.frameTime.p95}ms)`);
console.log(`Jank: ${results.jank.maxFrameTime}ms worst frame`);
if (results.memory) {
  console.log(`Memory: ${results.memory.growthMB}MB growth`);
}
console.log(`Status: ${hasRegression ? 'REGRESSION' : 'OK'}`);
