// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { EMOTES, ITEM_EMOTES, isEmoteId, getEmoteImage } from '../multiplayer/emotes';

describe('emote artwork', () => {
  it('ships only small thumbnails for every permitted emote', () => {
    for (const item of [...EMOTES, ...ITEM_EMOTES]) {
      const path = `public/${item.image.replace(/^.*?assets\//, 'assets/')}`;
      expect(existsSync(path), path).toBe(true);
      const png = readFileSync(path);
      expect(png.readUInt32BE(16), path).toBe(128);
      expect(png.readUInt32BE(20), path).toBe(128);
    }
  });
  it('accepts known catalog ids and rejects arbitrary URLs and unknown items', () => {
    expect(isEmoteId('item:seed_radish')).toBe(true);
    expect(isEmoteId('item:not_real')).toBe(false);
    expect(getEmoteImage('https://example.com/image.png')).toBeNull();
  });
});
