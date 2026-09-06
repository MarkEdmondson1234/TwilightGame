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
const MAX_LOGS = 360; // Hard ceiling per page session, including operation logs.
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
let residentMemory: (() => number) | undefined;
const lastOperation = new Map<string, number>();
let device: Fields = {};

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
}
if (import.meta.hot) import.meta.hot.dispose(stopSessionDiagnostics);
