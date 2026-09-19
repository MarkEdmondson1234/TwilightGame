/** @vitest-environment node */
import { describe, expect, it } from 'vitest';
import {
  TRIAL_DISTANCE,
  cartTuning,
  cartRecord,
  trialResult,
  validCartRecord,
  beginGoblinLunge,
  goblinPose,
} from '../minigames/test-of-agility/rules';
import {
  cartAnchor,
  cartContact,
  cartWidth,
  CART_ASPECT,
  obstacleGround,
  obstacleWidth,
  type OBSTACLES,
} from '../minigames/test-of-agility/geometry';
import { crossesContact } from '../minigames/skiing/rules';

describe('wizard agility rules', () => {
  it('retains a finite trial with no item rewards, including after endurance crashes', () => {
    expect(trialResult(TRIAL_DISTANCE - 1).success).toBe(false);
    expect(trialResult(TRIAL_DISTANCE).success).toBe(true);
    expect(trialResult(TRIAL_DISTANCE * 3)).toMatchObject({ success: true, rewards: [] });
    expect(trialResult(0).rewards).toEqual([]);
  });
  it('free play never advances the trial or grants items, even beyond the finish', () => {
    expect(trialResult(TRIAL_DISTANCE * 2, true)).toMatchObject({
      success: false,
      agilityPractice: true,
      rewards: [],
      score: 2400,
    });
  });
  it('introduces enemies and harder stages BEFORE the trial finishes, then keeps accelerating', () => {
    expect(cartTuning(0).speed).toBe(550);
    expect(cartTuning(3999).goblinChance).toBe(0);
    expect(cartTuning(4000).goblinChance).toBeGreaterThan(0);
    expect(cartTuning(9000).spawnMs).toBeLessThan(cartTuning(0).spawnMs);
    expect(cartTuning(120000).speed).toBeGreaterThan(cartTuning(116000).speed);
    expect(cartTuning(1000000).spawnMs).toBeGreaterThanOrEqual(280);
  });
  it('scores distance only and validates local/global records consistently', () => {
    expect(cartRecord(12345.9)).toEqual({ distance: 12345, score: 1234, level: 4 });
    expect(validCartRecord(cartRecord(12345))).toBe(true);
    expect(validCartRecord({ distance: 12345, score: 1235, level: 4 })).toBe(false);
    expect(validCartRecord({ distance: 12345, score: 1234, level: 1 })).toBe(false);
    expect(validCartRecord({ distance: Infinity, score: 1, level: 1 })).toBe(false);
    expect(validCartRecord(cartRecord(200000))).toBe(true);
  });
  it('gives goblins a readable wind-up and a fixed target you can dodge', () => {
    expect(beginGoblinLunge(1600, 1000, -300, 0)).toBeUndefined();
    expect(beginGoblinLunge(-1, 1000, -300, 0)).toBeUndefined();
    const attack = beginGoblinLunge(1500, 1000, -300, 0)!;
    expect(goblinPose({ ...attack, elapsed: 0.5 })).toMatchObject({ x: -300, windingUp: true });
    expect(goblinPose({ ...attack, elapsed: 1.2 }).x).toBe(0);
    expect(Math.abs(goblinPose({ ...attack, elapsed: 1.5 }).x - 300)).toBeGreaterThan(100);
    expect(crossesContact(240, 220, 230, -60, 60, 40)).toBe(true);
  });
});
describe('cart-specific contact geometry', () => {
  for (const [w, h] of [
    [390, 844],
    [844, 390],
    [1280, 800],
  ]) {
    for (const kind of ['crystal', 'rock', 'goblin'] as (keyof typeof OBSTACLES)[]) {
      it(`${kind} touches the cart at its visible base on ${w}×${h}`, () => {
        const c = cartContact(kind, w, h);
        expect(obstacleGround(kind, w, h, c.z)).toBeCloseTo(cartAnchor(w, h), 2);
        expect(crossesContact(c.z + 60, c.z + 10, c.z, 0, 0, c.halfWidth)).toBe(false);
        expect(crossesContact(c.z + 10, c.z - 10, c.z, 0, 0, c.halfWidth)).toBe(true);
        expect(
          crossesContact(c.z + 10, c.z - 10, c.z, c.halfWidth + 30, c.halfWidth + 40, c.halfWidth)
        ).toBe(false);
        expect(obstacleWidth(kind, w, 1)).toBeLessThanOrEqual(w * 0.28);
        expect(cartWidth(w, h) / CART_ASPECT).toBeLessThanOrEqual(h * 0.34 + 1e-6);
      });
    }
  }
});
