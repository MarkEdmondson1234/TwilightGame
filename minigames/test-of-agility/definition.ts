import type { MiniGameDefinition } from '../types';
import { MineCartGame } from './MineCartGame';

/**
 * Test of Agility mini-game definition.
 *
 * Third trial in the Wizard Trials series — a mine-cart dodge run, engine adapted
 * from minigames/skiing/SkiingGame.tsx. See minigames/test-of-agility/MineCartGame.tsx
 * for the gameplay.
 *
 * DEV-ONLY ENTRY: the mapLocation below is temporarily placed on the debug NPC
 * showcase map (debug_npcs, reached via F7), 2 tiles south of that map's existing
 * dev shortcut into wizard_trials at (27,6) — a plain grass tile with nothing else
 * on it. mapLocation triggers need no map-file edits at all (see
 * utils/interactions/providers/mapLocation.ts and MiniGameLocationIndicators.tsx,
 * which render the bobbing icon/tooltip purely from this coordinate), so
 * debugNPCs.ts itself is untouched.
 *
 * TODO: once the Strength Trial's exit flow is designed, relocate this trigger to
 * the Strength Trial chamber (maps/definitions/strengthTrial.ts) — a one-line
 * coordinate change here, nothing else.
 */
export const testOfAgilityDefinition: MiniGameDefinition = {
  id: 'test-of-agility',
  displayName: 'Test of Agility',
  description: 'Steer the runaway mine cart through the tunnels, dodging crystal outcrops.',
  icon: '🛤️',
  colour: '#7c3aed',
  component: MineCartGame,
  triggers: {
    mapLocation: { mapId: 'debug_npcs', x: 27, y: 8 },
  },
  confirmMessage: 'Board the runaway mine cart?',
  customBackdrop: true,
};
