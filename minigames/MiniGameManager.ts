/**
 * Mini-Game Manager
 *
 * Singleton manager that handles:
 * - Checking requirements before a mini-game opens
 * - Consuming items on start
 * - Processing results (rewards, progress) on completion
 * - Namespaced localStorage persistence per mini-game
 */

import { getMiniGame } from './registry';
import type { MiniGameResult } from './types';
import { inventoryManager } from '../utils/inventoryManager';
import { gameState } from '../GameState';
import { friendshipManager } from '../utils/FriendshipManager';
import { TimeManager } from '../utils/TimeManager';
import { getItem } from '../data/items';

const STORAGE_PREFIX = 'twilight_minigame_';

class MiniGameManagerClass {
  /**
   * Check if a mini-game's requirements are met.
   */
  checkRequirements(gameId: string): { canPlay: true } | { canPlay: false; reason: string } {
    const def = getMiniGame(gameId);
    if (!def) return { canPlay: false, reason: 'Unknown mini-game.' };

    // Check availability (season, time)
    if (def.availability) {
      const time = TimeManager.getCurrentTime();

      if (def.availability.seasons && def.availability.seasons.length > 0) {
        const currentSeason = time.season.toLowerCase() as
          | 'spring'
          | 'summer'
          | 'autumn'
          | 'winter';
        if (!def.availability.seasons.includes(currentSeason)) {
          return {
            canPlay: false,
            reason: `Only available in ${def.availability.seasons.join(', ')}.`,
          };
        }
      }

      if (def.availability.timeOfDay) {
        const isDay = time.timeOfDay === 'Day' || time.timeOfDay === 'Dawn';
        const wantDay = def.availability.timeOfDay === 'day';
        if (isDay !== wantDay) {
          return {
            canPlay: false,
            reason: `Only available during the ${def.availability.timeOfDay}.`,
          };
        }
      }

      if (def.availability.minFriendship) {
        const { npcId, level } = def.availability.minFriendship;
        const currentLevel = friendshipManager.getFriendshipLevel(npcId);
        if (currentLevel < level) {
          return {
            canPlay: false,
            reason: `Requires friendship level ${level} with this character.`,
          };
        }
      }
    }

    // Check item requirements (onStart items only)
    if (def.requirements) {
      for (const req of def.requirements) {
        if (req.consumeOn === 'onStart') {
          if (!inventoryManager.hasItem(req.itemId, req.quantity)) {
            const item = getItem(req.itemId);
            const name = item?.displayName ?? req.itemId;
            return {
              canPlay: false,
              reason: `Requires ${req.quantity}x ${name}.`,
            };
          }
        }
      }
    }

    return { canPlay: true };
  }

  /**
   * Consume onStart requirements. Call when the mini-game actually opens.
   */
  consumeStartRequirements(gameId: string): boolean {
    const def = getMiniGame(gameId);
    if (!def?.requirements) return true;

    for (const req of def.requirements) {
      if (req.consumeOn === 'onStart') {
        inventoryManager.removeItem(req.itemId, req.quantity);
      }
    }
    return true;
  }

  /**
   * Process a mini-game result: distribute rewards, consume onComplete items, save progress.
   */
  processResult(gameId: string, result: MiniGameResult): void {
    const def = getMiniGame(gameId);
    if (!def) return;

    if (result.success) {
      // Consume onComplete requirements
      if (def.requirements) {
        for (const req of def.requirements) {
          if (req.consumeOn === 'onComplete') {
            inventoryManager.removeItem(req.itemId, req.quantity);
          }
        }
      }

      // Grant item rewards
      if (result.rewards) {
        for (const reward of result.rewards) {
          inventoryManager.addItem(reward.itemId, reward.quantity);
        }
      }

      // Grant gold reward
      if (result.goldReward && result.goldReward > 0) {
        gameState.addGold(result.goldReward);
      }

      // Grant friendship rewards
      if (result.friendshipRewards) {
        for (const fr of result.friendshipRewards) {
          friendshipManager.addPoints(fr.npcId, fr.points, `mini-game: ${gameId}`);
        }
      }
    }

    // Save progress data if provided (regardless of success)
    if (result.progressData) {
      const existing = this.loadProgress(gameId) ?? {};
      this.saveProgress(gameId, { ...existing, ...result.progressData });
    }
  }

  /** Load saved progress for a mini-game. */
  loadProgress<T = Record<string, unknown>>(gameId: string): T | null {
    try {
      const raw = localStorage.getItem(`${STORAGE_PREFIX}${gameId}`);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  }

  /** Save progress for a mini-game. */
  saveProgress<T>(gameId: string, data: T): void {
    try {
      localStorage.setItem(`${STORAGE_PREFIX}${gameId}`, JSON.stringify(data));
    } catch (error) {
      console.error(`[MiniGameManager] Failed to save progress for ${gameId}:`, error);
    }
  }

  /** Clear saved progress for a mini-game. */
  clearProgress(gameId: string): void {
    localStorage.removeItem(`${STORAGE_PREFIX}${gameId}`);
  }
}

export const miniGameManager = new MiniGameManagerClass();
