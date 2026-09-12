import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const sdk = vi.hoisted(() => ({
  info: vi.fn(),
  captureMessage: vi.fn(),
  setTag: vi.fn(),
  setContext: vi.fn(),
}));
vi.mock('@sentry/react', () => ({
  logger: { info: sdk.info },
  captureMessage: sdk.captureMessage,
  setTag: sdk.setTag,
  setContext: sdk.setContext,
}));
vi.mock('../utils/PerformanceMonitor', () => ({
  performanceMonitor: {
    getMetrics: () => ({ heapUsed: 0, scene: { textureMB: 25, visibleSprites: 100 } }),
  },
}));
vi.mock('../utils/performanceTier', () => ({
  getCachedPerformanceSettings: () => ({
    tier: 'high',
    isMobile: false,
    resolution: 2,
    antialias: true,
    generateMipmaps: true,
    textureBudgetMB: 1536,
    maxConcurrentTextureLoads: 16,
  }),
}));
import {
  startSessionDiagnostics,
  stopSessionDiagnostics,
  recordSessionFrame,
  startDiagnosticOperation,
  logTextureEviction,
  setDiagnosticMap,
  setDiagnosticRenderer,
  setSlowMinuteContext,
  setDiagnosticView,
  reportDiagnosticContextLoss,
  reportDiagnosticWorldReady,
} from '../utils/sessionDiagnostics';

function visibility(value: 'visible' | 'hidden') {
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue(value);
  document.dispatchEvent(new Event('visibilitychange'));
}
function framesFor(ms: number, step = 20) {
  for (let i = 0; i < ms; i += step) {
    vi.advanceTimersByTime(step);
    recordSessionFrame();
  }
}
const reports = () => sdk.info.mock.calls.filter(([name]) => name === 'game.performance');
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'performance'] });
  vi.clearAllMocks();
  visibility('visible');
});
afterEach(() => {
  stopSessionDiagnostics();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('bounded foreground session diagnostics', () => {
  it('is inert before Sentry enables it', () => {
    recordSessionFrame();
    startDiagnosticOperation('local_save')();
    setDiagnosticMap('village');
    framesFor(60000);
    expect(sdk.info).not.toHaveBeenCalled();
  });
  it('keeps a stall that occurred long before the final 60 frames', () => {
    startSessionDiagnostics();
    recordSessionFrame();
    framesFor(1000);
    vi.advanceTimersByTime(500);
    recordSessionFrame();
    framesFor(58500);
    expect(reports()).toHaveLength(1);
    expect(reports()[0][1]).toMatchObject({
      'performance.worst_frame_ms': 500,
      'performance.frames_over_50ms': 1,
      'performance.scene_texture_mb': 25,
    });
    expect(reports()[0][1]['performance.fps']).toBeLessThan(50);
    expect(reports()[0][1]).not.toHaveProperty('performance.heap_mb');
  });
  it('excludes hidden-tab gaps and windows with no recent game frames', () => {
    startSessionDiagnostics();
    framesFor(10000);
    visibility('hidden');
    vi.advanceTimersByTime(120000);
    expect(reports()).toHaveLength(0);
    visibility('visible');
    framesFor(50000);
    expect(reports()[0][1]['performance.worst_frame_ms']).toBe(20);
    vi.advanceTimersByTime(60000);
    expect(reports()).toHaveLength(1);
  });
  it('includes a main-thread stall even when the minute timer resumes first', () => {
    startSessionDiagnostics();
    framesFor(59000);
    vi.advanceTimersByTime(10000);
    expect(reports()).toHaveLength(0);
    recordSessionFrame();
    expect(reports()[0][1]['performance.worst_frame_ms']).toBe(10000);
  });
  it('does not mix frame samples across maps', () => {
    startSessionDiagnostics();
    framesFor(50000, 100);
    setDiagnosticMap('village');
    framesFor(10000);
    expect(reports()[0][1]['performance.worst_frame_ms']).toBe(20);
    expect(reports()[0][1]['game.map']).toBe('village');
  });
  it('correlates errors and logs with a fresh page-session ID and map family', () => {
    startSessionDiagnostics();
    startSessionDiagnostics();
    const first = sdk.info.mock.calls[0][1]['game.session_id'];
    expect(sdk.info).toHaveBeenCalledTimes(1);
    expect(sdk.setTag).toHaveBeenCalledWith('game.session_id', first);
    setDiagnosticMap('forest_123456');
    startDiagnosticOperation('map_load')();
    expect(sdk.info.mock.lastCall?.[1]).toMatchObject({
      'game.session_id': first,
      'game.map': 'forest_generated',
    });
    stopSessionDiagnostics();
    startSessionDiagnostics();
    expect(sdk.info.mock.lastCall?.[1]['game.session_id']).not.toBe(first);
  });
  it('rate limits repeats but preserves the first slow operation and failure', () => {
    startSessionDiagnostics();
    const end = startDiagnosticOperation('local_save');
    end();
    end();
    for (let i = 0; i < 100; i++) startDiagnosticOperation('local_save')();
    const slow = startDiagnosticOperation('local_save');
    vi.advanceTimersByTime(100);
    slow();
    startDiagnosticOperation('local_save')(false);
    expect(sdk.info.mock.calls.filter(([name]) => name === 'game.operation')).toHaveLength(3);
    expect(sdk.info.mock.lastCall?.[1]['operation.success']).toBe(false);
  });
  it('logs texture eviction bursts with counts and skips empty ones', () => {
    startSessionDiagnostics();
    setDiagnosticMap('deep_forest');

    logTextureEviction(12, 45.67, 800.25);
    expect(sdk.info.mock.lastCall?.[0]).toBe('game.texture_eviction');
    expect(sdk.info.mock.lastCall?.[1]).toMatchObject({
      'game.map': 'deep_forest',
      'texture.evicted': 12,
      'texture.freed_mb': 45.7,
      'texture.resident_mb': 800.3,
    });

    // No eviction, no log — keeps the bounded budget for real events.
    const callsBefore = sdk.info.mock.calls.length;
    logTextureEviction(0, 0, 800);
    expect(sdk.info.mock.calls.length).toBe(callsBefore);
  });

  it('attaches slow-minute runtime context once the stall threshold is crossed', () => {
    startSessionDiagnostics();
    const getter = vi.fn(() => ({ 'runtime.npc_count': 7, 'runtime.weather': 'rain' }));
    setSlowMinuteContext(getter);
    // 60ms frames: every one of them is over the 50ms stall bar.
    framesFor(60000, 60);
    expect(reports()).toHaveLength(1);
    expect(reports()[0][1]).toMatchObject({
      'runtime.npc_count': 7,
      'runtime.weather': 'rain',
    });
    expect(getter).toHaveBeenCalledTimes(1);
  });

  it('never consults the runtime getter on healthy minutes', () => {
    startSessionDiagnostics();
    const getter = vi.fn(() => ({ 'runtime.npc_count': 1 }));
    setSlowMinuteContext(getter);
    framesFor(60000, 20); // 20ms frames: zero stalls
    expect(reports()).toHaveLength(1);
    expect(getter).not.toHaveBeenCalled();
  });

  it('pins the stall threshold: four stalls stay silent, five earn attribution', () => {
    startSessionDiagnostics();
    const getter = vi.fn(() => ({ 'runtime.npc_count': 2 }));
    setSlowMinuteContext(getter);
    recordSessionFrame();
    for (let i = 0; i < 4; i++) {
      vi.advanceTimersByTime(60);
      recordSessionFrame();
    }
    framesFor(60000 - 4 * 60, 20);
    expect(reports()).toHaveLength(1);
    expect(getter).not.toHaveBeenCalled();

    // New minute, one more stall than the threshold. The priming frame matters:
    // a stall is a delta between two frames, and the report above reset the
    // anchor, so without it the first of the five only re-anchors and four land.
    recordSessionFrame();
    for (let i = 0; i < 5; i++) {
      vi.advanceTimersByTime(60);
      recordSessionFrame();
    }
    framesFor(60000 - 5 * 60, 20);
    expect(reports()).toHaveLength(2);
    expect(getter).toHaveBeenCalledTimes(1);
    expect(reports()[1][1]).toMatchObject({ 'runtime.npc_count': 2 });
  });

  it('still sends the slow-minute report when the context getter throws', () => {
    startSessionDiagnostics();
    setSlowMinuteContext(() => {
      throw new Error('manager unavailable');
    });
    framesFor(60000, 60);
    expect(reports()).toHaveLength(1);
    expect(reports()[0][1]).not.toHaveProperty('runtime.npc_count');
  });

  it('marks async operations spanning tab switches', () => {
    startSessionDiagnostics();
    const finish = startDiagnosticOperation('cloud_upload');
    visibility('hidden');
    vi.advanceTimersByTime(2000);
    visibility('visible');
    finish();
    expect(sdk.info.mock.lastCall?.[1]).toMatchObject({
      'operation.background_interrupted': true,
      'operation.duration_ms': 2000,
    });
  });
  it('caps total traffic even during a long session', () => {
    startSessionDiagnostics();
    for (let i = 0; i < 500; i++) {
      startDiagnosticOperation('cloud_upload')();
      vi.advanceTimersByTime(60000);
    }
    expect(sdk.info).toHaveBeenCalledTimes(360);
  });
  it('survives SDK and GPU diagnostic failures', () => {
    sdk.info.mockImplementation(() => {
      throw new Error('SDK unavailable');
    });
    expect(startSessionDiagnostics).not.toThrow();
    expect(() =>
      setDiagnosticRenderer(
        {
          getExtension: () => {
            throw new Error('GPU unavailable');
          },
        } as unknown as WebGLRenderingContext,
        () => 0
      )
    ).not.toThrow();
    expect(() => startDiagnosticOperation('local_save')()).not.toThrow();
    sdk.info.mockReset();
  });
});

describe('zoom and graphics failure context', () => {
  it('reports a context loss once with the current camera, framebuffer and resident textures', () => {
    startSessionDiagnostics();
    setDiagnosticRenderer(undefined, () => 321);
    setDiagnosticView({
      zoom: 0.5,
      viewportWidth: 1688,
      viewportHeight: 780,
      canvasWidth: 1266,
      canvasHeight: 585,
      resolution: 0.75,
    });
    reportDiagnosticContextLoss();
    reportDiagnosticContextLoss();
    expect(sdk.captureMessage).toHaveBeenCalledTimes(1);
    expect(sdk.captureMessage).toHaveBeenCalledWith(
      'WebGL context lost',
      expect.objectContaining({
        tags: { category: 'game_crash' },
        contexts: {
          details: expect.objectContaining({
            'view.camera_zoom': 0.5,
            'view.canvas_width': 1266,
            'performance.resident_texture_mb': 321,
          }),
        },
      })
    );
  });
  it('keeps graphics diagnostics inert without Sentry configured', () => {
    reportDiagnosticContextLoss();
    expect(sdk.captureMessage).not.toHaveBeenCalled();
  });
});

describe('first-minute world diagnostics', () => {
  it('captures loaded texture memory immediately and reports before a minute-long crash', () => {
    startSessionDiagnostics();
    setDiagnosticRenderer(undefined, () => 304);
    setDiagnosticView({
      zoom: 0.75,
      viewportWidth: 844,
      viewportHeight: 390,
      canvasWidth: 1266,
      canvasHeight: 585,
      resolution: 1.5,
    });
    reportDiagnosticWorldReady();
    reportDiagnosticWorldReady();
    const ready = sdk.info.mock.calls.filter(([name]) => name === 'game.world_ready');
    expect(ready).toHaveLength(1);
    expect(ready[0][1]).toMatchObject({
      'performance.resident_texture_mb': 304,
      'view.camera_zoom': 0.75,
    });
    framesFor(15000);
    expect(reports()).toHaveLength(1);
    framesFor(45000);
    expect(reports()).toHaveLength(4);
    framesFor(59000);
    expect(reports()).toHaveLength(4);
    framesFor(1000);
    expect(reports()).toHaveLength(5);
  });
  it('does not send background samples and removes early timers on shutdown', () => {
    startSessionDiagnostics();
    reportDiagnosticWorldReady();
    visibility('hidden');
    vi.advanceTimersByTime(60000);
    expect(reports()).toHaveLength(0);
    stopSessionDiagnostics();
    sdk.info.mockClear();
    visibility('visible');
    framesFor(120000);
    expect(sdk.info).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
});
