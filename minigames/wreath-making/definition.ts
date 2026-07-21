/**
 * Wreath Making mini-game definition.
 *
 * Slot-based crafting where players arrange collected flowers into a wreath.
 * Triggered by talking to Mushra in the forest.
 * Available all year round.
 */

import type { MiniGameDefinition } from '../types';
import { WreathMakingGame } from './WreathMakingGame';

export const wreathMakingDefinition: MiniGameDefinition = {
  id: 'wreath-making',
  displayName: 'Make a Wreath',
  description: 'Arrange flowers into a beautiful wreath with Mushra.',
  icon: '🌿',
  colour: '#6b8e5a',
  component: WreathMakingGame,
  triggers: {
    // 'mushra' is the Mushra in the mushroom forest (maps/definitions/mushroomMap.ts).
    // This previously read 'forest_mushra', which no map declares — so the NPC route was
    // silently dead and only the placed crafting table opened this game.
    npcId: 'mushra',
    placedItemId: 'crafting_table',
  },
  customBackdrop: false,
};
