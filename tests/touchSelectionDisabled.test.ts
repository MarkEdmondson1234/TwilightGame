/** @vitest-environment node */
/**
 * On a touch screen, holding the D-pad must never bring up iOS's text loupe or
 * its Copy / Look Up callout (issue #157). A thumb on an arrow drifts onto
 * whatever text is nearby, so selection is switched off for the whole page on
 * coarse pointers — and back on for text fields, which Safari otherwise refuses
 * to let you type into.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(resolve(__dirname, '../src/styles/global.css'), 'utf8');

function coarseBlock(): string {
  const start = css.indexOf('@media (pointer: coarse)');
  expect(start, 'global.css needs an @media (pointer: coarse) block').toBeGreaterThanOrEqual(0);
  let depth = 0;
  for (let i = css.indexOf('{', start); i < css.length; i++) {
    if (css[i] === '{') depth++;
    if (css[i] === '}' && --depth === 0) return css.slice(start, i + 1);
  }
  throw new Error('unterminated @media (pointer: coarse) block');
}

describe('touch text selection', () => {
  it('is off for the whole page on touch screens', () => {
    const block = coarseBlock();
    const pageRule = block.match(/html,\s*body\s*\{([^}]*)\}/);
    expect(pageRule, 'the coarse-pointer block must style html, body').toBeTruthy();
    expect(pageRule![1]).toMatch(/-webkit-touch-callout:\s*none/);
    expect(pageRule![1]).toMatch(/-webkit-user-select:\s*none/);
    expect(pageRule![1]).toMatch(/[^-]user-select:\s*none/);
  });

  it('is back on for text fields, or chat cannot be typed into on iOS', () => {
    const block = coarseBlock();
    const fieldRule = block.match(/input,\s*textarea[^{]*\{([^}]*)\}/);
    expect(fieldRule, 'inputs and textareas must opt back in to selection').toBeTruthy();
    expect(fieldRule![1]).toMatch(/-webkit-user-select:\s*text/);
  });
});
