/** Bounded, metadata-only diagnostics. No gameplay payloads or console forwarding. */
import * as Sentry from '@sentry/react';
import { performanceMonitor } from './PerformanceMonitor';
import { getCachedPerformanceSettings } from './performanceTier';
import { startHeartbeat, takePreviousAbruptEnd, type Heartbeat } from './sessionHeartbeat';

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
// The last operation started and not yet finished — what a session that dies
// abruptly was in the middle of (see sessionHeartbeat.ts).
let inFlight: { name: Operation; at: number } | null = null;
let heartbeat: Heartbeat | null = null;

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
  safely(reportPreviousAbruptEnd);
  safely(startSessionHeartbeat);
}

/**
 * A session that ended without unloading — on iOS, the memory kill that a
 * player sees as "it refreshed back to the title screen". Nothing could
 * report it at the time; the heartbeat it left behind says what it was doing.
 */
function reportPreviousAbruptEnd(): void {
  const abrupt = takePreviousAbruptEnd(localStorage, Date.now());
  if (!abrupt) return;
  const p = abrupt.previous;
  const details: Fields = {
    'previous.kind': abrupt.kind,
    'previous.release': p.release,
    'previous.session_id': p.sessionId,
    'previous.map': p.map,
    'previous.in_flight': p.inFlight ?? 'none',
    'previous.in_flight_ms': p.inFlightSinceMs === null ? 0 : Math.round(p.beatAt - p.inFlightSinceMs),
    'previous.uptime_s': Math.round(p.uptimeMs / 1000),
    'previous.world_ready': p.worldReady,
    'previous.resident_texture_mb': p.residentTextureMB ?? 0,
    'previous.scene_texture_mb': p.sceneTextureMB ?? 0,
    'previous.visible_sprites': p.visibleSprites ?? 0,
    'previous.gap_s': Math.round(abrupt.gapMs / 1000),
  };
  log('game.session_abrupt_end', details);
  // A foreground death is the crash; a hidden tab reclaimed by the OS is
  // routine on a phone and stays a log line.
  // (Sentry directly rather than errorReporting's helper, as the context-loss
  // report does: errorReporting imports this module.)
  if (abrupt.kind === 'foreground') {
    Sentry.captureMessage(
      `Previous session ended abruptly in ${p.map}` + (p.inFlight ? ` during ${p.inFlight}` : ''),
      { level: 'warning', tags: { category: 'game_crash' }, contexts: { details } }
    );
  }
}

function startSessionHeartbeat(): void {
  const startedAt = performance.now();
  heartbeat = startHeartbeat({
    storage: localStorage,
    now: Date.now,
    sessionId,
    release: import.meta.env.VITE_APP_VERSION ?? 'dev',
    isHidden: () => document.visibilityState === 'hidden',
    onVisibilityChange: (handler) => {
      document.addEventListener('visibilitychange', handler);
      return () => document.removeEventListener('visibilitychange', handler);
    },
    onPageHide: (handler) => {
      window.addEventListener('pagehide', handler);
      return () => window.removeEventListener('pagehide', handler);
    },
    setInterval: (fn, ms) => setInterval(fn, ms),
    clearInterval: (handle) => clearInterval(handle as ReturnType<typeof setInterval>),
    getState: () => {
      const scene = performanceMonitor.getMetrics().scene;
      return {
        map: mapId,
        inFlight: inFlight?.name ?? null,
        // Wall-clock start of the in-flight operation, so the report can say how long it had run.
        inFlightSinceMs: inFlight ? Date.now() - Math.round(performance.now() - inFlight.at) : null,
        residentTextureMB: residentMemory ? Math.round(residentMemory()) : null,
        sceneTextureMB: Math.round(scene.textureMB),
        visibleSprites: scene.visibleSprites,
        uptimeMs: Math.round(performance.now() - startedAt),
        worldReady,
      };
    },
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
  heartbeat?.beat();
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
  // Saves are quick and constant; the loads are what a dying session is in
  // the middle of. Tell the heartbeat straight away — it may have two seconds.
  if (operation !== 'local_save') {
    inFlight = { name: operation, at: start };
    heartbeat?.beat();
  }
  return (success = true) => {
    if (finished || !active) return;
    finished = true;
    if (inFlight?.name === operation && inFlight.at === start) inFlight = null;
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
  inFlight = null;
  heartbeat?.stop();
  heartbeat = null;
}
if (import.meta.hot) import.meta.hot.dispose(stopSessionDiagnostics);
