/** @vitest-environment node */
/**
 * The season-change cutscene must play once when the season turns, not on every
 * page load.
 *
 * The trap this guards: season cutscenes are `playOnce: false` (they should
 * come back each year), so startCutscene()'s replay guard never fires for them.
 * The once-per-season rule lives in checkTrigger(), and a direct
 * startCutscene() call skips it — which is what App did while the cutscene
 * doubled as the loading screen, replaying it on every single load.
 * startSeasonCutsceneIfDue() is the only entry point that applies the rule, so
 * App must call that and nothing else.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { cutsceneManager } from '../utils/CutsceneManager';
import { ALL_CUTSCENES } from '../data/cutscenes';
import { TimeManager } from '../utils/TimeManager';

// CutsceneManager is exported only as a singleton, so each test resets it
// rather than constructing its own: end anything in flight, then loadState()
// overwrites both completedCutscenes and lastSeasonTriggered outright.
function freshManager() {
  cutsceneManager.endCutscene();
  cutsceneManager.registerCutscenes(ALL_CUTSCENES);
  return cutsceneManager;
}

const currentSeason = () => TimeManager.getCurrentTime().season.toLowerCase();

describe('season cutscene: once per season', () => {
  let manager: ReturnType<typeof freshManager>;

  beforeEach(() => {
    manager = freshManager();
  });

  it('starts the current season\'s cutscene on a fresh save', () => {
    manager.loadState([], undefined);
    expect(manager.startSeasonCutsceneIfDue()).toBe(`season_change_${currentSeason()}`);
  });

  it('does not start it again once this season has already been triggered', () => {
    // Simulates a reload: the season was recorded to gameState on the first
    // play and restored through loadState here.
    manager.loadState([], currentSeason());
    expect(manager.startSeasonCutsceneIfDue()).toBeNull();
    expect(manager.getState().isPlaying).toBe(false);
  });

  it('does not restart within a single session after playing through', () => {
    manager.loadState([], undefined);
    expect(manager.startSeasonCutsceneIfDue()).not.toBeNull();
    manager.endCutscene();

    expect(manager.startSeasonCutsceneIfDue()).toBeNull();
  });

  it('starts again when the recorded season is a different one', () => {
    const other = currentSeason() === 'winter' ? 'summer' : 'winter';
    manager.loadState([], other);
    expect(manager.startSeasonCutsceneIfDue()).toBe(`season_change_${currentSeason()}`);
  });

  it('records the season it started, so the caller can persist it', () => {
    manager.loadState([], undefined);
    manager.startSeasonCutsceneIfDue();
    expect(manager.getState().lastSeasonTriggered).toBe(currentSeason());
  });

  it('App starts the season cutscene only via startSeasonCutsceneIfDue', () => {
    const app = readFileSync(join(__dirname, '..', 'App.tsx'), 'utf-8');

    // App must delegate the whole decision — which season, whether it is due,
    // starting it — to the manager. Building the `season_change_*` id in App and
    // passing it to startCutscene() is precisely the bypass this guards against,
    // so App having its own knowledge of that id at all is the red flag.
    expect(
      app.includes('season_change'),
      'App.tsx builds a season_change cutscene id itself. Passing one to ' +
        'startCutscene() bypasses the once-per-season guard in checkTrigger() and ' +
        'replays the cutscene on every page load — call ' +
        'cutsceneManager.startSeasonCutsceneIfDue() and let it decide instead.'
    ).toBe(false);

    expect(app).toContain('startSeasonCutsceneIfDue');
  });
});
