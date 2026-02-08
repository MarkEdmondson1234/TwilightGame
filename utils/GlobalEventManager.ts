/**
 * GlobalEventManager - Manages shared world events across all players
 *
 * Caches global events from Firebase and exposes them synchronously
 * for dialogue filtering. Publishes collaborative milestone events
 * when players complete quests, make discoveries, etc.
 *
 * Gracefully degrades when offline (returns empty data via safe.ts stubs).
 */

import type { SharedWorldEvent, SharedEventType } from '../firebase/types';
import { getSharedDataService } from '../firebase/safe';
import { eventBus, GameEvent } from './EventBus';

// ============================================
// Constants
// ============================================

/** How long to cache events before re-fetching (5 minutes) */
const CACHE_TTL_MS = 5 * 60 * 1000;

/** Max events to fetch per refresh */
const MAX_EVENTS_PER_FETCH = 50;

// ============================================
// Quest ID to display name mapping
// ============================================

const QUEST_DISPLAY_NAMES: Record<string, string> = {
  gardening_quest: 'the village garden',
  witch_garden_quest: "the witch's garden",
  althea_chores: "Althea's chores",
  fairy_queen_quest: 'the Fairy Queen',
  fairy_bluebells_quest: 'the fairy bluebells',
};

// ============================================
// GlobalEventManager Class
// ============================================

class GlobalEventManager {
  private cachedEvents: SharedWorldEvent[] = [];
  private lastFetch: number = 0;
  private isInitialised = false;
  private unsubscribeQuest: (() => void) | null = null;

  /**
   * Initialise the manager - fetch initial events and subscribe to quest completions
   */
  async initialise(): Promise<void> {
    if (this.isInitialised) return;
    this.isInitialised = true;

    // Fetch initial events (non-blocking)
    this.refresh().catch((err) => {
      console.warn('[GlobalEventManager] Initial fetch failed:', err);
    });

    // Subscribe to quest completions to auto-publish achievement events
    this.unsubscribeQuest = eventBus.on(GameEvent.QUEST_COMPLETED, ({ questId }) => {
      const questName = QUEST_DISPLAY_NAMES[questId] || questId;
      this.publishEvent(
        'achievement',
        `Quest completed: ${questName}`,
        `completed ${questName}`
      ).catch((err) => {
        console.warn('[GlobalEventManager] Failed to publish quest completion:', err);
      });
    });

    console.log('[GlobalEventManager] Initialised');
  }

  /**
   * Clean up subscriptions
   */
  destroy(): void {
    if (this.unsubscribeQuest) {
      this.unsubscribeQuest();
      this.unsubscribeQuest = null;
    }
    this.isInitialised = false;
  }

  /**
   * Refresh cached events from Firebase (if cache has expired)
   */
  async refresh(): Promise<void> {
    const now = Date.now();
    if (now - this.lastFetch < CACHE_TTL_MS) return;

    try {
      const shared = getSharedDataService();
      const events = await shared.getWorldEvents(undefined, MAX_EVENTS_PER_FETCH);
      this.cachedEvents = events;
      this.lastFetch = now;

      // Notify subscribers that events have been updated
      const types = [...new Set(events.map((e) => e.eventType))];
      eventBus.emit(GameEvent.GLOBAL_EVENTS_UPDATED, {
        eventCount: events.length,
        types,
      });

      if (events.length > 0) {
        console.log(`[GlobalEventManager] Cached ${events.length} global events`);
      }
    } catch (error) {
      console.warn('[GlobalEventManager] Failed to fetch events:', error);
    }
  }

  /**
   * Force refresh (ignores cache TTL)
   */
  async forceRefresh(): Promise<void> {
    this.lastFetch = 0;
    await this.refresh();
  }

  /**
   * Get cached events, optionally filtered by type (synchronous for dialogue filtering)
   */
  getEvents(type?: SharedEventType): SharedWorldEvent[] {
    if (!type) return this.cachedEvents;
    return this.cachedEvents.filter((e) => e.eventType === type);
  }

  /**
   * Check if any event of a given type exists (for dialogue conditions)
   */
  hasEventOfType(type: SharedEventType): boolean {
    return this.cachedEvents.some((e) => e.eventType === type);
  }

  /**
   * Count events of a given type (for community milestones)
   */
  getEventCount(type?: SharedEventType): number {
    if (!type) return this.cachedEvents.length;
    return this.cachedEvents.filter((e) => e.eventType === type).length;
  }

  /**
   * Get human-readable descriptions of recent events (for AI dialogue context)
   */
  getRecentDescriptions(maxCount: number = 5): string[] {
    return this.cachedEvents.slice(0, maxCount).map((e) => {
      const who = e.contributorName || 'A traveller';
      return `${who} ${e.description}`;
    });
  }

  /**
   * Publish a new global event to Firebase
   */
  async publishEvent(
    eventType: SharedEventType,
    title: string,
    description: string,
    location?: { mapId: string; mapName: string },
    metadata?: Record<string, unknown>
  ): Promise<boolean> {
    try {
      const shared = getSharedDataService();
      const result = await shared.addWorldEvent(eventType, title, description, location, metadata);

      if (result) {
        console.log(`[GlobalEventManager] Published event: ${title}`);
        // Force refresh to include our own event in the cache
        await this.forceRefresh();
      }

      return !!result;
    } catch (error) {
      console.warn('[GlobalEventManager] Failed to publish event:', error);
      return false;
    }
  }
}

// ============================================
// Singleton Export
// ============================================

export const globalEventManager = new GlobalEventManager();
