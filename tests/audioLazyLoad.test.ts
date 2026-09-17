/**
 * Music and ambience are fetched and decoded on first play, not at boot.
 *
 * The whole catalogue decodes to ~440 MB of float PCM — more than the per-map
 * texture budget, resident on every map, and the likeliest cause of the
 * iPhone's tab being killed (design_docs/planned/PERFORMANCE_MOBILE_PLAN.md
 * §3.3). loadBatch(assets, ['sfx']) must therefore fetch only effects, and a
 * later playMusic()/playAmbient() must fetch its track itself and start it
 * when it lands. If a refactor makes loadBatch eager again, the first test
 * fails; if it drops the on-demand path, the second does.
 */
/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { audioManager } from '../utils/AudioManager';
import type { AudioAssetConfig } from '../utils/AudioManager';

const ASSETS: Record<string, AudioAssetConfig> = {
  sfx_click: { url: '/a/sfx/click.mp3', category: 'sfx' },
  sfx_dig: { url: '/a/sfx/dig.mp3', category: 'sfx' },
  music_village: { url: '/a/music/village.mp3', category: 'music', loop: true },
  ambient_birds: { url: '/a/ambient/birds.mp3', category: 'ambient', loop: true },
};

function fakeBuffer(): AudioBuffer {
  return { duration: 1, sampleRate: 44100, numberOfChannels: 1, length: 44100 } as AudioBuffer;
}

function fakeNode() {
  const param = { value: 1, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), cancelScheduledValues: vi.fn(), setTargetAtTime: vi.fn() };
  return { connect: vi.fn(), disconnect: vi.fn(), gain: param, playbackRate: param, start: vi.fn(), stop: vi.fn(), buffer: null, loop: false, onended: null };
}

describe('audio is loaded lazily by category', () => {
  const fetched: string[] = [];

  beforeEach(() => {
    fetched.length = 0;
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      fetched.push(url);
      return { ok: true, arrayBuffer: async () => new ArrayBuffer(8) } as Response;
    }));
    class FakeAudioContext {
      state = 'running';
      currentTime = 0;
      destination = {};
      createGain = () => fakeNode();
      createBufferSource = () => fakeNode();
      createBiquadFilter = () => ({ ...fakeNode(), type: 'lowpass', frequency: { value: 0, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() }, Q: { value: 1 } });
      createDelay = () => ({ ...fakeNode(), delayTime: { value: 0, setValueAtTime: vi.fn() } });
      decodeAudioData = async () => fakeBuffer();
      resume = async () => {};
    }
    vi.stubGlobal('AudioContext', FakeAudioContext);
    (window as unknown as { AudioContext: unknown }).AudioContext = FakeAudioContext;
  });

  it('loadBatch with a category filter fetches only that category', async () => {
    await audioManager.loadBatch(ASSETS, ['sfx']);
    expect(fetched.sort()).toEqual(['/a/sfx/click.mp3', '/a/sfx/dig.mp3']);
  });

  it('playMusic on an unloaded catalogued track fetches it on demand', async () => {
    await audioManager.loadBatch(ASSETS, ['sfx']);
    fetched.length = 0;
    audioManager.playMusic('music_village');
    await vi.waitFor(() => expect(fetched).toContain('/a/music/village.mp3'));
  });

  it('playAmbient on an unloaded catalogued track fetches it on demand', async () => {
    await audioManager.loadBatch(ASSETS, ['sfx']);
    fetched.length = 0;
    audioManager.playAmbient('ambient_birds');
    await vi.waitFor(() => expect(fetched).toContain('/a/ambient/birds.mp3'));
  });
});
