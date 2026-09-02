/**
 * Other players — wave, emote, or say something to them.
 *
 * Registered in ../registry.ts. See ../README.md for how to add a new provider.
 *
 * Clicking another player used to do nothing but walk towards them: the shared world let
 * you *see* each other and nothing else, unless you already knew that T opens the emote
 * wheel and that the chat button at the edge of the screen exists. This puts both on the
 * person you are trying to talk to.
 *
 * Context-menu only. A left-click near another player must keep meaning "walk there" —
 * players stand on doors, farm plots and shop counters, and stealing those clicks because
 * someone wandered past would be worse than the problem this solves.
 *
 * Inert without multiplayer: `getRemotePlayers()` is empty when presence is disabled, so
 * no gate on MULTIPLAYER_ENABLED is needed here.
 */

import type { AvailableInteraction, InteractionContext } from '../types';
import { MULTIPLAYER } from '../../../constants';
import { remotePlayerManager } from '../../../multiplayer/RemotePlayerManager';

export function remotePlayerProvider(ctx: InteractionContext): AvailableInteraction[] {
  const { position, isContextMenu, onEmote, onOpenEmoteWheel, onStartChat } = ctx;

  if (!isContextMenu) return [];

  // Nearest player within reach — two people standing together should not produce two
  // sets of options with no way to tell which is which.
  let nearest: { name: string; distance: number } | null = null;
  for (const player of remotePlayerManager.getRemotePlayers()) {
    const distance = Math.hypot(player.position.x - position.x, player.position.y - position.y);
    if (distance > MULTIPLAYER.PLAYER_CLICK_RADIUS_TILES) continue;
    if (!nearest || distance < nearest.distance) nearest = { name: player.name, distance };
  }
  if (!nearest) return [];

  const interactions: AvailableInteraction[] = [];
  const { name } = nearest;

  // Naming them is the point: it confirms you have the right person before you act, which
  // a bare "Wave" does not when two players overlap.
  if (onEmote) {
    interactions.push({
      type: 'player_wave',
      label: `Wave at ${name}`,
      icon: '👋',
      color: '#fbbf24',
      execute: () => onEmote('wave'),
    });
  }

  if (onOpenEmoteWheel) {
    interactions.push({
      type: 'player_emote',
      label: 'Other Emotes',
      icon: '😄',
      color: '#f472b6',
      execute: onOpenEmoteWheel,
    });
  }

  if (onStartChat) {
    interactions.push({
      type: 'player_chat',
      label: `Say Something`,
      icon: '💬',
      color: '#60a5fa',
      execute: onStartChat,
    });
  }

  return interactions;
}
