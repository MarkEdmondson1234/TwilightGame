/** @vitest-environment node */
import { describe, expect, it } from 'vitest';
import {
  crossesContact,
  forestLevel,
  retainedWood,
  levelTuning,
  runScore,
  STRETCH_DISTANCE,
  validRecord,
} from '../minigames/skiing/rules';

describe('skiing contact, rather than early horizontal overlap', () => {
  it('allows a player aligned with an approaching tree to keep steering', () => {
    expect(crossesContact(705, 695, 230, 0, 0, 45)).toBe(false);
    expect(crossesContact(300, 240, 230, 0, 0, 45)).toBe(false);
  });
  it('hits only as the ground plane is crossed and never after passing', () => {
    expect(crossesContact(240, 220, 230, 0, 0, 45)).toBe(true);
    expect(crossesContact(220, 200, 230, 0, 0, 45)).toBe(false);
    expect(crossesContact(240, 220, 230, 100, 100, 45)).toBe(false);
  });
  it('interpolates the dodge at contact instead of tunnelling on a slower frame', () => {
    expect(crossesContact(300, 100, 230, 100, -100, 45)).toBe(true);
    expect(crossesContact(240, 220, 230, 80, 160, 45)).toBe(false);
  });
});

describe('forest travel and run economy', () => {
  it('advances only completed stretches, including runs begun deep in the forest', () => {
    expect(forestLevel(1, STRETCH_DISTANCE - 1)).toBe(1);
    expect(forestLevel(1, STRETCH_DISTANCE)).toBe(2);
    expect(forestLevel(4, STRETCH_DISTANCE * 2 + 30)).toBe(6);
    expect(forestLevel(29, STRETCH_DISTANCE * 10)).toBe(30);
  });
  it('salvages a quarter of the total, never rounds each quality up separately', () => {
    const haul = { wood_poor: 2, wood_medium: 1, wood_fine: 2 };
    expect(retainedWood(haul, true)).toEqual({ wood_poor: 0, wood_medium: 0, wood_fine: 2 });
    expect(retainedWood(haul, false)).toEqual(haul);
    expect(haul.wood_poor).toBe(2);
    expect(retainedWood({ wood_poor: 0, wood_medium: 0, wood_fine: 0 }, true).wood_fine).toBe(0);
    expect(retainedWood({ wood_poor: 1, wood_medium: 0, wood_fine: 0 }, true).wood_poor).toBe(1);
  });
  it('introduces wolves only in later levels and bounds maximum difficulty', () => {
    expect(levelTuning(3).wolfChance).toBe(0);
    expect(levelTuning(4).wolfChance).toBeGreaterThan(0);
    expect(levelTuning(8).speed).toBeGreaterThan(levelTuning(1).speed);
    expect(levelTuning(30).spawnMs).toBeGreaterThanOrEqual(300);
  });
  it('scores the actual run, without a free bonus for starting deep', () => {
    expect(runScore(1000, { wood_poor: 1, wood_medium: 1, wood_fine: 1 })).toBe(400);
    expect(validRecord({ score: Infinity, distance: 100, level: 1 })).toBe(false);
    expect(validRecord({ score: 100, distance: 100, level: 1 })).toBe(true);
  });
});

import {
  contactForSprite,
  getPlayerCollisionAnchorY,
  spriteGroundY,
} from '../minigames/skiing/geometry';
describe('rendered contact geometry', () => {
  for (const [width, height] of [
    [390, 844],
    [844, 390],
    [1280, 800],
    [1920, 1080],
  ]) {
    it(`aligns visible bases at contact on ${width} × ${height}`, () => {
      for (const [base, aspect, pad] of [
        [420, 0.65, 0.066],
        [190, 1, 0.212],
        [240, 1, 0.238],
      ]) {
        const contact = contactForSprite(width, height, base, aspect, pad, 1 / 3, false);
        const playerY = getPlayerCollisionAnchorY(width, height);
        expect(spriteGroundY(width, height, contact.z, base, aspect, pad)).toBeCloseTo(playerY, 2);
        expect(spriteGroundY(width, height, contact.z + 100, base, aspect, pad)).toBeLessThan(
          playerY
        );
        expect(contact.halfWidth).toBeGreaterThan(0);
      }
    });
  }
});

import { pickObstacleX } from '../minigames/skiing/rules';
describe('reachable escape lanes', () => {
  it('refuses to fill the final free lane', () => {
    const objects = [-720, -360, 0, 360].map((worldX) => ({
      kind: 'tree_spruce',
      worldX,
      worldZ: 4000,
    }));
    expect(pickObstacleX(objects, 4000, () => 0.5)).toBeNull();
    expect(pickObstacleX(objects.slice(1), 4000, () => 0.5)).not.toBeNull();
  });
  it('ignores pickups and threats that will already have passed', () => {
    const objects = [-720, -360, 0, 360, 720].map((worldX) => ({
      kind: 'wood_poor',
      worldX,
      worldZ: 4000,
    }));
    expect(pickObstacleX(objects, 4000, () => 0.5)).not.toBeNull();
    expect(
      pickObstacleX(
        objects.map((o) => ({ ...o, kind: 'wolf' })),
        5000,
        () => 0.5
      )
    ).not.toBeNull();
  });
});
