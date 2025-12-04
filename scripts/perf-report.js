#!/usr/bin/env node

/**
 * Performance Report Generator
 *
 * Generates a markdown report from performance test results.
 * Used by GitHub Actions to post PR comments.
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

function generateReport(results, baseline) {
  const hasBaseline = !!baseline;
  let hasRegression = false;
  let hasWarning = false;

  // Calculate regression statuses
  const fpsStatus = hasBaseline
    ? getRegressionStatus(results.fps.avg, baseline.fps.avg, THRESHOLDS.fps, true)
    : 'neutral';
  const frameTimeStatus = hasBaseline
    ? getRegressionStatus(results.frameTime.avg, baseline.frameTime.avg, THRESHOLDS.frameTime)
    : 'neutral';
  const jankStatus = hasBaseline
    ? getRegressionStatus(results.jank.maxFrameTime, baseline.jank.maxFrameTime, THRESHOLDS.jank)
    : 'neutral';
  const memoryStatus = hasBaseline && results.memory && baseline.memory
    ? getRegressionStatus(results.memory.growthMB, baseline.memory.growthMB, THRESHOLDS.memory)
    : 'neutral';

  if ([fpsStatus, frameTimeStatus, jankStatus, memoryStatus].includes('regression')) {
    hasRegression = true;
  }
  if ([fpsStatus, frameTimeStatus, jankStatus, memoryStatus].includes('warning')) {
    hasWarning = true;
  }

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

### Metrics

| Metric | Current | ${hasBaseline ? 'Baseline | Change |' : ''} Status |
|--------|---------|${hasBaseline ? '---------|--------|' : ''} ------ |
| **FPS (avg)** | ${results.fps.avg} fps | ${hasBaseline ? `${baseline.fps.avg} fps | ${formatChange(results.fps.avg, baseline.fps.avg, true)} |` : ''} ${getStatusEmoji(fpsStatus)} |
| **FPS (min)** | ${results.fps.min} fps | ${hasBaseline ? `${baseline.fps.min} fps | ${formatChange(results.fps.min, baseline.fps.min, true)} |` : ''} |
| **Frame Time (avg)** | ${results.frameTime.avg} ms | ${hasBaseline ? `${baseline.frameTime.avg} ms | ${formatChange(results.frameTime.avg, baseline.frameTime.avg)} |` : ''} ${getStatusEmoji(frameTimeStatus)} |
| **Frame Time (P95)** | ${results.frameTime.p95} ms | ${hasBaseline ? `${baseline.frameTime.p95} ms | ${formatChange(results.frameTime.p95, baseline.frameTime.p95)} |` : ''} |
| **Jank (worst)** | ${results.jank.maxFrameTime} ms | ${hasBaseline ? `${baseline.jank.maxFrameTime} ms | ${formatChange(results.jank.maxFrameTime, baseline.jank.maxFrameTime)} |` : ''} ${getStatusEmoji(jankStatus)} |
`;

  if (results.memory) {
    report += `| **Memory Growth** | ${results.memory.growthMB} MB | ${hasBaseline && baseline.memory ? `${baseline.memory.growthMB} MB | ${formatChange(results.memory.growthMB, baseline.memory.growthMB)} |` : ''} ${getStatusEmoji(memoryStatus)} |
| **Heap (max)** | ${results.memory.maxMB} MB | ${hasBaseline && baseline.memory ? `${baseline.memory.maxMB} MB | ${formatChange(results.memory.maxMB, baseline.memory.maxMB)} |` : ''} |
`;
  }

  // Performance grade
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

`;

  if (hasRegression) {
    report += `
### :x: Regression Details

Performance has degraded compared to baseline. Please investigate the following:

`;
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
console.log('\n--- Performance Summary ---');
console.log(`FPS: ${results.fps.avg} (min: ${results.fps.min})`);
console.log(`Frame Time: ${results.frameTime.avg}ms (P95: ${results.frameTime.p95}ms)`);
console.log(`Jank: ${results.jank.maxFrameTime}ms worst frame`);
if (results.memory) {
  console.log(`Memory: ${results.memory.growthMB}MB growth`);
}
console.log(`Status: ${hasRegression ? 'REGRESSION' : 'OK'}`);
