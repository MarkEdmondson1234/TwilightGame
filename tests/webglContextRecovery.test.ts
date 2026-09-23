/**
 * WebGL context-loss recovery (issue #157).
 *
 * WHAT BREAKS IF THESE FAIL: a phone that loses its WebGL context (iOS does
 * this under memory pressure — reported entering the lava levels after a
 * goblin fight) shows a plain green screen with the HUD floating over it,
 * forever. Nothing throws. The old handler re-initialised PixiJS on the same
 * canvas it had just destroyed: `app.destroy(true)` detaches that canvas from
 * the DOM and Pixi's destroy force-loses its context, so the rebuilt world drew
 * into an element nobody could see. It also only ran on `webglcontextrestored`,
 * which iOS frequently never sends.
 */

/** @vitest-environment node */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createContextRecovery } from '../utils/pixi/contextRecovery';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file: string) => fs.readFileSync(path.join(ROOT, file), 'utf8');

function harness(waitMs = 2000) {
  let now = 0;
  let pending: { fn: () => void; at: number } | null = null;
  let rebuilds = 0;
  const recovery = createContextRecovery({
    waitMs,
    onRebuild: () => rebuilds++,
    setTimer: (fn, ms) => {
      pending = { fn, at: now + ms };
      return pending;
    },
    clearTimer: (handle) => {
      if (pending === handle) pending = null;
    },
  });
  const advance = (ms: number) => {
    now += ms;
    if (pending && pending.at <= now) {
      const { fn } = pending;
      pending = null;
      fn();
    }
  };
  return { recovery, advance, rebuilds: () => rebuilds };
}

describe('createContextRecovery', () => {
  it('rebuilds as soon as the browser restores the context', () => {
    const h = harness();
    h.recovery.handleLost();
    expect(h.rebuilds()).toBe(0);
    h.recovery.handleRestored();
    expect(h.rebuilds()).toBe(1);
    h.advance(5000); // the fallback timer must not fire a second rebuild
    expect(h.rebuilds()).toBe(1);
  });

  it('rebuilds anyway when no restore ever arrives (the usual iOS case)', () => {
    const h = harness(2000);
    h.recovery.handleLost();
    h.advance(1999);
    expect(h.rebuilds()).toBe(0);
    h.advance(1);
    expect(h.rebuilds()).toBe(1);
  });

  it('ignores the second "lost" our own teardown causes, and stray restores', () => {
    const h = harness();
    h.recovery.handleRestored(); // never lost
    expect(h.rebuilds()).toBe(0);
    h.recovery.handleLost();
    h.recovery.handleLost();
    h.recovery.handleRestored();
    h.recovery.handleLost(); // Pixi's destroy() calls loseContext() on the old canvas
    h.advance(10000);
    expect(h.rebuilds()).toBe(1);
  });

  it('does nothing after dispose (renderer torn down for another reason)', () => {
    const h = harness();
    h.recovery.handleLost();
    h.recovery.dispose();
    h.advance(10000);
    h.recovery.handleRestored();
    expect(h.rebuilds()).toBe(0);
  });
});

describe('renderer rebuild uses a fresh canvas', () => {
  const hook = read('hooks/usePixiRenderer.ts');
  const app = read('App.tsx');

  it('App keys the world canvas on canvasKey from usePixiRenderer', () => {
    const canvasTag = app.match(/<canvas[^>]*ref=\{canvasRef\}/);
    expect(canvasTag, 'world <canvas ref={canvasRef}> not found in App.tsx').not.toBeNull();
    // Without the key React keeps the old (detached, context-lost) element and
    // the rebuilt renderer draws into it: green screen, HUD only.
    expect(canvasTag![0]).toMatch(/key=\{canvasKey\}/);
    expect(app).toMatch(/\bcanvasKey,\s*\n\s*\}\s*=\s*usePixiRenderer\(/);
  });

  it('the init effect re-runs on a new canvas generation, and is wired to the recovery policy', () => {
    expect(hook).toMatch(/\}, \[enabled, isMapInitialized, canvasGeneration\]\);/);
    expect(hook).toMatch(/canvasKey: canvasGeneration/);
    expect(hook).toMatch(/createContextRecovery\(/);
    // The broken pattern: re-initialising PixiJS by hand from the restore
    // handler, on the canvas that was just destroyed.
    expect(hook).not.toMatch(/setTimeout\(\(\) => initPixi\(\)/);
  });
});
