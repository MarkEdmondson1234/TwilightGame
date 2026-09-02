/**
 * Character Sprite Scale Tests
 *
 * The player's artwork is authored far larger than the SVG placeholders, so it
 * is rendered at 3x and placeholders at 1x. Which of the two you get is decided
 * by pattern-matching the sprite URL — and that is a silent failure mode: when
 * the match stops working nothing throws, no texture 404s, the player simply
 * renders at a third of its size.
 *
 * That is not hypothetical. The check used to be
 * `url.includes('/assets/character')`, and moving the artwork to
 * /assets-optimized/character1/ broke it while every test still passed.
 *
 * So this drives the REAL path builder into the REAL detector: the two cannot
 * drift apart without failing here.
 */

/** @vitest-environment node */
import { describe, it, expect } from 'vitest';
import {
  generateCharacterSprites,
  isCustomCharacterSprite,
  DEFAULT_CHARACTER,
} from '../utils/characterSprites';
import { Direction } from '../types';

const DIRECTIONS = [Direction.Up, Direction.Down, Direction.Left, Direction.Right];

describe('Custom character sprite detection', () => {
  it('recognises every URL generateCharacterSprites actually produces', () => {
    for (const characterId of ['character1', 'character2']) {
      const sprites = generateCharacterSprites({ ...DEFAULT_CHARACTER, characterId });

      for (const direction of DIRECTIONS) {
        for (const url of sprites[direction]) {
          expect(
            isCustomCharacterSprite(url),
            `"${url}" was not recognised as custom character artwork, so it would render at ` +
              'baseScale 1.0 instead of 3.0 — the player appears a third of its intended size, ' +
              'with nothing throwing. Fix isCustomCharacterSprite() in utils/characterSprites.ts ' +
              'to match wherever the artwork now lives.'
          ).toBe(true);
        }
      }
    }
  });

  it('still recognises inline SVG placeholders', () => {
    expect(isCustomCharacterSprite('data:image/svg+xml;base64,QUJD')).toBe(true);
  });

  it('does not mistake NPC or tile art for character artwork', () => {
    for (const url of [
      '/TwilightGame/assets-optimized/npcs/mum_01.png',
      '/TwilightGame/assets-optimized/tiles/oak_tree_spring.png',
      '/TwilightGame/assets-optimized/items/wreath_base.png',
    ]) {
      expect(isCustomCharacterSprite(url), `"${url}" should not scale as the player`).toBe(false);
    }
  });
});
