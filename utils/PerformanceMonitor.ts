/**
 * PerformanceMonitor - Tracks game performance metrics for profiling
 *
 * Metrics tracked:
 * - FPS (frames per second)
 * - Frame time (ms per frame)
 * - Frame time variance (jank detection)
 * - JS heap size (memory)
 * - Sprite/node counts
 *
 * Usage:
 *   // In game loop:
 *   performanceMonitor.frameStart();
 *   // ... game logic ...
 *   performanceMonitor.frameEnd();
 *
 *   // Get current metrics:
 *   const metrics = performanceMonitor.getMetrics();
 *
 *   // Expose for headless testing:
 *   (window as any).__PERF_MONITOR__ = performanceMonitor;
 */

export interface PerformanceMetrics {
  // Frame timing
  fps: number;
  avgFrameTime: number;      // Average ms per frame
  minFrameTime: number;      // Best frame time in sample
  maxFrameTime: number;      // Worst frame time in sample (jank indicator)
  frameTimeVariance: number; // Standard deviation (jank indicator)

  // Memory (if available)
  heapUsed: number;          // JS heap used (bytes)
  heapTotal: number;         // JS heap total (bytes)

  // Counts
  spriteCount: number;       // PixiJS sprite count
  domNodeCount: number;      // DOM node count

  // Timing
  timestamp: number;
  uptime: number;            // Seconds since monitoring started
  frameCount: number;        // Total frames rendered
}

export interface PerformanceSnapshot {
  timestamp: number;
  metrics: PerformanceMetrics;
  label?: string;
}

const SAMPLE_SIZE = 60; // Track last 60 frames for averages

class PerformanceMonitor {
  private frameTimes: number[] = [];
  private lastFrameStart: number = 0;
  private startTime: number = 0;
  private frameCount: number = 0;
  private isRunning: boolean = false;
  private snapshots: PerformanceSnapshot[] = [];

  // External counts (set by renderers)
  private _spriteCount: number = 0;
  private _domNodeCount: number = 0;

  constructor() {
    this.startTime = performance.now();
  }

  /**
   * Call at the start of each frame
   */
  frameStart(): void {
    this.lastFrameStart = performance.now();
    this.isRunning = true;
  }

  /**
   * Call at the end of each frame
   */
  frameEnd(): void {
    if (!this.isRunning || this.lastFrameStart === 0) return;

    const frameTime = performance.now() - this.lastFrameStart;
    this.frameTimes.push(frameTime);
    this.frameCount++;

    // Keep only last SAMPLE_SIZE frames
    if (this.frameTimes.length > SAMPLE_SIZE) {
      this.frameTimes.shift();
    }
  }

  /**
   * Set sprite count (call from PixiJS renderer)
   */
  setSpriteCount(count: number): void {
    this._spriteCount = count;
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
      const squaredDiffs = this.frameTimes.map(t => Math.pow(t - avgFrameTime, 2));
      variance = Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / this.frameTimes.length);

      // FPS from average frame time
      fps = avgFrameTime > 0 ? 1000 / avgFrameTime : 0;
    }

    // Memory info (Chrome only)
    let heapUsed = 0;
    let heapTotal = 0;
    const perfMemory = (performance as any).memory;
    if (perfMemory) {
      heapUsed = perfMemory.usedJSHeapSize;
      heapTotal = perfMemory.totalJSHeapSize;
    }

    // DOM node count
    const domNodeCount = this._domNodeCount || document.querySelectorAll('*').length;

    return {
      fps: Math.round(fps * 10) / 10,
      avgFrameTime: Math.round(avgFrameTime * 100) / 100,
      minFrameTime: minFrameTime === Infinity ? 0 : Math.round(minFrameTime * 100) / 100,
      maxFrameTime: Math.round(maxFrameTime * 100) / 100,
      frameTimeVariance: Math.round(variance * 100) / 100,
      heapUsed,
      heapTotal,
      spriteCount: this._spriteCount,
      domNodeCount,
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
    this.lastFrameStart = 0;
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
    return `FPS: ${m.fps} | Frame: ${m.avgFrameTime}ms (${m.minFrameTime}-${m.maxFrameTime}ms) | Jank: ${m.frameTimeVariance}ms | Heap: ${heapMB} | Sprites: ${m.spriteCount} | DOM: ${m.domNodeCount}`;
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

    await new Promise(resolve => setTimeout(resolve, durationMs));

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

// Expose globally for headless testing
if (typeof window !== 'undefined') {
  (window as any).__PERF_MONITOR__ = performanceMonitor;
}

export default performanceMonitor;
