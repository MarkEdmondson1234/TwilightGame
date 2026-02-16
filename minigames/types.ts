/**
 * Mini-Game Plugin System — Type Definitions
 *
 * All interfaces for the mini-game plugin architecture.
 * Mini-games implement MiniGameComponentProps and export a MiniGameDefinition.
 */

import type { ComponentType } from 'react';
import type { Position } from '../types/core';
import type { GameTime } from '../utils/TimeManager';
import type { GameEvent, EventPayloads } from '../utils/EventBus';

// =============================================================================
// Trigger & Availability
// =============================================================================

/**
 * How a mini-game can be triggered.
 * Multiple trigger types can apply to the same game.
 */
export interface MiniGameTrigger {
  /** Triggered by interacting with a placed item (e.g. 'easel', 'carving_table') */
  placedItemId?: string;
  /** Triggered by talking to a specific NPC */
  npcId?: string;
  /** Triggered by using an inventory item */
  inventoryItemId?: string;
  /** Triggered by a quest reaching a certain stage */
  questTrigger?: { questId: string; stage: number };
  /** Triggered by a specific map location (tile coordinates) */
  mapLocation?: { mapId: string; x: number; y: number };
}

/**
 * Items required to start or complete the mini-game.
 */
export interface MiniGameItemRequirement {
  itemId: string;
  quantity: number;
  /** When to consume: 'onStart' removes items when opening, 'onComplete' on success */
  consumeOn: 'onStart' | 'onComplete';
}

/**
 * Seasonal/time availability constraints.
 */
export interface MiniGameAvailability {
  /** Which seasons this game is available in (empty/undefined = all) */
  seasons?: Array<'spring' | 'summer' | 'autumn' | 'winter'>;
  /** Time of day restriction (undefined = any time) */
  timeOfDay?: 'day' | 'night';
  /** Minimum friendship level with a specific NPC */
  minFriendship?: { npcId: string; level: number };
}

// =============================================================================
// Definition — what each mini-game declares about itself
// =============================================================================

/**
 * The complete definition of a mini-game.
 * Each mini-game exports one of these from its definition.ts file.
 */
export interface MiniGameDefinition {
  /** Unique identifier (kebab-case, e.g. 'pumpkin-carving') */
  id: string;

  /** Display name shown in radial menu / UI (British English) */
  displayName: string;

  /** Short description for tooltips */
  description: string;

  /** Icon emoji for radial menu */
  icon: string;

  /** Colour for radial menu option (hex string) */
  colour: string;

  /** The React component that renders this mini-game */
  component: ComponentType<MiniGameComponentProps>;

  /** How this mini-game can be triggered */
  triggers: MiniGameTrigger;

  /** Items required to play (optional) */
  requirements?: MiniGameItemRequirement[];

  /** Seasonal/time availability (optional, default = always available) */
  availability?: MiniGameAvailability;

  /**
   * If true, the component manages its own full-screen backdrop/positioning.
   * If false (default), MiniGameHost renders a standard dark backdrop.
   */
  customBackdrop?: boolean;
}

// =============================================================================
// Context — what the system provides to each mini-game component
// =============================================================================

/**
 * Read-only snapshot of relevant game state.
 */
export interface MiniGameGameState {
  /** Current in-game time */
  time: GameTime;
  /** Player's current gold */
  gold: number;
  /** Current map ID */
  currentMapId: string;
  /** Player position when mini-game was opened */
  playerPosition: Position;
}

/**
 * Actions a mini-game can perform to affect the main game.
 * These wrap the internal managers so mini-games don't need direct imports.
 */
export interface MiniGameActions {
  /** Show a toast notification */
  showToast: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;

  /** Add an item to the player's inventory */
  addItem: (itemId: string, quantity?: number) => boolean;

  /** Remove an item from the player's inventory */
  removeItem: (itemId: string, quantity?: number) => boolean;

  /** Check if player has a specific item */
  hasItem: (itemId: string, quantity?: number) => boolean;

  /** Get quantity of an item in inventory */
  getItemQuantity: (itemId: string) => number;

  /** Add gold */
  addGold: (amount: number) => void;

  /** Spend gold (returns false if insufficient) */
  spendGold: (amount: number) => boolean;

  /** Add friendship points with an NPC */
  addFriendshipPoints: (npcId: string, points: number) => void;

  /** Get friendship level with an NPC */
  getFriendshipLevel: (npcId: string) => number;

  /** Play a sound effect */
  playSfx: (sfxId: string) => void;

  /** Emit a game event via EventBus */
  emitEvent: <E extends GameEvent>(event: E, payload: EventPayloads[E]) => void;
}

/**
 * Persistence API for mini-game progress.
 * Each mini-game gets its own namespaced storage.
 */
export interface MiniGameStorage {
  /** Load saved progress (returns null if no saved data) */
  load: <T>() => T | null;

  /** Save progress (automatically namespaced by mini-game ID) */
  save: <T>(data: T) => void;

  /** Clear all saved progress */
  clear: () => void;
}

/**
 * Data about how/where the mini-game was triggered.
 */
export interface MiniGameTriggerData {
  /** What triggered the mini-game */
  triggerType: 'placedItem' | 'npc' | 'tile' | 'inventory' | 'quest' | 'mapLocation' | 'direct';
  /** Position where interaction happened */
  position?: Position;
  /** NPC ID if triggered by NPC */
  npcId?: string;
  /** Item ID if triggered by placed/inventory item */
  itemId?: string;
  /** Arbitrary extra data from the trigger */
  extra?: Record<string, unknown>;
}

/**
 * The full context passed to every mini-game component.
 */
export interface MiniGameContext {
  /** Read-only game state snapshot */
  gameState: MiniGameGameState;
  /** Actions to affect game state */
  actions: MiniGameActions;
  /** Namespaced persistence for this mini-game's progress */
  storage: MiniGameStorage;
  /** Data passed when the mini-game was triggered */
  triggerData: MiniGameTriggerData;
}

// =============================================================================
// Component Props & Result
// =============================================================================

/**
 * Props passed to every mini-game component by MiniGameHost.
 */
export interface MiniGameComponentProps {
  /** Full context with game state, actions, and storage */
  context: MiniGameContext;
  /** Call to close the mini-game without a result */
  onClose: () => void;
  /** Call to complete the mini-game with a result */
  onComplete: (result: MiniGameResult) => void;
}

/**
 * Result returned when a mini-game completes.
 * MiniGameManager processes this to distribute rewards.
 */
export interface MiniGameResult {
  /** Whether the player succeeded */
  success: boolean;

  /** Optional score (game-specific meaning) */
  score?: number;

  /** Items to award */
  rewards?: Array<{
    itemId: string;
    quantity: number;
  }>;

  /** Gold to award */
  goldReward?: number;

  /** Friendship points to award */
  friendshipRewards?: Array<{
    npcId: string;
    points: number;
  }>;

  /** Toast message to show after closing */
  message?: string;

  /** Message type for the toast */
  messageType?: 'info' | 'success' | 'warning' | 'error';

  /** Arbitrary data to persist in mini-game progress */
  progressData?: Record<string, unknown>;
}
