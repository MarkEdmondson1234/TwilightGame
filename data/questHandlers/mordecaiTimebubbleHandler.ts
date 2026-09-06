/**
 * Mordecai Time Bubble Handler
 *
 * State for the Wizard Trials epilogue: once the player passes the trials, a time
 * bubble containing the trapped Mordecai appears in the antechamber (wizard_trials).
 * Popping it swaps the bubble NPC for the freed Mordecai NPC (handled in
 * dialogueHandlers.ts, mirroring the ghost → queen swap, to avoid circular imports).
 *
 * This is deliberately not an event chain — there is no tracked quest here, just three
 * persisted narrative flags, the same style as ghostQueenHandler.ts's hasMetGhost().
 */

import { debugLog } from '../../utils/debugLog';

export const WIZARD_TRIALS_MORDECAI_ID = 'wizard_trials_mordecai';

const TRIALS_PASSED_KEY = 'wizard_trials_passed';
const BUBBLE_POPPED_KEY = 'wizard_trials_bubble_popped';
const REVEALED_YEAR_KEY = 'wizard_trials_mordecai_revealed';

/**
 * Has the player passed "the Trial of the Heart" (the last Wizard Trials cutscene)?
 *
 * Deliberately its own localStorage flag rather than
 * cutsceneManager.hasCompletedCutscene('wizard_trials_apprentice_pass'): unlike
 * eventChainManager (which self-loads from localStorage synchronously in its
 * constructor), CutsceneManager's completed-cutscenes list starts empty and is only
 * populated later by an explicit cutsceneManager.loadState() call from App.tsx's
 * mount effect — which runs after maps/definitions/wizardTrials.ts's static `npcs`
 * array has already been built at module-import time. Reading it there would always
 * see the freshly-constructed empty state, so the bubble/Mordecai would silently
 * vanish from the antechamber on every fresh page load. setWizardTrialsPassed() is
 * called the moment the encounter first unlocks (see spawnWizardTrialsMordecaiIfAbsent
 * in utils/npcs/mine/mordecai.ts), so this flag is synchronously available next session.
 */
export function hasPassedWizardTrials(): boolean {
  try {
    return localStorage.getItem(TRIALS_PASSED_KEY) === '1';
  } catch {
    return false;
  }
}

export function setWizardTrialsPassed(): void {
  try {
    localStorage.setItem(TRIALS_PASSED_KEY, '1');
    debugLog('MordecaiTimebubble', 'Wizard Trials passed — time bubble unlocked');
  } catch {
    // localStorage not available — ignore
  }
}

export function isBubblePopped(): boolean {
  try {
    return localStorage.getItem(BUBBLE_POPPED_KEY) === '1';
  } catch {
    return false;
  }
}

export function setBubblePopped(): void {
  try {
    localStorage.setItem(BUBBLE_POPPED_KEY, '1');
    debugLog('MordecaiTimebubble', 'Bubble popped — Mordecai freed');
  } catch {
    // localStorage not available — ignore
  }
}

/** Has Mordecai already had his "what year is it?!" reveal conversation? */
export function hasRevealedYear(): boolean {
  try {
    return localStorage.getItem(REVEALED_YEAR_KEY) === '1';
  } catch {
    return false;
  }
}

export function setHasRevealedYear(): void {
  try {
    localStorage.setItem(REVEALED_YEAR_KEY, '1');
    debugLog('MordecaiTimebubble', 'Reveal conversation complete');
  } catch {
    // localStorage not available — ignore
  }
}
