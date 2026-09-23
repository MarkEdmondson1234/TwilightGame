/** @vitest-environment node */
/**
 * Room props (MapDefinition.props) — static scenery that depth-sorts with the player.
 *
 * Issue #158: the kitchen easel (Draw / Craft Workshop / Make a Wreath) was drawn
 * as DOM inside MiniGameLocationIndicators with `zIndex: 99`, meaning "just behind
 * the player". But the player is drawn by PixiJS on the canvas, and the whole DOM
 * world layer sits above that canvas — so no CSS z-index could put the easel behind
 * her, and it painted over the player whenever she stood in front of it.
 *
 * These tests pin the replacement: the easel is a room prop, sorted on the same
 * Z_DEPTH_SORTED_BASE + floor(y * 10) scale as PlayerSprite, and the DOM overlay
 * draws prompts only.
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { mumsKitchen } from '../maps/definitions/mumsKitchen';
import { paintingEaselDefinition } from '../minigames/painting-easel/definition';
import {
  getRoomPropImageUrls,
  roomPropBox,
  roomPropTopAt,
  roomPropZIndex,
} from '../utils/roomProps';
import { Z_DEPTH_SORTED_BASE, Z_PLAYER_FLYING } from '../zIndex';

const ROOT = join(__dirname, '..');

/** PlayerSprite's depth rule for a player whose feet are at `feetY`. */
const playerZ = (feetY: number) => Z_DEPTH_SORTED_BASE + Math.floor(feetY * 10);

const easel = mumsKitchen.props?.find((p) => p.id === 'kitchen_easel');

describe('kitchen easel room prop', () => {
  it('exists as a room prop on mums_kitchen', () => {
    expect(easel, 'mumsKitchen.props must contain the kitchen easel').toBeDefined();
  });

  it('stands on the tile the painting mini-game is opened from', () => {
    const loc = paintingEaselDefinition.triggers.mapLocation;
    expect(loc?.mapId).toBe('mums_kitchen');
    expect(
      roomPropTopAt(mumsKitchen, loc!.x, loc!.y),
      'The easel prop no longer covers the Draw mini-game tile — move one or the other'
    ).toBeDefined();
  });

  it('sorts behind a player standing in front of it and in front of one behind it', () => {
    const z = roomPropZIndex(easel!);
    const base = easel!.anchor.y;
    expect(playerZ(base + 0.5)).toBeGreaterThan(z);
    expect(playerZ(base - 0.5)).toBeLessThan(z);
    // Inside the depth-sorted range, below a flying player
    expect(z).toBeGreaterThanOrEqual(Z_DEPTH_SORTED_BASE);
    expect(z).toBeLessThan(Z_PLAYER_FLYING);
  });

  it('is anchored at its bottom-centre', () => {
    const box = roomPropBox(easel!, 10, { x: 3, y: 4 });
    expect(box.x + box.width / 2).toBeCloseTo(easel!.anchor.x * 10 + 3);
    expect(box.y + box.height).toBeCloseTo(easel!.anchor.y * 10 + 4);
  });

  it('lifts the floating prompt above the easel instead of across it', () => {
    const top = roomPropTopAt(mumsKitchen, 10, 5);
    expect(top).toBeCloseTo(easel!.anchor.y - easel!.height);
    expect(roomPropTopAt(mumsKitchen, 2, 7)).toBeUndefined();
  });
});

describe('room prop artwork', () => {
  it('every prop image exists under public/', () => {
    const missing = getRoomPropImageUrls(mumsKitchen).filter(
      (url) => !existsSync(join(ROOT, 'public', url.replace(/^\/TwilightGame\//, '')))
    );
    expect(
      missing,
      `Room prop images not found — they would render as nothing:\n${missing.join('\n')}`
    ).toEqual([]);
  });
});

describe('DOM world overlay draws prompts, not scenery', () => {
  it('MiniGameLocationIndicators uses no hard-coded z-index and no world artwork', () => {
    const source = readFileSync(join(ROOT, 'components/MiniGameLocationIndicators.tsx'), 'utf-8');
    expect(
      source.match(/zIndex:\s*\d/g) ?? [],
      'Use constants from zIndex.ts. Anything that must sort behind the player cannot be DOM ' +
        'at all — the DOM world layer is above the PixiJS canvas. Make it a room prop.'
    ).toEqual([]);
    expect(
      source.includes('<img'),
      'Scenery drawn here covers the PixiJS player whatever its z-index. Add it to ' +
        'MapDefinition.props instead (utils/pixi/RoomPropsLayer.ts).'
    ).toBe(false);
  });
});
