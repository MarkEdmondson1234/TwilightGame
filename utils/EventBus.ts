/**
 * EventBus - Central event system for game state changes
 *
 * Provides a type-safe pub/sub system to decouple managers from React components.
 * Managers emit events when state changes, React components subscribe to update.
 *
 * Usage:
 *   // Emit an event (in manager)
 *   eventBus.emit(GameEvent.FARM_PLOT_CHANGED, { position: { x: 5, y: 3 } });
 *
 *   // Subscribe to events (in React hook)
 *   useEffect(() => {
 *     return eventBus.on(GameEvent.FARM_PLOT_CHANGED, (payload) => {
 *       setFarmUpdateTrigger(prev => prev + 1);
 *     });
 *   }, []);
 */

import type { Position } from '../types';

// ============================================================================
// Event Types
// ============================================================================

/**
 * All game events that can be emitted through the EventBus
 */
export enum GameEvent {
  // Farm events
  FARM_PLOT_CHANGED = 'farm:plot_changed',
  FARM_CROP_GREW = 'farm:crop_grew',
  FARM_CROP_HARVESTED = 'farm:crop_harvested',

  // NPC events
  NPC_MOVED = 'npc:moved',
  NPC_SPAWNED = 'npc:spawned',
  NPC_DESPAWNED = 'npc:despawned',

  // Item events
  PLACED_ITEMS_CHANGED = 'items:placed_changed',
  INVENTORY_CHANGED = 'items:inventory_changed',

  // Player status events
  STAMINA_CHANGED = 'player:stamina_changed',

  // Environment events
  WEATHER_CHANGED = 'env:weather_changed',
  TIME_CHANGED = 'env:time_changed',

  // Quest events
  QUEST_STARTED = 'quest:started',
  QUEST_STAGE_CHANGED = 'quest:stage_changed',
  QUEST_COMPLETED = 'quest:completed',
  QUEST_DATA_CHANGED = 'quest:data_changed',

  // Friendship events
  FRIENDSHIP_REWARD = 'friendship:reward',

  // Decoration crafting events
  DECORATION_CRAFTED = 'decoration:crafted',
  PAINTING_CREATED = 'decoration:painting_created',
  PAINTING_DELETED = 'decoration:painting_deleted',

  // Global events (shared between all players via Firebase)
  GLOBAL_EVENTS_UPDATED = 'global:events_updated',

  // Event chain events (YAML-based branching narratives)
  EVENT_CHAIN_UPDATED = 'chain:updated',
  EVENT_CHAIN_CHOICE_REQUIRED = 'chain:choice_required',
  EVENT_CHAIN_OBJECTIVE_REACHED = 'chain:objective_reached',

  // Magic events
  MAGIC_LEVEL_UP = 'magic:level_up',

  // Save events
  LOCAL_SAVE_FLUSHED = 'save:local_flushed',
  CLOUD_SYNC_STARTED = 'save:cloud_sync_started',
  CLOUD_SYNC_COMPLETED = 'save:cloud_sync_completed',
}

// ============================================================================
// Event Payloads (Type-Safe)
// ============================================================================

/**
 * Type-safe payload definitions for each event
 */
export interface EventPayloads {
  [GameEvent.FARM_PLOT_CHANGED]: {
    position?: Position;
    action?: 'till' | 'plant' | 'water' | 'harvest' | 'clear' | 'wilt' | 'die';
  };
  [GameEvent.FARM_CROP_GREW]: {
    position: Position;
    stage: number;
  };
  [GameEvent.FARM_CROP_HARVESTED]: {
    mapId: string;
    cropId: string;
    position: Position;
  };
  [GameEvent.NPC_MOVED]: {
    npcId: string;
    position?: Position;
  };
  [GameEvent.NPC_SPAWNED]: {
    npcId: string;
    mapId: string;
  };
  [GameEvent.NPC_DESPAWNED]: {
    npcId: string;
    mapId: string;
  };
  [GameEvent.PLACED_ITEMS_CHANGED]: {
    mapId: string;
    action?: 'add' | 'remove' | 'update';
  };
  [GameEvent.INVENTORY_CHANGED]: {
    action: 'add' | 'remove' | 'update';
    itemId?: string;
  };
  [GameEvent.STAMINA_CHANGED]: {
    value: number;
    maxValue: number;
  };
  [GameEvent.WEATHER_CHANGED]: {
    weather: string;
    mapId: string;
  };
  [GameEvent.TIME_CHANGED]: {
    hour: number;
    timeOfDay: 'day' | 'night';
  };
  [GameEvent.QUEST_STARTED]: {
    questId: string;
  };
  [GameEvent.QUEST_STAGE_CHANGED]: {
    questId: string;
    stage: number;
    previousStage: number;
  };
  [GameEvent.QUEST_COMPLETED]: {
    questId: string;
  };
  [GameEvent.QUEST_DATA_CHANGED]: {
    questId: string;
    key: string;
    value: unknown;
  };
  [GameEvent.FRIENDSHIP_REWARD]: {
    npcId: string;
    npcName: string;
    tier: string;
    items: Array<{ itemId: string; displayName: string; quantity: number }>;
  };
  [GameEvent.DECORATION_CRAFTED]: {
    recipeId: string;
    resultItemId: string;
    category: string;
  };
  [GameEvent.PAINTING_CREATED]: {
    paintingId: string;
  };
  [GameEvent.PAINTING_DELETED]: {
    paintingId: string;
  };
  [GameEvent.GLOBAL_EVENTS_UPDATED]: {
    eventCount: number;
    types: string[];
  };
  [GameEvent.EVENT_CHAIN_UPDATED]: {
    chainId: string;
    stageId: string;
    action: 'started' | 'advanced' | 'completed' | 'reset';
  };
  [GameEvent.EVENT_CHAIN_CHOICE_REQUIRED]: {
    chainId: string;
    stageId: string;
    stageText: string;
    choices: Array<{ text: string; next: string }>;
  };
  [GameEvent.EVENT_CHAIN_OBJECTIVE_REACHED]: {
    chainId: string;
    stageId: string;
  };
  [GameEvent.MAGIC_LEVEL_UP]: {
    previousLevel: 'novice' | 'journeyman' | 'master';
    newLevel: 'novice' | 'journeyman' | 'master';
  };
  [GameEvent.LOCAL_SAVE_FLUSHED]: {
    timestamp: number;
  };
  [GameEvent.CLOUD_SYNC_STARTED]: Record<string, never>;
  [GameEvent.CLOUD_SYNC_COMPLETED]: {
    success: boolean;
  };
}

// ============================================================================
// Event Handler Type
// ============================================================================

type EventHandler<E extends GameEvent> = (payload: EventPayloads[E]) => void;

// ============================================================================
// EventBus Class
// ============================================================================

class EventBus {
  private listeners = new Map<GameEvent, Set<EventHandler<GameEvent>>>();
  private debugEnabled = false;

  /**
   * Enable or disable debug logging for all events
   */
  setDebug(enabled: boolean): void {
    this.debugEnabled = enabled;
    if (enabled) {
      console.log('[EventBus] Debug mode enabled');
    }
  }

  /**
   * Emit an event with a type-safe payload
   */
  emit<E extends GameEvent>(event: E, payload: EventPayloads[E]): void {
    if (this.debugEnabled) {
      console.log(`[EventBus] ${event}`, payload);
    }

    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(payload);
        } catch (error) {
          console.error(`[EventBus] Error in handler for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Subscribe to an event with a type-safe handler
   * Returns an unsubscribe function
   */
  on<E extends GameEvent>(event: E, handler: EventHandler<E>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }

    const handlers = this.listeners.get(event)!;
    handlers.add(handler as EventHandler<GameEvent>);

    if (this.debugEnabled) {
      console.log(`[EventBus] Subscribed to ${event} (${handlers.size} listeners)`);
    }

    // Return unsubscribe function
    return () => {
      handlers.delete(handler as EventHandler<GameEvent>);
      if (this.debugEnabled) {
        console.log(`[EventBus] Unsubscribed from ${event} (${handlers.size} listeners)`);
      }
    };
  }

  /**
   * Remove a specific handler from an event
   */
  off<E extends GameEvent>(event: E, handler: EventHandler<E>): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.delete(handler as EventHandler<GameEvent>);
    }
  }

  /**
   * Remove all handlers for an event (use with caution)
   */
  clear(event?: GameEvent): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }

  /**
   * Get the number of listeners for an event (for debugging)
   */
  listenerCount(event: GameEvent): number {
    return this.listeners.get(event)?.size ?? 0;
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const eventBus = new EventBus();

// Initialize debug mode from constants
import { DEBUG } from '../constants';
eventBus.setDebug(DEBUG.EVENTS);
