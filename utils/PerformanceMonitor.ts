/**
 * PerformanceMonitor - Tracks game performance metrics for profiling
 *
 * Metrics tracked:
 * - FPS (frames per second) - based on frame-to-frame timing
 * - Frame time (ms per frame) - time between successive frames
 * - Frame time variance (jank detection)
 * - JS heap size (memory)
 * - Sprite/node counts
 *
 * Usage:
 *   // In game loop (call once per frame):
 *   performanceMonitor.tick();
 *
 *   // Get current metrics:
 *   const metrics = performanceMonitor.getMetrics();
 *
 *   // Expose for headless testing:
 *   window.__PERF_MONITOR__ = performanceMonitor;
 */

/**
 * What the renderer is being *asked* to draw, counted from the live scene graph.
 *
 * Every field here is a count or a byte total, not a duration. That is the whole
 * point: fps on a GPU-less CI runner is a measurement of the runner, but "this
 * map now puts 4,000 sprites on the stage" is the same number on a Mac, on an
 * iPad and on a SwiftShader software rasteriser. The forest-perf investigation
 * found the real lever is sprite density and texture residency, so these are
 * the quantities a regression would actually move.
 */
export interface SceneCost {
  nodes: number; // every node in the stage tree
  sprites: number; // renderable leaves (Sprite/AnimatedSprite/Text/Graphics)
  visibleSprites: number; // ...of those, the ones actually drawn this frame
  containers: number; // grouping nodes
  maxDepth: number; // deepest nesting — proxy for transform/sort work
  textures: number; // distinct texture sources referenced by visible sprites
  textureMB: number; // estimated GPU residency of those sources (RGBA)
}

export interface PerformanceMetrics {
  // Frame timing
  fps: number;
  avgFrameTime: number; // Average ms per frame
  minFrameTime: number; // Best frame time in sample
  maxFrameTime: number; // Worst frame time in sample (jank indicator)
  frameTimeVariance: number; // Standard deviation (jank indicator)

  // Memory (if available)
  heapUsed: number; // JS heap used (bytes)
  heapTotal: number; // JS heap total (bytes)

  // Counts
  spriteCount: number; // PixiJS sprite count
  domNodeCount: number; // DOM node count

  // Scene cost — see SceneCost. Hardware-independent, so unlike fps these
  // survive being measured on a software renderer.
  scene: SceneCost;

  // Timing
  timestamp: number;
  uptime: number; // Seconds since monitoring started
  frameCount: number; // Total frames rendered
}

export interface PerformanceSnapshot {
  timestamp: number;
  metrics: PerformanceMetrics;
  label?: string;
}

/**
 * The slice of a PixiJS display object this module needs. Structural, so the
 * monitor never imports pixi.js and can be unit-tested against plain objects.
 */
export interface SceneNode {
  children?: SceneNode[];
  visible?: boolean;
  renderable?: boolean;
  alpha?: number;
  texture?: { source?: { uid?: number | string; width?: number; height?: number } } | null;
}

export const EMPTY_SCENE_COST: SceneCost = {
  nodes: 0,
  sprites: 0,
  visibleSprites: 0,
  containers: 0,
  maxDepth: 0,
  textures: 0,
  textureMB: 0,
};

/**
 * Count what the stage is asking the renderer to draw.
 *
 * A node counts as a sprite when it carries a texture; anything with children
 * and no texture is a container. `visible` is inherited, so a hidden subtree
 * contributes to `sprites` (it is still built, still transformed on a resort)
 * but not to `visibleSprites` — the gap between the two is itself a useful
 * signal, because a layer left mounted-but-hidden is a common accidental cost.
 *
 * Texture memory is an estimate: width * height * 4 bytes, deduplicated by
 * source, ignoring mipmaps and compression. It tracks *residency*, which is the
 * number that decides whether an old iPad evicts textures mid-frame.
 */
export function measureSceneCost(stage: SceneNode | null | undefined): SceneCost {
  if (!stage) return { ...EMPTY_SCENE_COST };

  const cost: SceneCost = { ...EMPTY_SCENE_COST };
  const seenSources = new Set<number | string>();
  let textureBytes = 0;

  const walk = (node: SceneNode, depth: number, parentVisible: boolean): void => {
    cost.nodes++;
    if (depth > cost.maxDepth) cost.maxDepth = depth;

    const drawn =
      parentVisible &&
      node.visible !== false &&
      node.renderable !== false &&
      (node.alpha === undefined || node.alpha > 0);

    const source = node.texture?.source;
    if (source) {
      cost.sprites++;
      if (drawn) {
        cost.visibleSprites++;
        const uid = source.uid;
        const key = uid === undefined ? `${source.width}x${source.height}` : uid;
        if (!seenSources.has(key)) {
          seenSources.add(key);
          textureBytes += (source.width || 0) * (source.height || 0) * 4;
        }
      }
    } else if (node.children && node.children.length > 0) {
      cost.containers++;
    }

    if (node.children) {
      for (const child of node.children) walk(child, depth + 1, drawn);
    }
  };

  walk(stage, 0, true);

  cost.textures = seenSources.size;
  cost.textureMB = Math.round((textureBytes / 1024 / 1024) * 10) / 10;
  return cost;
}

const SAMPLE_SIZE = 60; // Track last 60 frames for averages

class PerformanceMonitor {
  private frameTimes: number[] = [];
  private lastTickTime: number = 0;
  private startTime: number = 0;
  private frameCount: number = 0;
  private snapshots: PerformanceSnapshot[] = [];

  // External counts (set by renderers)
  private _spriteCount: number = 0;
  private _domNodeCount: number = 0;

  // The live PixiJS stage, registered by usePixiRenderer. Held as a plain
  // reference and cleared on teardown; never walked on the frame path.
  private _stage: SceneNode | null = null;

  constructor() {
    this.startTime = performance.now();
  }

  /**
   * Call once per frame to measure frame-to-frame timing.
   * This measures the actual time between successive frames,
   * which accurately represents FPS.
   */
  tick(): void {
    const now = performance.now();

    if (this.lastTickTime > 0) {
      const frameTime = now - this.lastTickTime;
      this.frameTimes.push(frameTime);
      this.frameCount++;

      // Keep only last SAMPLE_SIZE frames
      if (this.frameTimes.length > SAMPLE_SIZE) {
        this.frameTimes.shift();
      }
    }

    this.lastTickTime = now;
  }

  /**
   * Set sprite count (call from PixiJS renderer)
   */
  setSpriteCount(count: number): void {
    this._spriteCount = count;
  }

  /**
   * Register the PixiJS stage so scene cost can be counted.
   *
   * Duck-typed rather than typed as `PIXI.Container` so this module stays free
   * of a pixi.js import — it is loaded by the headless harness and by tests that
   * have no renderer at all.
   */
  attachStage(stage: SceneNode | null): void {
    this._stage = stage;
  }

  /**
   * Set DOM node count (call from DOM renderer)
   */
  setDomNodeCount(count: number): void {
    this._domNodeCount = count;
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): PerformanceMetrics {
    const now = performance.now();

    // Calculate frame time stats
    let avgFrameTime = 0;
    let minFrameTime = Infinity;
    let maxFrameTime = 0;
    let variance = 0;
    let fps = 0;

    if (this.frameTimes.length > 0) {
      const sum = this.frameTimes.reduce((a, b) => a + b, 0);
      avgFrameTime = sum / this.frameTimes.length;
      minFrameTime = Math.min(...this.frameTimes);
      maxFrameTime = Math.max(...this.frameTimes);

      // Calculate variance
      const squaredDiffs = this.frameTimes.map((t) => Math.pow(t - avgFrameTime, 2));
      variance = Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / this.frameTimes.length);

      // FPS from average frame time
      fps = avgFrameTime > 0 ? 1000 / avgFrameTime : 0;
    }

    // Memory info (Chrome only)
    let heapUsed = 0;
    let heapTotal = 0;
    const perfMemory = performance.memory;
    if (perfMemory) {
      heapUsed = perfMemory.usedJSHeapSize;
      heapTotal = perfMemory.totalJSHeapSize;
    }

    // DOM node count
    const domNodeCount = this._domNodeCount || document.querySelectorAll('*').length;

    // Walk the stage. Only ever called on demand (debug HUD, headless harness),
    // never from the frame loop, so an O(nodes) walk is not on any hot path.
    const scene = measureSceneCost(this._stage);

    return {
      fps: Math.round(fps * 10) / 10,
      avgFrameTime: Math.round(avgFrameTime * 100) / 100,
      minFrameTime: minFrameTime === Infinity ? 0 : Math.round(minFrameTime * 100) / 100,
      maxFrameTime: Math.round(maxFrameTime * 100) / 100,
      frameTimeVariance: Math.round(variance * 100) / 100,
      heapUsed,
      heapTotal,
      spriteCount: this._spriteCount || scene.sprites,
      domNodeCount,
      scene,
      timestamp: now,
      uptime: (now - this.startTime) / 1000,
      frameCount: this.frameCount,
    };
  }

  /**
   * Take a snapshot of current metrics (for before/after comparison)
   */
  takeSnapshot(label?: string): PerformanceSnapshot {
    const snapshot: PerformanceSnapshot = {
      timestamp: performance.now(),
      metrics: this.getMetrics(),
      label,
    };
    this.snapshots.push(snapshot);
    return snapshot;
  }

  /**
   * Get all snapshots
   */
  getSnapshots(): PerformanceSnapshot[] {
    return [...this.snapshots];
  }

  /**
   * Clear snapshots
   */
  clearSnapshots(): void {
    this.snapshots = [];
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.frameTimes = [];
    this.lastTickTime = 0;
    this.startTime = performance.now();
    this.frameCount = 0;
    this.snapshots = [];
  }

  /**
   * Get a summary string for logging
   */
  getSummary(): string {
    const m = this.getMetrics();
    const heapMB = m.heapUsed ? `${(m.heapUsed / 1024 / 1024).toFixed(1)}MB` : 'N/A';
    return `FPS: ${m.fps} | Frame: ${m.avgFrameTime}ms (${m.minFrameTime}-${m.maxFrameTime}ms) | Jank: ${m.frameTimeVariance}ms | Heap: ${heapMB} | Sprites: ${m.scene.visibleSprites}/${m.scene.sprites} | Tex: ${m.scene.textures} (${m.scene.textureMB}MB) | DOM: ${m.domNodeCount}`;
  }

  /**
   * Check if performance is acceptable
   */
  isPerformanceOk(minFps: number = 30, maxFrameTime: number = 50): boolean {
    const m = this.getMetrics();
    return m.fps >= minFps && m.maxFrameTime <= maxFrameTime;
  }

  /**
   * Run a performance test for a duration and return metrics
   */
  async runTest(durationMs: number = 5000): Promise<{
    start: PerformanceMetrics;
    end: PerformanceMetrics;
    avg: PerformanceMetrics;
  }> {
    const start = this.getMetrics();
    this.reset();

    await new Promise((resolve) => setTimeout(resolve, durationMs));

    const end = this.getMetrics();

    return {
      start,
      end,
      avg: end, // After reset, end contains the average over the test period
    };
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Expose globally for headless testing (typed in vite-env.d.ts)
if (typeof window !== 'undefined') {
  window.__PERF_MONITOR__ = performanceMonitor;
}

export default performanceMonitor;
