/** @vitest-environment node */
/**
 * Guards YuleCelebrationManager.checkCatchUpCutscene() — the "you missed it"
 * recap, mirroring HarvestFeastManager.checkCatchUpCutscene() (see
 * tests/seasonReconcile.test.ts for the underlying day-math). Fires the
 * yule_catchup cutscene exactly when the whole day-42 window was missed —
 * either the player is currently past day 42 this Winter having never
 * gathered, or the boundary was crossed entirely while the game was closed —
 * and never fires when mid-window or already celebrated.
 *
 * The "crossed while closed" path compares gameState's saved lastKnownDay
 * against TimeManager.getTotalGameDays(), which is real-Date.now()-derived
 * and deliberately ignores TimeManager.setTimeOverride() (absences are
 * real-world gaps) — so that one test drives fake system time directly
 * rather than the display-only override.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TimeManager, Season } from '../utils/TimeManager';
import { gameState } from '../GameState';
import { cutsceneManager } from '../utils/CutsceneManager';
import { yuleCelebrationManager } from '../utils/YuleCelebrationManager';
import { yuleCatchupCutscene } from '../data/cutscenes/seasonalEvents';

describe('Yule celebration — catch-up recap', () => {
  beforeEach(() => {
    cutsceneManager.registerCutscene(yuleCatchupCutscene);
    gameState.resetYuleProgress();
    TimeManager.clearTimeOverride();
  });

  afterEach(() => {
    TimeManager.clearTimeOverride();
  });

  it('fires the recap when the player is past day 42 this Winter having missed it', () => {
    const year = 777_010;
    TimeManager.setTimeOverride({ season: Season.WINTER, day: 43, hour: 10, year });

    yuleCelebrationManager.checkCatchUpCutscene();

    expect(gameState.hasYuleBeenCelebrated(year)).toBe(true);
  });

  it('does not fire while still mid-window on day 42 itself', () => {
    const year = 777_011;
    TimeManager.setTimeOverride({ season: Season.WINTER, day: 42, hour: 10, year });

    yuleCelebrationManager.checkCatchUpCutscene();

    expect(gameState.hasYuleBeenCelebrated(year)).toBe(false);
  });

  it('does not fire again once already celebrated (live or caught up)', () => {
    const year = 777_012;
    gameState.markYuleCelebrated(year);
    TimeManager.setTimeOverride({ season: Season.WINTER, day: 43, hour: 10, year });

    yuleCelebrationManager.checkCatchUpCutscene();

    // Still exactly once — no duplicate entry, no re-trigger side effects.
    expect(
      gameState.getFullState().yule.celebratedYears.filter((y) => y === year).length
    ).toBe(1);
  });

  it('detects the boundary crossed entirely while the game was closed, across seasons', () => {
    vi.useFakeTimers();
    try {
      const targetYear = 5; // small, real-arithmetic-friendly year
      const autumnStart = TimeManager.seasonStartDayInYear(Season.AUTUMN);
      const winterStart = TimeManager.seasonStartDayInYear(Season.WINTER);

      // Last known: mid-autumn of targetYear, well before that year's Yule.
      const lastKnownTotalDays = targetYear * TimeManager.DAYS_PER_YEAR + autumnStart + 10;
      gameState.setYuleLastKnownDay(lastKnownTotalDays);

      // Real wall-clock now: 20 days past that year's Yule (day 42 of Winter).
      const nowTotalDays = targetYear * TimeManager.DAYS_PER_YEAR + winterStart + 41 + 20;
      vi.setSystemTime(TimeManager.GAME_START_DATE + nowTotalDays * TimeManager.MS_PER_GAME_DAY);

      // Display override just needs to say "not currently in Winter" so only
      // the crossed-while-closed path (not pastDay42ThisWinter) can fire.
      TimeManager.setTimeOverride({ season: Season.SPRING, day: 5, hour: 10, year: targetYear + 1 });

      yuleCelebrationManager.checkCatchUpCutscene();

      expect(gameState.hasYuleBeenCelebrated(targetYear)).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
});
