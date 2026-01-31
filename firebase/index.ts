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
 *   isFirebaseConfigured,
 * } from './firebase';
 * ```
 */

// Configuration
export {
  initializeFirebase,
  isFirebaseConfigured,
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
  SaveDataDocType,
} from './types';

export { FIRESTORE_PATHS, SAVE_DATA_DOCS } from './types';
