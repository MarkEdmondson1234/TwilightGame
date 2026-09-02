/**
 * TextureManager Tests
 *
 * These cover the three behaviours that exist specifically to keep the game
 * alive on mobile, each of which fails silently if it regresses:
 *
 * - Bounded concurrency. Firing every texture request in one tick is what mobile
 *   WebKit answers with "TypeError: Load failed" — an unhandled rejection with no
 *   stack, attributable to nothing. Nothing throws if this cap is removed; the
 *   game just starts failing on phones.
 * - Retry capping on demand-loaded misses. getTexture() requests on every miss and
 *   is called from the render loop, so an unbounded retry is a request storm at
 *   frame rate against a URL that will never resolve.
 * - Eviction that spares pinned and in-use textures. Destroying a texture a live
 *   sprite still points at surfaces later, somewhere else, as a render crash.
 */

/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from 'vitest';

/** In-flight counter so the test can observe the concurrency ceiling. */
let inFlight = 0;
let peakInFlight = 0;
let loadCalls: string[] = [];
/** URLs that should reject rather than resolve. */
const failing = new Set<string>();

function fakeTexture(width = 512, height = 512) {
  return {
    source: { width, height, scaleMode: 'nearest', autoGenerateMipmaps: false },
    destroy: vi.fn(),
  };
}

vi.mock('pixi.js', () => ({
  Assets: {
    load: vi.fn(async (url: string) => {
      loadCalls.push(url);
      inFlight++;
      peakInFlight = Math.max(peakInFlight, inFlight);
      // Yield so overlapping loads actually overlap.
      await new Promise((resolve) => setTimeout(resolve, 1));
      inFlight--;
      if (failing.has(url)) throw new Error(`boom: ${url}`);
      return fakeTexture();
    }),
    unload: vi.fn(async () => undefined),
  },
  Texture: class {},
}));

const MAX_CONCURRENT = 6;
vi.mock('../utils/performanceTier', () => ({
  getCachedPerformanceSettings: () => ({
    generateMipmaps: false,
    textureBudgetMB: 1, // deliberately tiny so eviction engages
    maxConcurrentTextureLoads: MAX_CONCURRENT,
  }),
}));

async function freshManager() {
  vi.resetModules();
  const { textureManager } = await import('../utils/TextureManager');
  textureManager.clear();
  return textureManager;
}

beforeEach(() => {
  inFlight = 0;
  peakInFlight = 0;
  loadCalls = [];
  failing.clear();
  vi.clearAllMocks();
});

describe('TextureManager concurrency', () => {
  it('never exceeds the device concurrency limit', async () => {
    const manager = await freshManager();
    const urls = Array.from({ length: 50 }, (_, i) => `/tex/${i}.png`);

    await manager.loadUrls(urls);

    expect(loadCalls).toHaveLength(50);
    expect(
      peakInFlight,
      `loaded ${peakInFlight} textures at once but the device limit is ${MAX_CONCURRENT}. ` +
        'Firing every request in one tick is what produced the uncaught "Load failed" ' +
        'rejections on mobile.'
    ).toBeLessThanOrEqual(MAX_CONCURRENT);
  });

  it('one failing texture does not fail the batch', async () => {
    const manager = await freshManager();
    failing.add('/tex/bad.png');

    await expect(
      manager.loadUrls(['/tex/good.png', '/tex/bad.png', '/tex/other.png'])
    ).resolves.toBeUndefined();

    expect(manager.hasTexture('/tex/good.png')).toBe(true);
    expect(manager.hasTexture('/tex/other.png')).toBe(true);
    expect(manager.hasTexture('/tex/bad.png')).toBe(false);
  });

  it('does not re-fetch textures it already holds', async () => {
    const manager = await freshManager();
    await manager.loadUrls(['/tex/a.png', '/tex/b.png']);
    loadCalls = [];

    await manager.loadUrls(['/tex/a.png', '/tex/b.png', '/tex/c.png']);

    expect(loadCalls).toEqual(['/tex/c.png']);
  });
});

describe('TextureManager on-demand loading', () => {
  it('getTexture requests a missing texture and notifies when it arrives', async () => {
    const manager = await freshManager();
    const onLoaded = vi.fn();
    manager.onTextureLoaded(onLoaded);

    expect(manager.getTexture('/tex/late.png')).toBeUndefined();
    await vi.waitFor(() => expect(manager.hasTexture('/tex/late.png')).toBe(true));

    expect(onLoaded).toHaveBeenCalled();
    expect(manager.getTexture('/tex/late.png')).toBeDefined();
  });

  it('stops retrying a URL that keeps failing', async () => {
    const manager = await freshManager();
    failing.add('/tex/never.png');

    // Simulate the render loop hammering the same miss. Each iteration waits
    // long enough for the previous attempt to have failed and cleared itself
    // from the in-flight map — otherwise the in-flight guard alone would hide a
    // missing attempt cap and this test would pass without guarding anything.
    for (let i = 0; i < 20; i++) {
      manager.getTexture('/tex/never.png');
      await new Promise((resolve) => setTimeout(resolve, 5));
    }

    expect(
      loadCalls.filter((u) => u === '/tex/never.png').length,
      'a permanently-missing URL was retried more than the attempt cap allows — ' +
        'from the render loop that is a request storm at frame rate'
    ).toBeLessThanOrEqual(2);
  });
});

describe('TextureManager eviction', () => {
  it('frees textures outside the keep set but spares pinned ones', async () => {
    const manager = await freshManager();
    manager.pin(['/tex/core.png']);
    await manager.loadUrls(['/tex/core.png', '/tex/mapA.png', '/tex/stale.png']);

    const evicted = manager.evictExcept(['/tex/mapA.png']);

    expect(evicted).toBe(1);
    expect(manager.hasTexture('/tex/stale.png')).toBe(false);
    expect(manager.hasTexture('/tex/mapA.png'), 'the current map lost a texture').toBe(true);
    expect(manager.hasTexture('/tex/core.png'), 'a pinned core texture was evicted').toBe(true);
  });

  it('does nothing while under budget', async () => {
    vi.resetModules();
    vi.doMock('../utils/performanceTier', () => ({
      getCachedPerformanceSettings: () => ({
        generateMipmaps: false,
        textureBudgetMB: 4096, // far above anything this test loads
        maxConcurrentTextureLoads: MAX_CONCURRENT,
      }),
    }));
    const { textureManager } = await import('../utils/TextureManager');
    textureManager.clear();
    await textureManager.loadUrls(['/tex/a.png', '/tex/b.png']);

    expect(textureManager.evictExcept([])).toBe(0);
    expect(textureManager.hasTexture('/tex/a.png')).toBe(true);
    vi.doUnmock('../utils/performanceTier');
  });
});
