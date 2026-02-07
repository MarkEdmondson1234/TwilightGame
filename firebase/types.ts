/**
 * Firebase Data Types
 *
 * TypeScript interfaces for Firestore documents and collections.
 * These map to the data model defined in FIREBASE_PERSISTENCE.md.
 */

import { Timestamp } from 'firebase/firestore';
import { CharacterCustomization } from '../GameState';
import { FarmPlot, NPCFriendship, PlacedItem, DeskContents } from '../types';

// ============================================
// User Profile
// ============================================

export interface UserProfile {
  displayName: string;
  email: string | null;
  createdAt: Timestamp;
  lastLoginAt: Timestamp;
  settings: UserSettings;
}

export interface UserSettings {
  musicVolume: number;
  sfxVolume: number;
  preferredLanguage: string;
}

// ============================================
// Save Slot
// ============================================

export interface SaveSlot {
  id: string;
  metadata: SaveMetadata;
}

export interface SaveMetadata {
  characterName: string;
  characterId: string;
  playTimeSeconds: number;
  lastSaved: Timestamp;
  currentMapId: string;
  gameDay: number;
  season: string;
  year: number;
  gold: number;
  version: string;
}

// ============================================
// Save Data Documents
// ============================================

export interface CharacterSaveData {
  customization: CharacterCustomization | null;
  position: { x: number; y: number };
  currentMapId: string;
  currentMapSeed?: number;
}

export interface InventorySaveData {
  items: Array<{ itemId: string; quantity: number }>;
  tools: string[];
  slotOrder?: string[];
}

export interface FarmingSaveData {
  plots: FarmPlot[];
  currentTool: 'hoe' | 'seeds' | 'wateringCan' | 'hand';
  selectedSeed: string | null;
}

export interface CookingSaveData {
  recipeBookUnlocked: boolean;
  unlockedRecipes: string[];
  recipeProgress: Record<
    string,
    {
      recipeId: string;
      timesCooked: number;
      isMastered: boolean;
      unlockedAt: number;
    }
  >;
}

export interface MagicSaveData {
  magicBookUnlocked: boolean;
  currentLevel: 'novice' | 'journeyman' | 'master';
  unlockedRecipes: string[];
  recipeProgress: Record<
    string,
    {
      recipeId: string;
      timesBrewed: number;
      isMastered: boolean;
      unlockedAt: number;
    }
  >;
}

export interface FriendshipsSaveData {
  npcFriendships: NPCFriendship[];
}

export interface QuestsSaveData {
  [questId: string]: {
    started: boolean;
    completed: boolean;
    stage: number;
    data: Record<string, unknown>;
  };
}

export interface WorldSaveData {
  weather: 'clear' | 'rain' | 'snow' | 'fog' | 'mist' | 'storm' | 'cherry_blossoms';
  automaticWeather: boolean;
  weatherDriftSpeed: number;
  placedItems: PlacedItem[];
  deskContents: DeskContents[];
  forageCooldowns: Record<string, number>;
  cutscenes: {
    completed: string[];
    lastSeasonTriggered?: string;
  };
}

export interface StatsSaveData {
  gold: number;
  forestDepth: number;
  caveDepth: number;
  statusEffects: {
    feelingSick: boolean;
    stamina: number;
    maxStamina: number;
    lastStaminaUpdate: number;
  };
  wateringCan: {
    currentLevel: number;
  };
  movementEffect: {
    mode: 'floating' | 'flying';
    expiresAt: number;
  } | null;
  transformations: {
    isFairyForm: boolean;
    fairyFormExpiresAt: number | null;
  };
  activePotionEffects: Record<
    string,
    {
      startTime: number;
      expiresAt: number;
    }
  >;
  playerDisguise: {
    npcId: string;
    npcName: string;
    sprite: string;
    expiresAt: number;
  } | null;
  dailyResourceCollections: Record<
    string,
    {
      lastCollectedDay: number;
      collectionsToday: number;
    }
  >;
  gamesPlayed: number;
  totalPlayTime: number;
  mushroomsCollected: number;
}

export interface DecorationSaveData {
  craftedPaints: string[];
  paintings: Array<{
    id: string;
    name: string;
    imageUrl: string;
    storageKey: string;
    paintIds: string[];
    colours: string[];
    createdAt: number;
    isUploaded: boolean;
  }>;
  hasEasel: boolean;
}

// ============================================
// Shared Data Types (Multi-player features)
// ============================================

/**
 * Conversation summary shared between players
 * Stored at: shared/conversations/{npcId}/summaries/{summaryId}
 */
export interface SharedConversationSummary {
  npcId: string;
  npcName: string;
  topic: string; // e.g., "recipes", "village history", "farming tips"
  summary: string; // Brief summary of what was discussed
  contributorId: string; // Anonymous user ID (hashed)
  contributorName: string; // Display name or "A villager"
  timestamp: Timestamp;
  season: string;
  gameDay: number;
  sentiment: 'positive' | 'neutral' | 'curious' | 'helpful';
}

/**
 * World event shared between players
 * Stored at: shared/events/{eventId}
 */
export interface SharedWorldEvent {
  eventType: SharedEventType;
  title: string;
  description: string;
  contributorId: string; // Anonymous user ID (hashed)
  contributorName: string; // Display name or "A traveller"
  timestamp: Timestamp;
  location?: {
    mapId: string;
    mapName: string;
  };
  metadata?: Record<string, unknown>; // Event-specific data
}

export type SharedEventType =
  | 'discovery' // Found rare item, new area, etc.
  | 'achievement' // Milestone reached
  | 'seasonal' // Seasonal event participation
  | 'community' // Community goal progress
  | 'mystery'; // Mysterious happenings

/**
 * Sync metadata for hybrid save system
 * Stored at: users/{userId}/syncMeta
 */
export interface SyncMetadata {
  lastLocalSave: number; // Timestamp of last localStorage save
  lastCloudSync: number; // Timestamp of last Firestore sync
  lastCloudSave: Timestamp; // Server timestamp of last cloud save
  deviceId: string; // Identifies which device last synced
  version: string; // Game version
}

// ============================================
// Firestore Path Helpers
// ============================================

export const FIRESTORE_PATHS = {
  // User profile is stored as the user document itself (2 segments: users/{userId})
  userProfile: (userId: string) => `users/${userId}`,
  // Sync metadata for hybrid save system
  syncMeta: (userId: string) => `users/${userId}/meta/sync`,
  // Saves are a subcollection under the user (4 segments: users/{userId}/saves/{slotId})
  userSaves: (userId: string) => `users/${userId}/saves`,
  saveSlot: (userId: string, slotId: string) => `users/${userId}/saves/${slotId}`,
  // Save data documents are in a subcollection under each save slot
  saveData: (userId: string, slotId: string, docType: string) =>
    `users/${userId}/saves/${slotId}/data/${docType}`,

  // Shared data paths (multi-player features)
  sharedConversations: (npcId: string) => `shared/conversations/${npcId}/summaries`,
  sharedConversationDoc: (npcId: string, summaryId: string) =>
    `shared/conversations/${npcId}/summaries/${summaryId}`,
  sharedEvents: () => `shared/events`,
  sharedEventDoc: (eventId: string) => `shared/events/${eventId}`,
} as const;

// Document types for save data
export type SaveDataDocType =
  | 'character'
  | 'inventory'
  | 'farming'
  | 'cooking'
  | 'magic'
  | 'friendships'
  | 'quests'
  | 'world'
  | 'stats'
  | 'decoration';

export const SAVE_DATA_DOCS: SaveDataDocType[] = [
  'character',
  'inventory',
  'farming',
  'cooking',
  'magic',
  'friendships',
  'quests',
  'world',
  'stats',
  'decoration',
];
