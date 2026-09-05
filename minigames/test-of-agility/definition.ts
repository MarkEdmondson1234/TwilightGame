import type { MiniGameDefinition } from '../types';
import { MineCartGame } from './MineCartGame';

/**
 * Test of Agility mini-game definition.
 *
 * Third trial in the Wizard Trials series — a mine-cart dodge run, engine adapted
 * from minigames/skiing/SkiingGame.tsx. See minigames/test-of-agility/MineCartGame.tsx
 * for the gameplay.
 *
 * Entry point: the doorway art at (7,4) in the Strength Trial chamber
 * (maps/definitions/strengthTrial.ts) — the tile that room's own comments reserve for
 * "continuing further into the trials." mapLocation triggers need no map-file edits
 * (see utils/interactions/providers/mapLocation.ts and MiniGameLocationIndicators.tsx,
 * which render the bobbing icon/tooltip purely from this coordinate), so
 * strengthTrial.ts itself is untouched.
 *
 * Gated on wizard_trials_strength stage 2 ('cleared') so the trigger only offers
 * itself once all six boulders are cleared — otherwise a player could skip the
 * Strength Trial entirely by walking straight to this tile.
 */
export const testOfAgilityDefinition: MiniGameDefinition = {
  id: 'test-of-agility',
  displayName: 'Test of Agility',
  description: 'Steer the runaway mine cart through the tunnels, dodging crystal outcrops.',
  icon: '🛤️',
  colour: '#7c3aed',
  component: MineCartGame,
  triggers: {
    mapLocation: { mapId: 'strength_trial', x: 7, y: 4 },
  },
  availability: {
    requiresQuest: 'wizard_trials_strength',
    requiresQuestStage: 2,
  },
  confirmMessage: 'Board the runaway mine cart?',
  customBackdrop: true,
};
