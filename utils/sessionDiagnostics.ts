/** Bounded, metadata-only diagnostics. No gameplay payloads or console forwarding. */
import * as Sentry from '@sentry/react';
import { performanceMonitor } from './PerformanceMonitor';
import { getCachedPerformanceSettings } from './performanceTier';

type Fields = Record<string, string | number | boolean>;
type Operation =
  | 'map_transition'
  | 'map_load'
  | 'texture_batch'
  | 'local_save'
  | 'cloud_upload'
  | 'cloud_download';
const INTERVAL_MS = 60_000;
const STARTUP_INTERVAL_MS = 15_000;
const STARTUP_SAMPLES = 4;
const MAX_LOGS = 360; // Hard ceiling per page session, including operation logs.
// A minute needs this many frames over 50ms before it counts as "slow" and
// earns runtime attribution (NPC count, weather, remote players). Healthy
// minutes log 0–1 such frames; the first real slow minute observed in
// production had 35. The bar is low enough to catch moderate jank, high
// enough that healthy sessions never pay the getter call.
const SLOW_MINUTE_STALLS = 5;
let active = false;
let sessionId = '';
let mapId = 'startup';
let sent = 0;
let visibilityEpoch = 0;
let lastFrame = 0;
let frames = 0;
let elapsed = 0;
let worst = 0;
let stalls = 0;
let reportDue = false;
let timer: ReturnType<typeof setInterval> | undefined;
let startupTimer: ReturnType<typeof setInterval> | undefined;
let worldReady = false;
let residentMemory: (() => number) | undefined;
const lastOperation = new Map<string, number>();
let device: Fields = {};
let view: Fields = {};
let contextLossReported = false;
// Registered via setSlowMinuteContext so this module never imports game
// modules (GameState already imports sessionDiagnostics — the cycle would be
// real). Only invoked for slow minutes, so healthy sessions pay nothing.
let slowMinuteContext: (() => Fields) | undefined;

function safely(action: () => void): void {
  try {
    action();
  } catch {
    /* Diagnostics must never interrupt gameplay. */
  }
}
function log(message: string, fields: Fields = {}): void {
  if (!active || sent >= MAX_LOGS) return;
  sent++;
  safely(() =>
    Sentry.logger.info(message, {
      ...device,
      'game.session_id': sessionId,
      'game.map': mapId,
      ...fields,
    })
  );
}
function resetFrames(): void {
  lastFrame = frames = elapsed = worst = stalls = 0;
}
function onVisibility(): void {
  visibilityEpoch++;
  reportDue = false;
  resetFrames(); // Discard the gap AND the partial window on either transition.
}

/** Constant-space frame accumulation; only a pending minute summary touches the SDK. */
export function recordSessionFrame(now = performance.now()): void {
  if (!active || sent >= MAX_LOGS || document.visibilityState !== 'visible') return;
  if (lastFrame > 0) {
    const dt = now - lastFrame;
    if (dt > 0) {
      frames++;
      elapsed += dt;
      worst = Math.max(worst, dt);
      if (dt > 50) stalls++;
    }
  }
  lastFrame = now;
  if (reportDue) {
    reportDue = false;
    reportPerformance();
  }
}
function reportPerformance(): void {
  if (!active || sent >= MAX_LOGS || document.visibilityState !== 'visible') return;
  // Called only by a live game frame: paused loops cannot send stale metrics.
  if (frames < 2 || elapsed < 5_000) {
    resetFrames();
    return;
  }
  safely(() => {
    const metrics = performanceMonitor.getMetrics();
    const summary: Fields = {
      ...view,
      'performance.fps': Math.round((frames * 10000) / elapsed) / 10,
      'performance.worst_frame_ms': Math.round(worst),
      'performance.frames_over_50ms': stalls,
      'performance.frames': frames,
      'performance.window_ms': Math.round(elapsed),
      'performance.scene_texture_mb': metrics.scene.textureMB,
      'performance.visible_sprites': metrics.scene.visibleSprites,
      'performance.viewport_width': window.innerWidth,
      'performance.viewport_height': window.innerHeight,
    };
    if (metrics.heapUsed > 0)
      summary['performance.heap_mb'] = Math.round(metrics.heapUsed / 1048576);
    if (residentMemory) summary['performance.resident_texture_mb'] = Math.round(residentMemory());
    // Slow minutes earn attribution: what was the world doing? The getter is
    // only called when the threshold is crossed, and its failure must not cost
    // us the report we already assembled.
    if (stalls >= SLOW_MINUTE_STALLS && slowMinuteContext) {
      safely(() => Object.assign(summary, slowMinuteContext()));
    }
    Sentry.setContext('game_performance', summary);
    log('game.performance', summary);
  });
  resetFrames();
}

/** Called only after Sentry initialises. One fresh ID per page load, never persisted. */
export function startSessionDiagnostics(): void {
  if (active || typeof window === 'undefined') return;
  safely(() => {
    sessionId = crypto.randomUUID();
    const settings = getCachedPerformanceSettings();
    device = {
      'device.user_agent': navigator.userAgent,
      'device.cores': navigator.hardwareConcurrency || 0,
      'device.memory_gb': (navigator as Navigator & { deviceMemory?: number }).deviceMemory || 0,
      'device.pixel_ratio': window.devicePixelRatio || 1,
      'graphics.tier': settings.tier,
      'graphics.mobile': settings.isMobile,
      'graphics.resolution': settings.resolution,
      'graphics.antialias': settings.antialias,
      'graphics.mipmaps': settings.generateMipmaps,
      'graphics.texture_budget_mb': settings.textureBudgetMB,
      'graphics.concurrent_loads': settings.maxConcurrentTextureLoads,
    };
    active = true;
    Sentry.setTag('game.session_id', sessionId);
    Sentry.setTag('graphics.tier', settings.tier);
    Sentry.setContext('game_device', device);
    document.addEventListener('visibilitychange', onVisibility);
    // Report on the next game frame, so a long main-thread stall is included
    // even when this timer resumes before requestAnimationFrame does.
    timer = setInterval(() => {
      if (document.visibilityState === 'visible') reportDue = true;
    }, INTERVAL_MS);
    log('game.session_start');
  });
}

/** Uses the game's existing WebGL context; never creates a second GPU context. */
export function setDiagnosticRenderer(
  gl: WebGLRenderingContext | WebGL2RenderingContext | undefined,
  getResidentMemory: () => number
): void {
  if (!active) return;
  residentMemory = getResidentMemory;
  safely(() => {
    const extension = gl?.getExtension('WEBGL_debug_renderer_info');
    device['graphics.renderer'] = gl
      ? String(gl.getParameter(extension ? extension.UNMASKED_RENDERER_WEBGL : gl.RENDERER))
      : 'unavailable';
    Sentry.setContext('game_device', device);
    log('game.renderer_ready');
  });
}

/** Camera and actual framebuffer dimensions, refreshed when the view changes. */
export function setDiagnosticView(next: {
  zoom: number;
  viewportWidth: number;
  viewportHeight: number;
  canvasWidth: number;
  canvasHeight: number;
  resolution: number;
}): void {
  if (!active) return;
  view = {
    'view.camera_zoom': next.zoom,
    'view.viewport_width': next.viewportWidth,
    'view.viewport_height': next.viewportHeight,
    'view.canvas_width': next.canvasWidth,
    'view.canvas_height': next.canvasHeight,
    'view.resolution': next.resolution,
    'view.pixel_ratio': window.devicePixelRatio || 1,
    'view.visual_scale': window.visualViewport?.scale ?? 1,
  };
  safely(() => Sentry.setContext('game_view', view));
}

/** Snapshot the loaded world before a short session can disappear without an exception. */
export function reportDiagnosticWorldReady(): void {
  if (!active || worldReady) return;
  worldReady = true;
  safely(() => {
    const details: Fields = { ...view };
    if (residentMemory) details['performance.resident_texture_mb'] = Math.round(residentMemory());
    log('game.world_ready', details);
  });
  // Anchor early reports to Play/world readiness, not time spent on the title.
  // Summaries still run on the next visible game frame, keeping stalls and
  // background gaps subject to the same rules as the regular minute report.
  if (timer) clearInterval(timer);
  resetFrames();
  reportDue = false;
  let samples = 0;
  startupTimer = setInterval(() => {
    if (document.visibilityState === 'visible') reportDue = true;
    samples++;
    if (samples >= STARTUP_SAMPLES) {
      clearInterval(startupTimer);
      startupTimer = undefined;
      timer = setInterval(() => {
        if (document.visibilityState === 'visible') reportDue = true;
      }, INTERVAL_MS);
    }
  }, STARTUP_INTERVAL_MS);
}

/** Context loss is not an exception, so automatic error reporting misses it. */
export function reportDiagnosticContextLoss(): void {
  if (!active || contextLossReported) return;
  contextLossReported = true;
  safely(() => {
    const metrics = performanceMonitor.getMetrics();
    const details: Fields = {
      ...view,
      'performance.visible_sprites': metrics.scene.visibleSprites,
      'performance.scene_texture_mb': metrics.scene.textureMB,
    };
    if (residentMemory) details['performance.resident_texture_mb'] = Math.round(residentMemory());
    Sentry.captureMessage('WebGL context lost', {
      level: 'warning',
      tags: { category: 'game_crash' },
      contexts: { details },
    });
    log('game.context_lost', details);
  });
}

export function setDiagnosticMap(nextMap: string): void {
  if (!active || nextMap === mapId) return;
  // Generated maps contain seeds: group them by map family for useful comparisons.
  mapId = nextMap.replace(/_\d+$/, '_generated');
  resetFrames();
  safely(() => {
    Sentry.setTag('game.map', mapId);
    Sentry.setContext('game_performance', null);
  });
}

/** One completion per operation/outcome/speed class per minute, plus the global session cap. */
/** Log a texture eviction summary, bounded like every other diagnostic. Issue #107:
 * correlating pink-square reports with eviction bursts is the main open question —
 * this gives Sentry the eviction side of the timeline. */
export function logTextureEviction(evicted: number, freedMB: number, residentMB: number): void {
  if (!active || sent >= MAX_LOGS || evicted <= 0) return;
  log('game.texture_eviction', {
    'game.map': mapId,
    'texture.evicted': evicted,
    'texture.freed_mb': Math.round(freedMB * 10) / 10,
    'texture.resident_mb': Math.round(residentMB * 10) / 10,
  });
}

/**
 * Register the runtime-context getter consulted only when a minute crosses
 * SLOW_MINUTE_STALLS. Keys must be namespaced (e.g. `runtime.npc_count`) — the
 * getter owns its field names, sessionDiagnostics stays game-agnostic.
 */
export function setSlowMinuteContext(getter: () => Fields): void {
  slowMinuteContext = getter;
}

export function startDiagnosticOperation(operation: Operation): (success?: boolean) => void {
  if (!active) return () => {};
  const start = performance.now();
  const startMap = mapId;
  const epoch = visibilityEpoch;
  const startedVisible = document.visibilityState === 'visible';
  let finished = false;
  return (success = true) => {
    if (finished || !active) return;
    finished = true;
    const now = performance.now();
    const slow = now - start >= (operation === 'local_save' ? 50 : 1000);
    const key = `${operation}:${success}:${slow}`;
    if (now - (lastOperation.get(key) ?? -Infinity) < INTERVAL_MS) return;
    lastOperation.set(key, now);
    log('game.operation', {
      'game.map': startMap,
      'operation.name': operation,
      'operation.duration_ms': Math.round(now - start),
      'operation.success': success,
      'operation.slow': slow,
      'operation.background_interrupted':
        !startedVisible || epoch !== visibilityEpoch || document.visibilityState !== 'visible',
    });
  };
}

/** Teardown for HMR and tests. */
export function stopSessionDiagnostics(): void {
  active = false;
  clearInterval(timer);
  if (typeof document !== 'undefined')
    document.removeEventListener('visibilitychange', onVisibility);
  resetFrames();
  lastOperation.clear();
  sent = 0;
  mapId = 'startup';
  reportDue = false;
  residentMemory = undefined;
  view = {};
  if (startupTimer) clearInterval(startupTimer);
  startupTimer = undefined;
  worldReady = false;
  contextLossReported = false;
  slowMinuteContext = undefined;
}
if (import.meta.hot) import.meta.hot.dispose(stopSessionDiagnostics);
