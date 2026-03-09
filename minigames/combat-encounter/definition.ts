/**
 * Combat Encounter — Mini-Game Definitions
 *
 * Two definitions sharing the same component, one per antagonist type.
 * Uses npcNameMatch for dynamic NPC IDs (e.g. goblin_depth_5_12345).
 */

import type { MiniGameDefinition } from '../types';
import CombatEncounter from './CombatEncounter';

export const goblinCombatDefinition: MiniGameDefinition = {
  id: 'combat-encounter-goblin',
  displayName: 'Confront',
  description: 'Stand your ground against the goblin!',
  icon: '\u2694\uFE0F',
  colour: '#8b4513',
  component: CombatEncounter,
  triggers: {
    npcNameMatch: 'Goblin',
  },
  customBackdrop: true,
};

export const umbraWolfCombatDefinition: MiniGameDefinition = {
  id: 'combat-encounter-wolf',
  displayName: 'Confront',
  description: 'Face the Umbra Wolf!',
  icon: '\u2694\uFE0F',
  colour: '#4a3060',
  component: CombatEncounter,
  triggers: {
    npcNameMatch: 'Umbra Wolf',
  },
  customBackdrop: true,
};
