/**
 * Stamina drains every frame while walking, but committing every frame meant
 * gameState.notify() — a HUD re-render and a scheduled full-save serialise —
 * at 60 Hz (design_docs/planned/PERFORMANCE_MOBILE_PLAN.md §3.1, cause D).
 *
 * The invariant: the per-frame path writes quietly and commits on a cadence,
 * discrete costs (an activity) commit at once, and the bar only hears about
 * whole-number changes. If a refactor routes update() back through
 * setStamina(), the first test fails.
 */
/** @vitest-environment node */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { staminaManager } from '../utils/StaminaManager';
import { gameState } from '../GameState';
import { eventBus, GameEvent } from '../utils/EventBus';
import { STAMINA } from '../constants';

const FRAME_S = 1 / 60;
const ONE_SECOND_OF_FRAMES = 60;

function walkFor(frames: number, nowMs: { value: number }) {
  for (let i = 0; i < frames; i++) {
    nowMs.value += 1000 / 60;
    staminaManager.update(FRAME_S, true, 'village');
  }
}

describe('stamina commit cadence', () => {
  const now = { value: 1_000_000 };

  beforeEach(() => {
    vi.spyOn(Date, 'now').mockImplementation(() => now.value);
    staminaManager.initialise({ showToast: () => {}, teleportHome: () => false });
    staminaManager.reset();
    gameState.setStamina(STAMINA.MAX);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('walking for a second commits to game state far fewer times than there were frames', () => {
    const commits = vi.spyOn(gameState, 'setStamina');
    walkFor(ONE_SECOND_OF_FRAMES, now);
    // One commit at the first change (nothing committed yet), none until the
    // interval elapses. The value itself must still have moved.
    expect(commits.mock.calls.length).toBeLessThanOrEqual(1);
    expect(gameState.getStamina()).toBeLessThan(STAMINA.MAX);
  });

  it('commits again once the commit interval has elapsed', () => {
    const commits = vi.spyOn(gameState, 'setStamina');
    walkFor(ONE_SECOND_OF_FRAMES, now); // first commit
    const after1s = commits.mock.calls.length;
    now.value += STAMINA.COMMIT_INTERVAL_MS;
    walkFor(1, now);
    expect(commits.mock.calls.length).toBe(after1s + 1);
    // ...and the committed value is the quietly-drained one, not a stale one.
    // (Within a frame's drain: past bedtime a frame applies two drains and the
    // commit lands after the first.)
    const committed = commits.mock.calls.at(-1)?.[0] as number;
    expect(Math.abs(committed - gameState.getStamina())).toBeLessThan(0.01);
  });

  it('an activity cost commits immediately', () => {
    const commits = vi.spyOn(gameState, 'setStamina');
    staminaManager.performActivity('till');
    expect(commits).toHaveBeenCalledTimes(1);
    expect(gameState.getStamina()).toBe(STAMINA.MAX - STAMINA.TILL_COST);
  });

  it('the bar hears about whole-number changes, not every frame', () => {
    const heard: number[] = [];
    const off = eventBus.on(GameEvent.STAMINA_CHANGED, (p) => heard.push(p.value));
    walkFor(ONE_SECOND_OF_FRAMES * 2, now); // drains ~0.16 stamina
    off();
    // 100 → 99.84: exactly one integer boundary crossed (plus nothing else)
    expect(heard.length).toBeLessThanOrEqual(2);
    expect(heard.length).toBeGreaterThanOrEqual(1);
  });

  it('reaching zero commits at once so exhaustion is never late', () => {
    gameState.setStamina(0.001);
    staminaManager.reset();
    const commits = vi.spyOn(gameState, 'setStamina');
    walkFor(1, now); // handleExhaustion → restoreStaminaFull → committed MAX
    expect(commits).toHaveBeenCalled();
    expect(gameState.getStamina()).toBe(STAMINA.MAX);
  });
});
