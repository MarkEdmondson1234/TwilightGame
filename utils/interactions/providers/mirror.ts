/**
 * Mirrors — open the character creator.
 *
 * Registered in ../registry.ts. See ../README.md for how to add a new provider.
 */

import type { AvailableInteraction, InteractionContext } from '../types';
import { checkMirrorInteraction } from '../../actionHandlers';

export function mirrorProvider(ctx: InteractionContext): AvailableInteraction[] {
  const { position, onMirror } = ctx;
  const interactions: AvailableInteraction[] = [];

  // Check for mirror interaction
  if (checkMirrorInteraction(position)) {
    interactions.push({
      type: 'mirror',
      label: 'Customise Character',
      icon: '🪞',
      color: '#a78bfa',
      execute: () => onMirror?.(),
    });
  }

  return interactions;
}
