import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const sdk = vi.hoisted(() => ({ info: vi.fn(), setTag: vi.fn(), setContext: vi.fn() }));
vi.mock('@sentry/react', () => ({
  logger: { info: sdk.info },
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
  setDiagnosticMap,
  setDiagnosticRenderer,
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
