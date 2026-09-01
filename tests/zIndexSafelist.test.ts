/** @vitest-environment node */
/**
 * Guards the z-index safelist in src/styles/global.css.
 *
 * zClass() in zIndex.ts builds `z-[${value}]` at runtime, so Tailwind's source
 * scanner never sees those class names and generates no rule for them unless
 * they are listed in the `@source inline(...)` safelist. A missing entry is
 * invisible in code review and at build time — the element simply renders with
 * `z-index: auto` and slips behind whatever else on the page did get a stacking
 * order. That is exactly how the title screen ended up underneath the HUD.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '..');

describe('z-index safelist', () => {
  it('lists every Z_* constant from zIndex.ts in global.css', () => {
    const source = readFileSync(join(ROOT, 'zIndex.ts'), 'utf-8');
    const css = readFileSync(join(ROOT, 'src/styles/global.css'), 'utf-8');

    const constants = [...source.matchAll(/^export const (Z_[A-Z_]+) = (-?[\d.]+);/gm)].map(
      ([, name, value]) => ({ name, value })
    );
    expect(constants.length).toBeGreaterThan(0);

    const safelist = css.match(/@source inline\("z-\[\{([^}]+)\}\]"\);/);
    expect(
      safelist,
      'No `@source inline("z-[{...}]")` safelist found in src/styles/global.css — ' +
        'without it every zClass() utility is missing from the stylesheet.'
    ).not.toBeNull();

    const listed = new Set(safelist![1].split(',').map((v) => v.trim()));
    const missing = constants.filter((c) => !listed.has(c.value));

    expect(
      missing,
      `These z-index constants are missing from the safelist in src/styles/global.css:\n` +
        missing.map((c) => `  - ${c.name} = ${c.value}`).join('\n') +
        `\nAdd their values inside the @source inline("z-[{...}]") braces, otherwise ` +
        `zClass() emits a class Tailwind never generated and the element gets no z-index.`
    ).toEqual([]);
  });
});
