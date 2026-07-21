/**
 * NPCs — talk, give a gift, or start an NPC-linked mini-game.
 *
 * Registered in ../registry.ts. See ../README.md for how to add a new provider.
 */

import type { AvailableInteraction, InteractionContext } from '../types';
import { TimeManager } from '../../TimeManager';
import { gameState } from '../../../GameState';
import { getMiniGamesForNPC } from '../../../minigames/registry';
import { inventoryManager } from '../../inventoryManager';
import { miniGameManager } from '../../../minigames/MiniGameManager';
import { npcManager } from '../../../NPCManager';
import { checkNPCInteraction } from '../../actionHandlers';

export function npcProvider(ctx: InteractionContext): AvailableInteraction[] {
  const { position, onNPC, onGiveGift, onCollectResource } = ctx;
  const config = ctx;
  const interactions: AvailableInteraction[] = [];

  // Check for NPC interaction
  const npcId = checkNPCInteraction(position);
  if (npcId) {
    const npc = npcManager.getNPCAtPosition(position);
    interactions.push({
      type: 'npc',
      label: `Talk to ${npc?.name || 'NPC'}`,
      icon: '💬',
      color: '#60a5fa',
      data: { npcId },
      execute: () => onNPC?.(npcId),
    });

    // Give Gift option (for NPCs that can be befriended)
    if (npc?.friendshipConfig?.canBefriend && onGiveGift) {
      interactions.push({
        type: 'give_gift',
        label: 'Give Gift',
        icon: '🎁',
        color: '#ec4899',
        data: { npcId },
        execute: () => onGiveGift(npcId),
      });
    }

    // Check for daily resource collection (e.g., milk from cow)
    if (npc?.dailyResource && onCollectResource) {
      const { itemId, maxPerDay, collectMessage, emptyMessage } = npc.dailyResource;
      const currentDay = TimeManager.getCurrentTime().totalDays;
      const remaining = gameState.getResourceCollectionsRemaining(npcId, maxPerDay, currentDay);

      if (remaining > 0) {
        interactions.push({
          type: 'collect_resource',
          label: `Collect Milk (${remaining} left)`,
          icon: '🥛',
          color: '#f5f5f5',
          data: { npcId, itemId },
          execute: () => {
            // Add item to inventory
            inventoryManager.addItem(itemId, 1);
            // Record the collection
            gameState.recordResourceCollection(npcId, currentDay);
            // Notify the handler
            onCollectResource({ success: true, message: collectMessage, itemId });
          },
        });
      } else {
        // Show disabled option when limit reached
        interactions.push({
          type: 'collect_resource',
          label: 'No Milk Available',
          icon: '🥛',
          color: '#9ca3af',
          data: { npcId, itemId },
          execute: () => {
            onCollectResource({ success: false, message: emptyMessage });
          },
        });
      }
    }

    // NPC-triggered mini-games (registry-based) — check by exact ID and by name match
    if (config.onOpenMiniGame) {
      const byId = getMiniGamesForNPC(npcId);
      const seen = new Set<string>();
      const npcMiniGames = [...byId].filter((mg) => {
        if (seen.has(mg.id)) return false;
        seen.add(mg.id);
        return true;
      });
      for (const mg of npcMiniGames) {
        const check = miniGameManager.checkRequirements(mg.id);
        if (check.canPlay) {
          interactions.push({
            type: 'open_mini_game',
            label: mg.displayName,
            icon: mg.icon,
            color: mg.colour,
            data: { miniGameId: mg.id, npcId },
            execute: () => {
              miniGameManager.consumeStartRequirements(mg.id);
              config.onOpenMiniGame!(mg.id, {
                triggerType: 'npc',
                position,
                npcId,
                extra: {
                  npcName: npc?.name,
                  npcSprite: npc?.portraitSprite || npc?.dialogueSprite || npc?.sprite,
                },
              });
            },
          });
        }
      }
    }
  }

  return interactions;
}
