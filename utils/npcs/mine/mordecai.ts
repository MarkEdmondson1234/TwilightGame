/**
 * Mordecai — Wizard Trials Epilogue NPC Factory Functions
 *
 * Once the player passes the Wizard Trials, a time bubble containing the trapped
 * Great Wizard Mordecai appears in the antechamber (wizard_trials). Popping it frees
 * him as a proper, walkable, talkable NPC.
 *
 * Two forms, sharing one id (WIZARD_TRIALS_MORDECAI_ID) so the swap between them
 * reads as a transformation in place — the same pattern as the ghost/queen swap in
 * utils/npcs/village/queenAvaricia.ts:
 *  - Bubble form (pre-pop): asleep, no friendship/dialogue beyond the pop/leave choice
 *  - Wizard form (post-pop): named, friendship/gifting enabled, full dialogue tree
 *
 * The actual NPC swap on "Pop the bubble" is handled by dialogueHandlers.ts (mirrors
 * the ghost → queen swap, kept there to avoid circular imports between this file and
 * dialogueHandlers.ts).
 */

import { NPC, Direction } from '../../../types';
import { npcAssets } from '../../../assets';
import { createStaticNPC } from '../createNPC';
import {
  WIZARD_TRIALS_MORDECAI_ID,
  hasPassedWizardTrials,
  setWizardTrialsPassed,
  isBubblePopped,
} from '../../../data/questHandlers/mordecaiTimebubbleHandler';

/** Clear mine-floor tile near the post-trial spawn point {12,9}, clear of the
 * floating trial-entrance door anchored at {12,7} (~3.5 tiles wide/tall). */
const MORDECAI_POSITION = { x: 14, y: 9 };

// ============================================================================
// Bubble Form (asleep, anonymous — pre-pop)
// ============================================================================

export function createTimeBubbleNPC(): NPC {
  return createStaticNPC({
    id: WIZARD_TRIALS_MORDECAI_ID,
    name: '???',
    position: MORDECAI_POSITION,
    direction: Direction.Left,
    // The source art already faces left (toward the player, who arrives from the
    // west at {12,9}) — NPCLayer's default flip assumes right-facing art, which
    // would turn this away from the player, so skip it.
    noFlip: true,
    scale: 6.0,
    sprite: npcAssets.wizard_timebubble,
    interactionRadius: 1.5,
    dialogue: [
      {
        id: 'greeting',
        text: 'Suspended in time, a wizard sleeps inside this bubble. It seems he is trapped. What do you want to do?',
        responses: [
          { text: 'Pop the bubble', nextId: 'bubble_popped' },
          { text: 'Leave him be' },
        ],
      },
      {
        id: 'bubble_popped',
        text: '*The bubble shimmers, then bursts in a puff of silvery light...*',
        // No responses — dialogue ends here. handleMordecaiTimebubbleActions in
        // dialogueHandlers.ts intercepts this node id to swap in Mordecai.
      },
    ],
  });
}

// ============================================================================
// Wizard Form (freed, named — post-pop)
// ============================================================================

export function createMordecaiWizardNPC(): NPC {
  return createStaticNPC({
    id: WIZARD_TRIALS_MORDECAI_ID,
    name: 'Mordecai',
    position: MORDECAI_POSITION,
    direction: Direction.Left,
    // Same reasoning as the bubble form above — the art already faces the player.
    noFlip: true,
    scale: 6.0,
    sprite: npcAssets.wizard_mordecai,
    interactionRadius: 1.5,
    portraitSprite: npcAssets.wizard_mordecai,
    dialogueExpressions: {
      default: npcAssets.wizard_mordecai,
    },
    friendshipConfig: { canBefriend: true, startingPoints: 0 },
    dialogue: [
      // Entry point is always 'greeting'; handleMordecaiTimebubbleActions redirects
      // it to the reveal conversation (first time) or the chat hub (every time after).
      { id: 'greeting', text: '' },

      // ---- First conversation: confusion -> realisation -> the 500-years shock ----
      {
        id: 'mordecai_reveal_intro',
        text: '"Zila? Zila, is that— wait." *He blinks, looking around in confusion.* "This isn\'t... where am I? What happened to my trials?"',
        responses: [
          { text: 'You were trapped in a time bubble.', nextId: 'mordecai_reveal_suspicion' },
        ],
      },
      {
        id: 'mordecai_reveal_suspicion',
        text: '"Trapped? I was confronting my apprentice — Zila — about... oh. Oh, dear. She wouldn\'t have. Would she?" *He tugs at his beard, thinking.* "Actually, knowing Zila, she absolutely would have."',
        responses: [
          { text: 'What were you confronting her about?', nextId: 'mordecai_reveal_avaricia' },
        ],
      },
      {
        id: 'mordecai_reveal_avaricia',
        text: '"A visitor of mine went missing — a queen, rather a memorable one, all crowns and complaints. I began to suspect Zila had done away with her. I never did get an answer." *He pauses.* "Tell me, young one — what year is it?"',
        responses: [{ text: 'Tell him the year.', nextId: 'mordecai_reveal_shock' }],
      },
      {
        id: 'mordecai_reveal_shock',
        text: '*His face goes pale.* "Five hundred years?! Five hundred— well. That explains the dust." *He laughs, a little shakily.* "I do apologise. This is rather a lot to take in for a man who, five minutes ago by his own reckoning, was simply having a disagreement with his apprentice."',
        responses: [{ text: 'Are you all right?', nextId: 'mordecai_reveal_end' }],
      },
      {
        id: 'mordecai_reveal_end',
        text: '"All right? No, not remotely. But I daresay I shall have to be." *He manages a wry smile.* "Thank you for freeing me. I mean that — even if I am still rather stuck on the five hundred years."',
        // No responses — ends dialogue. handleMordecaiTimebubbleActions sets
        // hasRevealedYear() when this node is reached.
      },

      // ---- Every conversation after the reveal ----
      {
        id: 'mordecai_chat_hub',
        text: '"Ah, hello again, young one."',
        responses: [
          { text: 'What are you going to do now?', nextId: 'mordecai_plans' },
          { text: 'Goodbye.' },
        ],
      },
      {
        id: 'mordecai_plans',
        text: '"Do? Oh — I suppose I shall make this old antechamber my base for a while, at least until I have got my bearings. There is rather a lot to figure out." *He glances round at the cave walls, looking faintly baffled.* "Back in my day, you understand, I was a great wizard — kings and queens travelled from every corner of the realm to seek my counsel. Though I daresay a great deal must have changed, in five hundred years."',
        responses: [
          { text: 'Kings and queens sought your counsel?', nextId: 'mordecai_backstory' },
          { text: 'Goodbye.' },
        ],
      },
      {
        id: 'mordecai_backstory',
        text: '"Indeed they did! I am Mordecai — the Great Wizard Mordecai, if you believe the trials, though between the two of us I mostly came up with that title myself. It has rather a nice ring to it, don\'t you think?" *He strokes his beard.* "I had been meaning to retire, as it happens — that is rather why I took on an apprentice in the first place." *He sighs.* "That rather backfired, as you may have gathered."',
        responses: [{ text: '...' }, { text: 'Goodbye.' }],
      },
    ],
  });
}

// ============================================================================
// Map Factory — used by wizardTrials.ts
// ============================================================================

/**
 * Returns the appropriate form for the antechamber's static NPC list, or null if
 * the player hasn't passed the trials yet. Only evaluated once at startup — the
 * mid-session appearance (right after passing the trials) is handled separately by
 * spawnWizardTrialsMordecaiIfAbsent(), called from App.tsx's cutscene completion.
 */
export function createWizardTrialsMordecaiOrNull(): NPC | null {
  if (!hasPassedWizardTrials()) return null;
  return isBubblePopped() ? createMordecaiWizardNPC() : createTimeBubbleNPC();
}

/**
 * Spawns the bubble (or Mordecai, if already popped in a prior session) into the
 * live wizard_trials NPC list, if it isn't already there. Called from App.tsx right
 * after the wizard_trials_apprentice_pass cutscene transitions the player back into
 * the antechamber — the moment the time bubble is meant to "emerge in front of them".
 *
 * npcManager is imported dynamically (not at module scope) because a static import
 * here would close a real circular-dependency loop: this file is pulled in by
 * maps/definitions/wizardTrials.ts, and NPCManager.ts's own import chain leads back
 * to maps/index.ts (via utils/mapUtils.ts's `import { mapManager } from '../maps'`) —
 * which is the very file evaluating wizardTrials.ts in the first place. See the
 * identical fix/explanation in data/questHandlers/wizardTrialsPatienceHandler.ts.
 */
export function spawnWizardTrialsMordecaiIfAbsent(): void {
  // Recorded here (not inferred from cutsceneManager) so it's synchronously readable
  // by createWizardTrialsMordecaiOrNull() at next session's module-import time — see
  // hasPassedWizardTrials()'s doc comment for why cutsceneManager can't be used there.
  setWizardTrialsPassed();

  void import('../../../NPCManager').then(({ npcManager }) => {
    const alreadyPresent = npcManager
      .getNPCsForMap('wizard_trials')
      .some((npc) => npc.id === WIZARD_TRIALS_MORDECAI_ID);
    if (alreadyPresent) return;

    npcManager.addDynamicNPC(isBubblePopped() ? createMordecaiWizardNPC() : createTimeBubbleNPC());
  });
}
