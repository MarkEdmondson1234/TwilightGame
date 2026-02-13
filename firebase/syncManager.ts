/**
 * Sync Manager - Hybrid Save System
 *
 * Coordinates between localStorage (fast, offline) and Firestore (cloud, canonical).
 *
 * Strategy:
 * - localStorage: Primary for speed, always available, immediate saves
 * - Firestore: Cloud backup, sync on login/logout/periodic, canonical on conflicts
 *
 * Sync triggers:
 * - On login: Compare timestamps, download newer cloud save or upload local
 * - On logout: Final backup to cloud
 * - Periodic: Every 5 minutes while playing (if signed in)
 * - Manual: User-triggered save to cloud
 */

import { doc, getDoc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { getFirebaseDb, isFirebaseInitialized } from './config';
import { authService } from './authService';
import { cloudSaveService } from './cloudSaveService';
import { syncDiaryFromFirestore } from '../services/diaryService';
import { gameState } from '../GameState';
import { FIRESTORE_PATHS, SyncMetadata } from './types';
import { eventBus, GameEvent } from '../utils/EventBus';

// ============================================
// Constants
// ============================================

const SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const GAME_VERSION = '1.0.0';
const DEFAULT_SLOT = 'slot_1';

// Generate a unique device ID (persisted in localStorage)
function getDeviceId(): string {
  let deviceId = localStorage.getItem('twilight_device_id');
  if (!deviceId) {
    deviceId = `device_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    localStorage.setItem('twilight_device_id', deviceId);
  }
  return deviceId;
}

// ============================================
// Sync State
// ============================================

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline';

export interface SyncState {
  status: SyncStatus;
  lastSyncTime: number | null;
  pendingChanges: boolean;
  error: string | null;
}

// ============================================
// SyncManager Class
// ============================================

class SyncManager {
  private syncInterval: ReturnType<typeof setInterval> | null = null;
  private state: SyncState = {
    status: 'idle',
    lastSyncTime: null,
    pendingChanges: false,
    error: null,
  };
  private listeners: Set<(state: SyncState) => void> = new Set();

  /**
   * Initialize sync manager
   * Call after Firebase and auth are initialized
   */
  initialize(): void {
    // Listen for auth state changes
    authService.onAuthStateChange((authState) => {
      if (authState.isAuthenticated && !authState.isLoading) {
        // User signed in - sync immediately
        this.onSignIn();
      } else if (!authState.isAuthenticated && !authState.isLoading) {
        // User signed out - stop periodic sync
        this.stopPeriodicSync();
      }
    });

    // Mark pending changes whenever local state is saved
    eventBus.on(GameEvent.LOCAL_SAVE_FLUSHED, () => {
      this.markPendingChanges();
    });

    // Best-effort cloud save when page is hidden (tab switch, close, navigate away)
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden' && this.state.pendingChanges) {
          this.attemptExitSave();
        }
      });
    }

    console.log('[SyncManager] Initialized');
  }

  /**
   * Handle user sign in - compare and sync saves
   */
  private async onSignIn(): Promise<void> {
    console.log('[SyncManager] User signed in, checking for sync...');

    try {
      this.updateState({ status: 'syncing' });

      // Get local save timestamp
      const localTimestamp = this.getLocalSaveTimestamp();

      // Get cloud save timestamp
      const cloudMeta = await this.getCloudSyncMeta();
      const cloudTimestamp = cloudMeta?.lastCloudSync || 0;

      console.log(
        '[SyncManager] Local timestamp:',
        localTimestamp,
        'Cloud timestamp:',
        cloudTimestamp
      );

      if (localTimestamp > cloudTimestamp) {
        // Local is newer - upload to cloud
        console.log('[SyncManager] Local save is newer, uploading to cloud...');
        await this.uploadToCloud();
      } else if (cloudTimestamp > localTimestamp) {
        // Cloud is newer - download to local
        console.log('[SyncManager] Cloud save is newer, downloading...');
        await this.downloadFromCloud();
      } else {
        console.log('[SyncManager] Saves are in sync');
      }

      // Sync diary entries from Firestore (non-blocking)
      syncDiaryFromFirestore().catch((err) => {
        console.warn('[SyncManager] Diary sync failed:', err);
      });

      this.updateState({
        status: 'idle',
        lastSyncTime: Date.now(),
        error: null,
      });

      // Start periodic sync
      this.startPeriodicSync();
    } catch (error) {
      console.error('[SyncManager] Sync failed:', error);
      this.updateState({
        status: 'error',
        error: error instanceof Error ? error.message : 'Sync failed',
      });
    }
  }

  /**
   * Upload current game state to cloud
   */
  async uploadToCloud(slotId: string = DEFAULT_SLOT): Promise<void> {
    if (!authService.isAuthenticated()) {
      console.log('[SyncManager] Not authenticated, skipping upload');
      return;
    }

    this.updateState({ status: 'syncing' });
    eventBus.emit(GameEvent.CLOUD_SYNC_STARTED, {});

    try {
      const state = gameState.getFullState();
      const playTime = state.stats?.totalPlayTime || 0;

      await cloudSaveService.saveGame(slotId, state, playTime);
      await this.updateCloudSyncMeta();

      this.updateState({
        status: 'idle',
        lastSyncTime: Date.now(),
        pendingChanges: false,
        error: null,
      });

      eventBus.emit(GameEvent.CLOUD_SYNC_COMPLETED, { success: true });
      console.log('[SyncManager] Uploaded to cloud successfully');
    } catch (error) {
      console.error('[SyncManager] Upload failed:', error);
      this.updateState({
        status: 'error',
        error: error instanceof Error ? error.message : 'Upload failed',
      });
      eventBus.emit(GameEvent.CLOUD_SYNC_COMPLETED, { success: false });
      throw error;
    }
  }

  /**
   * Download cloud save to local storage
   */
  async downloadFromCloud(slotId: string = DEFAULT_SLOT): Promise<void> {
    if (!authService.isAuthenticated()) {
      console.log('[SyncManager] Not authenticated, skipping download');
      return;
    }

    this.updateState({ status: 'syncing' });

    try {
      const cloudState = await cloudSaveService.loadGame(slotId);

      // Update local game state
      gameState.loadFromCloud(cloudState);

      // Update local save timestamp to match cloud
      this.setLocalSaveTimestamp(Date.now());

      this.updateState({
        status: 'idle',
        lastSyncTime: Date.now(),
        pendingChanges: false,
        error: null,
      });

      // Notify game that state was updated
      eventBus.emit(GameEvent.INVENTORY_CHANGED, { action: 'update' });

      // Also sync diary entries (non-blocking)
      syncDiaryFromFirestore().catch((err) => {
        console.warn('[SyncManager] Diary sync during download failed:', err);
      });

      console.log('[SyncManager] Downloaded from cloud successfully');
    } catch (error) {
      console.error('[SyncManager] Download failed:', error);
      this.updateState({
        status: 'error',
        error: error instanceof Error ? error.message : 'Download failed',
      });
      throw error;
    }
  }

  /**
   * Manual sync - force upload current state to cloud + pull diary entries
   */
  async syncNow(): Promise<void> {
    if (!authService.isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    await this.uploadToCloud();

    // Also pull diary entries from other devices (non-blocking)
    syncDiaryFromFirestore().catch((err) => {
      console.warn('[SyncManager] Diary sync failed:', err);
    });
  }

  /**
   * Sync before sign-out. Call BEFORE authService.signOut() so auth token is still valid.
   */
  async syncBeforeSignOut(): Promise<void> {
    if (!authService.isAuthenticated() || !this.state.pendingChanges) return;
    try {
      await this.uploadToCloud();
      console.log('[SyncManager] Final sync before sign-out completed');
    } catch (error) {
      console.warn('[SyncManager] Final sync before sign-out failed:', error);
    }
  }

  /**
   * Best-effort save on page exit (visibilitychange → hidden).
   * Fire-and-forget — may not complete if page is closed immediately.
   */
  private attemptExitSave(): void {
    if (!authService.isAuthenticated() || !this.state.pendingChanges) return;

    console.log('[SyncManager] Attempting exit save...');
    this.uploadToCloud().catch((error) => {
      console.warn('[SyncManager] Exit save failed (expected if page closed):', error);
    });
  }

  /**
   * Mark that local changes exist (for UI indicator)
   */
  markPendingChanges(): void {
    if (this.state.pendingChanges) return;
    this.updateState({ pendingChanges: true });
  }

  /**
   * Get current sync state
   */
  getState(): SyncState {
    return { ...this.state };
  }

  /**
   * Subscribe to sync state changes
   */
  onStateChange(callback: (state: SyncState) => void): () => void {
    this.listeners.add(callback);
    callback(this.state);
    return () => this.listeners.delete(callback);
  }

  // ============================================
  // Periodic Sync
  // ============================================

  private startPeriodicSync(): void {
    if (this.syncInterval) return;

    this.syncInterval = setInterval(async () => {
      if (!authService.isAuthenticated()) return;

      // Upload game state if there are pending changes
      if (this.state.pendingChanges) {
        console.log('[SyncManager] Periodic sync triggered');
        try {
          await this.uploadToCloud();
        } catch (error) {
          console.error('[SyncManager] Periodic sync failed:', error);
        }
      }

      // Always pull diary entries (may have entries from other devices)
      syncDiaryFromFirestore().catch((err) => {
        console.warn('[SyncManager] Periodic diary sync failed:', err);
      });
    }, SYNC_INTERVAL_MS);

    console.log('[SyncManager] Periodic sync started (every 5 minutes)');
  }

  private stopPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log('[SyncManager] Periodic sync stopped');
    }
  }

  // ============================================
  // Sync Metadata
  // ============================================

  private async getCloudSyncMeta(): Promise<SyncMetadata | null> {
    if (!isFirebaseInitialized() || !authService.isAuthenticated()) {
      return null;
    }

    const userId = authService.getUserId()!;
    const db = getFirebaseDb();
    const metaRef = doc(db, FIRESTORE_PATHS.syncMeta(userId));

    try {
      const metaDoc = await getDoc(metaRef);
      if (metaDoc.exists()) {
        return metaDoc.data() as SyncMetadata;
      }
    } catch (error) {
      console.warn('[SyncManager] Failed to get cloud sync meta:', error);
    }

    return null;
  }

  private async updateCloudSyncMeta(): Promise<void> {
    if (!isFirebaseInitialized() || !authService.isAuthenticated()) {
      return;
    }

    const userId = authService.getUserId()!;
    const db = getFirebaseDb();
    const metaRef = doc(db, FIRESTORE_PATHS.syncMeta(userId));

    const meta: Omit<SyncMetadata, 'lastCloudSave'> & {
      lastCloudSave: ReturnType<typeof serverTimestamp>;
    } = {
      lastLocalSave: this.getLocalSaveTimestamp(),
      lastCloudSync: Date.now(),
      lastCloudSave: serverTimestamp(),
      deviceId: getDeviceId(),
      version: GAME_VERSION,
    };

    await setDoc(metaRef, meta, { merge: true });
  }

  private getLocalSaveTimestamp(): number {
    const saved = localStorage.getItem('twilight_last_save');
    return saved ? parseInt(saved, 10) : 0;
  }

  private setLocalSaveTimestamp(timestamp: number): void {
    localStorage.setItem('twilight_last_save', timestamp.toString());
  }

  // ============================================
  // State Management
  // ============================================

  private updateState(partial: Partial<SyncState>): void {
    this.state = { ...this.state, ...partial };
    this.listeners.forEach((cb) => cb(this.state));
  }

  /**
   * Clean up (call on app unmount)
   */
  destroy(): void {
    this.stopPeriodicSync();
    this.listeners.clear();
  }
}

// Singleton instance
export const syncManager = new SyncManager();
