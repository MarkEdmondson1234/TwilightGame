/**
 * Event Chain Types
 *
 * TypeScript types for the YAML-based event chain system.
 * Event chains are branching narrative sequences that create
 * global events and inject NPC dialogue based on player choices.
 */

import type { SharedEventType } from '../firebase/types';
import type { FriendshipTier } from '../types/npc';

// ============================================
// YAML Schema Types (what authors write)
// ============================================

/** Root structure of a YAML event chain file */
export interface EventChainDefinition {
  id: string;
  title: string;
  description: string;
  type: SharedEventType;
  trigger: ChainTrigger;
  stages: ChainStage[];
}

/** How a chain gets activated */
export interface ChainTrigger {
  type: 'manual' | 'event_count' | 'quest_complete' | 'seasonal' | 'friendship' | 'tile';
  /** For event_count: which event type to count */
  eventType?: SharedEventType;
  /** For event_count: minimum count required */
  minCount?: number;
  /** For quest_complete: which quest must be done */
  questId?: string;
  /** For seasonal: which season triggers it */
  season?: string;
  /** For friendship: which NPC and tier */
  npcId?: string;
  tier?: FriendshipTier;
  /** For tile: map and position that triggers the chain */
  mapId?: string;
  tileX?: number;
  tileY?: number;
  /** For tile: proximity radius (default 1.5) */
  radius?: number;
}

/** A single stage in the chain */
export interface ChainStage {
  id: string;
  text: string;
  /** Explicit numeric stage number for backward compatibility with dialogue trees */
  stageNumber?: number;
  /** Optional global event published when entering this stage */
  event?: ChainEvent;
  /** Optional NPC dialogue injected during this stage */
  dialogue?: Record<string, ChainDialogue>;
  /** Player choices (makes this a branching point) */
  choices?: ChainChoice[];
  /** Auto-advance to this stage (for linear progression) */
  next?: string;
  /** Wait this many game days before auto-advancing */
  waitDays?: number;
  /** Items rewarded when reaching this stage */
  rewards?: ChainReward[];
  /** Objective the player must complete to advance (e.g. go to a location) */
  objective?: ChainObjective;
  /** Marks this stage as the end of the chain */
  end?: boolean;
}

/** An objective the player must complete to advance a stage */
export interface ChainObjective {
  type: 'go_to';
  mapId: string;
  tileX: number;
  tileY: number;
  /** Proximity radius (default 1.5) */
  radius?: number;
  /** Hint text shown to the player, e.g. "Go to the village well" */
  hint?: string;
}

/** Global event published by a stage */
export interface ChainEvent {
  title: string;
  description: string;
  contributor: string;
  location?: { mapId: string; mapName: string };
}

/** Dialogue injected into an NPC during a stage */
export interface ChainDialogue {
  text: string;
  expression?: string;
}

/** A player choice at a branching point */
export interface ChainChoice {
  text: string;
  next: string;
  /** Optional event published when choosing this option */
  event?: ChainEvent;
  /** Requirements to see this choice */
  requires?: ChainRequirement;
}

/** Requirements for a choice to be available */
export interface ChainRequirement {
  quest?: string;
  questCompleted?: string;
  friendshipTier?: { npcId: string; tier: FriendshipTier };
  item?: string;
}

/** Item reward */
export interface ChainReward {
  item: string;
  quantity: number;
}

// ============================================
// Runtime State Types (tracking progress)
// ============================================

/** Saved progress through an event chain */
export interface EventChainProgress {
  chainId: string;
  currentStageId: string;
  startedDay: number;
  stageEnteredDay: number;
  choicesMade: Record<string, string>;
  completed: boolean;
  /** Quest-specific data stored by TypeScript handlers (cobwebs cleaned, crops grown, etc.) */
  metadata?: Record<string, unknown>;
}

/** Parsed and validated chain ready for use */
export interface LoadedEventChain {
  definition: EventChainDefinition;
  /** Map of stage ID to stage for quick lookup */
  stageMap: Map<string, ChainStage>;
}
