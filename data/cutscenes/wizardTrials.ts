/**
 * Wizard Trials Cutscenes — Mordecai's projection
 *
 * Narrative framing for the four Wizard Trials mini-games (Test of Wits, Test of
 * Strength, Test of Agility, Test of Patience). Mordecai has been trapped in a frozen
 * time bubble for 500 years and never got round to dismantling his own trials — he
 * appears only as a magical projection, never as a walkable/clickable NPC, so there is
 * no NPC registry entry for him: `spriteUrl` is set explicitly on every character entry
 * below instead of resolving through NPCManager.
 *
 * None of these have bespoke background art (only Mordecai's projection PNG was
 * supplied), so every scene reuses the tileable mine-floor texture as a repeating CSS
 * background rather than a single stretched image.
 *
 * Trigger wiring lives outside this file:
 *  - wizard_trials_wits_intro / wizard_trials_agility_intro: fired by
 *    `MiniGameDefinition.precedingCutsceneId` from `utils/interactions/providers/mapLocation.ts`.
 *  - wizard_trials_strength_intro: fired manually from App.tsx's mini-game onClose
 *    handler the instant the crate puzzle is won.
 *  - wizard_trials_final_judgement: fired by `Transition.precedingCutsceneId` from
 *    `utils/interactions/providers/transition.ts` (the "Climb the Beanstalk" transition
 *    in maps/definitions/testOfPatience.ts).
 *  - wizard_trials_apprentice_fail / _pass: only reachable via the judgement scene's
 *    dialogue choices (`triggerCutscene`), never triggered directly.
 */

import { CutsceneDefinition, CutsceneCharacter, CutsceneScene } from '../../types';
import { tileAssets, npcAssets } from '../../assets';

/** Every scene shares this look: Mordecai's projection over the tileable mine floor. */
const MINE_FLOOR_BACKDROP = `#1a1410 url('${tileAssets.mine_floor}') repeat`;

function mordecai(overrides?: Partial<CutsceneCharacter>): CutsceneCharacter[] {
  return [
    {
      characterId: 'mordecai',
      spriteUrl: npcAssets.mordecai_projection,
      position: { x: 62, y: 46 },
      scale: 1.4,
      opacity: 0.92,
      entrance: { type: 'fade', duration: 600 },
      ...overrides,
    },
  ];
}

/** A single-line Mordecai scene with the shared backdrop, to cut down repetition below. */
function mordecaiScene(id: string, text: string, extra?: Partial<CutsceneScene>): CutsceneScene {
  return {
    id,
    backgroundCss: MINE_FLOOR_BACKDROP,
    backgroundLayers: [],
    characters: mordecai(),
    dialogue: { speaker: 'Mordecai', text },
    transitionOut: { type: 'fade', duration: 500 },
    ...extra,
  };
}

// ============================================================================
// Scene 1 — Antechamber welcome
// ============================================================================

export const wizardTrialsIntroCutscene: CutsceneDefinition = {
  id: 'wizard_trials_intro',
  name: "Mordecai's Welcome",
  canSkip: true,
  playOnce: true,

  trigger: {
    type: 'position',
    mapId: 'wizard_trials',
    position: { x: 3, y: 7 },
    radius: 3,
  },

  onComplete: { action: 'none' },

  scenes: [
    mordecaiScene(
      'welcome',
      'Enter, he — or she — who dares! To become the apprentice of the Great Wizard Mordecai, you must pass the trials!'
    ),
    mordecaiScene(
      'warning',
      "Fail one, and all is lost. Good luck with it... you'll need it."
    ),
  ],
};

// ============================================================================
// Scene 2 — Before the Test of Wits
// ============================================================================

export const wizardTrialsWitsIntroCutscene: CutsceneDefinition = {
  id: 'wizard_trials_wits_intro',
  name: 'Test of Wits: Introduction',
  canSkip: true,
  playOnce: false,

  trigger: { type: 'manual', id: 'wizard_trials_wits_intro' },

  onComplete: { action: 'none' },

  scenes: [
    mordecaiScene(
      'challenge',
      'You think you are smart enough to become my apprentice? Well, you had better prove it! Find your way through my labyrinth.'
    ),
  ],
};

// ============================================================================
// Scene 3 — Winning the Test of Wits, before the Test of Strength
// ============================================================================

export const wizardTrialsStrengthIntroCutscene: CutsceneDefinition = {
  id: 'wizard_trials_strength_intro',
  name: 'Test of Strength: Introduction',
  canSkip: true,
  playOnce: false,

  trigger: { type: 'manual', id: 'wizard_trials_strength_intro' },

  onComplete: {
    action: 'transition',
    mapId: 'strength_trial',
    position: { x: 7, y: 6 },
  },

  scenes: [
    mordecaiScene(
      'praise',
      'A wizard needs more than a good intellect. To become my apprentice, you must also know how to preserve your strength.'
    ),
    mordecaiScene(
      'instructions',
      'Clear the rocks from the door, if you can. But beware: if you faint, you will have failed my trial.'
    ),
  ],
};

// ============================================================================
// Scene 4 — Before the Test of Agility
// ============================================================================

export const wizardTrialsAgilityIntroCutscene: CutsceneDefinition = {
  id: 'wizard_trials_agility_intro',
  name: 'Test of Agility: Introduction',
  canSkip: true,
  playOnce: false,

  trigger: { type: 'manual', id: 'wizard_trials_agility_intro' },

  onComplete: { action: 'none' },

  scenes: [
    mordecaiScene(
      'challenge',
      'A wizard must have excellent reflexes, and be able to think on their feet!'
    ),
    mordecaiScene(
      'dare',
      'Do you dare climb into a mine cart, hurtling at high speed into the abyss? This trial is truly not for the faint of heart — you had better be ready!'
    ),
  ],
};

// ============================================================================
// Scene 5 — Arriving at the Test of Patience
// ============================================================================

export const wizardTrialsPatienceIntroCutscene: CutsceneDefinition = {
  id: 'wizard_trials_patience_intro',
  name: 'Test of Patience: Introduction',
  canSkip: true,
  playOnce: true,

  trigger: {
    type: 'position',
    mapId: 'test_of_patience',
    position: { x: 4, y: 10 },
    radius: 3,
  },

  onComplete: { action: 'none' },

  scenes: [
    mordecaiScene(
      'patience',
      'Becoming adept at magic requires patience. Just like most other worthwhile things in life.'
    ),
  ],
};

// ============================================================================
// Scene 6 — The final judgement (branches to 7a/7b)
// ============================================================================

export const wizardTrialsFinalJudgementCutscene: CutsceneDefinition = {
  id: 'wizard_trials_final_judgement',
  name: 'The Trial of the Heart',
  canSkip: false,
  playOnce: false,

  trigger: { type: 'manual', id: 'wizard_trials_final_judgement' },

  // Never actually reached — every path out of this cutscene is a dialogue choice's
  // triggerCutscene, which ends this one before onComplete is consulted.
  onComplete: { action: 'none' },

  scenes: [
    mordecaiScene(
      'passed',
      "Well, wouldn't you know it! You have passed all four of my trials!"
    ),
    mordecaiScene(
      'setup',
      'In that case, I have only one thing left — and your answer determines whether you are worthy of becoming my apprentice.'
    ),
    {
      id: 'question',
      backgroundCss: MINE_FLOOR_BACKDROP,
      backgroundLayers: [],
      characters: mordecai(),
      dialogue: {
        speaker: 'Mordecai',
        text: 'Answer me truthfully: are you willing to give up everything in this world to become a wizard? If you do, you will gain access to great power. However, you should know that you will never be able to see your friends or family again. What do you choose?',
        choices: [
          {
            text: 'I want to become a wizard!',
            triggerCutscene: 'wizard_trials_apprentice_fail',
          },
          {
            text: "I'm sorry, I can't leave my family.",
            triggerCutscene: 'wizard_trials_apprentice_pass',
          },
        ],
      },
    },
  ],
};

// ============================================================================
// Scene 7a — Failed the trial of the heart
// ============================================================================

export const wizardTrialsApprenticeFailCutscene: CutsceneDefinition = {
  id: 'wizard_trials_apprentice_fail',
  name: 'The Trial of the Heart: Failure',
  canSkip: false,
  playOnce: false,

  trigger: { type: 'manual', id: 'wizard_trials_apprentice_fail' },

  onComplete: {
    action: 'transition',
    mapId: 'mums_kitchen',
    position: { x: 8, y: 6 },
  },

  scenes: [
    mordecaiScene('afraid', 'Ah. I was afraid you might say that.'),
    mordecaiScene(
      'failure',
      'But you see, what a wizard needs more than anything is friends and family. By not realising this, you have failed my final test: the trial of the heart. Alas, it is not to be.'
    ),
  ],
};

// ============================================================================
// Scene 7b — Passed the trial of the heart
// ============================================================================

export const wizardTrialsApprenticePassCutscene: CutsceneDefinition = {
  id: 'wizard_trials_apprentice_pass',
  name: 'The Trial of the Heart: Success',
  canSkip: false,
  playOnce: false,

  trigger: { type: 'manual', id: 'wizard_trials_apprentice_pass' },

  onComplete: {
    action: 'transition',
    mapId: 'wizard_trials',
    position: { x: 12, y: 9 },
  },

  scenes: [
    mordecaiScene(
      'delighted',
      'You know what? That was exactly what I was hoping you would say!'
    ),
    mordecaiScene(
      'success',
      'By answering that way, you have passed my final test: the trial of the heart. Congratulations — you are officially my apprentice!'
    ),
  ],
};

export const ALL_WIZARD_TRIALS_CUTSCENES: CutsceneDefinition[] = [
  wizardTrialsIntroCutscene,
  wizardTrialsWitsIntroCutscene,
  wizardTrialsStrengthIntroCutscene,
  wizardTrialsAgilityIntroCutscene,
  wizardTrialsPatienceIntroCutscene,
  wizardTrialsFinalJudgementCutscene,
  wizardTrialsApprenticeFailCutscene,
  wizardTrialsApprenticePassCutscene,
];
