/** @vitest-environment node */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createState } from '../minigames/lava-leap/engine';
import { lavaSoundEvents } from '../minigames/lava-leap/soundEvents';
import { lavaLeapAudioAssets } from '../minigames/lava-leap/audioAssets';

describe('Lava Leap sound cues', () => {
  it('plays a nearby chute warning once, followed by its eruption', () => {
    const before = createState();
    before.x = 1250;
    before.time = 3.49;
    const warning = { ...before, time: 3.51 };
    expect(lavaSoundEvents(before, warning)).toEqual(['warning']);
    expect(lavaSoundEvents(warning, { ...warning, time: 3.55 })).toEqual([]);
    expect(lavaSoundEvents({ ...warning, time: 4.79 }, { ...warning, time: 4.81 })).toEqual([
      'eruption',
    ]);
    expect(lavaSoundEvents({ ...before, x: 80 }, { ...warning, x: 80 })).toEqual([]);
  });
  it('plays only successful powers, and does not mistake a rescue for a landing', () => {
    const before = createState();
    expect(lavaSoundEvents(before, { ...before, cooldown: 1.1 })).toEqual(['frost']);
    expect(lavaSoundEvents(before, { ...before })).toEqual([]);
    expect(
      lavaSoundEvents({ ...before, grounded: false, vy: 200 }, { ...before, rescues: 1 })
    ).toEqual(['rescue']);
    expect(lavaSoundEvents(before, { ...before, checkpoint: 1 })).toEqual(['haven']);
    expect(lavaSoundEvents(before, { ...before, collected: [0] })).toEqual(['treasure']);
    expect(lavaSoundEvents(before, { ...before, won: true })).toEqual(['finish']);
  });
  it('ships short, non-silent, unclipped PCM files with click-free starts and tails', () => {
    for (const config of Object.values(lavaLeapAudioAssets)) {
      const bytes = readFileSync(`public${config.url.replace('/TwilightGame', '')}`);
      expect(bytes.toString('ascii', 0, 4)).toBe('RIFF');
      expect(bytes.toString('ascii', 8, 12)).toBe('WAVE');
      expect(bytes.readUInt32LE(40)).toBe(bytes.length - 44);
      expect(bytes.readUInt16LE(22)).toBe(1);
      expect(bytes.readUInt32LE(24)).toBe(22050);
      const seconds = (bytes.length - 44) / 44100;
      expect(seconds).toBeLessThanOrEqual(1.5);
      let peak = 0;
      for (let i = 44; i < bytes.length; i += 2)
        peak = Math.max(peak, Math.abs(bytes.readInt16LE(i)));
      expect(peak).toBeGreaterThan(300);
      expect(peak).toBeLessThan(27000);
      expect(bytes.readInt16LE(44)).toBe(0);
      expect(Math.abs(bytes.readInt16LE(bytes.length - 2))).toBeLessThan(20);
    }
  });
});
