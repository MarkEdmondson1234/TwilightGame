import { describe, it, expect } from 'vitest';
import { measureSceneCost, SceneNode } from '../utils/PerformanceMonitor';

/**
 * Scene cost is what the CI performance gate now grades, in place of frame rate.
 *
 * The reason is in scripts/perf-report.js: CI renders through SwiftShader on a
 * GPU-less runner, so fps there measured the runner, not the game — four
 * main-branch runs of identical code spanned 1.4 to 49.6 fps. These counts do
 * not, which is the whole point of moving the gate onto them. So they need to be
 * right, and they need to keep counting the same things.
 */

const sprite = (uid: number, w = 64, h = 64, extra: Partial<SceneNode> = {}): SceneNode => ({
  texture: { source: { uid, width: w, height: h } },
  ...extra,
});

describe('measureSceneCost', () => {
  it('returns zeros rather than throwing when no stage is attached', () => {
    // The harness reads metrics before the renderer exists, and on teardown
    // after it is gone. Neither may throw inside a getMetrics() call.
    expect(measureSceneCost(null)).toMatchObject({ nodes: 0, sprites: 0, textureMB: 0 });
    expect(measureSceneCost(undefined)).toMatchObject({ nodes: 0 });
  });

  it('separates sprites from the containers that group them', () => {
    const stage: SceneNode = { children: [{ children: [sprite(1), sprite(2)] }, sprite(3)] };
    const cost = measureSceneCost(stage);

    expect(cost.sprites).toBe(3);
    expect(cost.containers).toBe(2); // the stage is itself a container
    expect(cost.nodes).toBe(5); // stage + container + 3 sprites
  });

  it('counts a hidden subtree as built but not as drawn', () => {
    // The gap between the two is the signal: a layer left mounted-but-hidden
    // still costs transform and sort work, and is a common accidental regression.
    const stage: SceneNode = {
      children: [sprite(1), { visible: false, children: [sprite(2), sprite(3)] }],
    };
    const cost = measureSceneCost(stage);

    expect(cost.sprites).toBe(3);
    expect(cost.visibleSprites).toBe(1);
  });

  it('treats alpha 0 and renderable false as not drawn', () => {
    const stage: SceneNode = {
      children: [sprite(1, 64, 64, { alpha: 0 }), sprite(2, 64, 64, { renderable: false }), sprite(3)],
    };
    expect(measureSceneCost(stage).visibleSprites).toBe(1);
  });

  it('deduplicates texture sources, so an atlas reused 100 times costs once', () => {
    const stage: SceneNode = { children: [sprite(7), sprite(7), sprite(7), sprite(9)] };
    const cost = measureSceneCost(stage);

    expect(cost.sprites).toBe(4);
    expect(cost.textures).toBe(2);
  });

  it('estimates texture residency as RGBA bytes', () => {
    // 1024x1024x4 = 4 MB.
    const stage: SceneNode = { children: [sprite(1, 1024, 1024)] };
    expect(measureSceneCost(stage).textureMB).toBe(4);
  });

  it('reports the deepest nesting, not the average', () => {
    const stage: SceneNode = { children: [{ children: [{ children: [sprite(1)] }] }, sprite(2)] };
    expect(measureSceneCost(stage).maxDepth).toBe(3);
  });

  it('ignores a hidden sprite when totalling texture memory', () => {
    // Residency is about what the frame actually needs resident.
    const stage: SceneNode = {
      children: [sprite(1, 1024, 1024), sprite(2, 1024, 1024, { visible: false })],
    };
    expect(measureSceneCost(stage).textureMB).toBe(4);
  });
});
