/**
 * Firebase Module - Main Entry Point
 *
 * Re-exports all Firebase services for convenient importing.
 *
 * Usage:
 * ```typescript
 * import {
 *   initializeFirebase,
 *   authService,
 *   cloudSaveService,
 *   syncManager,
 *   sharedDataService,
 *   isFirebaseConfigured,
 * } from './firebase';
 * ```
 */

// Configuration
export {
  initializeFirebase,
  isFirebaseConfigured,
  isFirebaseDisabled,
  isFirebaseInitialized,
  getFirebaseAuth,
  getFirebaseDb,
  getFirebaseApp,
} from './config';

// Authentication
export { authService } from './authService';
export type { AuthState } from './authService';

// Cloud Saves
export { cloudSaveService } from './cloudSaveService';

// Sync Manager (Hybrid Save System)
export { syncManager } from './syncManager';
export type { SyncStatus, SyncState } from './syncManager';

// Shared Data (Multi-player Features)
export { sharedDataService } from './sharedDataService';

// Painting Storage
export { paintingStorageService } from './paintingStorage';

// Types
export type {
  UserProfile,
  UserSettings,
  SaveSlot,
  SaveMetadata,
  CharacterSaveData,
  InventorySaveData,
  FarmingSaveData,
  CookingSaveData,
  MagicSaveData,
  FriendshipsSaveData,
  QuestsSaveData,
  WorldSaveData,
  StatsSaveData,
  SyncMetadata,
  SharedConversationSummary,
  SharedWorldEvent,
  SharedEventType,
  SaveDataDocType,
} from './types';

export { FIRESTORE_PATHS, SAVE_DATA_DOCS } from './types';
